import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withRetry, SMS_RETRY_OPTIONS } from "../_shared/retry.ts";
import { enrollInFollowUp, pauseFollowUpOnResponse } from "../_shared/follow-up.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========================================
// STOP/UNSUBSCRIBE KEYWORDS - CHECK FIRST!
// ========================================
const STOP_KEYWORDS = [
  'stop', 'unsubscribe', 'cancel', 'remove', 'quit', 'end',
  'optout', 'opt out', 'opt-out', 'leave me alone', 'stop texting',
  'do not contact', 'don\'t contact', 'dont contact'
];

function isStopRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();
  return STOP_KEYWORDS.some(keyword => 
    lowerMessage === keyword || 
    lowerMessage.startsWith(keyword + ' ') ||
    lowerMessage.endsWith(' ' + keyword)
  );
}

// ========================================
// SPAM/AUTOMATED MESSAGE FILTER
// ========================================
const SPAM_PATTERNS = [
  /^https?:\/\/static\.wixstatic\.com/i,  // Wix image URLs
  /^https?:\/\/.*wix.*\.(png|jpg|jpeg|gif|webp|mp4)/i,  // Other Wix media
  /^https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp)(\?[^\s]*)?$/i,  // Pure image URLs
];

function isSpamMessage(message: string): boolean {
  const trimmed = message.trim();
  // Skip if message is just a URL matching spam patterns
  return SPAM_PATTERNS.some(pattern => pattern.test(trimmed));
}

// ========================================
// INSTRUCTOR CONFIG & RESPONSE HANDLER
// ========================================

const INSTRUCTOR_CONFIG = [
  { name: "Anthony Bui", phone: "+19198181415" },
  { name: "Damien Robinson", phone: "+19195210630" },
  { name: "Daison Reich", phone: "+16363285065" },
  { name: "Aileen Rossouw", phone: "+19727541242" },
  { name: "Courtney", phone: "+19197587325" },
  { name: "Adam Avendano", phone: "+18633263431" },
  { name: "James", phone: "+18159157802" },
  { name: "Mavrick Vo", phone: "+19197254644" },
];

async function handleInstructorResponse(
  instructor: { name: string; phone: string },
  body: string,
  supabase: any
): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  const instructorFirstName = instructor.name.split(' ')[0];
  console.log(`👩‍🏫 Instructor response from ${instructor.name}: "${body}"`);

  try {
    // 1. Find most recent post_class check for this instructor (within 8 hours)
    const { data: checks, error: checkErr } = await supabase
      .from('fightflow_instructor_checks')
      .select('*')
      .eq('instructor_phone', instructor.phone)
      .eq('check_type', 'post_class')
      .is('attendance_confirmed', null)
      .gte('created_at', new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (checkErr) {
      console.error('Error fetching instructor check:', checkErr.message);
    }

    const check = checks?.[0];

    if (!check) {
      console.log(`No pending post_class check found for ${instructor.name} in the last 8 hours`);
      // Still reply gracefully
      await sendTwilioSMS(instructor.phone, `Thanks ${instructorFirstName}! We don't have a pending check right now, but we appreciate the reply! 🙌`);
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' } }
      );
    }

    // 2. Parse response
    const normalized = body.trim().toLowerCase();
    const isYes = normalized.startsWith('y');
    const isNo = normalized.startsWith('n');

    if (!isYes && !isNo) {
      console.log(`Unrecognized instructor response: "${body}"`);
      await sendTwilioSMS(instructor.phone, `Got it — can you reply YES or NO?`);
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' } }
      );
    }

    // 3. Update check record
    const attendanceConfirmed = isYes;
    await supabase
      .from('fightflow_instructor_checks')
      .update({
        attendance_confirmed: attendanceConfirmed,
        response: body,
        responded_at: new Date().toISOString(),
      })
      .eq('id', check.id);

    console.log(`✅ Updated check ${check.id}: attendance_confirmed=${attendanceConfirmed}`);

    if (isYes) {
      // 4. If YES → trigger day+1 follow-up
      const studentFirstName = (check.student_name || '').split(' ')[0];
      const day1Message = `Hey ${studentFirstName}! Hope your first class at Fight Flow was amazing! How did it feel? 🥊`;

      // Try to find existing day+1 sequence step for this appointment
      const { data: existingStep } = await supabase
        .from('fightflow_sequence_steps')
        .select('*')
        .eq('appointment_id', check.appointment_id)
        .eq('step_name', 'day_plus_1')
        .in('status', ['pending', 'scheduled'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingStep) {
        // Accelerate: schedule for 30 minutes from now
        const fireAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        await supabase
          .from('fightflow_sequence_steps')
          .update({ scheduled_for: fireAt })
          .eq('id', existingStep.id);
        console.log(`⏩ Accelerated day+1 step ${existingStep.id} → fires at ${fireAt}`);
      } else {
        // Create a new day+1 step
        const fireAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        await supabase
          .from('fightflow_sequence_steps')
          .insert({
            appointment_id: check.appointment_id,
            step_name: 'day_plus_1',
            step_order: 1,
            channel: 'sms',
            scheduled_for: fireAt,
            status: 'pending',
            message_content: day1Message,
          });
        console.log(`📝 Created new day+1 step for appointment ${check.appointment_id}`);
      }

      // Reply to instructor
      await sendTwilioSMS(instructor.phone, `Thanks ${instructorFirstName}! Got it. 🙌`);

    } else {
      // If NO → update, reply to instructor
      await sendTwilioSMS(instructor.phone, `Thanks ${instructorFirstName}! We'll follow up with them.`);
    }

  } catch (err: any) {
    console.error('Instructor handler error:', err.message);
  }

  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' } }
  );
}

