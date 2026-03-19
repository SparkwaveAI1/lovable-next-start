/**
 * Fight Flow AI Response Edge Function — Speed-to-Lead Framework
 * SPA-847: Upgraded 2026-03-19
 *
 * 7-Component Framework:
 * 1. Persona — brief, competent rep (not a chatbot)
 * 2. Hard limits — max 2 sentences, ≤160 chars, zero filler, never echo lead details
 * 3. Urgency scale 0-10 routing
 * 4. Intent detection (Buying / Info-seeking / Problem / Routine)
 * 5. Qualifying logic — 4-message ceiling → human handoff
 * 6. Tone — answer before asking; one purpose per message; match energy
 * 7. Transfer — natural close; default next step = phone call
 *
 * Tiered Model Routing:
 * - T1: claude-haiku-3-5 — standard qualifying
 * - T2: claude-sonnet-4-5 — complex/transfers (urgency ≥8 or msg ≥4)
 *
 * Quality Gate (Sonnet reviews Haiku output ~26% catch rate):
 * - Fires when T1 produces a response for urgency <8 and msg count <4
 *
 * Re-engagement:
 * - No reply: follow up at 20 min, then 2 hours (max 2 attempts)
 * - Mid-convo drop: 15 min (max 1 attempt)
 * - Quiet hours: 8 PM–8 AM ET
 *
 * Human Handoff SMS:
 * - After 4 messages OR transfer trigger: SMS Scott +1 919 532 4050
 * - Payload: name, phone, service type, urgency score, transcript summary
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Constants ───────────────────────────────────────────────────────────────
const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_REFERER = "https://fightflowacademy.com";
const OPENROUTER_TITLE = "Fight Flow Lead Responder";

// Tiered models (Speed-to-Lead Blueprint / IDENTITY.md tiering)
const MODEL_T1 = "anthropic/claude-haiku-3-5"; // standard qualifying
const MODEL_T2 = "anthropic/claude-sonnet-4-5"; // complex / transfers
const MODEL_EVAL = "openai/gpt-4o-mini";        // quality gate evaluator (fast)

// Hard limits (7-Component, Component 2)
const MAX_CHARS = 160;
const MAX_MESSAGES_BEFORE_HANDOFF = 4;

// Twilio / Scott
const SCOTT_PHONE = "+19195324050";

// Quiet hours (ET) — 8 PM–8 AM
const QUIET_START_HOUR = 20; // 8 PM ET
const QUIET_END_HOUR = 8;    // 8 AM ET

// ─── Types ───────────────────────────────────────────────────────────────────
interface ClassSchedule {
  id: string;
  class_name: string;
  instructor: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface AgentConfig {
  agent_name?: string;
  personality_prompt?: string;
  greeting_message?: string;
  fallback_message?: string;
  booking_enabled?: boolean;
  max_response_length?: number;
  model?: string;
  temperature?: number;
  evaluation_enabled?: boolean;
}

type Intent = "BUYING" | "INFO_SEEKING" | "PROBLEM" | "ROUTINE" | "REJECTION" | "ESCALATION";
type Tier = "T1" | "T2";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function etHour(): number {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  ).getHours();
}

function isQuietHours(): boolean {
  const h = etHour();
  return h >= QUIET_START_HOUR || h < QUIET_END_HOUR;
}

function getDayName(d: number): string {
  return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d] ?? "Unknown";
}

function formatTime(t: string): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  const suffix = hr >= 12 ? "PM" : "AM";
  const disp = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
  return `${disp}:${m ?? "00"} ${suffix}`;
}

function formatSchedule(classes: ClassSchedule[]): string {
  if (!classes?.length) return "No classes currently scheduled.";
  const byDay: Record<number, ClassSchedule[]> = {};
  classes.forEach(c => { (byDay[c.day_of_week] ??= []).push(c); });
  return Object.entries(byDay)
    .sort(([a],[b]) => +a - +b)
    .map(([day, list]) =>
      `${getDayName(+day)}: ${list.map(c => `${c.class_name} at ${formatTime(c.start_time)}`).join(", ")}`
    ).join("\n");
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

// ─── Intent Detection (Component 4) ──────────────────────────────────────────
const BUYING_SIGNALS = [
  "sign up","signup","join","how do i start","want to try","trial","free class",
  "book","schedule","register","when can i come","first class","how to join",
  "i want","ready to","lets do","let's do"
];
const INFO_SIGNALS = [
  "how much","price","cost","rates","fees","membership","monthly","what do you offer",
  "tell me about","what classes","what times","schedule","hours","location","where are you",
  "do you have","what is","what's","can i","do you"
];
const PROBLEM_SIGNALS = [
  "issue","problem","complaint","hurt","injury","injured","refund","cancel","not happy",
  "frustrated","terrible","worst","broken","sue","lawyer","medical"
];
const REJECTION_SIGNALS = [
  "not interested","no thanks","no thank you","i'm good","im good","maybe later",
  "not right now","already found","too expensive","can't afford","too far","too busy",
  "not for me","changed my mind","gonna pass","i'll pass","decided against"
];
const ESCALATION_SIGNALS = [
  "talk to a person","speak to someone","real person","talk to manager","speak to owner",
  "call me","can someone call","leave me alone","unsubscribe","stop texting",
  "lawyer","sue","legal","liability"
];

function detectIntent(message: string): Intent {
  const m = message.toLowerCase();
  if (REJECTION_SIGNALS.some(s => m.includes(s))) return "REJECTION";
  if (ESCALATION_SIGNALS.some(s => m.includes(s))) return "ESCALATION";
  if (BUYING_SIGNALS.some(s => m.includes(s))) return "BUYING";
  if (PROBLEM_SIGNALS.some(s => m.includes(s))) return "PROBLEM";
  if (INFO_SIGNALS.some(s => m.includes(s))) return "INFO_SEEKING";
  return "ROUTINE";
}

// ─── Urgency Score (Component 3) ─────────────────────────────────────────────
/**
 * Returns 0–10:
 * 9–10 = emergency (1 question → transfer)
 * 6–8  = fast-track
 * 3–5  = standard (2–3 qualifying questions)
 * 0–2  = patient
 */
