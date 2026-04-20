import { createClient } from 'npm:@supabase/supabase-js@2';

// === INLINED: _shared/retry.ts ===
/**
 * Retry utility with exponential backoff
 * 
 * Usage:
 * const result = await withRetry(() => riskyOperation(), {
 *   maxAttempts: 3,
 *   initialDelayMs: 1000,
 *   maxDelayMs: 10000,
 *   backoffMultiplier: 2
 * });
 */

interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  shouldRetry: () => true,
  onRetry: () => {},
};

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry
      if (attempt >= opts.maxAttempts || !opts.shouldRetry(lastError)) {
        throw lastError;
      }

      // Log retry attempt
      opts.onRetry(lastError, attempt);
      console.log(`Retry attempt ${attempt}/${opts.maxAttempts} after ${delay}ms. Error: ${lastError.message}`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Check if an error is likely transient (worth retrying)
 */
function isTransientError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Network-related errors
  if (message.includes('network') || 
      message.includes('timeout') || 
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('socket hang up')) {
    return true;
  }

  // Rate limiting
  if (message.includes('rate limit') || 
      message.includes('too many requests') ||
      message.includes('429')) {
    return true;
  }

  // Temporary server errors
  if (message.includes('500') || 
      message.includes('502') || 
      message.includes('503') || 
      message.includes('504')) {
    return true;
  }

  return false;
}

/**
 * Preset for SMS sending (Twilio)
 */
const SMS_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  shouldRetry: isTransientError,
  onRetry: (error, attempt) => {
    console.log(`SMS retry ${attempt}: ${error.message}`);
  }
};

/**
 * Preset for email sending (Resend)
 */
const EMAIL_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  shouldRetry: isTransientError,
  onRetry: (error, attempt) => {
    console.log(`Email retry ${attempt}: ${error.message}`);
  }
};

/**
 * Preset for social posting (Late API)
 */
const SOCIAL_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 2, // Less aggressive for social posts
  initialDelayMs: 2000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  shouldRetry: (error) => {
    // Don't retry auth errors
    if (error.message.includes('token') || 
        error.message.includes('expired') ||
        error.message.includes('unauthorized')) {
      return false;
    }
    return isTransientError(error);
  },
  onRetry: (error, attempt) => {
    console.log(`Social post retry ${attempt}: ${error.message}`);
  }
};

// === INLINED: _shared/follow-up.ts ===
/**
 * Follow-Up System Utilities
 * 
 * Shared functions for enrolling contacts in follow-up sequences.
 */


type FollowUpTrigger = 
  | 'new_lead' 
  | 'no_response' 
  | 'missed_class' 
  | 'attended_no_signup' 
  | 'conversation_dropped';

interface EnrollOptions {
  contactId: string;
  businessId: string;
  trigger: FollowUpTrigger;
  /** Override the default delay for the first step (in hours) */
  initialDelayHours?: number;
}

/**
 * Enroll a contact in a follow-up sequence.
 * 
 * This will:
 * 1. Find the active sequence for the trigger type and business
 * 2. Check if contact is already enrolled (skip if so)
 * 3. Create the enrollment with next_step_due_at calculated
 * 
 * @returns true if enrolled, false if already enrolled or no sequence exists
 */
async function enrollInFollowUp(
  supabase: SupabaseClient,
  options: EnrollOptions
): Promise<{ enrolled: boolean; reason?: string }> {
  const { contactId, businessId, trigger, initialDelayHours } = options;

  console.log(`📋 Attempting to enroll contact ${contactId} in ${trigger} sequence`);

  // Find active sequence for this trigger and business
  const { data: sequence, error: seqError } = await supabase
    .from('follow_up_sequences')
    .select('id')
    .eq('business_id', businessId)
    .eq('trigger_type', trigger)
    .eq('is_active', true)
    .single();

  if (seqError || !sequence) {
    console.log(`📋 No active ${trigger} sequence for business ${businessId}`);
    return { enrolled: false, reason: 'no_sequence' };
  }

  // Check if already enrolled in this sequence
  const { data: existing } = await supabase
    .from('contact_follow_ups')
    .select('id, status')
    .eq('contact_id', contactId)
    .eq('sequence_id', sequence.id)
    .single();

  if (existing && existing.status === 'active') {
    console.log(`📋 Contact already enrolled in ${trigger} sequence`);
    return { enrolled: false, reason: 'already_enrolled' };
  }

  // Get the first step to calculate initial delay
  const { data: firstStep } = await supabase
    .from('follow_up_steps')
    .select('delay_hours')
    .eq('sequence_id', sequence.id)
    .eq('step_order', 1)
    .single();

  const delayHours = initialDelayHours ?? firstStep?.delay_hours ?? 24;
  const nextStepDue = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();

  // Create or update enrollment
  if (existing) {
    // Re-enroll (was completed/paused/responded before)
    const { error: updateError } = await supabase
      .from('contact_follow_ups')
      .update({
        status: 'active',
        current_step: 0,
        enrolled_at: new Date().toISOString(),
        next_step_due_at: nextStepDue,
        last_step_sent_at: null,
        completed_at: null,
        pause_reason: null,
      })
      .eq('id', existing.id);

    if (updateError) {
      console.error(`📋 Failed to re-enroll: ${updateError.message}`);
      return { enrolled: false, reason: 'update_error' };
    }
  } else {
    // New enrollment
    const { error: insertError } = await supabase
      .from('contact_follow_ups')
      .insert({
        contact_id: contactId,
        sequence_id: sequence.id,
        business_id: businessId,
        status: 'active',
        current_step: 0,
        next_step_due_at: nextStepDue,
      });

    if (insertError) {
      // Handle unique constraint violation (race condition)
      if (insertError.code === '23505') {
        console.log(`📋 Contact already enrolled (race condition)`);
        return { enrolled: false, reason: 'already_enrolled' };
      }
      console.error(`📋 Failed to enroll: ${insertError.message}`);
      return { enrolled: false, reason: 'insert_error' };
    }
  }

  console.log(`✅ Contact ${contactId} enrolled in ${trigger} sequence, first step due: ${nextStepDue}`);
  return { enrolled: true };
}

