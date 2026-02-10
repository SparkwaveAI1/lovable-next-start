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

// Resend webhook payload structure
interface ResendWebhookPayload {
  type: string;
  data: {
    from: string;
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    headers?: Record<string, string>;
  };
}

// Also support direct email format for backwards compatibility
interface DirectEmailPayload {
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  body?: string;
  content?: string;
  plain?: string;
}

/**
 * Parse plus-addressed email to extract business ID
 * Format: sparkwave+{business_id}@reply.sparkwave-ai.com
 * Returns null if no plus-tag found (will default to Sparkwave)
 */
function parseBusinessIdFromPlusAddress(toAddress: string): string | null {
  if (!toAddress) return null;
  
  // Match sparkwave+{business_id}@reply.sparkwave-ai.com
  const plusMatch = toAddress.match(/sparkwave\+([a-f0-9-]+)@reply\.sparkwave-ai\.com/i);
  
  if (plusMatch && plusMatch[1]) {
    console.log('📧 Extracted business_id from plus-address:', plusMatch[1]);
    return plusMatch[1];
  }
  
  return null;
}

// Default Sparkwave business ID for emails without plus-addressing
const SPARKWAVE_DEFAULT_BUSINESS_ID = '5a9bbfcf-fae5-4063-9780-bcbe366bae88';

/**
 * Extract just the new reply content, removing quoted original messages
 */
function extractReplyContent(fullBody: string): string {
  if (!fullBody) return '';

  // Common reply separators
  const separators = [
    /On .+ wrote:/i,
    /^From:/im,
    /^Sent:/im,
    /-----Original Message-----/i,
    /________________________________/,
    /^>/m  // Quoted lines starting with >
  ];

  let content = fullBody;
  for (const separator of separators) {
    const match = content.search(separator);
    if (match > 0) {
      content = content.substring(0, match);
      break;
    }
  }

  return content.trim();
}