function scoreUrgency(message: string, intent: Intent, msgCount: number): number {
  if (intent === "ESCALATION") return 10;
  if (intent === "REJECTION") return 0;

  let score = 3; // baseline
  const m = message.toLowerCase();

  // Buying intent boosts
  if (intent === "BUYING") score += 4;
  if (m.includes("today") || m.includes("now") || m.includes("asap")) score += 2;
  if (m.includes("tonight") || m.includes("this week")) score += 1;

  // Info-seeking with specifics → likely warm
  if (intent === "INFO_SEEKING") score += 1;
  if (m.includes("price") || m.includes("cost") || m.includes("how much")) score += 1;

  // Problem → high urgency
  if (intent === "PROBLEM") score = Math.max(score, 7);

  // Deep in conversation → escalate
  if (msgCount >= MAX_MESSAGES_BEFORE_HANDOFF) score = Math.max(score, 9);

  return Math.min(10, score);
}

// ─── Tier Selection (Component 2 + tiering) ──────────────────────────────────
function selectTier(urgency: number, msgCount: number, intent: Intent): Tier {
  if (urgency >= 8 || msgCount >= MAX_MESSAGES_BEFORE_HANDOFF || intent === "PROBLEM" || intent === "ESCALATION") {
    return "T2";
  }
  return "T1";
}