/**
 * Pause a contact's follow-up when they respond.
 * 
 * Call this when a contact sends a message (in sms-webhook) to stop
 * the automated sequence and let the conversation flow naturally.
 */
async function pauseFollowUpOnResponse(
  supabase: SupabaseClient,
  contactId: string
): Promise<void> {
  const { data: activeFollowUps, error } = await supabase
    .from('contact_follow_ups')
    .select('id')
    .eq('contact_id', contactId)
    .eq('status', 'active');

  if (error || !activeFollowUps || activeFollowUps.length === 0) {
    return; // No active follow-ups to pause
  }

  console.log(`⏸️ Pausing ${activeFollowUps.length} follow-up(s) for contact ${contactId} due to response`);

  await supabase
    .from('contact_follow_ups')
    .update({
      status: 'responded',
      pause_reason: 'Contact responded',
    })
    .eq('contact_id', contactId)
    .eq('status', 'active');
}

/**
 * Cancel all follow-ups for a contact (e.g., when they convert or opt out).
 */
async function cancelFollowUps(
  supabase: SupabaseClient,
  contactId: string,
  reason: string
): Promise<void> {
  await supabase
    .from('contact_follow_ups')
    .update({
      status: 'cancelled',
      pause_reason: reason,
    })
    .eq('contact_id', contactId)
    .eq('status', 'active');
}

// === END INLINED ===

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========================================
// STOP/UNSUBSCRIBE KEYWORDS - CHECK FIRST!
// ========================================
const STOP_KEYWORDS = [
  'stop', 'unsubscribe', 'cancel', 'remove', 'quit', 'end',
  'optout', 'opt out', 'opt-out', 'leave me alone', 'stop texting',
  'do not contact', 'don\'t contact', 'dont contact'
];

function isStopRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();
  return STOP_KEYWORDS.some(keyword => 
    lowerMessage === keyword || 
    lowerMessage.startsWith(keyword + ' ') ||
    lowerMessage.endsWith(' ' + keyword)
  );
}

// ========================================
// SPAM/AUTOMATED MESSAGE FILTER
// ========================================
const SPAM_PATTERNS = [
  /^https?:\/\/static\.wixstatic\.com/i,  // Wix image URLs
  /^https?:\/\/.*wix.*\.(png|jpg|jpeg|gif|webp|mp4)/i,  // Other Wix media
  /^https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp)(\?[^\s]*)?$/i,  // Pure image URLs
];

function isSpamMessage(message: string): boolean {
  const trimmed = message.trim();
  // Skip if message is just a URL matching spam patterns
  return SPAM_PATTERNS.some(pattern => pattern.test(trimmed));
}

// ========================================
// INSTRUCTOR CONFIG & RESPONSE HANDLER
// ========================================

const INSTRUCTOR_CONFIG = [
  { name: "Anthony Bui", phone: "+19198181415" },
  { name: "Damien Robinson", phone: "+19195210630" },
  { name: "Daison Reich", phone: "+16363285065" },
  { name: "Aileen Rossouw", phone: "+19727541242" },
  { name: "Courtney", phone: "+19197587325" },
  { name: "Adam Avendano", phone: "+18633263431" },
  { name: "James", phone: "+18159157802" },
  { name: "Mavrick Vo", phone: "+19197254644" },
];

async function handleInstructorResponse(
  instructor: { name: string; phone: string },
  body: string,
  supabase: any
): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  const instructorFirstName = instructor.name.split(' ')[0];
  console.log(`👩‍🏫 Instructor response from ${instructor.name}: "${body}"`);

  try {
    // 1. Find most recent post_class check for this instructor (within 8 hours)
    const { data: checks, error: checkErr } = await supabase
      .from('fightflow_instructor_checks')
      .select('*')
      .eq('instructor_phone', instructor.phone)
      .eq('check_type', 'post_class')
      .is('attendance_confirmed', null)
      .gte('created_at', new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (checkErr) {
      console.error('Error fetching instructor check:', checkErr.message);
    }

    const check = checks?.[0];

    if (!check) {
      console.log(`No pending post_class check found for ${instructor.name} in the last 8 hours`);
      // Still reply gracefully
      await sendTwilioSMS(instructor.phone, `Thanks ${instructorFirstName}! We don't have a pending check right now, but we appreciate the reply! 🙌`);
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' } }
      );
    }

    // 2. Parse response
    const normalized = body.trim().toLowerCase();
    const isYes = normalized.startsWith('y');
    const isNo = normalized.startsWith('n');

    if (!isYes && !isNo) {
      console.log(`Unrecognized instructor response: "${body}"`);
      await sendTwilioSMS(instructor.phone, `Got it — can you reply YES or NO?`);
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' } }
      );
    }

    // 3. Update check record
    const attendanceConfirmed = isYes;
    await supabase
      .from('fightflow_instructor_checks')
      .update({
        attendance_confirmed: attendanceConfirmed,
        response: body,
        responded_at: new Date().toISOString(),
      })
      .eq('id', check.id);

    console.log(`✅ Updated check ${check.id}: attendance_confirmed=${attendanceConfirmed}`);

    if (isYes) {
      // 4. If YES → trigger day+1 follow-up
      const studentFirstName = (check.student_name || '').split(' ')[0];
      const day1Message = `Hey ${studentFirstName}! Hope your first class at Fight Flow was amazing! How did it feel? 🥊`;

      // Try to find existing day+1 sequence step for this appointment
      const { data: existingStep } = await supabase
        .from('fightflow_sequence_steps')
        .select('*')
        .eq('appointment_id', check.appointment_id)
        .eq('step_name', 'day_plus_1')
        .in('status', ['pending', 'scheduled'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingStep) {
        // Accelerate: schedule for 30 minutes from now
        const fireAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        await supabase
          .from('fightflow_sequence_steps')
          .update({ scheduled_for: fireAt })
          .eq('id', existingStep.id);
        console.log(`⏩ Accelerated day+1 step ${existingStep.id} → fires at ${fireAt}`);
      } else {
        // Create a new day+1 step
        const fireAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        await supabase
          .from('fightflow_sequence_steps')
          .insert({
            appointment_id: check.appointment_id,
            step_name: 'day_plus_1',
            step_order: 1,
            channel: 'sms',
            scheduled_for: fireAt,
            status: 'pending',
            message_content: day1Message,
          });
        console.log(`📝 Created new day+1 step for appointment ${check.appointment_id}`);
      }

      // Reply to instructor
      await sendTwilioSMS(instructor.phone, `Thanks ${instructorFirstName}! Got it. 🙌`);

    } else {
      // If NO → update, reply to instructor
      await sendTwilioSMS(instructor.phone, `Thanks ${instructorFirstName}! We'll follow up with them.`);
    }

  } catch (err: any) {
    console.error('Instructor handler error:', err.message);
  }

  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' } }
  );
}

