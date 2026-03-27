import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Resend Webhook Handler
 *
 * Receives webhook events from Resend and updates email tracking data.
 * Webhook URL: https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/resend-webhook
 *
 * Handles: email.sent, email.delivered, email.opened, email.clicked, email.bounced, email.complained
 * Writes to: email_events (all events), email_sends (status updates), outreach_log (CI/cold outreach)
 *
 * Fixed SPA-1758: Migrated from esm.sh import (causes BOOT_ERROR) to npm: specifier
 * for Supabase Edge Runtime compatibility.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const event = await req.json();
    console.log("📬 resend-webhook event:", event.type, event.data?.email_id);

    // Always log to email_events (captures all emails including cold outreach)
    const { error: eventLogError } = await supabase.from("email_events").insert({
      email_id: event.data?.email_id,
      event_type: event.type,
      recipient: event.data?.to?.[0] || null,
      timestamp: event.created_at || new Date().toISOString(),
      metadata: {
        from: event.data?.from,
        to: event.data?.to,
        subject: event.data?.subject,
        bounce: event.data?.bounce || null,
        click: event.data?.click || null,
        headers: event.data?.headers || null,
        raw_event: event,
      },
    });
    if (eventLogError) console.error("⚠️ email_events insert error:", eventLogError);
    else console.log("✅ email_events row inserted");

    // Update outreach_log for CI/cold-outreach emails
    if (event.type === "email.opened" || event.type === "email.bounced") {
      try {
        const { data: rec } = await supabase
          .from("outreach_log")
          .select("id, opened_at")
          .eq("resend_message_id", event.data?.email_id)
          .maybeSingle();
        if (rec) {
          if (event.type === "email.opened" && !rec.opened_at) {
            await supabase.from("outreach_log").update({ opened_at: new Date().toISOString() }).eq("id", rec.id);
          }
          if (event.type === "email.bounced") {
            await supabase.from("outreach_log").update({ bounced_at: new Date().toISOString(), status: "bounced" }).eq("id", rec.id);
          }
        }
      } catch (outreachErr) {
        console.error("outreach_log update error (non-fatal):", outreachErr);
      }
    }

    // Find email_sends record and update campaign tracking
    const { data: sendRecord } = await supabase
      .from("email_sends")
      .select("id, campaign_id, subscriber_id, status")
      .eq("resend_id", event.data?.email_id)
      .single();

    if (!sendRecord) {
      console.log("⚠️ No email_sends record for:", event.data?.email_id);
      return new Response(
        JSON.stringify({ received: true, matched: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();

    if (event.type === "email.delivered") {
      await supabase.from("email_sends").update({ status: "delivered", delivered_at: now }).eq("id", sendRecord.id);
      // SPA-2320: guard against null campaign_id — non-campaign emails have campaign_id=null
      if (sendRecord.campaign_id) {
        await supabase.rpc("increment_campaign_stat", { p_campaign_id: sendRecord.campaign_id, p_stat: "total_delivered" });
      }

    } else if (event.type === "email.opened" && sendRecord.status !== "opened" && sendRecord.status !== "clicked") {
      await supabase.from("email_sends").update({ status: "opened", opened_at: now }).eq("id", sendRecord.id);
      // SPA-2320: guard against null campaign_id — non-campaign emails have campaign_id=null
      if (sendRecord.campaign_id) {
        await supabase.rpc("increment_campaign_stat", { p_campaign_id: sendRecord.campaign_id, p_stat: "total_opened" });
        console.log("✅ increment_campaign_stat total_opened for campaign:", sendRecord.campaign_id);
      } else {
        console.log("⚠️ email.opened: no campaign_id on send record — skipping stat increment for id:", sendRecord.id);
      }

    } else if (event.type === "email.clicked") {
      await supabase.from("email_sends").update({ status: "clicked", clicked_at: now }).eq("id", sendRecord.id);
      if (event.data?.click) {
        await supabase.from("email_clicks").insert({
          send_id: sendRecord.id,
          url: event.data.click.link,
          clicked_at: event.data.click.timestamp || now,
          user_agent: event.data.click.user_agent,
          ip_address: event.data.click.ip_address,
        });
      }
      // SPA-2320: guard against null campaign_id
      if (sendRecord.status !== "clicked" && sendRecord.campaign_id) {
        await supabase.rpc("increment_campaign_stat", { p_campaign_id: sendRecord.campaign_id, p_stat: "total_clicked" });
      }

    } else if (event.type === "email.bounced") {
      await supabase.from("email_sends").update({
        status: "bounced", bounced_at: now,
        bounce_type: event.data?.bounce?.type || "unknown",
        error_message: event.data?.bounce?.message,
      }).eq("id", sendRecord.id);
      await supabase.from("email_subscribers").update({ status: "bounced", updated_at: now }).eq("id", sendRecord.subscriber_id);
      // SPA-2320: guard against null campaign_id
      if (sendRecord.campaign_id) {
        await supabase.rpc("increment_campaign_stat", { p_campaign_id: sendRecord.campaign_id, p_stat: "total_bounced" });
      }

    } else if (event.type === "email.complained") {
      await supabase.from("email_sends").update({ status: "complained" }).eq("id", sendRecord.id);
      await supabase.from("email_subscribers").update({ status: "complained", unsubscribed_at: now, updated_at: now }).eq("id", sendRecord.subscriber_id);
      // SPA-2320: guard against null campaign_id
      if (sendRecord.campaign_id) {
        await supabase.rpc("increment_campaign_stat", { p_campaign_id: sendRecord.campaign_id, p_stat: "total_complained" });
      }

    } else {
      console.log("📬 Unhandled event type:", event.type);
    }

    console.log("✅ Webhook processed:", event.type);
    return new Response(
      JSON.stringify({ received: true, processed: event.type }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("❌ Webhook error:", err);
    return new Response(
      JSON.stringify({ received: true, error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