/**
 * Strip HTML tags and decode entities
 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
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

    // Parse the raw payload first for debugging
    const rawPayload = await req.json();
    console.log('📧 Raw payload:', JSON.stringify(rawPayload, null, 2));

    // Handle Resend's webhook format: { type: "email.received", data: { from, to, subject, text } }
    // Also handle direct format for backwards compatibility: { from, to, subject, text }
    let emailData: DirectEmailPayload;

    if (rawPayload.type && rawPayload.data) {
      // Resend webhook format
      console.log('Detected Resend webhook format, type:', rawPayload.type);
      emailData = rawPayload.data;
    } else if (rawPayload.from) {
      // Direct format (backwards compatible)
      console.log('Detected direct email format');
      emailData = rawPayload;
    } else {
      console.error('Unknown payload format:', Object.keys(rawPayload));
      return new Response(
        JSON.stringify({ error: 'Unknown payload format', keys: Object.keys(rawPayload) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle 'to' being an array (Resend sends it as array)
    const toAddress = Array.isArray(emailData.to) ? emailData.to[0] : emailData.to;

    console.log('From:', emailData.from);
    console.log('To:', toAddress);
    console.log('Subject:', emailData.subject);

    // Detailed logging for ALL fields - helps debug where Resend puts the body
    console.log('📧 Full emailData object:', JSON.stringify(emailData, null, 2));
    console.log('📧 All emailData keys:', Object.keys(emailData));

    // Resend inbound webhooks only send metadata, NOT the email body
    // We need to fetch the full email content using the email_id
    const emailId = (emailData as any).email_id || (emailData as any).id || (rawPayload.data as any)?.email_id;
    console.log('📧 Email ID from webhook:', emailId);

    let fetchedEmailBody = '';

    if (emailId) {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');

      if (!resendApiKey) {
        console.error('📧 RESEND_API_KEY not configured - cannot fetch email body');
      } else {
        // Try the receiving endpoint first (for inbound emails)
        console.log('📧 Fetching full email content from Resend API...');

        let emailContentResponse = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
          },
        });

        // If receiving endpoint fails, try the regular emails endpoint
        if (!emailContentResponse.ok) {
          console.log('📧 Receiving endpoint failed, trying regular emails endpoint...');
          emailContentResponse = await fetch(`https://api.resend.com/emails/${emailId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
            },
          });
        }

        if (!emailContentResponse.ok) {
          console.error('📧 Failed to fetch email content from Resend:', emailContentResponse.status, await emailContentResponse.text());
        } else {
          const emailContent = await emailContentResponse.json();
          console.log('📧 Full email content from API:', JSON.stringify(emailContent, null, 2));

          // Extract the body from the API response
          fetchedEmailBody = emailContent.text || emailContent.html || emailContent.body || emailContent.content || '';
          console.log('📧 Fetched email body length:', fetchedEmailBody.length);
          console.log('📧 Fetched email body preview:', fetchedEmailBody.substring(0, 300));
        }
      }
    } else {
      console.log('📧 No email_id in webhook - checking inline body fields');
    }

    // Check each possible body field in the webhook payload as fallback
    const possibleBodyFields = ['text', 'html', 'body', 'content', 'plain', 'plainText', 'textBody', 'htmlBody', 'rawBody'];
    for (const field of possibleBodyFields) {
      const value = (emailData as any)[field];
      if (value) {
        console.log(`📧 Found body in webhook "${field}" field, length: ${value.length}, preview: ${String(value).substring(0, 150)}`);
      }
    }

    // Validate required fields
    if (!emailData.from) {
      console.error('Missing from field in payload');
      return new Response(
        JSON.stringify({ error: 'Missing from field' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract sender email address (handle "Name <email@domain.com>" format)
    const fromMatch = emailData.from.match(/<([^>]+)>/) || [null, emailData.from];
    const senderEmail = fromMatch[1]?.toLowerCase().trim();

    if (!senderEmail) {
      console.error('Could not extract sender email');
      return new Response(
        JSON.stringify({ error: 'Invalid sender' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sender email:', senderEmail);

    // Extract the raw "to" email for lookup
    const toEmailMatch = toAddress?.match(/<([^>]+)>/) || [null, toAddress];
    const toEmail = toEmailMatch[1]?.toLowerCase().trim() || toAddress?.toLowerCase().trim();
    console.log('📧 Looking up business for to address:', toEmail);

    let businessId: string | null = null;
    let businessName: string = 'the business';

    // PRIORITY 1: Parse plus-address for business routing (multi-tenant support)
    // Format: sparkwave+{business_id}@reply.sparkwave-ai.com
    const plusAddressBusinessId = parseBusinessIdFromPlusAddress(toEmail || '');
    
    if (plusAddressBusinessId) {
      // Validate the business ID exists
      const { data: businessFromPlus } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('id', plusAddressBusinessId)
        .single();
      
      if (businessFromPlus) {
        businessId = businessFromPlus.id;
        businessName = businessFromPlus.name;
        console.log('📧 ✅ Routed via plus-address to business:', businessId, businessName);
      } else {
        console.log('📧 ⚠️ Plus-address business ID not found in database:', plusAddressBusinessId);
      }
    }
    
    // PRIORITY 2: Try agent_config lookup by from_email (legacy method)
    if (!businessId) {
      const { data: agentConfigMatch } = await supabase
        .from('agent_config')
        .select('business_id, businesses(name)')
        .ilike('from_email', toEmail || '')
        .single();

      if (agentConfigMatch) {
        businessId = agentConfigMatch.business_id;
        businessName = (agentConfigMatch.businesses as any)?.name || 'the business';
        console.log('📧 Found business from agent_config:', businessId, businessName);
      }
    }
    
    // PRIORITY 3: Default to Sparkwave (NOT Fight Flow or first business)
    // This ensures stray emails go to Sparkwave, not Fight Flow
    if (!businessId) {
      businessId = SPARKWAVE_DEFAULT_BUSINESS_ID;
      const { data: sparkwaveBusiness } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', businessId)
        .single();
      
      businessName = sparkwaveBusiness?.name || 'Sparkwave AI';
      console.log('📧 No routing match found - defaulting to Sparkwave:', businessId, businessName);
    }

    if (!businessId) {
      console.error('Could not determine business for inbound email');
      // Log the failed attempt
      await supabase.from('automation_logs').insert({
        automation_type: 'email_inbound_failed',
        status: 'error',
        error_message: 'Could not determine business from to address',
        processed_data: {
          from_email: senderEmail,
          to_email: toEmail,
          subject: emailData.subject
        }
      });
      return new Response(
        JSON.stringify({ error: 'Could not determine business' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the contact by email (case-insensitive)
    let { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, business_id, first_name, last_name, email, phone, preferred_channel')
      .eq('business_id', businessId)
      .ilike('email', senderEmail)
      .single();

    // If contact not found, create a new one
    if (contactError || !contact) {
      console.log('Contact not found for email:', senderEmail, '- creating new contact');

      // Extract name from the "from" field if available (e.g., "John Doe <john@example.com>")
      const nameMatch = emailData.from.match(/^([^<]+)</);
      const fromName = nameMatch ? nameMatch[1].trim() : '';
      const nameParts = fromName.split(' ');
      const firstName = nameParts[0] || 'Email';
      const lastName = nameParts.slice(1).join(' ') || 'Lead';

      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert({
          email: senderEmail,
          first_name: firstName,
          last_name: lastName,
          source: 'email_inbound',
          status: 'new_lead',
          business_id: businessId,
          preferred_channel: 'email',
          last_activity_date: new Date().toISOString()
        })
        .select('id, business_id, first_name, last_name, email, phone, preferred_channel')
        .single();

      if (createError) {
        console.error('Failed to create contact:', createError);
        // Log the error but continue to process the email
        await supabase.from('automation_logs').insert({
          business_id: businessId,
          automation_type: 'email_inbound_contact_creation_failed',
          status: 'error',
          error_message: createError.message,
          processed_data: {
            from_email: senderEmail,
            subject: emailData.subject
          }
        });
      } else {
        contact = newContact;
        console.log('Created new contact:', contact.id, contact.first_name, contact.last_name);
      }
    } else {
      console.log('Found existing contact:', contact.id, contact.first_name, contact.last_name);
    }

    // If we still don't have a contact, we can't continue with the conversation
    if (!contact) {
      console.error('Could not find or create contact, logging email anyway');
      await supabase.from('automation_logs').insert({
        business_id: businessId,
        automation_type: 'email_inbound_no_contact',
        status: 'error',
        error_message: 'Could not find or create contact',
        processed_data: {
          from_email: senderEmail,
          to_email: toEmail,
          subject: emailData.subject,
          text_preview: (emailData.text || '').substring(0, 200)
        }
      });
      return new Response(
        JSON.stringify({ received: true, logged: true, contact_created: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update preferred channel to email and last activity (they responded via email)
    await supabase
      .from('contacts')
      .update({
        preferred_channel: 'email',
        last_activity_date: new Date().toISOString()
      })
      .eq('id', contact.id);
    console.log('Updated contact activity and preferred channel');

    // Find existing thread for this contact - get ALL threads to handle duplicates
    const { data: existingThreads } = await supabase
      .from('conversation_threads')
      .select('id, status, created_at')
      .eq('contact_id', contact.id)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    let threadId: string;

    if (existingThreads && existingThreads.length > 0) {
      // Use the most recent thread regardless of status
      threadId = existingThreads[0].id;
      console.log('📧 Using existing thread:', threadId, '(found', existingThreads.length, 'total)');

      // Ensure the thread is active
      if (existingThreads[0].status !== 'active') {
        await supabase
          .from('conversation_threads')
          .update({ status: 'active', conversation_state: 'answering_questions' })
          .eq('id', threadId);
        console.log('📧 Reactivated thread:', threadId);
      }

      // Close any duplicate threads (keep only the most recent one active)
      if (existingThreads.length > 1) {
        const oldThreadIds = existingThreads.slice(1).map(t => t.id);
        await supabase
          .from('conversation_threads')
          .update({ status: 'closed' })
          .in('id', oldThreadIds);
        console.log('📧 Closed', oldThreadIds.length, 'duplicate threads');
      }
    } else {
      // No thread exists - create a new one
      console.log('📧 No existing thread found, creating new one');
      const { data: newThread, error: createError } = await supabase
        .from('conversation_threads')
        .insert({
          contact_id: contact.id,
          business_id: businessId,
          status: 'active',
          conversation_state: 'answering_questions'
        })
        .select('id')
        .single();

      if (createError || !newThread) {
        console.error('Failed to create thread:', createError);
        throw createError || new Error('Failed to create thread');
      }
      threadId = newThread.id;
      console.log('📧 Created new thread:', threadId);
    }

    // Use fetched email body first (from Resend API), then fall back to webhook fields
    const ed = emailData as any;
    let rawEmailBody = '';
    let bodySource = 'none';

    // Priority 1: Body fetched from Resend API
    if (fetchedEmailBody && fetchedEmailBody.length > 0) {
      rawEmailBody = fetchedEmailBody;
      bodySource = 'resend_api';
      console.log('📧 Using body from Resend API fetch');
    }
    // Priority 2: Check webhook payload fields as fallback
    else {
      rawEmailBody = emailData.text ||
                     ed.plain ||
                     ed.plainText ||
                     ed.text_body ||
                     ed.textBody ||
                     ed.body ||
                     ed.content ||
                     ed.message ||
                     emailData.html ||
                     ed.html_body ||
                     ed.htmlBody ||
                     '';

      if (emailData.text) bodySource = 'webhook_text';
      else if (ed.plain) bodySource = 'webhook_plain';
      else if (ed.plainText) bodySource = 'webhook_plainText';
      else if (ed.text_body) bodySource = 'webhook_text_body';
      else if (ed.textBody) bodySource = 'webhook_textBody';
      else if (ed.body) bodySource = 'webhook_body';
      else if (ed.content) bodySource = 'webhook_content';
      else if (ed.message) bodySource = 'webhook_message';
      else if (emailData.html) bodySource = 'webhook_html';
      else if (ed.html_body) bodySource = 'webhook_html_body';
      else if (ed.htmlBody) bodySource = 'webhook_htmlBody';
    }

    console.log('📧 Final body length:', rawEmailBody.length);
    console.log('📧 Body source:', bodySource);
    console.log('📧 Body preview:', rawEmailBody.substring(0, 300));

    // Strip HTML tags if we got HTML content
    let plainTextBody = rawEmailBody;
    if (rawEmailBody.includes('<') && rawEmailBody.includes('>')) {
      plainTextBody = stripHtml(rawEmailBody);
      console.log('📧 Stripped HTML, new length:', plainTextBody.length);
    }

    // Extract just the reply (not the quoted original message)
    let replyText = extractReplyContent(plainTextBody);
    console.log('📧 After extracting reply, length:', replyText.length);
    console.log('📧 Reply content preview:', replyText.substring(0, 200));

    // If body is still empty, use the subject line as context
    if (!replyText || replyText.trim().length === 0) {
      if (emailData.subject) {
        console.log('📧 No body content, using subject as message:', emailData.subject);
        replyText = `Subject: ${emailData.subject}`;
      } else {
        console.log('📧 No reply content and no subject, using generic message');
        replyText = 'I have a question about your services.';
      }
    }

    console.log('📧 Final reply text:', replyText.substring(0, 100) + (replyText.length > 100 ? '...' : ''));

    // Store the inbound message
    await supabase.from('sms_messages').insert({
      thread_id: threadId,
      contact_id: contact.id,
      direction: 'inbound',
      message: replyText,
      ai_response: false
    });

    // Get FULL conversation history (no limit - AI needs full context)
    const { data: messageHistory } = await supabase
      .from('sms_messages')
      .select('direction, message, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    console.log('📧 Loaded conversation history:', messageHistory?.length || 0, 'messages');

    // Prepare conversation for AI (as message array)
    const conversationMessages = messageHistory?.map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.message
    })) || [];

    // Also format as readable text for context
    const historyText = messageHistory?.map(msg => {
      const role = msg.direction === 'inbound' ? 'Customer' : 'You (AI)';
      return `${role}: ${msg.message}`;
    }).join('\n') || 'No previous messages';

    console.log('📧 Conversation history preview:', historyText.substring(0, 300));

    // Get contact name
    const contactName = contact.first_name && contact.first_name !== 'Unknown' && contact.first_name !== 'Email'
      ? `${contact.first_name} ${contact.last_name || ''}`.trim()
      : null;

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
      console.log('📧 Loaded knowledge base:', knowledgeBase.length, 'entries');
    }

    // Load class schedule
    const { data: classSchedule } = await supabase
      .from('class_schedule')
      .select('id, class_name, instructor, day_of_week, start_time, end_time')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    // Format schedule for AI (convert day_of_week number to day name)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let scheduleText = '';
    if (classSchedule && classSchedule.length > 0) {
      scheduleText = classSchedule.map(c => {
        const day = dayNames[c.day_of_week];
        const startTime = c.start_time?.substring(0, 5) || ''; // "16:30:00" -> "16:30"
        const endTime = c.end_time?.substring(0, 5) || '';
        return `${day}: ${c.class_name} with ${c.instructor} (${startTime}-${endTime})`;
      }).join('\n');
      console.log('📧 Loaded class schedule:', classSchedule.length, 'classes');
    }

    // Get current day of week for context (use Eastern Time for the business)
    const now = new Date();
    // Convert to Eastern Time to get the correct local day
    const easternTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const currentDay = easternTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentDayName = dayNames[currentDay];
    const currentHour = easternTime.getHours();
    const currentMinute = easternTime.getMinutes();

    console.log(`📧 Current time (Eastern): ${currentDayName} ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);

    // Filter today's classes
    const todaysClasses = classSchedule?.filter(c => c.day_of_week === currentDay) || [];
    let todaysScheduleText = 'No classes scheduled today.';
    if (todaysClasses.length > 0) {
      todaysScheduleText = todaysClasses.map(c => {
        const startTime = c.start_time?.substring(0, 5) || '';
        const endTime = c.end_time?.substring(0, 5) || '';
        return `${c.class_name} with ${c.instructor} (${startTime}-${endTime})`;
      }).join('\n');
    }

    console.log('📧 Today is', currentDayName, '- classes today:', todaysClasses.length);

    // Call AI for response with full conversation context and business knowledge
    const aiResponse = await fetch(`${supabaseUrl}/functions/v1/ai-response`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: conversationMessages,
        businessId: businessId,
        businessContext: businessName,
        contactName: contactName,
        conversationHistory: historyText,
        classSchedule: classSchedule || [],
        knowledgeBase: knowledgeText,
        scheduleText: scheduleText,
        todaysSchedule: todaysScheduleText,
        currentDay: currentDayName,
        threadId: threadId
      })
    });

    const aiResult = await aiResponse.json();
    const responseMessage = aiResult.message || 'Thanks for your reply! Someone will get back to you soon.';

    console.log('AI response:', responseMessage);

    // Store outbound response
    await supabase.from('sms_messages').insert({
      thread_id: threadId,
      contact_id: contact.id,
      direction: 'outbound',
      message: responseMessage,
      ai_response: true
    });

    // Get agent config for email settings
    const { data: agentConfig } = await supabase
      .from('agent_config')
      .select('from_email, from_name')
      .eq('business_id', businessId)
      .single();

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

    // Generate plus-addressed reply-to for proper routing on future replies
    const plusAddressedReplyTo = `sparkwave+${businessId}@reply.sparkwave-ai.com`;
    console.log('📧 Sending response with plus-addressed reply-to:', plusAddressedReplyTo);
    
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: senderEmail,
        subject: `Re: ${emailData.subject || 'Your inquiry'}`,
        html: emailHtml,
        from_email: fromEmail,
        from_name: fromName,
        contact_id: contact.id,
        business_id: businessId,
        reply_to: plusAddressedReplyTo
      })
    });

    if (emailResponse.ok) {
      console.log('Email response sent successfully');
    } else {
      console.error('Failed to send email response:', await emailResponse.text());
    }

    // Log the interaction
    await supabase.from('automation_logs').insert({
      business_id: businessId,
      automation_type: 'email_reply_processed',
      status: 'success',
      processed_data: {
        contact_id: contact.id,
        thread_id: threadId,
        from_email: senderEmail,
        reply_preview: replyText.substring(0, 100),
        contact_was_new: contact.source === 'email_inbound'
      }
    });

    // Also insert into email_replies table for dedicated reply tracking
    const { error: replyInsertError } = await supabase.from('email_replies').insert({
      from_email: senderEmail,
      from_name: emailData.from,
      to_email: toEmail,
      subject: emailData.subject,
      body_text: replyText,
      body_html: rawEmailBody.includes('<') ? rawEmailBody : null,
      contact_id: contact.id,
      status: 'new',
      notified: false,
      raw_payload: rawPayload
    });

    if (replyInsertError) {
      console.error('📧 Failed to insert into email_replies:', replyInsertError.message);
    } else {
      console.log('📧 ✅ Logged to email_replies table');
    }

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
