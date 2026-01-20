import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    // 10 digits: assume US number, add country code
    return '+1' + digits;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // 11 digits starting with 1: already has US country code
    return '+' + digits;
  }

  // Return as-is if we can't normalize
  return phoneNumber;
}

/**
 * Find or create a contact using HubSpot-style deduplication:
 * 1. Try to find by phone within the business
 * 2. If not found, create new contact with business_id
 */
async function findOrCreateContact(
  supabase: any,
  businessId: string,
  phone: string
): Promise<{ id: string; business_id: string; isNew: boolean; email?: string; first_name?: string; last_name?: string; preferred_channel?: string }> {

  const normalizedPhone = normalizePhoneNumber(phone);
  console.log(`Looking up contact: phone=${normalizedPhone}, businessId=${businessId}`);

  // Try to find existing contact by phone within this business
  const { data: existingContact, error: lookupError } = await supabase
    .from('contacts')
    .select('id, business_id, first_name, last_name, email, phone, preferred_channel')
    .eq('business_id', businessId)
    .eq('phone', normalizedPhone)
    .single();

  if (existingContact) {
    console.log(`Found existing contact: ${existingContact.id} (${existingContact.first_name} ${existingContact.last_name})`);
    return { ...existingContact, isNew: false };
  }

  // Also try without normalization in case stored format differs
  if (normalizedPhone !== phone) {
    const { data: altContact } = await supabase
      .from('contacts')
      .select('id, business_id, first_name, last_name, email, phone, preferred_channel')
      .eq('business_id', businessId)
      .eq('phone', phone)
      .single();

    if (altContact) {
      console.log(`Found existing contact (alt format): ${altContact.id}`);
      return { ...altContact, isNew: false };
    }
  }

  // No existing contact found - create new one
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
    .select('id, business_id')
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

    console.log('Incoming SMS:', { from, body, to });

    // STEP 1: Determine which business this SMS is for based on the Twilio phone number
    let { data: smsConfig, error: configError } = await supabase
      .from('sms_config')
      .select('business_id, businesses(id, name)')
      .eq('phone_number', to)
      .eq('is_active', true)
      .single();

    if (configError || !smsConfig) {
      console.error('No SMS config found for Twilio number:', to, 'Error:', configError?.message);
      // Fallback: try to find any business with this phone number
      // Or default to first business (for backwards compatibility)
      const { data: defaultBusiness } = await supabase
        .from('businesses')
        .select('id, name')
        .limit(1)
        .single();

      if (!defaultBusiness) {
        throw new Error(`No business configured for Twilio number: ${to}`);
      }

      console.log(`Using default business: ${defaultBusiness.name} (${defaultBusiness.id})`);
      smsConfig = {
        business_id: defaultBusiness.id,
        businesses: [defaultBusiness]
      } as typeof smsConfig;
    }

    const businessId = smsConfig!.business_id;
    const businessName = (smsConfig!.businesses as any)?.[0]?.name || (smsConfig!.businesses as any)?.name || 'Unknown Business';
    console.log(`SMS for business: ${businessName} (${businessId})`);

    // STEP 2: Find or create contact using proper deduplication
    const contact = await findOrCreateContact(supabase, businessId, from);

    if (contact.isNew) {
      console.log(`New contact created from SMS: ${contact.id}`);
    } else {
      console.log(`Matched existing contact: ${contact.id}`);
    }

    // STEP 3: Find or create conversation thread (handle duplicates)
    let isNewThread = false;

    // Get ALL threads for this contact to handle duplicates
    const { data: existingThreads } = await supabase
      .from('conversation_threads')
      .select('id, status, created_at')
      .eq('contact_id', contact.id)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    let thread: { id: string } | null = null;

    if (existingThreads && existingThreads.length > 0) {
      // Use the most recent thread regardless of status
      thread = { id: existingThreads[0].id };
      console.log('📱 Using existing thread:', thread.id, '(found', existingThreads.length, 'total)');

      // Ensure the thread is active
      if (existingThreads[0].status !== 'active') {
        await supabase
          .from('conversation_threads')
          .update({ status: 'active', conversation_state: 'answering_questions' })
          .eq('id', thread.id);
        console.log('📱 Reactivated thread:', thread.id);
      }

      // Close any duplicate threads (keep only the most recent one active)
      if (existingThreads.length > 1) {
        const oldThreadIds = existingThreads.slice(1).map(t => t.id);
        await supabase
          .from('conversation_threads')
          .update({ status: 'closed' })
          .in('id', oldThreadIds);
        console.log('📱 Closed', oldThreadIds.length, 'duplicate threads');
      }
    } else {
      // No thread exists - create a new one
      isNewThread = true;
      console.log('📱 No existing thread found, creating new one');
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

    // Update contact's last_activity_date and set preferred channel if not set
    // If they're responding via SMS and we haven't set a preference yet, they prefer SMS
    await supabase
      .from('contacts')
      .update({
        last_activity_date: new Date().toISOString(),
        preferred_channel: contact.preferred_channel || 'sms'
      })
      .eq('id', contact.id);

    // Get FULL conversation history for context (no limit - AI needs full context)
    const { data: messageHistory, error: historyError } = await supabase
      .from('sms_messages')
      .select('direction, message, created_at')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true });

    if (historyError) {
      console.error('Failed to get message history:', historyError);
    }

    console.log('📱 Loaded conversation history:', messageHistory?.length || 0, 'messages');

    // Get business context
    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .single();

    // Load business knowledge base
    const { data: knowledgeBase } = await supabase
      .from('business_knowledge')
      .select('category, title, content')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    // Format knowledge for AI
    let knowledgeText = '';
    if (knowledgeBase && knowledgeBase.length > 0) {
      knowledgeText = knowledgeBase.map(k => `${k.title}: ${k.content}`).join('\n');
      console.log('📱 Loaded knowledge base:', knowledgeBase.length, 'entries');
    }

    // Load class schedule
    const { data: classes } = await supabase
      .from('class_schedule')
      .select('id, class_name, instructor, day_of_week, start_time, end_time')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    // Format schedule for AI (convert day_of_week number to day name)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let scheduleText = '';
    if (classes && classes.length > 0) {
      scheduleText = classes.map(c => {
        const day = dayNames[c.day_of_week];
        const startTime = c.start_time?.substring(0, 5) || '';
        const endTime = c.end_time?.substring(0, 5) || '';
        return `${day}: ${c.class_name} with ${c.instructor} (${startTime}-${endTime})`;
      }).join('\n');
      console.log('📱 Loaded class schedule:', classes.length, 'classes');
    }

    // Get current day of week for context (use Eastern Time for the business)
    const now = new Date();
    // Convert to Eastern Time to get the correct local day
    const easternTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const currentDay = easternTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentDayName = dayNames[currentDay];
    const currentHour = easternTime.getHours();
    const currentMinute = easternTime.getMinutes();

    console.log(`📱 Current time (Eastern): ${currentDayName} ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);

    // Filter today's classes
    const todaysClasses = classes?.filter(c => c.day_of_week === currentDay) || [];
    let todaysScheduleText = 'No classes scheduled today.';
    if (todaysClasses.length > 0) {
      todaysScheduleText = todaysClasses.map(c => {
        const startTime = c.start_time?.substring(0, 5) || '';
        const endTime = c.end_time?.substring(0, 5) || '';
        return `${c.class_name} with ${c.instructor} (${startTime}-${endTime})`;
      }).join('\n');
    }

    console.log('📱 Today is', currentDayName, '- classes today:', todaysClasses.length);

    // Prepare conversation for AI
    const conversationMessages = messageHistory?.map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.message
    })) || [];

    // Add the new message
    conversationMessages.push({
      role: 'user',
      content: body
    });

    // Also format as readable text for context
    const historyText = messageHistory?.map(msg => {
      const role = msg.direction === 'inbound' ? 'Customer' : 'You (AI)';
      return `${role}: ${msg.message}`;
    }).join('\n') || 'No previous messages';

    console.log('📱 Conversation history preview:', historyText.substring(0, 300));

    // Get contact name if available
    const contactName = contact.first_name && contact.first_name !== 'SMS Contact'
      ? `${contact.first_name} ${contact.last_name || ''}`.trim()
      : null;

    // Call AI service with full context and business knowledge
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

    const aiResult = await aiResponse.json();
    let responseMessage = aiResult.message || 'Thanks for your message! Someone will get back to you soon.';

    // Handle class booking if AI detected intent
    if (aiResult.shouldBook && aiResult.classDetails) {
      console.log('Processing booking:', aiResult.classDetails);

      // Use classScheduleId if provided, otherwise find by name
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
        // Calculate the next occurrence of this class (use Eastern Time)
        const nowUtc = new Date();
        const easternNow = new Date(nowUtc.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const targetDay = aiResult.classDetails.dayOfWeek ?? targetClass.day_of_week;
        let daysUntilClass = (targetDay - easternNow.getDay() + 7) % 7;
        // If it's today but the class time has passed, schedule for next week
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

        if (bookingError) {
          console.error('Booking failed:', bookingError);
          // Don't override AI response, just log the error
        } else {
          console.log(`Booking created: ${targetClass.class_name} on ${classDate.toDateString()}`);

          // Update contact pipeline stage to 'qualified'
          await supabase
            .from('contacts')
            .update({
              pipeline_stage: 'qualified',
              status: 'qualified'
            })
            .eq('id', contact.id);

          // Get the booking ID for notification
          const { data: newBooking } = await supabase
            .from('class_bookings')
            .select('id')
            .eq('contact_id', contact.id)
            .eq('class_schedule_id', targetClass.id)
            .eq('booking_date', classDate.toISOString().split('T')[0])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Send booking notification email
          if (newBooking?.id) {
            try {
              // Build conversation summary from recent messages
              const conversationSummary = messageHistory
                ?.filter((msg: any) => msg.direction === 'inbound')
                .map((msg: any) => msg.message)
                .slice(-3)
                .join(' | ') || '';

              await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-booking-notification`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  booking_id: newBooking.id,
                  conversation_summary: conversationSummary
                })
              });
              console.log('Booking notification triggered');
            } catch (notifyError) {
              console.error('Failed to send booking notification:', notifyError);
              // Don't fail the booking if notification fails
            }
          }

          await supabase
            .from('automation_logs')
            .insert({
              business_id: businessId,
              automation_type: 'class_booking',
              status: 'success',
              processed_data: {
                contact_id: contact.id,
                class_name: targetClass.class_name,
                class_date: classDate.toISOString().split('T')[0],
                class_time: targetClass.start_time,
                instructor: targetClass.instructor
              }
            });
        }
      } else {
        console.log('Could not find matching class for booking:', aiResult.classDetails);
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

    // Send SMS via Twilio API directly (more reliable than TwiML)
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || Deno.env.get('TWILIO_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioFromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (accountSid && authToken && twilioFromNumber) {
      console.log('Sending SMS via Twilio API...');

      const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: twilioFromNumber,
          To: from, // Send back to the original sender
          Body: responseMessage
        })
      });

      if (!twilioResponse.ok) {
        const errorData = await twilioResponse.text();
        console.error('Twilio API error:', errorData);
      } else {
        const twilioResult = await twilioResponse.json();
        console.log('SMS sent successfully, SID:', twilioResult.sid);
      }
    } else {
      console.warn('Twilio credentials not configured, cannot send SMS');
    }

    // STEP 7: Send email greeting for new threads if contact has email
    if (isNewThread && contact.email) {
      console.log('New thread with email contact, sending email greeting...');

      try {
        // Get agent config with email greeting template
        const { data: agentConfig } = await supabase
          .from('agent_config')
          .select('email_greeting_subject, email_greeting_body, from_email, from_name')
          .eq('business_id', businessId)
          .single();

        if (agentConfig?.email_greeting_body && agentConfig?.from_email) {
          // Personalize the email content
          const personalizedHtml = agentConfig.email_greeting_body
            .replace(/\{\{first_name\}\}/gi, contact.first_name || 'there')
            .replace(/\{\{last_name\}\}/gi, contact.last_name || '')
            .replace(/\{\{email\}\}/gi, contact.email || '');

          const personalizedSubject = (agentConfig.email_greeting_subject || 'Thanks for reaching out!')
            .replace(/\{\{first_name\}\}/gi, contact.first_name || 'there');

          // Send email via the send-email function
          const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              to: contact.email,
              subject: personalizedSubject,
              html: personalizedHtml,
              from_email: agentConfig.from_email,
              from_name: agentConfig.from_name || businessName,
              contact_id: contact.id
            })
          });

          if (emailResponse.ok) {
            console.log('Email greeting sent successfully to:', contact.email);
          } else {
            const emailError = await emailResponse.text();
            console.error('Failed to send email greeting:', emailError);
          }
        } else {
          console.log('No email greeting template configured for business');
        }
      } catch (emailErr: any) {
        console.error('Error sending email greeting:', emailErr.message);
        // Don't fail the whole request if email fails
      }
    }

    // Return empty TwiML (just acknowledge receipt, we already sent the message via API)
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

    return new Response(twimlResponse, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml; charset=utf-8'
      }
    });

  } catch (error: any) {
    console.error('SMS webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
