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

    // For now, just respond with a simple acknowledgment
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>Thanks for your message! Our AI assistant will respond shortly.</Message>
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