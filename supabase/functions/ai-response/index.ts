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
 * - T1/T2: direct OpenAI gpt-4o — standard + complex lead response. Accuracy/reliability over cheap routing.
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

// Use GPT-5.5 direct through OpenAI for all lead responses. Do not downshift live sales conversations to cheaper models.
const MODEL_T1 = Deno.env.get("FIGHTFLOW_RESPONSE_MODEL") || "openai-direct/gpt-5.5";
const MODEL_T2 = Deno.env.get("FIGHTFLOW_RESPONSE_MODEL") || "openai-direct/gpt-5.5";
const MODEL_EVAL = "openai/gpt-4o-mini";                // quality gate evaluator (fast)

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

type BookingGuardrailAction = "defer" | "cancel" | "status" | null;

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

function detectBookingGuardrail(message: string): BookingGuardrailAction {
  const m = message.toLowerCase().replace(/[’‘]/g, "'");

  if (/\b(am i|was i|did you|did we)\s+(book|schedule|reserve|confirm)/i.test(m) ||
      /\b(booked|scheduled|confirmed)\??$/i.test(m) ||
      /\b(am i booked|am i scheduled|is it booked|is that confirmed)\b/i.test(m)) {
    return "status";
  }

  if (/\b(cancel|unbook|unschedule|remove me|take me off|can't make|cant make)\b/i.test(m)) {
    return "cancel";
  }

  if (/\b(don't|dont|do not|not yet|hold off|wait|pause)\b.{0,40}\b(book|schedule|reserve|confirm)\b/i.test(m) ||
      /\b(book|schedule|reserve|confirm)\b.{0,40}\b(not yet|don't|dont|do not|hold off|wait|pause)\b/i.test(m) ||
      /\bjust looking|not ready|still deciding\b/i.test(m)) {
    return "defer";
  }

  return null;
}

function requestedClassHint(message: string): string | null {
  const m = message.toLowerCase();
  if (m.includes("muay thai")) return "muay thai";
  if (m.includes("kickboxing")) return "kickboxing";
  if (m.includes("boxing")) return "boxing";
  if (m.includes("bjj") || m.includes("jiu") || m.includes("grappling")) return "grappling";
  if (m.includes("mma")) return "mma";
  if (m.includes("youth") || m.includes("kids") || m.includes("juniors")) return "youth";
  return null;
}

function formatShortTime(t: string): string {
  if (!t) return "";
  const [h, m = "00"] = t.split(":");
  const hr = parseInt(h, 10);
  const suffix = hr >= 12 ? "p" : "a";
  const disp = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
  return `${disp}${m !== "00" ? `:${m}` : ""}${suffix}`;
}

function classMatchesHint(className: string, hint: string): boolean {
  const name = className.toLowerCase();
  if (hint === "grappling") return name.includes("grappling") || name.includes("jiu") || name.includes("bjj");
  if (hint === "youth") return name.includes("youth") || name.includes("juniors") || name.includes("kids");
  return name.includes(hint);
}

function labelForScheduleHint(hint: string, fallback?: string): string {
  if (hint === "grappling") return "Grappling";
  if (hint === "youth") return "Youth/Juniors";
  if (hint === "muay thai") return "Muay Thai";
  if (hint === "boxing") return "Boxing";
  if (hint === "kickboxing") return "Kickboxing";
  if (hint === "mma") return "MMA";
  return fallback || hint;
}

function formatRequestedClassSchedule(message: string, classes: ClassSchedule[] | null | undefined): string | null {
  const hint = requestedClassHint(message);
  if (!hint || !classes?.length) return null;
  const matches = classes
    .filter((c) => classMatchesHint(c.class_name, hint))
    .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));
  if (!matches.length) return null;

  const classLabel = labelForScheduleHint(hint, matches[0].class_name);
  const times = matches.map((c) => `${getDayName(c.day_of_week).slice(0, 3)} ${formatShortTime(c.start_time)}`).join("; ");
  return truncate(`${classLabel}: ${times}. Free first class — what day works?`, 260);
}

function shortTimeFromScheduleLine(line: string): string {
  const m = line.match(/\((\d{1,2}:\d{2})(?::\d{2})?/);
  if (!m) return "";
  return formatShortTime(m[1]);
}

function findRelevantScheduleSummary(message: string, schedule: string): string | null {
  if (!schedule) return null;
  const m = message.toLowerCase();
  const lines = schedule.split("\n").map(l => l.trim()).filter(Boolean);
  const hint = requestedClassHint(message);
  if (hint) {
    const matches = lines.filter(l => classMatchesHint(l.toLowerCase(), hint));
    if (matches.length) {
      const label = labelForScheduleHint(hint);
      const compactTimes = matches.map((line) => {
        const day = (line.split(":")[0] || "").slice(0, 3);
        const time = shortTimeFromScheduleLine(line);
        return time ? `${day} ${time}` : line;
      });
      return truncate(`${label}: ${compactTimes.join("; ")}. Free first class — what day works?`, 260);
    }
  }
  if (/\b(schedule|time|times|when|class|classes)\b/i.test(m) && lines.length > 0) {
    return truncate(lines.slice(0, 4).join("; "), 220);
  }
  return null;
}

function deterministicFallbackResponse(message: string, schedule: string, knowledgeBase: string, classes?: ClassSchedule[] | null): string | null {
  const m = message.toLowerCase();
  const asksPrice = /\b(price|prices|pricing|cost|costs|how much|rate|rates|fee|fees|membership)\b/i.test(m);
  const asksYouth = /\b(youth|kid|kids|child|children|teen|teens|son|daughter|minor|age|ages|old)\b/i.test(m);
  const asksSpecificSchedule = /\b(schedule|time|times|when|days?|hours)\b/i.test(m);
  const asksClassSchedule = /\b(class|classes)\b/i.test(m) && requestedClassHint(message) !== null;
  const asksSchedule = asksSpecificSchedule || asksClassSchedule;
  const asksConsent = /\b(parent|guardian|consent|waiver|minor|under 18|under eighteen)\b/i.test(m);
  const asksFreeTrial = /\b(free class|trial|try a class|try one|come in|first class)\b/i.test(m);
  const asksMultipleClasses = /\b(more than one|multiple classes|multiple class|two classes|several classes)\b/i.test(m);
  const generalTrainingInterest = /\b(interested in training|want to train|looking to train|start training)\b/i.test(m);

  if (asksConsent) {
    return "For minors, a parent/guardian handles the waiver. First class is free — what age and class are you looking for?";
  }

  if (asksMultipleClasses) {
    return "Yes — you can do multiple classes. First class is free; which classes are you most interested in trying?";
  }

  if (generalTrainingInterest) {
    return "Great — are you interested in Muay Thai, Boxing, MMA, Grappling, Self Defense, or general fitness?";
  }

  if (asksFreeTrial) {
    return "Yes — first class is free. Which class do you want to try: Muay Thai, boxing, grappling, or MMA?";
  }

  if (asksYouth && asksSchedule) {
    const scheduleLine = formatRequestedClassSchedule(message, classes) ?? findRelevantScheduleSummary(message, schedule);
    if (scheduleLine) return truncate(scheduleLine, MAX_CHARS);
  }

  if (asksYouth && asksPrice) {
    return "Youth/teen options are available. Adult unlimited is $159/mo + $50 registration. First class is free — what age and class?";
  }

  if (asksYouth) {
    return "We have youth/teen-friendly training options. What age is your child, and are they more interested in boxing or Muay Thai?";
  }

  if (asksPrice) {
    const kbPriceLine = knowledgeBase.split("\n").find(line => /\$|price|pricing|cost|membership|monthly|fee/i.test(line));
    if (kbPriceLine) return truncate(`${kbPriceLine.trim()} First class is free — want to come in?`, MAX_CHARS);
    return "Adult unlimited is $159/mo plus a $50 registration fee. First class is free — want to come in?";
  }

  if (asksSchedule) {
    const scheduleLine = formatRequestedClassSchedule(message, classes) ?? findRelevantScheduleSummary(message, schedule);
    if (scheduleLine) return truncate(scheduleLine, MAX_CHARS);
    return "We have classes most weekdays and Saturdays. Tell me boxing, Muay Thai, BJJ, or MMA and I'll send the best times.";
  }

  return null;
}

async function getContactIdForThread(
  supabase: ReturnType<typeof createClient>,
  threadId: string | null | undefined
): Promise<string | null> {
  if (!threadId) return null;
  const { data, error } = await supabase
    .from("conversation_threads")
    .select("contact_id")
    .eq("id", threadId)
    .single();
  if (error) {
    console.error("[ai-response] booking guardrail thread lookup error:", error.message);
    return null;
  }
  return data?.contact_id ?? null;
}

async function latestConfirmedBooking(
  supabase: ReturnType<typeof createClient>,
  contactId: string
): Promise<any | null> {
  const { data, error } = await supabase
    .from("class_bookings")
    .select("id, booking_date, status, class_schedule_id")
    .eq("contact_id", contactId)
    .eq("status", "confirmed")
    .order("booking_date", { ascending: false })
    .limit(1);
  if (error) {
    console.error("[ai-response] booking guardrail booking lookup error:", error.message);
    return null;
  }
  return data?.[0] ?? null;
}

async function updateContactCrmStateSafely(params: {
  supabase: ReturnType<typeof createClient>;
  contactId: string | null;
  businessId: string | null | undefined;
  requestedStage: string;
  requestedStatus: string;
  reason: string;
}): Promise<void> {
  const { supabase, contactId, businessId, requestedStage, requestedStatus, reason } = params;
  if (!contactId) return;

  const { data: contact, error } = await supabase
    .from("contacts")
    .select("pipeline_stage,status")
    .eq("id", contactId)
    .single();

  if (error) {
    console.error("[ai-response] CRM state lookup error:", error.message);
    return;
  }

  const stageRank: Record<string, number> = {
    new: 0,
    new_lead: 0,
    lead: 1,
    contacted: 2,
    qualified: 3,
    trial_pending: 4,
    booked: 5,
    won: 6,
    lost: 6,
    cancelled: 6,
    do_not_contact: 6,
  };
  const currentStage = contact?.pipeline_stage ?? "new";
  const currentRank = stageRank[currentStage] ?? 0;
  const requestedRank = stageRank[requestedStage] ?? 0;

  if (requestedRank < currentRank) {
    await supabase.from("automation_logs").insert({
      business_id: businessId,
      automation_type: "crm_transition_blocked",
      status: "warning",
      error_message: `Blocked CRM downgrade ${currentStage} -> ${requestedStage}`,
      processed_data: { contact_id: contactId, current_stage: currentStage, requested_stage: requestedStage, reason },
    });
    return;
  }

  await supabase.from("contacts").update({
    pipeline_stage: requestedStage,
    status: requestedStatus,
  }).eq("id", contactId);
}

async function logSpeedToLeadResponse(params: {
  supabase: ReturnType<typeof createClient>;
  businessId: string | null | undefined;
  threadId: string | null | undefined;
  contactId?: string | null;
  intent: string;
  urgency: number;
  tier: string;
  msgCount?: number;
  handoffSent?: boolean;
  reengagementScheduled?: boolean;
  response: string;
  guardrail?: string;
}): Promise<void> {
  const { supabase, businessId, threadId } = params;
  if (!businessId) return;

  const contactId = params.contactId ?? await getContactIdForThread(supabase, threadId);
  await supabase.from("automation_logs").insert({
    business_id: businessId,
    automation_type: "speed_to_lead_response",
    status: "success",
    processed_data: {
      thread_id: threadId,
      contact_id: contactId,
      intent: params.intent,
      urgency: params.urgency,
      tier: params.tier,
      msg_count: params.msgCount ?? null,
      handoff_sent: params.handoffSent ?? false,
      reengagement_scheduled: params.reengagementScheduled ?? false,
      response_preview: params.response.slice(0, 100),
      guardrail: params.guardrail ?? null,
    },
  }).then(({ error: logErr }) => { if (logErr) console.error("Log insert error:", logErr.message); });
}

async function applyBookingGuardrail(params: {
  supabase: ReturnType<typeof createClient>;
  action: BookingGuardrailAction;
  threadId: string | null | undefined;
  businessId: string | null | undefined;
  contactName: string | null | undefined;
}): Promise<string | null> {
  const { supabase, action, threadId, businessId, contactName } = params;
  if (!action) return null;

  const contactId = await getContactIdForThread(supabase, threadId);
  const booking = contactId ? await latestConfirmedBooking(supabase, contactId) : null;
  const firstName = contactName?.split(" ")[0];
  const prefix = firstName ? `${firstName}, ` : "";

  if (action === "defer") {
    if (threadId) {
      await supabase.from("conversation_threads").update({
        conversation_state: "booking_deferred",
        needs_human_review: false,
      }).eq("id", threadId);
    }
    if (contactId) {
      await updateContactCrmStateSafely({
        supabase,
        contactId,
        businessId,
        requestedStage: "new",
        requestedStatus: "new_lead",
        reason: "booking_defer_guardrail",
      });
    }
    return `${prefix}no problem — I won't book anything yet. When you're ready, send the class/day that works.`;
  }

  if (action === "cancel") {
    if (threadId) {
      await supabase.from("conversation_threads").update({
        conversation_state: "pending_cancellation",
        needs_human_review: true,
      }).eq("id", threadId);
    }
    if (businessId) {
      await supabase.from("automation_logs").insert({
        business_id: businessId,
        automation_type: "booking_guardrail_human_review",
        status: "warning",
        processed_data: { action, contact_id: contactId, thread_id: threadId, booking_id: booking?.id ?? null, mutation: "blocked_pending_human_review" },
      });
    }
    return booking
      ? `${prefix}I’ll have the team check that booking and help with the change. What day/time would work better?`
      : `${prefix}you're not booked yet — I don't see a confirmed booking here. If you want a time, send the class/day that works.`;
  }

  if (action === "status") {
    if (threadId) {
      await supabase.from("conversation_threads").update({ conversation_state: "booking_status_checked" }).eq("id", threadId);
    }
    return booking
      ? `${prefix}yes — I see a confirmed class booking on ${booking.booking_date}. The team will expect you.`
      : `${prefix}I don't see a confirmed booking yet. Send the class/day you want and I can help set it up.`;
  }

  return null;
}

// ─── Intent Detection (Component 4) ──────────────────────────────────────────
const BUYING_SIGNALS = [
  "sign up","signup","join","how do i start","want to try","trial","free class",
  "book","schedule","register","when can i come","first class","how to join",
  "i want","ready to","lets do","let's do",
  // MMA competition signals — high-intent fighters looking for a competitive gym
  "compete","competitive gym","fight team","competitive team","amateur fighter","pro fighter",
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
    ? `URGENCY 9-10: Answer directly, then move to booking or human help only if truly needed.`
    : urgency >= 6
    ? `URGENCY ${urgency}: Skip small talk. Answer accurately and move toward booking in 1-2 messages.`
    : `URGENCY ${urgency}: Answer accurately, then move toward a free trial or ask the one missing detail.`;

  const intentInstruction = {
    BUYING:       "INTENT: BUYING — They want to start. Remove friction. Give them one clear next step.",
    INFO_SEEKING: "INTENT: INFO-SEEKING — Answer their question directly first, then advance toward trial.",
    PROBLEM:      "INTENT: PROBLEM — Empathize first, answer if possible, and only escalate for safety/injury/legal/account issues.",
    ROUTINE:      "INTENT: ROUTINE — Answer directly. Keep it natural and move toward a trial if appropriate.",
    REJECTION:    "INTENT: REJECTION — Accept gracefully. One sentence. Do not pitch or follow up.",
    ESCALATION:   "INTENT: ESCALATION — They explicitly want a human. Acknowledge and say someone will reach out. Stop.",
  }[intent];

  const handoffInstruction = msgCount >= MAX_MESSAGES_BEFORE_HANDOFF
    ? `\nLONG THREAD: Still answer the question. If the lead has given enough detail, move to a free-trial booking. Only hand off if they ask for a person or the answer is unavailable.`
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
- Use the loaded schedule and knowledge base as source of truth. Do not invent or give partial class schedules when a full matching schedule is loaded.
- Do not refer leads to Scott for normal program, schedule, pricing, waiver, or first-class questions. Answer them and move toward booking.
- Human handoff is only for explicit human request, injury/safety/legal/account issue, or genuinely missing information.

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

TRANSFER / BOOKING RULE:
- The job is to set appointments and answer accurately, not offload normal questions.
- Natural close: "Want to try a free class?" or "What day works?"
- Default next step = book a free trial class.
- If the lead agrees to a specific class/day/time, confirm it as booked: "You're booked for [class] [day] at [time]. We'll let the team know to expect you."
- After agreement, NEVER send a booking link or tell them to book themselves; the system records the appointment and notifies staff.
- If they want a trial but no exact class/day/time is clear, ask for the one missing detail instead of sending a link.
- Only transfer when rules above say human handoff is required.

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

// ─── OpenAI Direct Fallback ───────────────────────────────────────────────────
async function callOpenAI(
  messages: Array<{role: string; content: string}>,
  apiKey: string,
  model = "gpt-4o-mini",
  maxTokens = 120,
  temperature = 0.7
): Promise<string> {
  const isGpt5 = /^gpt-5/i.test(model);
  const body = isGpt5
    ? { model, messages, max_completion_tokens: Math.max(maxTokens, 512) }
    : { model, messages, max_tokens: maxTokens, temperature };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${model} error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

async function callPrimaryResponseModel(
  model: string,
  messages: Array<{role: string; content: string}>,
  openRouterKey: string,
  maxTokens = 120,
  temperature = 0.3
): Promise<string> {
  if (model === "gpt-5.5" || model === "openai/gpt-5.5") {
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) throw new Error("OPENAI_API_KEY not configured for direct OpenAI response model");
    return callOpenAI(messages, openAiKey, "gpt-5.5", maxTokens, temperature);
  }
  if (model.startsWith("openai-direct/")) {
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) throw new Error("OPENAI_API_KEY not configured for direct OpenAI response model");
    return callOpenAI(messages, openAiKey, model.replace("openai-direct/", ""), maxTokens, temperature);
  }
  return callLLM(model, messages, openRouterKey, maxTokens, temperature);
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
      MODEL_EVAL,
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
 * Enroll thread in re-engagement using fightflow_sequence_steps.
 * Type: 'no_reply' (20min, 2hr) or 'mid_convo_drop' (15min).
 * Uses step_name = 'reengage_no_reply' (indexed, cancelable when lead replies).
 */
async function scheduleReEngagement(
  supabase: ReturnType<typeof createClient>,
  threadId: string,
  _businessId: string,
  type: "no_reply" | "mid_convo_drop"
): Promise<boolean> {
  // Check if re-engagement already pending for this thread
  const { data: existing } = await supabase
    .from("fightflow_sequence_steps")
    .select("id")
    .eq("appointment_id", threadId)
    .eq("step_name", "reengage_no_reply")
    .eq("status", "pending")
    .limit(1);

  if (existing && existing.length > 0) {
    console.log("Re-engagement already scheduled for thread", threadId);
    return true;
  }

  const delays = type === "no_reply"
    ? [20 * 60 * 1000, 2 * 60 * 60 * 1000]     // 20 min, 2 hr
    : [15 * 60 * 1000];                           // 15 min

  const now = Date.now();
  const rows = delays.map((d, i) => ({
    appointment_id: threadId,
    step_name: "reengage_no_reply",
    step_order: i + 1,
    channel: "sms",
    status: "pending",
    scheduled_for: new Date(now + d).toISOString(),
    message_content: "Hey, just checking in — still interested in trying a class at Fight Flow? 🥊",
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("fightflow_sequence_steps").insert(rows);
  if (error) {
    console.error("Re-engagement schedule error:", error.message);
    await supabase.from("automation_logs").insert({
      business_id: _businessId,
      automation_type: "fightflow_reengagement_schedule_failed",
      status: "error",
      error_message: error.message,
      processed_data: { thread_id: threadId, table: "fightflow_sequence_steps", type },
    });
    return false;
  } else {
    console.log(`Re-engagement (${type}) scheduled: ${delays.length} attempt(s) for thread ${threadId}`);
    return true;
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Parse request BEFORE try so catch block can access it ──────────────────
  let messages: any[];
  let businessId: string;
  let businessContext: any;
  let classSchedule: any;
  let scheduleText: string;
  let contactName: string;
  let contactPhone: string;
  let threadId: string;
  let knowledgeBase: any;
  let latestMessage = "";
  let latestScheduleText = "";
  let latestKnowledgeText = "";

  try {
    ({
      messages,
      businessId,
      businessContext,
      classSchedule,
      scheduleText,
      contactName,
      contactPhone,
      threadId,
      knowledgeBase,
    } = await req.json());
    latestMessage = messages?.[messages.length - 1]?.content ?? "";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SERVICE_ROLE_JWT") ?? ""
    );

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID") || Deno.env.get("TWILIO_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER") || "+191****2900";

    // ── Build context ────────────────────────────────────────────────────────
    const msgCount: number = messages?.filter((m: any) => m.role === "user").length ?? 0;
    const schedule = Array.isArray(classSchedule) && classSchedule.length > 0
      ? formatSchedule(classSchedule)
      : (typeof scheduleText === "string" && scheduleText.trim() ? scheduleText.trim() : formatSchedule([]));
    const knowledgeText = typeof knowledgeBase === "string"
      ? knowledgeBase
      : Array.isArray(knowledgeBase)
        ? knowledgeBase.map((k: any) => `${k.title}: ${k.content}`).join("\n")
        : "";
    latestScheduleText = schedule;
    latestKnowledgeText = knowledgeText;

    // ── Deterministic guardrails for known high-risk states/categories ───────
    const bookingGuardrailAction = detectBookingGuardrail(latestMessage);
    const bookingGuardrailMessage = await applyBookingGuardrail({
      supabase,
      action: bookingGuardrailAction,
      threadId,
      businessId,
      contactName,
    });
    if (bookingGuardrailMessage) {
      const responseText = truncate(bookingGuardrailMessage, MAX_CHARS);
      await logSpeedToLeadResponse({
        supabase,
        businessId,
        threadId,
        intent: "BOOKING_GUARDRAIL",
        urgency: 3,
        tier: "guardrail",
        msgCount,
        response: responseText,
        guardrail: bookingGuardrailAction ?? "booking_guardrail",
      });
      return new Response(JSON.stringify({
        message: responseText,
        intent: "ROUTINE",
        urgency: 3,
        tier: "T1",
        shouldHandoff: bookingGuardrailAction === "cancel",
        handoffSent: false,
        reengagementScheduled: false,
        shouldBook: false,
        classDetails: null,
        detectedIntents: ["BOOKING_GUARDRAIL"],
        evaluation: { enabled: false, tier: "guardrail" },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const priorBookedMessage = (messages || [])
      .filter((m: any) => m.role === "assistant" && /booked for|you're booked|you are booked/i.test(m.content || ""))
      .map((m: any) => m.content || "")
      .pop();
    if (priorBookedMessage && /\b(trained before|experience|experienced|trained)\b/i.test(latestMessage)) {
      const bookedMatch = priorBookedMessage.match(/booked for\s+([^\.]+)|you're booked for\s+([^\.]+)|you are booked for\s+([^\.]+)/i);
      const bookedText = (bookedMatch?.[1] || bookedMatch?.[2] || bookedMatch?.[3] || "your class").trim();
      const responseText = truncate(`Great — we'll see you for ${bookedText}. Bring any gear you have; the team will expect you.`, MAX_CHARS);
      await logSpeedToLeadResponse({
        supabase,
        businessId,
        threadId,
        intent: "BOOKING_CONTEXT_GUARDRAIL",
        urgency: 3,
        tier: "guardrail",
        msgCount,
        response: responseText,
        guardrail: "booking_context_retention",
      });
      return new Response(JSON.stringify({
        message: responseText,
        intent: "ROUTINE",
        urgency: 3,
        tier: "T1",
        shouldHandoff: false,
        handoffSent: false,
        reengagementScheduled: false,
        shouldBook: false,
        classDetails: null,
        detectedIntents: ["BOOKING_CONTEXT_GUARDRAIL"],
        evaluation: { enabled: false, tier: "guardrail" },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const deterministicMessage = deterministicFallbackResponse(latestMessage, schedule, knowledgeText, classSchedule ?? []);
    if (deterministicMessage) {
      const responseText = truncate(deterministicMessage, MAX_CHARS);
      await logSpeedToLeadResponse({
        supabase,
        businessId,
        threadId,
        intent: "INFO_SEEKING",
        urgency: 4,
        tier: "guardrail",
        msgCount,
        response: responseText,
        guardrail: "deterministic_fallback",
      });
      return new Response(JSON.stringify({
        message: responseText,
        intent: "INFO_SEEKING",
        urgency: 4,
        tier: "T1",
        shouldHandoff: false,
        handoffSent: false,
        reengagementScheduled: false,
        shouldBook: false,
        classDetails: null,
        detectedIntents: ["DETERMINISTIC_FALLBACK"],
        evaluation: { enabled: false, tier: "guardrail" },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Intent & urgency ─────────────────────────────────────────────────────
    const intent = detectIntent(latestMessage);
    const urgency = scoreUrgency(latestMessage, intent, msgCount);
    const tier = selectTier(urgency, msgCount, intent);
    // Only hand off when the lead explicitly asks for a human or the issue is unsafe/legal/account-risk.
    // Do not offload normal schedule/pricing/program questions; answer and book the trial.
    const shouldHandoff = intent === "ESCALATION" || intent === "PROBLEM";

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
          .from("fightflow_sequence_steps")
          .update({ status: "cancelled" })
          .eq("appointment_id", threadId)
          .eq("step_name", "reengage_no_reply")
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
    let aiMessage = await callPrimaryResponseModel(
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

      // ── SPA-881: Create mc_task in Mission Control for hot lead visibility ──
      // Idempotency: one mc_task per thread handoff (keyed by threadId via external_id)
      if (threadId) {
        try {
          const mcTaskExternalId = `fightflow-handoff-${threadId}`;

          // Check for existing open task for this thread
          const { data: existingTasks, error: lookupErr } = await supabase
            .from("mc_tasks")
            .select("id")
            .eq("external_id", mcTaskExternalId)
            .in("status", ["inbox", "todo", "in_progress"])
            .limit(1);

          if (lookupErr) {
            console.error("[ai-response] mc_task lookup error:", lookupErr.message);
          } else if (!existingTasks?.length) {
            // Build transcript for mc_task description
            const transcriptLines = (Array.isArray(messages) ? messages : [])
              .slice(-6)
              .map((m: { role: string; content: string }) =>
                `${m.role === "user" ? "Lead" : "AI"}: ${m.content}`
              )
              .join("\n");

            const { error: insertErr } = await supabase.from("mc_tasks").insert({
              title: `🔥 Hot lead: ${contactName ?? contactPhone ?? "Unknown"} — urgency ${urgency}/10`,
              description: `Phone: ${contactPhone ?? "unknown"}\nUrgency: ${urgency}/10\nIntent: ${intent}\nMessages exchanged: ${msgCount}\nService: ${serviceType}\n\nTranscript (last 6 msgs):\n${transcriptLines}`,
              priority: urgency >= 9 ? "critical" : "high",
              status: "inbox",
              tags: ["owner:scott", "fightflow", "hot-lead"],
              business_id: businessId ?? null,
              external_id: mcTaskExternalId,
              external_source: "fightflow-chatbot",
            });

            if (insertErr) {
              console.error("[ai-response] mc_task insert error:", insertErr.message);
            } else {
              console.log(`[ai-response] ✅ mc_task created for hot lead: ${contactName ?? contactPhone} (urgency ${urgency})`);
            }
          } else {
            console.log(`[ai-response] mc_task already open for thread ${threadId}, skipping`);
          }
        } catch (mcTaskErr: any) {
          // Non-blocking: never let mc_task failures affect the SMS response
          console.error("[ai-response] mc_task creation failed (non-blocking):", mcTaskErr.message);
        }
      }
    }

    // ── Re-engagement scheduling ──────────────────────────────────────────────
    // Schedule re-engagement for new outbound responses (not handoffs / rejections)
    let reengagementScheduled = false;
    if (threadId && businessId && !shouldHandoff && !isQuietHours()) {
      const reType = msgCount > 1 ? "mid_convo_drop" : "no_reply";
      reengagementScheduled = await scheduleReEngagement(supabase, threadId, businessId, reType);
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
    await logSpeedToLeadResponse({
      supabase,
      businessId,
      threadId,
      intent,
      urgency,
      tier,
      msgCount,
      handoffSent,
      reengagementScheduled,
      response: aiMessage,
    });

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
      evaluation: { enabled: true, tier, responseModel: primaryModel },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("ai-response fatal:", error);

    const deterministicMessage = deterministicFallbackResponse(latestMessage, latestScheduleText, latestKnowledgeText);
    if (deterministicMessage) {
      return new Response(JSON.stringify({
        message: truncate(deterministicMessage, MAX_CHARS),
        intent: "INFO_SEEKING",
        urgency: 4,
        tier: "T1",
        shouldHandoff: false,
        handoffSent: false,
        reengagementScheduled: false,
        shouldBook: false,
        classDetails: null,
        detectedIntents: ["DETERMINISTIC_ERROR_FALLBACK"],
        evaluation: { enabled: false, tier: "guardrail" },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // RETRY: Try once with OpenAI direct before giving up.
    // OpenRouter can fail for credits/provider routing; direct OpenAI keeps speed-to-lead alive.
    try {
      console.log("[ai-response] Retrying with direct OpenAI fallback...");
      const openAiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openAiKey) throw new Error("No OPENAI_API_KEY for fallback");
      const backupMessages: Array<{role: string; content: string}> = [
        {
          role: "system",
          content: `You are a lead responder for Fight Flow Academy, an MMA & fitness gym in Raleigh-Durham, NC. Sound like a real person texting. Max 160 chars. Answer directly, then ask one follow-up question. If the lead agrees to a specific class/day/time, confirm they are booked and say the team will expect them. Never send a booking link after agreement. RESPOND ONLY with the SMS text. No quotes. No labels.`
        },
        { role: "user", content: latestMessage || "I'm interested in your gym" }
      ];
      
      const backupResponse = await callOpenAI(backupMessages, openAiKey, "gpt-4o-mini", 120, 0.7);
      if (backupResponse && backupResponse.length > 5) {
        return new Response(JSON.stringify({
          message: truncate(backupResponse, MAX_CHARS),
          intent: "ROUTINE",
          urgency: 3,
          tier: "T1",
          shouldHandoff: false,
          handoffSent: false,
          reengagementScheduled: false,
          shouldBook: false,
          classDetails: null,
          detectedIntents: ["ROUTINE"],
          evaluation: { enabled: false, tier: "T1" },
          _retried: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (retryError: any) {
      console.error("[ai-response] Backup model also failed:", retryError.message);
    }

    // LAST RESORT: Return null so caller uses personalized fallback
    return new Response(JSON.stringify({
      message: null,
      error: error.message,
      useFallback: true,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
