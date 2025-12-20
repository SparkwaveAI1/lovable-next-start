import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Send Email Edge Function
 * 
 * Sends emails via Resend API. Supports both single emails and campaign batch sending.
 * 
 * Required Supabase Edge Function Secrets:
 * - RESEND_API_KEY: Your Resend API key
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  // For single email
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
  
  // For campaign sending
  campaign_id?: string;
  
  // For transactional emails
  template?: 'welcome' | 'password_reset' | 'notification';
  template_data?: Record<string, any>;
  business_id?: string;
  
  // For linking to contact
  contact_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📧 send-email function started');

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not configured');
      throw new Error('Email service not configured');
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: SendEmailRequest = await req.json();
    console.log('📧 Request type:', body.campaign_id ? 'campaign' : 'single');

    // Campaign sending mode
    if (body.campaign_id) {
      return await sendCampaign(body.campaign_id, supabase, resendApiKey);
    }

    // Single email mode
    if (!body.to || !body.subject || !body.html) {
      throw new Error('Missing required fields: to, subject, html');
    }

    const fromEmail = body.from_email || 'noreply@yourdomain.com';
    const fromName = body.from_name || 'Your Company';

    const emailPayload = {
      from: `${fromName} <${fromEmail}>`,
      to: [body.to],
      subject: body.subject,
      html: body.html,
      text: body.text,
      reply_to: body.reply_to,
    };

    console.log('📧 Sending single email to:', body.to);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Resend API error:', result);
      throw new Error(result.message || 'Failed to send email');
    }

    console.log('✅ Email sent successfully:', result.id);

    // If contact_id is provided, create email_sends record and update contact
    if (body.contact_id) {
      // Create email_sends record linked to contact
      await supabase.from('email_sends').insert({
        contact_id: body.contact_id,
        resend_id: result.id,
        status: 'sent',
        sent_at: new Date().toISOString(),
        campaign_id: null, // Direct email, not campaign
        subscriber_id: null, // Using contact_id instead
      });

      // Update contact's last_activity_date
      await supabase.from('contacts').update({
        last_activity_date: new Date().toISOString(),
      }).eq('id', body.contact_id);

      console.log('📧 Email linked to contact:', body.contact_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: result.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Error in send-email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Send a campaign to contacts based on targeting criteria
 */
async function sendCampaign(
  campaignId: string,
  supabase: any,
  resendApiKey: string
): Promise<Response> {
  console.log('📧 Starting campaign send:', campaignId);

  // Get campaign details
  const { data: campaign, error: campaignError } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    throw new Error('Campaign not found');
  }

  if (campaign.status === 'sent') {
    throw new Error('Campaign has already been sent');
  }

  if (campaign.status === 'sending') {
    throw new Error('Campaign is already being sent');
  }

  // Update campaign status to sending
  await supabase
    .from('email_campaigns')
    .update({ status: 'sending' })
    .eq('id', campaignId);

  try {
    // Get recipients using the database function
    const { data: recipients, error: recipientsError } = await supabase
      .rpc('get_campaign_recipients', { p_campaign_id: campaignId });

    if (recipientsError) {
      console.error('❌ Error fetching recipients:', recipientsError);
      throw new Error('Failed to fetch campaign recipients');
    }

    if (!recipients || recipients.length === 0) {
      // No recipients - mark as sent with 0 count
      await supabase
        .from('email_campaigns')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          total_recipients: 0,
          total_sent: 0,
        })
        .eq('id', campaignId);

      return new Response(
        JSON.stringify({
          success: true,
          campaign_id: campaignId,
          total_recipients: 0,
          sent: 0,
          errors: 0,
          message: 'No recipients matched the targeting criteria',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`📧 Sending to ${recipients.length} contacts`);

    // Update total recipients
    await supabase
      .from('email_campaigns')
      .update({ total_recipients: recipients.length })
      .eq('id', campaignId);

    let sentCount = 0;
    let errorCount = 0;

    // Send emails in batches of 10 to avoid rate limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (contact: any) => {
        try {
          // Personalize content
          const personalizedHtml = personalizeContent(
            campaign.content_html,
            contact
          );
          const personalizedText = campaign.content_text
            ? personalizeContent(campaign.content_text, contact)
            : undefined;
          const personalizedSubject = personalizeContent(
            campaign.subject,
            contact
          );

          // Create send record first (linked to contact)
          const { data: sendRecord, error: sendRecordError } = await supabase
            .from('email_sends')
            .insert({
              campaign_id: campaignId,
              contact_id: contact.contact_id,
              status: 'pending',
            })
            .select('id')
            .single();

          if (sendRecordError) {
            console.error(`❌ Failed to create send record for ${contact.email}:`, sendRecordError);
            errorCount++;
            return;
          }

          // Send via Resend
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `${campaign.from_name} <${campaign.from_email}>`,
              to: [contact.email],
              subject: personalizedSubject,
              html: personalizedHtml,
              text: personalizedText,
              reply_to: campaign.reply_to,
              headers: {
                'X-Campaign-Id': campaignId,
                'X-Send-Id': sendRecord.id,
                'X-Contact-Id': contact.contact_id,
              },
            }),
          });

          const result = await response.json();

          if (response.ok) {
            // Update send record with success
            await supabase
              .from('email_sends')
              .update({
                resend_id: result.id,
                status: 'sent',
                sent_at: new Date().toISOString(),
              })
              .eq('id', sendRecord.id);

            // Update contact's last activity
            await supabase.rpc('contact_touch', { p_contact_id: contact.contact_id });

            sentCount++;
          } else {
            // Update send record with error
            await supabase
              .from('email_sends')
              .update({
                status: 'bounced',
                error_message: result.message || 'Send failed',
              })
              .eq('id', sendRecord.id);

            errorCount++;
            console.error(`❌ Failed to send to ${contact.email}:`, result);
          }
        } catch (err: any) {
          errorCount++;
          console.error(`❌ Error sending to ${contact.email}:`, err.message);
        }
      }));

      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Log progress for large campaigns
      if (recipients.length > 100 && (i + BATCH_SIZE) % 100 === 0) {
        console.log(`📧 Progress: ${Math.min(i + BATCH_SIZE, recipients.length)}/${recipients.length}`);
      }
    }

    // Update campaign with final stats
    await supabase
      .from('email_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        total_sent: sentCount,
      })
      .eq('id', campaignId);

    console.log(`✅ Campaign sent: ${sentCount} delivered, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id: campaignId,
        total_recipients: recipients.length,
        sent: sentCount,
        errors: errorCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    // If sending fails, revert campaign status to draft
    await supabase
      .from('email_campaigns')
      .update({ status: 'draft' })
      .eq('id', campaignId);

    throw error;
  }
}

/**
 * Replace personalization tokens in content
 */
function personalizeContent(content: string, contact: any): string {
  return content
    .replace(/{{first_name}}/gi, contact.first_name || 'there')
    .replace(/{{last_name}}/gi, contact.last_name || '')
    .replace(/{{email}}/gi, contact.email || '')
    .replace(/{{name}}/gi, 
      contact.first_name 
        ? `${contact.first_name}${contact.last_name ? ' ' + contact.last_name : ''}`
        : 'there'
    );
}
