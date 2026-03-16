import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Resend Webhook Handler
 * 
 * Receives webhook events from Resend and updates email tracking data.
 * 
 * Webhook URL to configure in Resend: https://[your-project].supabase.co/functions/v1/resend-webhook
 * 
 * Optional: Set RESEND_WEBHOOK_SECRET in Edge Function Secrets for signature verification
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    headers?: Record<string, string>;
    // For click events
    click?: {
      link: string;
      timestamp: string;
      user_agent?: string;
      ip_address?: string;
    };
    // For bounce events
    bounce?: {
      message: string;
      type: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📬 resend-webhook received event');

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse webhook payload
    const event: ResendWebhookEvent = await req.json();
    console.log('📬 Event type:', event.type);
    console.log('📬 Email ID:', event.data.email_id);

    // ============================================================
    // ALWAYS log to email_events first (captures ALL emails including cold outreach)
    // ============================================================
    try {
      const { error: eventLogError } = await supabase
        .from('email_events')
        .insert({
          email_id: event.data.email_id,
          event_type: event.type,
          recipient: event.data.to?.[0] || null,
          timestamp: event.created_at || new Date().toISOString(),
          metadata: {
            from: event.data.from,
            to: event.data.to,
            subject: event.data.subject,
            click: event.data.click || null,
            bounce: event.data.bounce || null,
            headers: event.data.headers || null,
            raw_event: event,
          },
        });

      if (eventLogError) {
        console.error('⚠️ Failed to log to email_events:', eventLogError);
      } else {
        console.log('✅ Logged to email_events table');
      }
    } catch (logErr) {
      console.error('⚠️ Error logging event:', logErr);
    }

    // ============================================================
    // Update outreach_log for CI/cold-outreach emails
    // ============================================================
    try {
      if (event.type === 'email.opened' || event.type === 'email.bounced') {
        const outreachNow = new Date().toISOString();
        const { data: outreachRecord } = await supabase
          .from('outreach_log')
          .select('id, opened_at')
          .eq('resend_message_id', event.data.email_id)
          .maybeSingle();

        if (outreachRecord) {
          if (event.type === 'email.opened' && !outreachRecord.opened_at) {
            await supabase
              .from('outreach_log')
              .update({ opened_at: outreachNow })
              .eq('id', outreachRecord.id);
            console.log('✅ outreach_log opened_at updated for:', event.data.email_id);
          } else if (event.type === 'email.bounced') {
            await supabase
              .from('outreach_log')
              .update({ bounced_at: outreachNow, status: 'bounced' })
              .eq('id', outreachRecord.id);
            console.log('✅ outreach_log bounced_at updated for:', event.data.email_id);
          }
        }
        // No-op if no outreach_log record — this email was a campaign email, not a CI email
      }
    } catch (outreachErr) {
      console.error('outreach_log update error (non-fatal):', outreachErr);
    }

    // Find the send record by resend_id
    const { data: sendRecord, error: findError } = await supabase
      .from('email_sends')
      .select('id, campaign_id, subscriber_id, status')
      .eq('resend_id', event.data.email_id)
      .single();

    if (findError || !sendRecord) {
      console.log('⚠️ Send record not found for:', event.data.email_id);
      // Return 200 anyway to acknowledge receipt
      return new Response(
        JSON.stringify({ received: true, matched: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('📬 Found send record:', sendRecord.id);

    const now = new Date().toISOString();

    // Handle different event types
    switch (event.type) {
      case 'email.delivered':
        await supabase
          .from('email_sends')
          .update({
            status: 'delivered',
            delivered_at: now,
          })
          .eq('id', sendRecord.id);

        // Increment campaign delivered count
        await supabase.rpc('increment_campaign_stat', {
          p_campaign_id: sendRecord.campaign_id,
          p_stat: 'total_delivered',
        });
        break;

      case 'email.opened':
        // Only update if not already marked as opened
        if (sendRecord.status !== 'opened' && sendRecord.status !== 'clicked') {
          await supabase
            .from('email_sends')
            .update({
              status: 'opened',
              opened_at: now,
            })
            .eq('id', sendRecord.id);

          // Increment campaign opened count
          await supabase.rpc('increment_campaign_stat', {
            p_campaign_id: sendRecord.campaign_id,
            p_stat: 'total_opened',
          });
        }
        break;

      case 'email.clicked':
        await supabase
          .from('email_sends')
          .update({
            status: 'clicked',
            clicked_at: now,
          })
          .eq('id', sendRecord.id);

        // Record the click
        if (event.data.click) {
          await supabase
            .from('email_clicks')
            .insert({
              send_id: sendRecord.id,
              url: event.data.click.link,
              clicked_at: event.data.click.timestamp || now,
              user_agent: event.data.click.user_agent,
              ip_address: event.data.click.ip_address,
            });
        }

        // Increment campaign clicked count (only once per send)
        if (sendRecord.status !== 'clicked') {
          await supabase.rpc('increment_campaign_stat', {
            p_campaign_id: sendRecord.campaign_id,
            p_stat: 'total_clicked',
          });
        }
        break;

      case 'email.bounced':
        await supabase
          .from('email_sends')
          .update({
            status: 'bounced',
            bounced_at: now,
            bounce_type: event.data.bounce?.type || 'unknown',
            error_message: event.data.bounce?.message,
          })
          .eq('id', sendRecord.id);

        // Update subscriber status
        await supabase
          .from('email_subscribers')
          .update({
            status: 'bounced',
            updated_at: now,
          })
          .eq('id', sendRecord.subscriber_id);

        // Increment campaign bounced count
        await supabase.rpc('increment_campaign_stat', {
          p_campaign_id: sendRecord.campaign_id,
          p_stat: 'total_bounced',
        });
        break;

      case 'email.complained':
        await supabase
          .from('email_sends')
          .update({
            status: 'complained',
          })
          .eq('id', sendRecord.id);

        // Update subscriber status - they marked as spam
        await supabase
          .from('email_subscribers')
          .update({
            status: 'complained',
            unsubscribed_at: now,
            updated_at: now,
          })
          .eq('id', sendRecord.subscriber_id);

        // Increment campaign complained count
        await supabase.rpc('increment_campaign_stat', {
          p_campaign_id: sendRecord.campaign_id,
          p_stat: 'total_complained',
        });
        break;

      default:
        console.log('📬 Unhandled event type:', event.type);
    }

    console.log('✅ Webhook processed successfully');

    return new Response(
      JSON.stringify({ received: true, processed: event.type }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    // Return 200 to acknowledge receipt even on error
    // This prevents Resend from retrying
    return new Response(
      JSON.stringify({ received: true, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
