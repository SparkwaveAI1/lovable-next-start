/**
 * Fight Flow Re-engagement Processor — Speed-to-Lead Framework
 * SPA-847: Created 2026-03-19
 *
 * Called by an external cron (every 5 min via OpenClaw or Supabase pg_cron).
 * Processes pending re-engagement rows that are due to fire.
 *
 * Re-engagement rules:
 * - no_reply: attempt 1 at T+20min, attempt 2 at T+2hr (max 2 total)
 * - mid_convo_drop: attempt 1 at T+15min (max 1 total)
 * - Quiet hours (8PM–8AM ET): skip silently (mark as skipped_quiet, reschedule next day)
 * - If lead replied since scheduling → cancel remaining attempts
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Quiet hours (ET): 8 PM – 8 AM
const QUIET_START = 20;
const QUIET_END = 8;

function etHour(): number {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  ).getHours();
}

function isQuietHours(): boolean {
  const h = etHour();
  return h >= QUIET_START || h < QUIET_END;
}

async function sendTwilioSMS(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string
): Promise<boolean> {
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Twilio send error:", err);
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID") || Deno.env.get("TWILIO_SID");
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER") || "+19197372900";

  const now = new Date().toISOString();
  const results: Record<string, string>[] = [];

  try {
    // Fetch due rows
    const { data: rows, error } = await supabase
      .from("fightflow_reengagement_queue")
      .select("*")
      .eq("status", "pending")
      .lte("fire_at", now)
      .limit(50);

    if (error) throw error;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ processed: 0, results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${rows.length} re-engagement rows`);

    for (const row of rows) {
      // Quiet hours check
      if (isQuietHours()) {
        // Reschedule to 8 AM ET
        const tomorrow = new Date();
        tomorrow.setHours(8, 0, 0, 0);
        // Advance by 1 day if still within quiet window
        if (tomorrow <= new Date()) tomorrow.setDate(tomorrow.getDate() + 1);
        // Convert to UTC based on ET offset
        const etOffset = 5 * 60 * 60 * 1000; // ET = UTC-5 (rough)
        const fireAt = new Date(tomorrow.getTime() + etOffset).toISOString();

        await supabase
          .from("fightflow_reengagement_queue")
          .update({ status: "skipped_quiet", fire_at: fireAt })
          .eq("id", row.id);

        results.push({ id: row.id, action: "skipped_quiet", fire_at: fireAt });
        continue;
      }

      // Check if lead replied since this was scheduled
      const { data: thread } = await supabase
        .from("conversation_threads")
        .select("last_lead_message_at, conversation_state")
        .eq("id", row.thread_id)
        .single();

      if (thread) {
        const scheduledAt = new Date(row.created_at).getTime();
        const lastReply = thread.last_lead_message_at
          ? new Date(thread.last_lead_message_at).getTime()
          : 0;

        if (lastReply > scheduledAt || thread.conversation_state === "closed_not_interested") {
          // Lead replied or closed — cancel remaining
          await supabase
            .from("fightflow_reengagement_queue")
            .update({ status: "cancelled" })
            .eq("thread_id", row.thread_id)
            .eq("status", "pending");

          results.push({ id: row.id, action: "cancelled_lead_replied" });
          continue;
        }
      }

      // Get contact info for the thread
      const { data: contact } = await supabase
        .from("sms_contacts")
        .select("phone, name")
        .eq("id", thread?.id ?? "")  // fallback — join via conversation_threads if needed
        .single();

      // Attempt to get contact phone from conversation_threads
      const { data: threadFull } = await supabase
        .from("conversation_threads")
        .select("contact_id, business_id")
        .eq("id", row.thread_id)
        .single();

      if (!threadFull) {
        await supabase
          .from("fightflow_reengagement_queue")
          .update({ status: "cancelled" })
          .eq("id", row.id);
        results.push({ id: row.id, action: "cancelled_no_thread" });
        continue;
      }

      // Get contact phone
      const { data: fullContact } = await supabase
        .from("sms_contacts")
        .select("phone, name, first_name")
        .eq("id", threadFull.contact_id)
        .single();

      if (!fullContact?.phone) {
        await supabase
          .from("fightflow_reengagement_queue")
          .update({ status: "cancelled" })
          .eq("id", row.id);
        results.push({ id: row.id, action: "cancelled_no_phone" });
        continue;
      }

      // Build re-engagement message
      const firstName = fullContact.first_name || fullContact.name?.split(" ")[0] || "";
      let reEngageMsg: string;

      if (row.type === "no_reply") {
        reEngageMsg = row.attempt === 1
          ? `Hey${firstName ? " " + firstName : ""}! Still curious about Fight Flow? Happy to answer any questions.`
          : `Last follow-up — are you still interested in trying a class? Just reply and I'll get you set up.`;
      } else {
        // mid_convo_drop
        reEngageMsg = `Hey${firstName ? " " + firstName : ""}, did you want to finish getting that trial class booked?`;
      }

      // Send SMS
      if (!twilioSid || !twilioToken) {
        console.error("Twilio credentials missing — skipping send");
        results.push({ id: row.id, action: "skipped_no_twilio" });
        continue;
      }

      const sent = await sendTwilioSMS(twilioSid, twilioToken, twilioFrom, fullContact.phone, reEngageMsg);

      if (sent) {
        // Mark sent
        await supabase
          .from("fightflow_reengagement_queue")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", row.id);

        // Log to sms_messages table (for conversation history)
        await supabase.from("sms_messages").insert({
          contact_id: threadFull.contact_id,
          thread_id: row.thread_id,
          direction: "outbound",
          message: reEngageMsg,
          business_id: "456dc53b-d9d9-41b0-bc33-4f4c4a791eff", // SPA-1583: FF business_id
          created_at: new Date().toISOString(),
          metadata: { source: "reengagement", attempt: row.attempt, type: row.type },
        }).catch((e: Error) => console.error("sms_messages insert error:", e.message));

        results.push({ id: row.id, action: "sent", message: reEngageMsg });
        console.log(`Re-engagement sent (${row.type} attempt ${row.attempt}): ${fullContact.phone}`);
      } else {
        // Failed send — don't mark as sent, leave for retry
        results.push({ id: row.id, action: "send_failed" });
      }
    }

    return new Response(JSON.stringify({ processed: rows.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("fightflow-reengagement fatal:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
