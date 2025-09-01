import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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
    // Parse SMS webhook data from GoHighLevel
    const smsData = await req.json();
    console.log('SMS webhook received:', JSON.stringify(smsData, null, 2));

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract SMS details (adjust field names based on GHL webhook format)
    const fromPhone = smsData.from || smsData.phone;
    const toPhone = smsData.to || smsData.businessPhone;
    const messageContent = smsData.message || smsData.body;
    const conversationId = `${fromPhone}_${toPhone}`;

    // Look up business ID from the webhook endpoint
    const urlPath = new URL(req.url).pathname;
    const endpointSlug = urlPath.split('/').pop();
    
    const { data: webhookEndpoint } = await supabase
      .from('webhook_endpoints')
      .select('business_id')
      .eq('endpoint_slug', endpointSlug)
      .single();

    const businessId = webhookEndpoint?.business_id || null;

    if (!businessId) {
      console.error('No business found for endpoint:', endpointSlug);
      return new Response(
        JSON.stringify({ success: false, error: 'Business not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update or create conversation state
    const { data: existingConversation } = await supabase
      .from('conversation_state')
      .select('*')
      .eq('contact_phone', fromPhone)
      .eq('business_id', businessId)
      .single();

    if (existingConversation) {
      // Update existing conversation
      await supabase
        .from('conversation_state')
        .update({
          last_message_at: new Date().toISOString(),
          conversation_context: {
            ...existingConversation.conversation_context,
            last_inbound_message: messageContent
          }
        })
        .eq('id', existingConversation.id);
    } else {
      // Create new conversation
      await supabase
        .from('conversation_state')
        .insert({
          contact_phone: fromPhone,
          business_id: businessId,
          conversation_context: {
            initial_message: messageContent,
            last_inbound_message: messageContent
          },
          status: 'active'
        });
    }

    // Log the SMS in automation_logs
    const { error: logError } = await supabase
      .from('automation_logs')
      .insert({
        business_id: businessId,
        automation_type: 'sms_conversation',
        status: 'success',
        source_data: smsData,
        processed_data: {
          from: fromPhone,
          to: toPhone,
          message: messageContent,
          direction: 'inbound'
        },
        conversation_id: conversationId,
        sms_from: fromPhone,
        sms_to: toPhone,
        sms_direction: 'inbound'
      });

    if (logError) {
      console.error('Failed to log SMS:', logError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to log SMS' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('SMS successfully processed and logged');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'SMS received and logged',
        conversationId: conversationId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SMS webhook error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});