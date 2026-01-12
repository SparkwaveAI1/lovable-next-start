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
): Promise<{ id: string; business_id: string; isNew: boolean }> {

  const normalizedPhone = normalizePhoneNumber(phone);
  console.log(`Looking up contact: phone=${normalizedPhone}, businessId=${businessId}`);

  // Try to find existing contact by phone within this business
  const { data: existingContact, error: lookupError } = await supabase
    .from('contacts')
    .select('id, business_id, first_name, last_name, email, phone')
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
      .select('id, business_id, first_name, last_name, email, phone')
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
        businesses: defaultBusiness
      };
    }

    const businessId = smsConfig.business_id;
    const businessName = (smsConfig.businesses as any)?.name || 'Unknown Business';
    console.log(`SMS for business: ${businessName} (${businessId})`);

    // STEP 2: Find or create contact using proper deduplication
    const contact = await findOrCreateContact(supabase, businessId, from);

    if (contact.isNew) {
      console.log(`New contact created from SMS: ${contact.id}`);
    } else {
      console.log(`Matched existing contact: ${contact.id}`);
    }

    // STEP 3: Find or create conversation thread
    let { data: thread, error: threadError } = await supabase
      .from('conversation_threads')
      .select('id')
      .eq('contact_id', contact.id)
      .eq('status', 'active')
      .single();

    if (threadError && threadError.code === 'PGRST116') {
      // Create new thread
      const { data: newThread, error: createThreadError } = await supabase
        .from('conversation_threads')
        .insert({
          contact_id: contact.id,
          business_id: businessId,
          status: 'active'
        })
        .select('id')
        .single();

      if (createThreadError) {
        throw new Error(`Failed to create thread: ${createThreadError.message}`);
      }
      thread = newThread;
    } else if (threadError) {
      throw new Error(`Thread lookup error: ${threadError.message}`);
    }

    if (!thread) {
      throw new Error('Thread not found and could not be created');
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

    // Update contact's last_activity_date
    await supabase
      .from('contacts')
      .update({ last_activity_date: new Date().toISOString() })
      .eq('id', contact.id);

    // Get conversation history for context
    const { data: messageHistory, error: historyError } = await supabase
      .from('sms_messages')
      .select('direction, message')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true })
      .limit(10);

    if (historyError) {
      console.error('Failed to get message history:', historyError);
    }

    // Get business context and class schedule
    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .single();

    const { data: classes } = await supabase
      .from('class_schedule')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true);

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

    // Get contact name if available
    const contactName = contact.first_name && contact.first_name !== 'SMS Contact'
      ? `${contact.first_name} ${contact.last_name || ''}`.trim()
      : null;

    // Call AI service with full context
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
        threadId: thread.id
      })
    });

    const aiResult = await aiResponse.json();
    let responseMessage = aiResult.message || 'Thanks for your message! Someone will get back to you soon.';

    // Handle class booking if AI detected intent
    if (aiResult.shouldBook && aiResult.classDetails) {
      const targetClass = classes?.find((cls: any) =>
        cls.class_name.toLowerCase().includes(aiResult.classDetails.className.toLowerCase())
      );

      if (targetClass) {
        const today = new Date();
        const targetDay = targetClass.day_of_week;
        const daysUntilClass = (targetDay - today.getDay() + 7) % 7 || 7;
        const classDate = new Date(today);
        classDate.setDate(today.getDate() + daysUntilClass);

        const { error: bookingError } = await supabase
          .from('class_bookings')
          .insert({
            contact_id: contact.id,
            class_schedule_id: targetClass.id,
            booking_date: classDate.toISOString().split('T')[0],
            status: 'confirmed',
            notes: `Booked via AI SMS assistant`
          });

        if (bookingError) {
          console.error('Booking failed:', bookingError);
          responseMessage = `I'd love to book that class for you, but there was a technical issue. Please call us to complete your booking.`;
        } else {
          await supabase
            .from('automation_logs')
            .insert({
              business_id: businessId,
              automation_type: 'class_booking',
              status: 'success',
              error_message: `Class booked: ${targetClass.class_name} on ${classDate.toDateString()}`
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

    // Return TwiML response
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>${responseMessage}</Message>
      </Response>`;

    return new Response(twimlResponse, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml'
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
