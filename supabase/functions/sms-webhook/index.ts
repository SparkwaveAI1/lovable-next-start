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
          knowledgeBase: knowledgeText,
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
