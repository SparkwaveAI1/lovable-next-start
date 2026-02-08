import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Send Batch Emails - Fire and forget
 * 
 * For template-based campaigns where the same email goes to many recipients.
 * Runs server-side with no agent polling needed.
 * 
 * Usage:
 *   POST /send-batch-emails
 *   {
 *     "recipients": [{ "email": "...", "first_name": "..." }, ...],
 *     "subject": "Your Free Class",
 *     "html_template": "<p>Hi {first_name}, ...</p>",
 *     "from_email": "team@reply.sparkwave-ai.com",
 *     "from_name": "Fight Flow Academy",
 *     "campaign_id": "optional-uuid",
 *     "business_id": "uuid"
 *   }
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Recipient {
  email: string;
  first_name?: string;
  contact_id?: string;
  [key: string]: string | undefined;
}

interface BatchEmailRequest {
  recipients: Recipient[];
  subject: string;
  html_template: string;
  from_email?: string;
  from_name?: string;
  campaign_id?: string;
  business_id?: string;
  delay_ms?: number; // Delay between emails (default 500ms)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const body: BatchEmailRequest = await req.json();
    const {
      recipients,
      subject,
      html_template,
      from_email = 'team@reply.sparkwave-ai.com',
      from_name = 'Sparkwave',
      campaign_id,
      business_id,
      delay_ms = 500
    } = body;

    if (!recipients || recipients.length === 0) {
      throw new Error('No recipients provided');
    }

    if (!subject || !html_template) {
      throw new Error('Subject and html_template required');
    }

    console.log(`Starting batch email: ${recipients.length} recipients`);

    const results = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process emails with delay to avoid rate limits
    for (const recipient of recipients) {
      try {
        // Substitute template variables
        let html = html_template;
        for (const [key, value] of Object.entries(recipient)) {
          if (value) {
            html = html.replace(new RegExp(`{${key}}`, 'g'), value);
          }
        }

        // Send via Resend
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${from_name} <${from_email}>`,
            to: [recipient.email],
            subject: subject,
            html: html,
          }),
        });

        if (response.ok) {
          results.sent++;
          console.log(`✓ Sent to ${recipient.email}`);
        } else {
          const error = await response.text();
          results.failed++;
          results.errors.push(`${recipient.email}: ${error}`);
          console.error(`✗ Failed ${recipient.email}: ${error}`);
        }

        // Delay between emails
        if (delay_ms > 0) {
          await new Promise(r => setTimeout(r, delay_ms));
        }

      } catch (err) {
        results.failed++;
        results.errors.push(`${recipient.email}: ${err.message}`);
      }
    }

    console.log(`Batch complete: ${results.sent}/${results.total} sent`);

    // Log to database if we have Supabase access
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase.from('automation_logs').insert({
          business_id: business_id,
          automation_type: 'batch_email',
          status: results.failed === 0 ? 'success' : 'partial',
          source_data: { campaign_id, recipient_count: results.total },
          processed_data: results,
        });
      }
    } catch (logErr) {
      console.error('Failed to log:', logErr);
    }

    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Batch email error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
