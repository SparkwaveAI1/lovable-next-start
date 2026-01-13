import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Inbound Email Handler
 *
 * Receives inbound emails (replies) via Resend's inbound webhook
 * and routes them to the AI for response.
 *
 * Setup in Resend:
 * 1. Go to Resend Dashboard → Domains → Add Domain
 * 2. Set up MX records for receiving email
 * 3. Configure webhook URL: https://[project].supabase.co/functions/v1/email-inbound
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InboundEmail {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📧 Inbound email received');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse the inbound email
    const email: InboundEmail = await req.json();

    console.log('From:', email.from);
    console.log('To:', email.to);
    console.log('Subject:', email.subject);

    // Extract sender email address (handle "Name <email@domain.com>" format)
    const fromMatch = email.from.match(/<([^>]+)>/) || [null, email.from];
    const senderEmail = fromMatch[1]?.toLowerCase().trim();

    if (!senderEmail) {
      console.error('Could not extract sender email');
      return new Response(
        JSON.stringify({ error: 'Invalid sender' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sender email:', senderEmail);

    // Find the contact by email
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, business_id, first_name, last_name, email, phone, preferred_channel')
      .eq('email', senderEmail)
      .single();

    if (contactError || !contact) {
      console.log('Contact not found for email:', senderEmail);
      // Could create new contact here, but for now just acknowledge
      return new Response(
        JSON.stringify({ received: true, matched: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found contact:', contact.id, contact.first_name, contact.last_name);

    // Update preferred channel to email (they responded via email)
    if (!contact.preferred_channel) {
      await supabase
        .from('contacts')
        .update({
          preferred_channel: 'email',
          last_activity_date: new Date().toISOString()
        })
        .eq('id', contact.id);
      console.log('Set preferred channel to email');
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
      const { data: newThread, error: createError } = await supabase
        .from('conversation_threads')
        .insert({
          contact_id: contact.id,
          business_id: contact.business_id,
          status: 'active',
          conversation_state: 'answering_questions'
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Failed to create thread:', createError);
        throw createError;
      }
      thread = newThread;
      console.log('Created new thread:', thread.id);
    }

    if (!thread) {
      throw new Error('Could not find or create thread');
    }

    // Extract the reply text (strip quoted content)
    let replyText = email.text || '';

    // Remove common reply indicators and quoted content
    // Look for lines starting with > or "On ... wrote:"
    const lines = replyText.split('\n');
    const cleanLines: string[] = [];
    for (const line of lines) {
      // Stop at quoted content indicators
      if (line.match(/^>/) ||
          line.match(/^On .* wrote:$/i) ||
          line.match(/^-{3,}/) ||
          line.match(/^From:.*@/i)) {
        break;
      }
      cleanLines.push(line);
    }
    replyText = cleanLines.join('\n').trim();

    if (!replyText) {
      console.log('No reply content extracted');
      return new Response(
        JSON.stringify({ received: true, empty_reply: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Reply content:', replyText.substring(0, 100) + '...');

    // Store the inbound message
    await supabase.from('sms_messages').insert({
      thread_id: thread.id,
      contact_id: contact.id,
      direction: 'inbound',
      message: replyText,
      ai_response: false
    });

    // Get conversation history
    const { data: messageHistory } = await supabase
      .from('sms_messages')
      .select('direction, message')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true })
      .limit(10);

    // Get business info
    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', contact.business_id)
      .single();

    // Prepare conversation for AI
    const conversationMessages = messageHistory?.map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.message
    })) || [];

    // Get contact name
    const contactName = contact.first_name && contact.first_name !== 'Unknown'
      ? `${contact.first_name} ${contact.last_name || ''}`.trim()
      : null;

    // Call AI for response
    const aiResponse = await fetch(`${supabaseUrl}/functions/v1/ai-response`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: conversationMessages,
        businessId: contact.business_id,
        businessContext: business?.name || 'the business',
        contactName: contactName,
        classSchedule: [],
        threadId: thread.id
      })
    });

    const aiResult = await aiResponse.json();
    const responseMessage = aiResult.message || 'Thanks for your reply! Someone will get back to you soon.';

    console.log('AI response:', responseMessage);

    // Store outbound response
    await supabase.from('sms_messages').insert({
      thread_id: thread.id,
      contact_id: contact.id,
      direction: 'outbound',
      message: responseMessage,
      ai_response: true
    });

    // Get agent config for email settings
    const { data: agentConfig } = await supabase
      .from('agent_config')
      .select('from_email, from_name')
      .eq('business_id', contact.business_id)
      .single();

    const businessName = business?.name || 'the business';
    const fromEmail = agentConfig?.from_email || 'noreply@example.com';
    const fromName = agentConfig?.from_name || businessName;

    // Send email response
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <p>${responseMessage}</p>
        <p style="margin-top: 20px; color: #666; font-size: 12px;">
          You can also text us anytime!
        </p>
      </div>
    `;

    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: senderEmail,
        subject: `Re: ${email.subject}`,
        html: emailHtml,
        from_email: fromEmail,
        from_name: fromName,
        contact_id: contact.id
      })
    });

    if (emailResponse.ok) {
      console.log('Email response sent successfully');
    } else {
      console.error('Failed to send email response:', await emailResponse.text());
    }

    // Log the interaction
    await supabase.from('automation_logs').insert({
      business_id: contact.business_id,
      automation_type: 'email_reply_processed',
      status: 'success',
      processed_data: {
        contact_id: contact.id,
        thread_id: thread.id,
        from_email: senderEmail,
        reply_preview: replyText.substring(0, 100)
      }
    });

    return new Response(
      JSON.stringify({
        received: true,
        processed: true,
        contact_id: contact.id,
        response_sent: emailResponse.ok
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Inbound email error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