async function sendTwilioSMS(to: string, message: string): Promise<void> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || Deno.env.get('TWILIO_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioFromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !twilioFromNumber) {
    console.error('Missing Twilio credentials for instructor reply');
    return;
  }

  const params = new URLSearchParams({ From: twilioFromNumber, To: to, Body: message });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    console.error(`Twilio instructor reply failed: ${res.status} ${await res.text()}`);
  } else {
    const r = await res.json();
    console.log(`📱 Instructor reply sent to ${to}, SID: ${r.sid}`);
  }
}

// Phone normalization function for E.164 format
function normalizePhoneNumber(phoneNumber: string): string | null {
  if (!phoneNumber) return null;

  // Remove all non-numeric characters except leading +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // If already has +, keep it
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Remove all non-numeric characters
  const digits = phoneNumber.replace(/\D/g, '');

  if (digits.length === 10) {
    return '+1' + digits;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return '+' + digits;
  }

  return phoneNumber;
}

/**
 * Find or create a contact using HubSpot-style deduplication
 */
async function findOrCreateContact(
  supabase: any,
  businessId: string,
  phone: string
): Promise<{ id: string; business_id: string; isNew: boolean; email?: string; first_name?: string; last_name?: string; preferred_channel?: string; tags?: string[] }> {

  const normalizedPhone = normalizePhoneNumber(phone);
  console.log(`Looking up contact: phone=${normalizedPhone}, businessId=${businessId}`);

  const { data: existingContact, error: lookupError } = await supabase
    .from('contacts')
    .select('id, business_id, first_name, last_name, email, phone, preferred_channel, tags')
    .eq('business_id', businessId)
    .eq('phone', normalizedPhone)
    .single();

  if (existingContact) {
    console.log(`Found existing contact: ${existingContact.id} (${existingContact.first_name} ${existingContact.last_name})`);
    return { ...existingContact, isNew: false };
  }

  if (normalizedPhone !== phone) {
    const { data: altContact } = await supabase
      .from('contacts')
      .select('id, business_id, first_name, last_name, email, phone, preferred_channel, tags')
      .eq('business_id', businessId)
      .eq('phone', phone)
      .single();

    if (altContact) {
      console.log(`Found existing contact (alt format): ${altContact.id}`);
      return { ...altContact, isNew: false };
    }
  }

  console.log(`No existing contact found, creating new contact for business ${businessId}`);

  const { data: newContact, error: createError } = await supabase
    .from('contacts')
    .insert({
      business_id: businessId,
      phone: normalizedPhone,
      source: 'sms_inbound',
      status: 'new_lead',
      first_name: 'SMS Contact',
      sms_status: 'active'
    })
    .select('id, business_id, tags')
    .single();

  if (createError) {
    throw new Error(`Failed to create contact: ${createError.message}`);
  }

  console.log(`Created new contact: ${newContact.id}`);
  return { ...newContact, isNew: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse Twilio webhook data
    const formData = await req.formData();
    const from = formData.get('From')?.toString() || '';
    const body = formData.get('Body')?.toString() || '';
    const to = formData.get('To')?.toString() || '';

    console.log('Incoming SMS:', { from, body: body.substring(0, 50), to });

    // ========================================
    // STEP 0: CHECK FOR STOP REQUEST FIRST!
    // ========================================
    if (isStopRequest(body)) {
      console.log('🛑 STOP request detected from:', from);
      
      // Find the contact
      let { data: smsConfig } = await supabase
        .from('sms_config')
        .select('business_id')
        .eq('phone_number', to)
        .eq('is_active', true)
        .single();

      if (!smsConfig) {
        const { data: defaultBusiness } = await supabase
          .from('businesses')
          .select('id')
          .limit(1)
          .single();
        smsConfig = { business_id: defaultBusiness?.id };
      }

      if (smsConfig?.business_id) {
        const normalizedPhone = normalizePhoneNumber(from);
        
        // Update contact to do_not_contact
        const { data: contact } = await supabase
          .from('contacts')
          .select('id, tags')
          .eq('business_id', smsConfig.business_id)
          .eq('phone', normalizedPhone)
          .single();

        if (contact) {
          const currentTags = contact.tags || [];
          const newTags = [...new Set([...currentTags, 'do_not_contact', 'sms_optout'])];
          
          await supabase
            .from('contacts')
            .update({ 
              tags: newTags,
              sms_status: 'opted_out'
            })
            .eq('id', contact.id);

          // Pause any active follow-ups
          await supabase
            .from('contact_follow_ups')
            .update({ status: 'paused' })
            .eq('contact_id', contact.id)
            .eq('status', 'active');

          // Close any open threads
          await supabase
            .from('conversation_threads')
            .update({ status: 'closed', conversation_state: 'opted_out' })
            .eq('contact_id', contact.id)
            .eq('status', 'active');

          console.log('🛑 Contact opted out:', contact.id);
        }

        // Log the opt-out
        await supabase.from('automation_logs').insert({
          business_id: smsConfig.business_id,
          automation_type: 'sms_optout',
          status: 'success',
          processed_data: { phone: normalizedPhone, message: body }
        });
      }

      // Send ONE confirmation - Twilio will handle this via TwiML
      const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>You've been unsubscribed and won't receive further messages. Reply START to resubscribe.</Message></Response>`;
      
      return new Response(twimlResponse, {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
      });
    }

    // ========================================
    // STEP 0.5: CHECK FOR SPAM/AUTOMATED MESSAGES
    // ========================================
    if (isSpamMessage(body)) {
      console.log('🚫 Spam message detected, ignoring:', body.substring(0, 50));
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' } }
      );
    }

    // ========================================
    // STEP 0.7: CHECK IF SENDER IS AN INSTRUCTOR
    // Route to instructor handler — NEVER to AI chatbot
    // ========================================
    const instructor = INSTRUCTOR_CONFIG.find(i => i.phone === from);
    if (instructor) {
      console.log(`👩‍🏫 Instructor message detected from ${instructor.name} (${from})`);
      return handleInstructorResponse(instructor, body, supabase);
    }

    // STEP 1: Determine which business this SMS is for
    let { data: smsConfig, error: configError } = await supabase
      .from('sms_config')
      .select('business_id, businesses(id, name)')
      .eq('phone_number', to)
      .eq('is_active', true)
      .single();

    if (configError || !smsConfig) {
      console.error('No SMS config found for Twilio number:', to);
      const { data: defaultBusiness } = await supabase
        .from('businesses')
        .select('id, name')
        .limit(1)
        .single();

      if (!defaultBusiness) {
        throw new Error(`No business configured for Twilio number: ${to}`);
      }

      smsConfig = {
        business_id: defaultBusiness.id,
        businesses: [defaultBusiness]
      } as typeof smsConfig;
    }

    const businessId = smsConfig!.business_id;
    const businessName = (smsConfig!.businesses as any)?.[0]?.name || (smsConfig!.businesses as any)?.name || 'Unknown Business';
    console.log(`SMS for business: ${businessName} (${businessId})`);

    // STEP 2: Find or create contact
    const contact = await findOrCreateContact(supabase, businessId, from);

    // ========================================
    // STEP 2.5: CHECK IF CONTACT IS BLOCKED
    // ========================================
    const contactTags = contact.tags || [];
    if (contactTags.includes('do_not_contact') || contactTags.includes('sms_optout')) {
      console.log('⚠️ Contact has do_not_contact tag, not responding:', contact.id);
      
      // Store the message but don't respond
      // (They may have texted START to resubscribe - handle that separately if needed)
      const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
      return new Response(twimlResponse, {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
      });
    }

    // Check if they're an active member - flag for human follow-up instead of AI
    if (contactTags.includes('active_member')) {
      console.log('ℹ️ Active member texted in - flagging for human follow-up');
      
      // Store the message
      const { data: existingThread } = await supabase
        .from('conversation_threads')
        .select('id')
        .eq('contact_id', contact.id)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let threadId = existingThread?.id;
      if (!threadId) {
        const { data: newThread } = await supabase
          .from('conversation_threads')
          .insert({
            contact_id: contact.id,
            business_id: businessId,
            status: 'active',
            conversation_state: 'needs_human_review',
            needs_human_review: true
          })
          .select('id')
          .single();
        threadId = newThread?.id;
      } else {
        await supabase
          .from('conversation_threads')
          .update({ needs_human_review: true, conversation_state: 'needs_human_review' })
          .eq('id', threadId);
      }

      if (threadId) {
        await supabase.from('sms_messages').insert({
          thread_id: threadId,
          contact_id: contact.id,
          direction: 'inbound',
          message: body,
          ai_response: false
        });
      }

      // Log for visibility
      await supabase.from('automation_logs').insert({
        business_id: businessId,
        automation_type: 'active_member_message',
        status: 'flagged',
        processed_data: { contact_id: contact.id, message_preview: body.substring(0, 100) }
      });

      // Don't auto-respond to active members - let human handle it
      const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
      return new Response(twimlResponse, {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
      });
    }

    // ========================================
    // RATE LIMITING CHECK
    // ========================================
    // Check when we last messaged this contact
    const { data: canMessage } = await supabase
      .rpc('can_message_contact', { 
        p_contact_id: contact.id, 
        p_channel: 'sms',
        p_min_hours_between: 24 
      });

    // Note: For INBOUND messages (customer initiated), we should still respond
    // Rate limiting is mainly for our automated outbound messages
    // But we track all messages for the record

    if (contact.isNew) {
      console.log(`New contact created from SMS: ${contact.id}`);
      
      enrollInFollowUp(supabase, {
        contactId: contact.id,
        businessId: businessId,
        trigger: 'new_lead',
      }).catch(err => console.error('Follow-up enrollment failed:', err));
    } else {
      console.log(`Matched existing contact: ${contact.id}`);
      
      pauseFollowUpOnResponse(supabase, contact.id)
        .catch(err => console.error('Follow-up pause failed:', err));
    }

    // STEP 3: Find or create conversation thread
    let isNewThread = false;

    const { data: existingThreads } = await supabase
      .from('conversation_threads')
      .select('id, status, created_at')
      .eq('contact_id', contact.id)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    let thread: { id: string } | null = null;

    if (existingThreads && existingThreads.length > 0) {
      thread = { id: existingThreads[0].id };
      console.log('📱 Using existing thread:', thread.id);

      if (existingThreads[0].status !== 'active') {
        await supabase
          .from('conversation_threads')
          .update({ status: 'active', conversation_state: 'answering_questions' })
          .eq('id', thread.id);
      }

      if (existingThreads.length > 1) {
        const oldThreadIds = existingThreads.slice(1).map(t => t.id);
        await supabase
          .from('conversation_threads')
          .update({ status: 'closed' })
          .in('id', oldThreadIds);
      }
    } else {
      isNewThread = true;
      const { data: newThread, error: createThreadError } = await supabase
        .from('conversation_threads')
        .insert({
          contact_id: contact.id,
          business_id: businessId,
          status: 'active',
          conversation_state: 'answering_questions'
        })
        .select('id')
        .single();

      if (createThreadError || !newThread) {
        throw new Error(`Failed to create thread: ${createThreadError?.message}`);
      }
      thread = newThread;
      console.log('📱 Created new thread:', thread.id);
    }

    // STEP 4: Store incoming message
    const { error: messageError } = await supabase
      .from('sms_messages')
      .insert({
        thread_id: thread.id,
        contact_id: contact.id,
        direction: 'inbound',
        message: body,
        ai_response: false
      });

    if (messageError) {
      throw new Error(`Failed to store message: ${messageError.message}`);
    }

    await supabase
      .from('contacts')
      .update({
        last_activity_date: new Date().toISOString(),
        preferred_channel: contact.preferred_channel || 'sms'
      })
      .eq('id', contact.id);

    // Get conversation history
    const { data: messageHistory } = await supabase
      .from('sms_messages')
      .select('direction, message, created_at')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true });

    // ========================================
    // Detect returning contact (gap > 7 days since last message)
    // ========================================
    const currentTime = new Date();
    const priorMessages = messageHistory || [];
    const lastMessageBefore = priorMessages
      .filter(m => m.direction === 'inbound')
      .slice(-2, -1)[0]; // Second-to-last inbound (not the current one)

    let returningContactContext = '';
    let isReturningContact = false;

    if (lastMessageBefore) {
      const lastMsgDate = new Date(lastMessageBefore.created_at);
      const daysSinceLast = Math.floor((currentTime.getTime() - lastMsgDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceLast >= 7) {
        isReturningContact = true;

        // Find any booking promises in prior AI messages
        const bookingPromises = priorMessages
          .filter(m => m.direction === 'outbound')
          .filter(m => /booked|scheduled|set you up|confirmed|see you/i.test(m.message))
          .map(m => m.message.substring(0, 120));

        // Find expressed preferences
        const classPrefs = priorMessages
          .filter(m => m.direction === 'inbound')
          .filter(m => /muay thai|boxing|bjj|grappling|kickboxing|mma/i.test(m.message))
          .map(m => m.message.substring(0, 80));

        returningContactContext = `
=== RETURNING CONTACT — ${daysSinceLast} DAYS SINCE LAST MESSAGE ===
This person has contacted us before. They are NOT a new lead. Reference their prior conversation naturally.

${bookingPromises.length > 0 ? `PRIOR COMMITMENTS MADE (check if they followed through):\n${bookingPromises.map(p => `- "${p}"`).join('\n')}` : ''}

${classPrefs.length > 0 ? `THEIR EXPRESSED INTERESTS:\n${classPrefs.map(p => `- "${p}"`).join('\n')}` : ''}

INSTRUCTIONS FOR RETURNING CONTACT:
- Acknowledge they're coming back (briefly, naturally — not robotically)
- Reference what they discussed before if relevant
- If we promised them something (booking, etc.) and they're asking about it again, acknowledge it directly
- They already know us — skip the intro pitch
- If they're asking about pricing/membership, they're hot — flag with "I'll have Scott reach out to you directly about that!" and set needs_human_review = true
=== END RETURNING CONTACT CONTEXT ===`;

        console.log(`🔄 Returning contact detected: ${daysSinceLast} days since last message`);
      }
    }

    // Flag returning contacts asking about pricing for Scott's personal follow-up
    const isPricingInquiry = /price|cost|how much|membership|monthly|fee|rate/i.test(body);
    if (isReturningContact && isPricingInquiry) {
      await supabase
        .from('conversation_threads')
        .update({
          needs_human_review: true,
          conversation_state: 'hot_re_engagement'
        })
        .eq('id', thread.id);
      console.log('🔥 Hot re-engagement: returning contact asking about pricing — flagged for Scott');
    }

    // Get business context
    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .single();

    // Load knowledge base
    const { data: knowledgeBase } = await supabase
      .from('business_knowledge')
      .select('category, title, content')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    let knowledgeText = '';
    if (knowledgeBase && knowledgeBase.length > 0) {
      knowledgeText = knowledgeBase.map(k => `${k.title}: ${k.content}`).join('\n');
    }

    // Load class schedule
    const { data: classes } = await supabase
      .from('class_schedule')
      .select('id, class_name, instructor, day_of_week, start_time, end_time')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let scheduleText = '';
    if (classes && classes.length > 0) {
      scheduleText = classes.map(c => {
        const day = dayNames[c.day_of_week];
        const startTime = c.start_time?.substring(0, 5) || '';
        const endTime = c.end_time?.substring(0, 5) || '';
        return `${day}: ${c.class_name} with ${c.instructor} (${startTime}-${endTime})`;
      }).join('\n');
    }

    const now = new Date();
    const easternTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const currentDay = easternTime.getDay();
    const currentDayName = dayNames[currentDay];

    const todaysClasses = classes?.filter(c => c.day_of_week === currentDay) || [];
    let todaysScheduleText = 'No classes scheduled today.';
    if (todaysClasses.length > 0) {
      todaysScheduleText = todaysClasses.map(c => {
        const startTime = c.start_time?.substring(0, 5) || '';
        const endTime = c.end_time?.substring(0, 5) || '';
        return `${c.class_name} with ${c.instructor} (${startTime}-${endTime})`;
      }).join('\n');
    }

    const conversationMessages = messageHistory?.map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.message
    })) || [];

    conversationMessages.push({ role: 'user', content: body });

    const historyText = messageHistory?.map(msg => {
      const role = msg.direction === 'inbound' ? 'Customer' : 'You (AI)';
      return `${role}: ${msg.message}`;
    }).join('\n') || 'No previous messages';

    const contactName = contact.first_name && contact.first_name !== 'SMS Contact'
      ? `${contact.first_name} ${contact.last_name || ''}`.trim()
      : null;

    // ========================================
    // CALL AI - WITH ERROR PROTECTION
    // ========================================
    let responseMessage = 'Thanks for your message! Someone will get back to you soon.';
    let aiResult: any = { message: null };

    try {
      const aiResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-response`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: conversationMessages,
          businessId: businessId,
          businessContext: business?.name || businessName,
          classSchedule: classes || [],
          contactName: contactName,
          threadId: thread.id,
          conversationHistory: historyText,
          knowledgeBase: (knowledgeText || '') + (returningContactContext ? '\n\n' + returningContactContext : ''),
          scheduleText: scheduleText,
          todaysSchedule: todaysScheduleText,
          currentDay: currentDayName
        })
      });

      // Only use AI response if it was successful
      if (aiResponse.ok) {
        aiResult = await aiResponse.json();
        
        // CRITICAL: Only use AI message if it looks like a real response
        // Never send error messages, stack traces, or technical text
        if (aiResult.message && 
            typeof aiResult.message === 'string' &&
            aiResult.message.length > 0 &&
            aiResult.message.length < 500 &&
            !aiResult.message.toLowerCase().includes('error') &&
            !aiResult.message.toLowerCase().includes('invalid') &&
            !aiResult.message.toLowerCase().includes('failed') &&
            !aiResult.message.toLowerCase().includes('exception') &&
            !aiResult.message.toLowerCase().includes('jwt') &&
            !aiResult.message.toLowerCase().includes('token') &&
            !aiResult.message.toLowerCase().includes('undefined') &&
            !aiResult.message.toLowerCase().includes('null')) {
          responseMessage = aiResult.message;
        } else {
          console.warn('⚠️ AI response looks like an error, using fallback');
        }
      } else {
        console.error('AI response failed with status:', aiResponse.status);
        // Log the error internally but don't expose to customer
        await supabase.from('automation_logs').insert({
          business_id: businessId,
          automation_type: 'ai_response_error',
          status: 'error',
          error_message: `AI returned status ${aiResponse.status}`,
          processed_data: { contact_id: contact.id, thread_id: thread.id }
        });
      }
    } catch (aiError: any) {
      console.error('AI call failed:', aiError.message);
      // Log internally, use fallback for customer
      await supabase.from('automation_logs').insert({
        business_id: businessId,
        automation_type: 'ai_response_error',
        status: 'error',
        error_message: aiError.message,
        processed_data: { contact_id: contact.id, thread_id: thread.id }
      });
    }

    // Handle class booking if AI detected intent
    if (aiResult.shouldBook && aiResult.classDetails) {
      console.log('Processing booking:', aiResult.classDetails);

      let targetClass = null;
      if (aiResult.classDetails.classScheduleId) {
        targetClass = classes?.find((cls: any) => cls.id === aiResult.classDetails.classScheduleId);
      }
      if (!targetClass) {
        targetClass = classes?.find((cls: any) =>
          cls.class_name.toLowerCase().includes(aiResult.classDetails.className.toLowerCase())
        );
      }

      if (targetClass) {
        const nowUtc = new Date();
        const easternNow = new Date(nowUtc.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const targetDay = aiResult.classDetails.dayOfWeek ?? targetClass.day_of_week;
        let daysUntilClass = (targetDay - easternNow.getDay() + 7) % 7;
        if (daysUntilClass === 0) {
          const [hours, minutes] = targetClass.start_time.split(':').map(Number);
          const classTimeToday = new Date(easternNow);
          classTimeToday.setHours(hours, minutes, 0, 0);
          if (easternNow > classTimeToday) {
            daysUntilClass = 7;
          }
        }
        const classDate = new Date(easternNow);
        classDate.setDate(easternNow.getDate() + daysUntilClass);

        const { error: bookingError } = await supabase
          .from('class_bookings')
          .insert({
            contact_id: contact.id,
            class_schedule_id: targetClass.id,
            booking_date: classDate.toISOString().split('T')[0],
            status: 'confirmed',
            notes: `Booked via AI SMS assistant - ${targetClass.class_name} at ${targetClass.start_time}`
          });

        if (!bookingError) {
          console.log(`Booking created: ${targetClass.class_name} on ${classDate.toDateString()}`);

          await supabase
            .from('contacts')
            .update({ pipeline_stage: 'qualified', status: 'qualified' })
            .eq('id', contact.id);

          await supabase.from('automation_logs').insert({
            business_id: businessId,
            automation_type: 'class_booking',
            status: 'success',
            processed_data: {
              contact_id: contact.id,
              class_name: targetClass.class_name,
              class_date: classDate.toISOString().split('T')[0]
            }
          });
        }
      }
    }

    // Store AI response
    await supabase
      .from('sms_messages')
      .insert({
        thread_id: thread.id,
        contact_id: contact.id,
        direction: 'outbound',
        message: responseMessage,
        ai_response: true
      });

    // Send SMS via Twilio
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || Deno.env.get('TWILIO_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioFromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (accountSid && authToken && twilioFromNumber) {
      try {
        const twilioResult = await withRetry(async () => {
          const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              From: twilioFromNumber,
              To: from,
              Body: responseMessage
            })
          });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Twilio API error (${response.status}): ${errorData}`);
          }

          return response.json();
        }, SMS_RETRY_OPTIONS);

        console.log('📱 SMS sent successfully, SID:', twilioResult.sid);
        
        // Log for rate limiting
        await supabase.from('contact_message_log').insert({
          contact_id: contact.id,
          business_id: businessId,
          channel: 'sms',
          direction: 'outbound',
          message_preview: responseMessage.substring(0, 100)
        });
        
        // Update contact's last contacted timestamp
        await supabase
          .from('contacts')
          .update({ sms_last_contacted: new Date().toISOString() })
          .eq('id', contact.id);
          
      } catch (smsError: any) {
        console.error('📱 SMS sending failed:', smsError.message);
        await supabase.from('automation_logs').insert({
          business_id: businessId,
          automation_type: 'sms_response_failed',
          status: 'error',
          error_message: smsError.message,
          processed_data: { contact_id: contact.id, thread_id: thread.id }
        });
      }
    }

    // Return empty TwiML
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

    return new Response(twimlResponse, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
    });

  } catch (error: any) {
    console.error('SMS webhook error:', error);
    // NEVER return error details in the response - just acknowledge receipt
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' } }
    );
  }
});
