import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Find or create contact by phone number
    let { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, business_id')
      .eq('phone', from)
      .single();

    if (contactError && contactError.code === 'PGRST116') {
      // Contact not found, create new one
      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert({
          phone: from,
          source: 'sms_inbound',
          status: 'new_lead',
          first_name: 'SMS User'
        })
        .select('id, business_id')
        .single();

      if (createError) {
        throw new Error(`Failed to create contact: ${createError.message}`);
      }
      contact = newContact;
    } else if (contactError) {
      throw new Error(`Contact lookup error: ${contactError.message}`);
    }

    // Find or create conversation thread
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
          business_id: contact.business_id,
          status: 'active'
        })
        .select('id')
        .single();

      if (createThreadError) {
        throw new Error(`Failed to create thread: ${createThreadError.message}`);
      }
      thread = newThread;
    }

    // Store incoming message
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
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', contact.business_id)
      .single();

    const { data: classes, error: classError } = await supabase
      .from('class_schedule')
      .select('*')
      .eq('business_id', contact.business_id)
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

    // Call AI service
    const aiResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-response`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: conversationMessages,
        businessContext: business?.name || 'Fight Flow Academy',
        classSchedule: classes || []
      })
    });

    const aiResult = await aiResponse.json();
    let responseMessage = aiResult.message || 'Thanks for your message! Someone will get back to you soon.';

    // Handle class booking if AI detected intent
    if (aiResult.shouldBook && aiResult.classDetails) {
      // Find the specific class in schedule
      const targetClass = classes?.find(cls => 
        cls.class_name.toLowerCase().includes(aiResult.classDetails.className.toLowerCase())
      );
      
      if (targetClass) {
        // Calculate next occurrence of this class day
        const today = new Date();
        const targetDay = targetClass.day_of_week;
        const daysUntilClass = (targetDay - today.getDay() + 7) % 7 || 7;
        const classDate = new Date(today);
        classDate.setDate(today.getDate() + daysUntilClass);
        
        // Book the class
        const { error: bookingError } = await supabase
          .from('class_bookings')
          .insert({
            contact_id: contact.id,
            class_schedule_id: targetClass.id,
            booking_date: classDate.toISOString().split('T')[0], // YYYY-MM-DD format
            status: 'confirmed',
            notes: `Booked via AI SMS assistant`
          });
        
        if (bookingError) {
          console.error('Booking failed:', bookingError);
          // Update the response message to indicate booking issue
          responseMessage = `I'd love to book that class for you, but there was a technical issue. Please call us at (555) 123-4567 to complete your booking.`;
        } else {
          // Log successful booking
          await supabase
            .from('automation_logs')
            .insert({
              business_id: contact.business_id,
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

    // Replace the TwiML response with AI-generated message
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

  } catch (error) {
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