// ─── System Prompt (Component 1, 5, 6, 7) ────────────────────────────────────
function buildSystemPrompt(params: {
  contactName: string | null;
  urgency: number;
  intent: Intent;
  tier: Tier;
  msgCount: number;
  schedule: string;
  knowledgeBase: string;
  dbPersonality: string;
  businessContext: string;
}): string {
  const { contactName, urgency, intent, tier, msgCount, schedule, knowledgeBase, dbPersonality, businessContext } = params;
  const remaining = MAX_MESSAGES_BEFORE_HANDOFF - msgCount;

  const urgencyInstruction = urgency >= 9
    ? `URGENCY 9-10 (EMERGENCY): Ask ONE clarifying question, then immediately offer a call. Do not qualify further.`
    : urgency >= 6
    ? `URGENCY ${urgency} (FAST-TRACK): Skip small talk. Get to the point. Move toward booking in 1-2 messages.`
    : `URGENCY ${urgency} (STANDARD): Qualify naturally. Max ${remaining} more message(s) before handing off to Scott.`;

  const intentInstruction = {
    BUYING:       "INTENT: BUYING — They want to start. Remove friction. Give them one clear next step.",
    INFO_SEEKING: "INTENT: INFO-SEEKING — Answer their question directly first, then advance toward trial.",
    PROBLEM:      "INTENT: PROBLEM — Empathize first. Do not pitch. Offer to connect with Scott immediately.",
    ROUTINE:      "INTENT: ROUTINE — Keep it natural. Qualify without pressure.",
    REJECTION:    "INTENT: REJECTION — Accept gracefully. One sentence. Do not pitch or follow up.",
    ESCALATION:   "INTENT: ESCALATION — They want a human. Acknowledge. Say Scott will reach out. Stop.",
  }[intent];

  const handoffInstruction = msgCount >= MAX_MESSAGES_BEFORE_HANDOFF
    ? `\nMANDATORY HANDOFF: This is message ${msgCount + 1} / ${MAX_MESSAGES_BEFORE_HANDOFF + 1}. Transfer NOW. Say something like: "Let me have Scott call you directly — he can answer everything in 2 minutes. What's the best time?"`
    : "";

  return `${dbPersonality}You are a lead responder for Fight Flow Academy — ${businessContext || "Fight Flow Academy"}, an MMA & fitness gym in Raleigh-Durham, NC.
${contactName ? `Lead name: ${contactName}` : ""}

PERSONA: You are a brief, competent human rep — NOT a chatbot. Sound like a real person texting.

HARD RULES (non-negotiable):
- Max 2 sentences per reply
- Max 160 characters per reply
- Zero filler words ("Great!", "Awesome!", "Sure thing!")
- NEVER echo/repeat what the lead just said back to them
- Answer first, then (optionally) ask ONE question
- One purpose per message — not two asks

${urgencyInstruction}
${intentInstruction}
${handoffInstruction}

QUALIFYING LOGIC (Components 5):
- Message 1: Discovery question (what brings them in, what they're looking for)
- Messages 2-3: Narrow to class type + schedule
- Message 4: Offer trial / confirm booking OR hand off to Scott

TONE (Component 6):
- Match their energy. Short replies → short back.
- Long, enthusiastic replies → warm and specific back.
- Never robotic. Never repeat their words back at them.
- Sound like you've been here before. You know the gym. You want them to succeed.

TRANSFER RULE (Component 7):
- Natural close: "Want to pop in for a free trial?" or "I can grab you a time with Scott."
- Default next step = book a trial class or a quick call with Scott
- When transferring, end with: "I'll let Scott know to reach out shortly."

SCHEDULE:
${schedule || "No schedule loaded."}

KNOWLEDGE BASE:
${knowledgeBase ? knowledgeBase.slice(0, 1500) : "No additional context."}

RESPOND ONLY with the SMS text. No quotes. No labels. No prefix.`;
}

// ─── OpenRouter Call ──────────────────────────────────────────────────────────
async function callLLM(
  model: string,
  messages: Array<{role: string; content: string}>,
  apiKey: string,
  maxTokens = 100,
  temperature = 0.7
): Promise<string> {
  const res = await fetch(OPENROUTER_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": OPENROUTER_REFERER,
      "X-Title": OPENROUTER_TITLE,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${model} error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

// ─── Quality Gate (T2 reviews T1 output) ─────────────────────────────────────
/**
 * Sonnet reviews Haiku's draft. Returns the corrected message or the original.
 * Only fires for T1 responses (not emergency, not transfer).
 */
async function qualityGate(
  draft: string,
  leadMessage: string,
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  const evalPrompt = `You are a quality reviewer for SMS lead responses. Evaluate this draft reply.

LEAD MESSAGE: "${leadMessage}"
DRAFT REPLY: "${draft}"

Rules the draft must follow:
1. Max 2 sentences
2. Max 160 characters
3. No filler words (Great!, Awesome!, Sure thing!)
4. Answers the lead's question/intent first
5. Does NOT echo/repeat their words back to them
6. Has one clear purpose

If all rules pass, reply ONLY: PASS
If any rule fails, reply ONLY with a corrected version of the SMS (no explanation, no prefix, ≤160 chars).`;

  try {
    const result = await callLLM(
      MODEL_T2,
      [{ role: "user", content: evalPrompt }],
      apiKey,
      120,
      0.2
    );

    if (result.startsWith("PASS")) {
      console.log("Quality gate: PASS");
      return draft;
    }

    // Returned a corrected version
    const corrected = truncate(result, MAX_CHARS);
    console.log("Quality gate: CORRECTED →", corrected);
    return corrected;
  } catch (err) {
    console.error("Quality gate error (using draft):", err);
    return draft;
  }
}

// ─── Human Handoff SMS (Component → Handoff) ─────────────────────────────────
async function sendHandoffSMS(params: {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  contactName: string | null;
  contactPhone: string | null;
  serviceType: string;
  urgency: number;
  transcriptSummary: string;
}): Promise<void> {
  const { accountSid, authToken, fromNumber, contactName, contactPhone, serviceType, urgency, transcriptSummary } = params;

  const name = contactName || "Unknown";
  const phone = contactPhone || "N/A";
  const summary = truncate(transcriptSummary, 300);

  const body = `🚨 Fight Flow Lead Handoff
Name: ${name}
Phone: ${phone}
Interest: ${serviceType}
Urgency: ${urgency}/10
Transcript: ${summary}`;

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: fromNumber, To: SCOTT_PHONE, Body: body }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Handoff SMS failed:", text);
    } else {
      console.log("Handoff SMS sent to Scott");
    }
  } catch (err) {
    console.error("Handoff SMS error:", err);
  }
}