async function sendTwilioSMS(to: string, message: string): Promise<void> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || Deno.env.get('TWILIO_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioFromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !twilioFromNumber) {
    console.error('Missing Twilio credentials for instructor reply');
    return;
  }

  const params = new URLSearchParams({ From: twilioFromNumber, To: to, Body: message });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    console.error(`Twilio instructor reply failed: ${res.status} ${await res.text()}`);
  } else {
    const r = await res.json();
    console.log(`📱 Instructor reply sent to ${to}, SID: ${r.sid}`);
  }
}

// Phone normalization function for E.164 format
function normalizePhoneNumber(phoneNumber: string): string | null {
  if (!phoneNumber) return null;

  // Remove all non-numeric characters except leading +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // If already has +, keep it
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Remove all non-numeric characters
  const digits = phoneNumber.replace(/\D/g, '');

  if (digits.length === 10) {
    return '+1' + digits;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return '+' + digits;
  }

  return phoneNumber;
}

/**
 * Find or create a contact using HubSpot-style deduplication
 */
async function findOrCreateContact(
  supabase: any,
  businessId: string,
  phone: string
): Promise<{ id: string; business_id: string; isNew: boolean; email?: string; first_name?: string; last_name?: string; preferred_channel?: string; tags?: string[] }> {

  const normalizedPhone = normalizePhoneNumber(phone);
  console.log(`Looking up contact: phone=${normalizedPhone}, businessId=${businessId}`);

  const { data: existingContact, error: lookupError } = await supabase
    .from('contacts')
    .select('id, business_id, first_name, last_name, email, phone, preferred_channel, tags')
    .eq('business_id', businessId)
    .eq('phone', normalizedPhone)
    .single();

  if (existingContact) {
    console.log(`Found existing contact: ${existingContact.id} (${existingContact.first_name} ${existingContact.last_name})`);
    return { ...existingContact, isNew: false };
  }

  if (normalizedPhone !== phone) {
    const { data: altContact } = await supabase
      .from('contacts')
      .select('id, business_id, first_name, last_name, email, phone, preferred_channel, tags')
      .eq('business_id', businessId)
      .eq('phone', phone)
      .single();

    if (altContact) {
      console.log(`Found existing contact (alt format): ${altContact.id}`);
      return { ...altContact, isNew: false };
    }
  }

  console.log(`No existing contact found, creating new contact for business ${businessId}`);

  const { data: newContact, error: createError } = await supabase
    .from('contacts')
    .insert({
      business_id: businessId,
      phone: normalizedPhone,
      source: 'sms_inbound',
      status: 'new_lead',
      first_name: 'SMS Contact',
      sms_status: 'active'
    })
    .select('id, business_id, tags')
    .single();

  if (createError) {
    throw new Error(`Failed to create contact: ${createError.message}`);
  }

  console.log(`Created new contact: ${newContact.id}`);
  return { ...newContact, isNew: true };
}

// ========================================
// SMS BOOKING DETECTION & RECORDING
// ========================================

function mapServiceName(rawService: string): string {
  const lower = rawService.toLowerCase();
  if (lower.includes('muay thai')) return 'Muay Thai';
  if (lower.includes('boxing bootcamp') || lower.includes('boxing boot camp')) return 'Boxing Bootcamp';
  if (lower.includes('boxing skills') || lower.includes('boxing class')) return 'Boxing Skills';
  if (lower.includes('kickboxing')) return 'Kickboxing Bootcamp';
  if (lower.includes('grappling') || lower.includes('bjj') || lower.includes('submission')) return 'Submission Grappling';
  if (lower.includes('mma') || lower.includes('mixed martial arts')) return 'MMA Skills and Sparring';
  if (lower.includes('self defense') || lower.includes('self-defense')) return 'Self Defense';
  // kids/youth/junior or unrecognized — return as-is
  return rawService;
}

function computeNextOccurrenceET(dayOfWeekStr: string, timeStr: string): Date | null {
  const dayMap: Record<string, number> = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6
  };

  const targetDayNum = dayMap[dayOfWeekStr.toLowerCase()];
  if (targetDayNum === undefined) return null;

  // Parse time string like "6:00 PM" or "6 PM"
  const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!timeMatch) return null;

  let hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2] || '0');
  const ampm = timeMatch[3].toUpperCase();

  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  // Get current date components in Eastern time
  const now = new Date();
  const etDateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);

  const etYear = parseInt(etDateParts.find(p => p.type === 'year')!.value);
  const etMonth = parseInt(etDateParts.find(p => p.type === 'month')!.value) - 1; // 0-indexed
  const etDay = parseInt(etDateParts.find(p => p.type === 'day')!.value);

  // Current day of week in ET
  const currentDayNum = new Date(etYear, etMonth, etDay).getDay();

  // Days until target — STRICTLY positive (minimum 1 day from now)
  let daysUntil = targetDayNum - currentDayNum;
  if (daysUntil <= 0) daysUntil += 7;

  // Target date in ET (JS handles month overflow automatically)
  const targetEtDay = etDay + daysUntil;

  // Convert ET date+time to UTC using offset trick:
  // 1. Start with approx UTC assuming UTC-5 (EST)
  // 2. Check what ET actually shows for that UTC moment
  // 3. Adjust by the difference (handles both EDT -4 and EST -5)
  const approxUtc = new Date(Date.UTC(etYear, etMonth, targetEtDay, hours + 5, minutes));

  const etCheckParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(approxUtc);

  const checkHour = parseInt(etCheckParts.find(p => p.type === 'hour')!.value);
  const checkMinute = parseInt(etCheckParts.find(p => p.type === 'minute')!.value);

  // Adjust: desired ET time - actual ET time (in minutes)
  const desiredMinutes = hours * 60 + minutes;
  const actualMinutes = checkHour * 60 + checkMinute;
  const diffMs = (desiredMinutes - actualMinutes) * 60 * 1000;

  return new Date(approxUtc.getTime() + diffMs);
}

