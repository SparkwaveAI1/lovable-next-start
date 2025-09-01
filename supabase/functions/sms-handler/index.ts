import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SMS sending function
async function sendSMSResponse(toPhone: string, message: string, businessId: string, supabase: any) {
  try {
    console.log(`Attempting to send SMS to ${toPhone}: "${message}"`);
    
    // Get GHL configuration for this business
    const { data: ghlConfig } = await supabase
      .from('ghl_configurations')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .single();

    if (!ghlConfig) {
      throw new Error('No active GoHighLevel configuration found for this business');
    }

    const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    if (!ghlApiKey) {
      throw new Error('GoHighLevel API key not configured');
    }

    const response = await fetch('https://rest.gohighlevel.com/v1/conversations/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'SMS',
        contactId: '', // GHL will lookup contact by phone
        phone: toPhone,
        message: message,
        locationId: ghlConfig.location_id
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`GHL SMS API Error: ${result.message || 'Unknown error'}`);
    }

    console.log('SMS sent successfully:', result.id);
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return { success: false, error: error.message };
  }
}

// OpenAI conversation function
async function processWithOpenAI(messageContent: string, conversationContext: any, fromPhone: string) {
  const systemPrompt = `You are an AI assistant for Fight Flow Academy, a martial arts school and gym in Raleigh, NC. 

Your role:
- Answer questions about classes, pricing, schedules
- Book free trial classes when requested  
- Be friendly and helpful
- Keep responses concise for SMS (under 160 characters when possible)

Current context: This is an SMS conversation with a potential student.

If someone wants to book a trial class, respond with: "I'd love to schedule your free trial! What day works best for you this week?"

Previous conversation context: ${JSON.stringify(conversationContext)}`;

  try {
    console.log('Processing message with OpenAI:', messageContent);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: messageContent }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      return "Thanks for your message! We'll get back to you soon.";
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || "Thanks for your message! We'll get back to you soon.";
    
    console.log('OpenAI response generated:', aiResponse);
    return aiResponse;
    
  } catch (error) {
    console.error('Error processing with OpenAI:', error);
    return "Thanks for your message! We'll get back to you soon.";
  }
}

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

    let conversationContext = {};
    if (existingConversation) {
      conversationContext = existingConversation.conversation_context || {};
    }

    // Process message with OpenAI
    console.log('Processing message with AI...');
    const aiResponse = await processWithOpenAI(messageContent, conversationContext, fromPhone);
    
    // Send AI response via SMS
    let smsResult = null;
    if (aiResponse) {
      console.log('Sending AI response via SMS...');
      smsResult = await sendSMSResponse(fromPhone, aiResponse, businessId, supabase);
      
      if (smsResult.success) {
        console.log('SMS response sent successfully');
      } else {
        console.error('Failed to send SMS response:', smsResult.error);
      }
    }
    
    // Update conversation context with new messages
    const updatedContext = {
      ...conversationContext,
      messages: [
        ...(conversationContext.messages || []),
        { role: 'user', content: messageContent, timestamp: new Date().toISOString() },
        { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() }
      ],
      last_inbound_message: messageContent,
      last_ai_response: aiResponse,
      last_sms_sent: smsResult?.success ? new Date().toISOString() : null
    };

    if (existingConversation) {
      // Update existing conversation
      await supabase
        .from('conversation_state')
        .update({
          last_message_at: new Date().toISOString(),
          conversation_context: updatedContext
        })
        .eq('id', existingConversation.id);
    } else {
      // Create new conversation
      await supabase
        .from('conversation_state')
        .insert({
          contact_phone: fromPhone,
          business_id: businessId,
          conversation_context: updatedContext,
          status: 'active'
        });
    }

    // Log the inbound SMS in automation_logs
    const inboundLogData = {
      business_id: businessId,
      automation_type: 'sms_conversation',
      status: 'success',
      source_data: smsData,
      processed_data: {
        from: fromPhone,
        to: toPhone,
        message: messageContent,
        direction: 'inbound',
        ai_response: aiResponse,
        ai_processing: 'completed'
      },
      conversation_id: conversationId,
      sms_from: fromPhone,
      sms_to: toPhone,
      sms_direction: 'inbound'
    };

    // Log outbound SMS if sent
    const outboundLogData = smsResult ? {
      business_id: businessId,
      automation_type: 'sms_conversation',
      status: smsResult.success ? 'success' : 'failed',
      source_data: { aiResponse },
      processed_data: {
        from: toPhone,
        to: fromPhone,
        message: aiResponse,
        direction: 'outbound',
        messageId: smsResult.messageId
      },
      conversation_id: conversationId,
      sms_from: toPhone,
      sms_to: fromPhone,
      sms_direction: 'outbound',
      error_message: smsResult.error || null
    } : null;

    // Insert both logs
    const logsToInsert = outboundLogData ? [inboundLogData, outboundLogData] : [inboundLogData];
    const { error: logError } = await supabase
      .from('automation_logs')
      .insert(logsToInsert);

    if (logError) {
      console.error('Failed to log SMS:', logError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to log SMS' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('SMS successfully processed with AI response');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'SMS received, processed with AI, and logged',
        conversationId: conversationId,
        aiResponse: aiResponse
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