// ─── Re-engagement Scheduler ──────────────────────────────────────────────────
/**
 * Enroll thread in re-engagement if not already enrolled.
 * Type: 'no_reply' (20min, 2hr) or 'mid_convo_drop' (15min).
 * Respects quiet hours — does not schedule if in quiet window.
 */
async function scheduleReEngagement(
  supabase: ReturnType<typeof createClient>,
  threadId: string,
  businessId: string,
  type: "no_reply" | "mid_convo_drop"
): Promise<void> {
  // Check if re-engagement already pending
  const { data: existing } = await supabase
    .from("fightflow_reengagement_queue")
    .select("id")
    .eq("thread_id", threadId)
    .eq("status", "pending")
    .limit(1);

  if (existing && existing.length > 0) {
    console.log("Re-engagement already scheduled for thread", threadId);
    return;
  }

  const delays = type === "no_reply"
    ? [20 * 60 * 1000, 2 * 60 * 60 * 1000]     // 20 min, 2 hr
    : [15 * 60 * 1000];                           // 15 min

  const now = Date.now();
  const rows = delays.map((d, i) => ({
    thread_id: threadId,
    business_id: businessId,
    type,
    attempt: i + 1,
    max_attempts: delays.length,
    fire_at: new Date(now + d).toISOString(),
    status: "pending",
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("fightflow_reengagement_queue").insert(rows);
  if (error) {
    console.error("Re-engagement schedule error:", error.message);
  } else {
    console.log(`Re-engagement (${type}) scheduled: ${delays.length} attempt(s)`);
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID") || Deno.env.get("TWILIO_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER") || "+19197372900";

    const {
      messages,
      businessId,
      businessContext,
      classSchedule,
      contactName,
      contactPhone,
      threadId,
      knowledgeBase,
    } = await req.json();

    // ── Build context ────────────────────────────────────────────────────────
    const latestMessage: string = messages?.[messages.length - 1]?.content ?? "";
    const msgCount: number = messages?.filter((m: any) => m.role === "user").length ?? 0;
    const schedule = formatSchedule(classSchedule ?? []);
    const knowledgeText = typeof knowledgeBase === "string"
      ? knowledgeBase
      : Array.isArray(knowledgeBase)
        ? knowledgeBase.map((k: any) => `${k.title}: ${k.content}`).join("\n")
        : "";

    // ── Intent & urgency ─────────────────────────────────────────────────────
    const intent = detectIntent(latestMessage);
    const urgency = scoreUrgency(latestMessage, intent, msgCount);
    const tier = selectTier(urgency, msgCount, intent);
    const shouldHandoff = msgCount >= MAX_MESSAGES_BEFORE_HANDOFF || intent === "ESCALATION";

    console.log(`[ai-response] intent=${intent} urgency=${urgency} tier=${tier} msgCount=${msgCount} handoff=${shouldHandoff}`);

    // ── Agent config (personality override from DB) ───────────────────────────
    let agentConfig: AgentConfig | null = null;
    if (businessId) {
      const { data } = await supabase
        .from("agent_config")
        .select("*")
        .eq("business_id", businessId)
        .single();
      agentConfig = data ?? null;
    }

    const dbPersonality = agentConfig?.personality_prompt
      ? `${agentConfig.personality_prompt}\n\n---\n\n`
      : "";

    // ── Rejection / Escalation fast-path ─────────────────────────────────────
    if (intent === "REJECTION") {
      const rejectMsg = "No problem — feel free to reach out if anything changes. Take care!";
      // Cancel any pending re-engagement
      if (threadId) {
        await supabase
          .from("fightflow_reengagement_queue")
          .update({ status: "cancelled" })
          .eq("thread_id", threadId)
          .eq("status", "pending");
      }
      return new Response(JSON.stringify({
        message: rejectMsg,
        intent,
        urgency,
        tier,
        shouldHandoff: false,
        reengagementScheduled: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Build system prompt ───────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt({
      contactName,
      urgency,
      intent,
      tier,
      msgCount,
      schedule,
      knowledgeBase: knowledgeText,
      dbPersonality,
      businessContext,
    });

    // ── Generate response (tiered) ────────────────────────────────────────────
    const primaryModel = tier === "T2" ? MODEL_T2 : MODEL_T1;
    let aiMessage = await callLLM(
      primaryModel,
      [
        { role: "system", content: systemPrompt },
        ...(messages ?? []),
      ],
      apiKey,
      120,
      0.7
    );

    // Enforce hard char limit (Component 2)
    aiMessage = truncate(aiMessage, MAX_CHARS);

    // ── Quality gate (T1 only, non-emergency) ─────────────────────────────────
    if (tier === "T1" && urgency < 8 && !shouldHandoff) {
      aiMessage = await qualityGate(aiMessage, latestMessage, systemPrompt, apiKey);
    }

    console.log("[ai-response] final message:", aiMessage);

    // ── Human handoff ─────────────────────────────────────────────────────────
    let handoffSent = false;
    if (shouldHandoff && twilioSid && twilioToken) {
      // Build transcript summary from last N messages
      const lastMsgs = (messages ?? []).slice(-8).map((m: any) =>
        `${m.role === "user" ? "Lead" : "AI"}: ${m.content}`
      ).join(" | ");

      // Detect service type from conversation
      const serviceType = classSchedule?.find((c: ClassSchedule) => {
        const txt = (messages ?? []).map((m: any) => m.content).join(" ").toLowerCase();
        return txt.includes(c.class_name.toLowerCase().split(" ")[0]);
      })?.class_name ?? "General Inquiry";

      await sendHandoffSMS({
        accountSid: twilioSid,
        authToken: twilioToken,
        fromNumber: twilioFrom,
        contactName: contactName ?? null,
        contactPhone: contactPhone ?? null,
        serviceType,
        urgency,
        transcriptSummary: lastMsgs,
      });
      handoffSent = true;
    }

    // ── Re-engagement scheduling ──────────────────────────────────────────────
    // Schedule re-engagement for new outbound responses (not handoffs / rejections)
    let reengagementScheduled = false;
    if (threadId && businessId && !shouldHandoff && !isQuietHours()) {
      const reType = msgCount > 1 ? "mid_convo_drop" : "no_reply";
      await scheduleReEngagement(supabase, threadId, businessId, reType);
      reengagementScheduled = true;
    }

    // ── Update conversation state ─────────────────────────────────────────────
    if (threadId) {
      const convState = shouldHandoff
        ? "needs_human_review"
        : intent === "BUYING"
          ? "collecting_booking_info"
          : "answering_questions";

      await supabase.from("conversation_threads").update({
        conversation_state: convState,
        last_bot_message_at: new Date().toISOString(),
        ...(shouldHandoff ? { needs_human_review: true } : {}),
      }).eq("id", threadId);
    }

    // ── Log to automation_logs ────────────────────────────────────────────────
    if (businessId) {
      await supabase.from("automation_logs").insert({
        business_id: businessId,
        automation_type: "speed_to_lead_response",
        status: "success",
        processed_data: {
          thread_id: threadId,
          intent,
          urgency,
          tier,
          msg_count: msgCount,
          handoff_sent: handoffSent,
          reengagement_scheduled: reengagementScheduled,
          response_preview: aiMessage.slice(0, 100),
        },
      }).catch((e: Error) => console.error("Log insert error:", e.message));
    }

    return new Response(JSON.stringify({
      message: aiMessage,
      intent,
      urgency,
      tier,
      shouldHandoff,
      handoffSent,
      reengagementScheduled,
      // Legacy fields for sms-webhook compatibility
      shouldBook: false,
      classDetails: null,
      detectedIntents: [intent],
      evaluation: { enabled: true, tier },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("ai-response fatal:", error);
    return new Response(JSON.stringify({
      message: "Thanks for reaching out! We'll get back to you shortly.",
      error: error.message,
      errorFiltered: true,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