async function detectBookingConfirmation(
  aiResponse: string,
  conversationContext: Array<{ role: string; content: string }>
): Promise<{ is_booking: boolean; service?: string; day?: string; time?: string }> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    console.log('📅 No OpenAI key — skipping booking detection');
    return { is_booking: false };
  }

  const contextText = conversationContext.slice(-3)
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Does this AI response confirm a specific class booking? Look for confirmation of: a service type, a day of week, and a time. If all three are present, extract them. Respond ONLY as JSON: { "is_booking": true, "service": "...", "day": "Monday", "time": "6:00 PM" } or { "is_booking": false }. Be conservative — only return true if ALL THREE (service, day, time) are explicit.'
        },
        {
          role: 'user',
          content: `Conversation context:\n${contextText}\n\nAI response to classify:\n${aiResponse}`
        }
      ],
      max_tokens: 100,
      temperature: 0
    })
  });

  if (!response.ok) {
    console.error(`📅 Booking detection API error: ${response.status}`);
    return { is_booking: false };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '';

  try {
    // Strip possible markdown code fences
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    console.error('📅 Failed to parse booking detection JSON:', content);
    return { is_booking: false };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // PRE-TRY TRACE: log to a static endpoint to verify function even starts
  let _traceError = '';
  try { _traceError += 'URL:' + new URL(req.url).searchParams.get('test'); } catch(e: any) { _traceError += 'URL_ERR:' + e.message; }

  try {
    // ── Test mode: ?test=true uses fake business_id, skips Twilio sends ──────
    const url = new URL(req.url);
    const isTest = url.searchParams.get('test') === 'true';
    const testBusinessId = '00000000-0000-0000-0000-000000000000';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_JWT') ?? ''
    );

    // Parse Twilio webhook data
    const formData = await req.formData();
    const from = formData.get('From')?.toString() || '';
    const body = formData.get('Body')?.toString() || '';
    const to = formData.get('To')?.toString() || '';

    console.log('Incoming SMS:', { from, body: body.substring(0, 50), to });
    // TRACE 0: First possible trace point
    try { await supabase.from('automation_logs').insert({ business_id: isTest ? testBusinessId : '456dc53b-d9d9-41b0-bc33-4f4c4a791eff', automation_type: 'trace_0_start', status: 'info', error_message: `pre=${_traceError} from=${from} body=${body.substring(0,20)}` }); } catch(_e: any) { console.error('TRACE 0 FAIL:', _e.message); }

    // ── DEDUP: Skip if we already processed this exact message recently ──────
    const messageSid = formData.get('MessageSid')?.toString() || '';
    if (from && body) {
      try {
        const { data: recentMsgs } = await supabase
          .from('sms_messages')
          .select('id, created_at')
          .eq('direction', 'inbound')
          .eq('message', body)
          .limit(1)
          .order('created_at', { ascending: false });
          
        if (recentMsgs && recentMsgs.length > 0) {
          const msgAge = Date.now() - new Date(recentMsgs[0].created_at).getTime();
          if (msgAge < 60000) { // 60 second dedup window
            console.log('⏩ Duplicate inbound detected, skipping:', messageSid);
            return new Response(
              '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
              { headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' } }
            );
          }
        }
      } catch (dedupErr: any) {
        console.warn('Dedup check failed (non-fatal):', dedupErr.message);
      }
    }

    try { await supabase.from('automation_logs').insert({ business_id: isTest ? testBusinessId : '456dc53b-d9d9-41b0-bc33-4f4c4a791eff', automation_type: 'trace_2_dedup', status: 'info', error_message: `past dedup from=${from}` }); } catch(_e){}
    // ========================================
    // STEP 0: CHECK FOR STOP REQUEST FIRST!
    // ========================================
    if (isStopRequest(body)) {
      console.log('🛑 STOP request detected from:', from);
      
      // Find the contact
      let { data: smsConfig } = await supabase
        .from('sms_config')
        .select('business_id')
        .eq('phone_number', to)
        .eq('is_active', true)
        .single();

      if (!smsConfig) {
        const { data: defaultBusiness } = await supabase
          .from('businesses')
          .select('id')
          .limit(1)
          .single();
        smsConfig = { business_id: defaultBusiness?.id };
      }

      if (smsConfig?.business_id) {
        const normalizedPhone = normalizePhoneNumber(from);
        
        // Update contact to do_not_contact
        const { data: contact } = await supabase
          .from('contacts')
          .select('id, tags')
          .eq('business_id', smsConfig.business_id)
          .eq('phone', normalizedPhone)
          .single();

        if (contact) {
          const currentTags = contact.tags || [];
          const newTags = [...new Set([...currentTags, 'do_not_contact', 'sms_optout'])];
          
          await supabase
            .from('contacts')
            .update({ 
              tags: newTags,
              sms_status: 'opted_out'
            })
            .eq('id', contact.id);

          // Pause any active follow-ups
          await supabase
            .from('contact_follow_ups')
            .update({ status: 'paused' })
            .eq('contact_id', contact.id)
            .eq('status', 'active');

          // Close any open threads
          await supabase
            .from('conversation_threads')
            .update({ status: 'closed', conversation_state: 'opted_out' })
            .eq('contact_id', contact.id)
            .eq('status', 'active');

          console.log('🛑 Contact opted out:', contact.id);
        }

        // Log the opt-out
        await supabase.from('automation_logs').insert({
          business_id: smsConfig.business_id,
          automation_type: 'sms_optout',
          status: 'success',
          processed_data: { phone: normalizedPhone, message: body }
        });
      }

      // Send ONE confirmation - Twilio will handle this via TwiML
      const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>You've been unsubscribed and won't receive further messages. Reply START to resubscribe.</Message></Response>`;
      
      return new Response(twimlResponse, {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
      });
    }

    // ========================================
    // STEP 0.5: CHECK FOR SPAM/AUTOMATED MESSAGES
    // ========================================
    if (isSpamMessage(body)) {
      console.log('🚫 Spam message detected, ignoring:', body.substring(0, 50));
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' } }
      );
    }

    // ========================================
    // STEP 0.7: CHECK IF SENDER IS AN INSTRUCTOR
    // Route to instructor handler — NEVER to AI chatbot
    // ========================================
    const instructor = INSTRUCTOR_CONFIG.find(i => i.phone === from);
    if (instructor) {
      console.log(`👩‍🏫 Instructor message detected from ${instructor.name} (${from})`);
      return handleInstructorResponse(instructor, body, supabase);
    }

    // STEP 1: Determine which business this SMS is for
    let { data: smsConfig, error: configError } = await supabase
      .from('sms_config')
      .select('business_id, businesses(id, name)')
      .eq('phone_number', to)
      .eq('is_active', true)
      .single();

    if (configError || !smsConfig) {
      console.error('No SMS config found for Twilio number:', to);
      const { data: defaultBusiness } = await supabase
        .from('businesses')
        .select('id, name')
        .limit(1)
        .single();

      if (!defaultBusiness) {
        throw new Error(`No business configured for Twilio number: ${to}`);
      }

      smsConfig = {
        business_id: defaultBusiness.id,
        businesses: [defaultBusiness]
      } as typeof smsConfig;
    }

    const businessId = isTest ? testBusinessId : smsConfig!.business_id;
    const businessName = isTest ? 'TEST Business' : ((smsConfig!.businesses as any)?.[0]?.name || (smsConfig!.businesses as any)?.name || 'Unknown Business');
    console.log(`SMS for business: ${businessName} (${businessId})${isTest ? ' [TEST MODE]' : ''}`);
    try { await supabase.from('automation_logs').insert({ business_id: businessId, automation_type: 'trace_3_biz', status: 'info', error_message: `biz=${businessName}` }); } catch(_e){}

    // STEP 2: Find or create contact
    const contact = await findOrCreateContact(supabase, businessId, from);
    try { await supabase.from('automation_logs').insert({ business_id: businessId, automation_type: 'trace_4_contact', status: 'info', error_message: `cid=${contact?.id||'NULL'}` }); } catch(_e){}

    // ========================================
    // STEP 2.5: CHECK IF CONTACT IS BLOCKED
    // ========================================
    const contactTags = contact.tags || [];
    if (contactTags.includes('do_not_contact') || contactTags.includes('sms_optout')) {
      console.log('⚠️ Contact has do_not_contact tag, not responding:', contact.id);
      
      // Store the message but don't respond
      // (They may have texted START to resubscribe - handle that separately if needed)
      const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
      return new Response(twimlResponse, {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
      });
    }

    // Check if they're an active member - flag for human follow-up instead of AI
    if (contactTags.includes('active_member')) {
      console.log('ℹ️ Active member texted in - flagging for human follow-up');
      
      // Store the message
      const { data: existingThread } = await supabase
        .from('conversation_threads')
        .select('id')
        .eq('contact_id', contact.id)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let threadId = existingThread?.id;
      if (!threadId) {
        const { data: newThread } = await supabase
          .from('conversation_threads')
          .insert({
            contact_id: contact.id,
            business_id: businessId,
            status: 'active',
            conversation_state: 'needs_human_review',
            needs_human_review: true
          })
          .select('id')
          .single();
        threadId = newThread?.id;
      } else {
        await supabase
          .from('conversation_threads')
          .update({ needs_human_review: true, conversation_state: 'needs_human_review' })
          .eq('id', threadId);
      }

      if (threadId) {
        await supabase.from('sms_messages').insert({
          thread_id: threadId,
          contact_id: contact.id,
          direction: 'inbound',
          message: body,
          ai_response: false,
          business_id: businessId
        });
      }

      // Log for visibility
      await supabase.from('automation_logs').insert({
        business_id: businessId,
        automation_type: 'active_member_message',
        status: 'flagged',
        processed_data: { contact_id: contact.id, message_preview: body.substring(0, 100) }
      });

      // Don't auto-respond to active members - let human handle it
      const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
      return new Response(twimlResponse, {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
      });
    }

    // ========================================
    // RATE LIMITING CHECK
    // ========================================
    // Check when we last messaged this contact
    const { data: canMessage } = await supabase
      .rpc('can_message_contact', { 
        p_contact_id: contact.id, 
        p_channel: 'sms',
        p_min_hours_between: 24 
      });

    // Note: For INBOUND messages (customer initiated), we should still respond
    // Rate limiting is mainly for our automated outbound messages
    // But we track all messages for the record

    if (contact.isNew) {
      console.log(`New contact created from SMS: ${contact.id}`);
      
      enrollInFollowUp(supabase, {
        contactId: contact.id,
        businessId: businessId,
        trigger: 'new_lead',
      }).catch(err => console.error('Follow-up enrollment failed:', err));
    } else {
      console.log(`Matched existing contact: ${contact.id}`);
      
      pauseFollowUpOnResponse(supabase, contact.id)
        .catch(err => console.error('Follow-up pause failed:', err));
    }

    // STEP 3: Find or create conversation thread
    let isNewThread = false;

    const { data: existingThreads } = await supabase
      .from('conversation_threads')
      .select('id, status, created_at')
      .eq('contact_id', contact.id)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    let thread: { id: string } | null = null;

    if (existingThreads && existingThreads.length > 0) {
      thread = { id: existingThreads[0].id };
      console.log('📱 Using existing thread:', thread.id);

      if (existingThreads[0].status !== 'active') {
        await supabase
          .from('conversation_threads')
          .update({ status: 'active', conversation_state: 'answering_questions' })
          .eq('id', thread.id);
      }

      if (existingThreads.length > 1) {
        const oldThreadIds = existingThreads.slice(1).map(t => t.id);
        await supabase
          .from('conversation_threads')
          .update({ status: 'closed' })
          .in('id', oldThreadIds);
      }
    } else {
      isNewThread = true;
      const { data: newThread, error: createThreadError } = await supabase
        .from('conversation_threads')
        .insert({
          contact_id: contact.id,
          business_id: businessId,
          status: 'active',
          conversation_state: 'answering_questions'
        })
        .select('id')
        .single();

      if (createThreadError || !newThread) {
        throw new Error(`Failed to create thread: ${createThreadError?.message}`);
      }
      thread = newThread;
      console.log('📱 Created new thread:', thread.id);
    }

    // STEP 4: Store incoming message
    const { error: messageError } = await supabase
      .from('sms_messages')
      .insert({
        thread_id: thread.id,
        contact_id: contact.id,
        direction: 'inbound',
        message: body,
        ai_response: false,
        business_id: businessId
      });

    if (messageError) {
      throw new Error(`Failed to store message: ${messageError.message}`);
    }

    // Cancel any pending re-engagement steps — lead replied, so no need to follow up
    await supabase
      .from('fightflow_sequence_steps')
      .update({ status: 'cancelled' })
      .eq('appointment_id', thread.id)
      .eq('step_name', 'reengage_no_reply')
      .eq('status', 'pending');

    await supabase
      .from('contacts')
      .update({
        last_activity_date: new Date().toISOString(),
        preferred_channel: contact.preferred_channel || 'sms'
      })
      .eq('id', contact.id);

    // Get conversation history
    const { data: messageHistory } = await supabase
      .from('sms_messages')
      .select('direction, message, created_at')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true });

    // ========================================
    // Detect returning contact (gap > 7 days since last message)
    // ========================================
    const currentTime = new Date();
    const priorMessages = messageHistory || [];
    const lastMessageBefore = priorMessages
      .filter(m => m.direction === 'inbound')
      .slice(-2, -1)[0]; // Second-to-last inbound (not the current one)

    let returningContactContext = '';
    let isReturningContact = false;

    if (lastMessageBefore) {
      const lastMsgDate = new Date(lastMessageBefore.created_at);
      const daysSinceLast = Math.floor((currentTime.getTime() - lastMsgDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceLast >= 7) {
        isReturningContact = true;

        // Find any booking promises in prior AI messages
        const bookingPromises = priorMessages
          .filter(m => m.direction === 'outbound')
          .filter(m => /booked|scheduled|set you up|confirmed|see you/i.test(m.message))
          .map(m => m.message.substring(0, 120));

        // Find expressed preferences
        const classPrefs = priorMessages
          .filter(m => m.direction === 'inbound')
          .filter(m => /muay thai|boxing|bjj|grappling|kickboxing|mma/i.test(m.message))
          .map(m => m.message.substring(0, 80));

        returningContactContext = `
=== RETURNING CONTACT — ${daysSinceLast} DAYS SINCE LAST MESSAGE ===
This person has contacted us before. They are NOT a new lead. Reference their prior conversation naturally.

${bookingPromises.length > 0 ? `PRIOR COMMITMENTS MADE (check if they followed through):\n${bookingPromises.map(p => `- "${p}"`).join('\n')}` : ''}

${classPrefs.length > 0 ? `THEIR EXPRESSED INTERESTS:\n${classPrefs.map(p => `- "${p}"`).join('\n')}` : ''}

INSTRUCTIONS FOR RETURNING CONTACT:
- Acknowledge they're coming back (briefly, naturally — not robotically)
- Reference what they discussed before if relevant
- If we promised them something (booking, etc.) and they're asking about it again, acknowledge it directly
- They already know us — skip the intro pitch
- If they're asking about pricing/membership, they're hot — flag with "I'll have Scott reach out to you directly about that!" and set needs_human_review = true
=== END RETURNING CONTACT CONTEXT ===`;

        console.log(`🔄 Returning contact detected: ${daysSinceLast} days since last message`);
      }
    }

    // Flag returning contacts asking about pricing for Scott's personal follow-up
    const isPricingInquiry = /price|cost|how much|membership|monthly|fee|rate/i.test(body);
    if (isReturningContact && isPricingInquiry) {
      await supabase
        .from('conversation_threads')
        .update({
          needs_human_review: true,
          conversation_state: 'hot_re_engagement'
        })
        .eq('id', thread.id);
      console.log('🔥 Hot re-engagement: returning contact asking about pricing — flagged for Scott');
    }

    // Get business context
    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .single();

    // Load knowledge base
    const { data: knowledgeBase } = await supabase
      .from('business_knowledge')
      .select('category, title, content')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    let knowledgeText = '';
    if (knowledgeBase && knowledgeBase.length > 0) {
      knowledgeText = knowledgeBase.map(k => `${k.title}: ${k.content}`).join('\n');
    }

    // Load class schedule
    const { data: classes } = await supabase
      .from('class_schedule')
      .select('id, class_name, instructor, day_of_week, start_time, end_time')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let scheduleText = '';
    if (classes && classes.length > 0) {
      scheduleText = classes.map(c => {
        const day = dayNames[c.day_of_week];
        const startTime = c.start_time?.substring(0, 5) || '';
        const endTime = c.end_time?.substring(0, 5) || '';
        return `${day}: ${c.class_name} with ${c.instructor} (${startTime}-${endTime})`;
      }).join('\n');
    }

    const now = new Date();
    const easternTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const currentDay = easternTime.getDay();
    const currentDayName = dayNames[currentDay];

    const todaysClasses = classes?.filter(c => c.day_of_week === currentDay) || [];
    let todaysScheduleText = 'No classes scheduled today.';
    if (todaysClasses.length > 0) {
      todaysScheduleText = todaysClasses.map(c => {
        const startTime = c.start_time?.substring(0, 5) || '';
        const endTime = c.end_time?.substring(0, 5) || '';
        return `${c.class_name} with ${c.instructor} (${startTime}-${endTime})`;
      }).join('\n');
    }

    // Build conversation messages from history (current inbound message already stored in Step 4)
    // NOTE: Do NOT push `body` again — it's already included in messageHistory from the DB insert above
    const conversationMessages = messageHistory?.map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.message
    })) || [];

    const historyText = messageHistory?.map(msg => {
      const role = msg.direction === 'inbound' ? 'Customer' : 'You (AI)';
      return `${role}: ${msg.message}`;
    }).join('\n') || 'No previous messages';

    const contactName = contact.first_name && contact.first_name !== 'SMS Contact'
      ? `${contact.first_name} ${contact.last_name || ''}`.trim()
      : null;

    // ========================================
    // CALL AI - WITH RETRY AND ERROR PROTECTION
    // ========================================
    // If AI fails, we still send something useful — a personalized greeting
    // that keeps the conversation going instead of a dead-end "someone will get back to you"
    let responseMessage = `Hey${contactName ? ' ' + contactName : ''}! Thanks for reaching out to ${businessName || 'us'}. What info can I help you with?`;
    let aiResult: any = { message: null };
    try { await supabase.from('automation_logs').insert({ business_id: businessId, automation_type: 'trace_5_pre_ai', status: 'info', error_message: 'before ai call' }); } catch(_e){}

    const maxAiRetries = 2;
    for (let aiAttempt = 0; aiAttempt < maxAiRetries; aiAttempt++) {
      try {
        const aiResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-response`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SERVICE_ROLE_JWT')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: conversationMessages,
            businessId: businessId,
            businessContext: business?.name || businessName,
            classSchedule: classes || [],
            contactName: contactName,
            threadId: thread.id,
            conversationHistory: historyText,
            knowledgeBase: (knowledgeText || '') + (returningContactContext ? '\n\n' + returningContactContext : ''),
            scheduleText: scheduleText,
            todaysSchedule: todaysScheduleText,
            currentDay: currentDayName,
            contactPhone: from
          })
        });

        // Only use AI response if it was successful
        if (aiResponse.ok) {
          aiResult = await aiResponse.json();
          
          // CRITICAL: Only use AI message if it looks like a real response
          // Filter out stack traces and technical error text, but allow natural conversation
          const msg = (aiResult.message || '').toLowerCase();
          const isTechnicalError = (
            msg.includes('stack trace') ||
            msg.includes('exception in') ||
            msg.includes('undefined is not') ||
            msg.includes('cannot read propert') ||
            msg.includes('typeerror:') ||
            msg.includes('referenceerror:') ||
            msg.includes('internal server error') ||
            msg.includes('502 bad gateway') ||
            msg.includes('503 service')
          );
          
          if (aiResult.message && 
              typeof aiResult.message === 'string' &&
              aiResult.message.length > 0 &&
              aiResult.message.length < 500 &&
              !isTechnicalError) {
            responseMessage = aiResult.message;
            break; // Success — exit retry loop
          } else {
            console.warn('⚠️ AI response looks like a technical error, will retry if attempts remain');
            if (aiAttempt < maxAiRetries - 1) {
              await new Promise(r => setTimeout(r, 300)); // Wait 300ms before retry
              continue;
            }
          }
        } else {
          console.error(`AI response failed with status ${aiResponse.status} (attempt ${aiAttempt + 1}/${maxAiRetries})`);
          // Log the error internally but don't expose to customer
          await supabase.from('automation_logs').insert({
            business_id: businessId,
            automation_type: 'ai_response_error',
            status: 'error',
            error_message: `AI returned status ${aiResponse.status} on attempt ${aiAttempt + 1}`,
            processed_data: { contact_id: contact.id, thread_id: thread.id }
          });
          if (aiAttempt < maxAiRetries - 1) {
            await new Promise(r => setTimeout(r, 500)); // Wait 500ms before retry
          }
        }
      } catch (aiError: any) {
        console.error(`AI call failed (attempt ${aiAttempt + 1}/${maxAiRetries}):`, aiError.message);
        await supabase.from('automation_logs').insert({
          business_id: businessId,
          automation_type: 'ai_response_error',
          status: 'error',
          error_message: aiError.message,
          processed_data: { contact_id: contact.id, thread_id: thread.id }
        });
        if (aiAttempt < maxAiRetries - 1) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    try { await supabase.from('automation_logs').insert({ business_id: businessId, automation_type: 'trace_6_post_ai', status: 'info', error_message: `msg=${responseMessage.substring(0,40)}` }); } catch(_e){}
    // Handle class booking if AI detected intent
    if (aiResult.shouldBook && aiResult.classDetails) {
      console.log('Processing booking:', aiResult.classDetails);

      let targetClass = null;
      if (aiResult.classDetails.classScheduleId) {
        targetClass = classes?.find((cls: any) => cls.id === aiResult.classDetails.classScheduleId);
      }
      if (!targetClass) {
        targetClass = classes?.find((cls: any) =>
          cls.class_name.toLowerCase().includes(aiResult.classDetails.className.toLowerCase())
        );
      }

      if (targetClass) {
        const nowUtc = new Date();
        const easternNow = new Date(nowUtc.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const targetDay = aiResult.classDetails.dayOfWeek ?? targetClass.day_of_week;
        let daysUntilClass = (targetDay - easternNow.getDay() + 7) % 7;
        if (daysUntilClass === 0) {
          const [hours, minutes] = targetClass.start_time.split(':').map(Number);
          const classTimeToday = new Date(easternNow);
          classTimeToday.setHours(hours, minutes, 0, 0);
          if (easternNow > classTimeToday) {
            daysUntilClass = 7;
          }
        }
        const classDate = new Date(easternNow);
        classDate.setDate(easternNow.getDate() + daysUntilClass);

        const { error: bookingError } = await supabase
          .from('class_bookings')
          .insert({
            contact_id: contact.id,
            class_schedule_id: targetClass.id,
            booking_date: classDate.toISOString().split('T')[0],
            status: 'confirmed',
            notes: `Booked via AI SMS assistant - ${targetClass.class_name} at ${targetClass.start_time}`
          });

        if (!bookingError) {
          console.log(`Booking created: ${targetClass.class_name} on ${classDate.toDateString()}`);

          await supabase
            .from('contacts')
            .update({ pipeline_stage: 'qualified', status: 'qualified' })
            .eq('id', contact.id);

          await supabase.from('automation_logs').insert({
            business_id: businessId,
            automation_type: 'class_booking',
            status: 'success',
            processed_data: {
              contact_id: contact.id,
              class_name: targetClass.class_name,
              class_date: classDate.toISOString().split('T')[0]
            }
          });
        }
      }
    }

    // Send SMS via Twilio FIRST, then store with twilio_sid
    let twilioSid = null;
    let smsPhone = null;

    if (isTest) {
      // ── TEST MODE: Skip real Twilio send, use fake SID ────────────────────
      twilioSid = 'TEST_' + crypto.randomUUID().slice(0, 8);
      smsPhone = from;
      console.log('[TEST] Would send SMS:', responseMessage);
    } else {
      const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || Deno.env.get('TWILIO_SID');
      const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioFromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (accountSid && authToken && twilioFromNumber) {
      try {
        const twilioResult = await withRetry(async () => {
          const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              From: twilioFromNumber,
              To: from,
              Body: responseMessage
            })
          });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Twilio API error (${response.status}): ${errorData}`);
          }

          return response.json();
        }, SMS_RETRY_OPTIONS);

        twilioSid = twilioResult.sid;
        smsPhone = from;
        console.log('📱 SMS sent successfully, SID:', twilioResult.sid);
        
        // Log for rate limiting
        await supabase.from('contact_message_log').insert({
          contact_id: contact.id,
          business_id: businessId,
          channel: 'sms',
          direction: 'outbound',
          message_preview: responseMessage.substring(0, 100)
        });
        
        // Update contact's last contacted timestamp
        await supabase
          .from('contacts')
          .update({ sms_last_contacted: new Date().toISOString() })
          .eq('id', contact.id);
          
      } catch (smsError: any) {
        console.error('📱 SMS sending failed:', smsError.message);
        await supabase.from('automation_logs').insert({
          business_id: businessId,
          automation_type: 'sms_response_failed',
          status: 'error',
          error_message: smsError.message,
          processed_data: { contact_id: contact.id, thread_id: thread.id }
        });
      }
    }
    } // end else (non-test Twilio send)

    // Store AI response AFTER sending (with twilio_sid and phone)
    await supabase
      .from('sms_messages')
      .insert({
        thread_id: thread.id,
        contact_id: contact.id,
        direction: 'outbound',
        message: responseMessage,
        ai_response: true,
        phone: smsPhone,
        twilio_sid: twilioSid,
        business_id: businessId
      });

    // ========================================
    // STEP 7: BOOKING DETECTION → fightflow_appointments
    // Non-blocking: errors logged but never prevent SMS from being sent
    // ========================================
    try {
      const bookingResult = await detectBookingConfirmation(responseMessage, conversationMessages);

      if (bookingResult.is_booking && bookingResult.service && bookingResult.day && bookingResult.time) {
        const mappedService = mapServiceName(bookingResult.service);
        console.log(`📅 Booking detected: ${mappedService} on ${bookingResult.day} at ${bookingResult.time}`);

        const sessionStartUTC = computeNextOccurrenceET(bookingResult.day, bookingResult.time);

        if (sessionStartUTC) {
          const sessionEndUTC = new Date(sessionStartUTC.getTime() + 75 * 60 * 1000);

          // Build contact info from existing contact record
          const bookingContactName = contact.first_name && contact.first_name !== 'SMS Contact'
            ? `${contact.first_name} ${contact.last_name || ''}`.trim()
            : 'SMS Contact';
          const bookingContactEmail = (contact as any).email || null;
          const bookingContactPhone = (contact as any).phone || from;

          // Idempotency check: ±1 day window
          const windowStart = new Date(sessionStartUTC.getTime() - 24 * 60 * 60 * 1000).toISOString();
          const windowEnd = new Date(sessionStartUTC.getTime() + 24 * 60 * 60 * 1000).toISOString();

          let idempotencyQuery = supabase
            .from('fightflow_appointments')
            .select('id')
            .eq('service_name', mappedService)
            .gte('session_start', windowStart)
            .lte('session_start', windowEnd);

          if (bookingContactEmail) {
            idempotencyQuery = idempotencyQuery.eq('contact_email', bookingContactEmail);
          } else {
            idempotencyQuery = idempotencyQuery.eq('contact_phone', bookingContactPhone);
          }

          const { data: existingBooking } = await idempotencyQuery.limit(1);

          if (existingBooking && existingBooking.length > 0) {
            console.log('📅 Booking already exists for this contact/service/date — skipping');
          } else {
            // Format date/time in ET for logging
            const etLogStr = sessionStartUTC.toLocaleString('en-US', {
              timeZone: 'America/New_York',
              weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit', hour12: true
            });

            const { error: insertError } = await supabase
              .from('fightflow_appointments')
              .insert({
                wix_booking_id: `sms-confirmed-${crypto.randomUUID()}`,
                contact_name: bookingContactName,
                contact_email: bookingContactEmail,
                contact_phone: bookingContactPhone,
                service_name: mappedService,
                session_start: sessionStartUTC.toISOString(),
                session_end: sessionEndUTC.toISOString(),
                status: 'confirmed',
                sequence_enrolled: false,
                location: '900 East Six Forks Road, Raleigh, NC, USA',
                notes: 'Booked via SMS conversation'
              });

            if (insertError) {
              console.error('📅 Failed to insert SMS booking:', insertError.message);
            } else {
              console.log(`📅 SMS booking created: ${bookingContactName} — ${mappedService} ${etLogStr}`);
            }
          }
        } else {
          console.error(`📅 Could not compute date for: ${bookingResult.day} ${bookingResult.time}`);
        }
      }
    } catch (bookingDetectionError: any) {
      console.error('📅 Booking detection error (non-fatal):', bookingDetectionError.message);
    }

    // Return empty TwiML
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

    return new Response(twimlResponse, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
    });

  } catch (error: any) {
    console.error('SMS webhook error:', error);
    // Write error to automation_logs using the already-created supabase client (if available)
    // We use a simple fetch to the REST API instead of dynamic import
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseKey = Deno.env.get('SERVICE_ROLE_JWT') ?? '';
      await fetch(`${supabaseUrl}/rest/v1/automation_logs`, {
        method: 'POST',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: '00000000-0000-0000-0000-000000000000', automation_type: 'sms_webhook_error', status: 'error', error_message: `CATCH: ${error.message} | pre=${_traceError} | Stack: ${(error.stack || '').substring(0, 200)}` })
      });
    } catch {}
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' } }
    );
  }
});
