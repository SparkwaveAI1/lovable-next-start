export type BookingGuardrailKind = 'dont_book' | 'cancel_booking' | 'booking_status';

export interface BookingGuardrailResult {
  kind: BookingGuardrailKind;
  message: string;
  suppressBooking: true;
  needsHumanReview: boolean;
}

interface FallbackOptions {
  contactName?: string | null;
  businessName?: string | null;
  leadMessage: string;
  knowledgeText?: string | null;
  scheduleText?: string | null;
  historyText?: string | null;
}

export type FightFlowOutboundValidationReason =
  | 'empty_message'
  | 'generic_dead_end'
  | 'technical_text'
  | 'placeholder_text'
  | 'booking_confirmation_without_booking'
  | 'bare_form_booking_defer'
  | 'booking_defer_on_bare_form'
  | 'unsupported_schedule_or_price'
  | 'no_reachable_channel'
  | 'no_valid_sms_channel'
  | 'no_sms_consent'
  | 'missing_sms_consent';

export interface FightFlowOutboundValidationInput extends Partial<FallbackOptions> {
  message: string;
  channel?: 'sms' | 'email' | 'internal';
  contactPhone?: string | null;
  hasRealInquiry?: boolean;
  hasPhone?: boolean;
  hasEmail?: boolean;
  smsConsent?: boolean;
  bookingExistsOrCreated?: boolean;
  bookingAlreadyConfirmed?: boolean;
}

export interface FightFlowOutboundValidationResult {
  action: 'allow' | 'rewrite' | 'block';
  allowed?: boolean;
  safeMessage: string;
  message?: string;
  reasons: FightFlowOutboundValidationReason[];
  needsHumanReview: boolean;
}

export type FightFlowCrmStatus = 'new_lead' | 'qualified' | 'needs_human' | 'converted' | string | null | undefined;
export type FightFlowPipelineStage =
  | 'new'
  | 'qualified'
  | 'trial_pending'
  | 'trial_scheduled'
  | 'needs_staff_booking_confirmation'
  | 'pending_cancellation'
  | 'pending_review'
  | string
  | null
  | undefined;

export interface FightFlowCrmTransitionInput {
  currentStatus?: FightFlowCrmStatus;
  currentPipelineStage?: FightFlowPipelineStage;
  requestedStatus?: FightFlowCrmStatus;
  requestedPipelineStage?: FightFlowPipelineStage;
  reason: string;
  source: 'sms_webhook' | 'webhook_handler' | 'follow_up' | 'manual' | string;
}

export interface FightFlowCrmTransitionDecision {
  allowed: boolean;
  status?: string;
  pipelineStage?: string;
  blockedReason?: 'crm_downgrade_blocked';
  log: {
    reason: string;
    source: string;
    from: { status?: FightFlowCrmStatus; pipelineStage?: FightFlowPipelineStage };
    requested: { status?: FightFlowCrmStatus; pipelineStage?: FightFlowPipelineStage };
    applied: { status?: string; pipelineStage?: string };
  };
}

const CRM_STAGE_RANK: Record<string, number> = {
  new: 10,
  new_lead: 10,
  qualified: 30,
  trial_pending: 40,
  needs_staff_booking_confirmation: 45,
  pending_cancellation: 50,
  pending_review: 50,
  trial_scheduled: 60,
  converted: 90,
};

function crmRank(value?: string | null): number {
  return CRM_STAGE_RANK[(value || '').toLowerCase()] ?? 20;
}

export function decideFightFlowCrmTransition(input: FightFlowCrmTransitionInput): FightFlowCrmTransitionDecision {
  const currentStatusRank = crmRank(input.currentStatus);
  const currentStageRank = crmRank(input.currentPipelineStage);
  const requestedStatusRank = crmRank(input.requestedStatus);
  const requestedStageRank = crmRank(input.requestedPipelineStage);
  const wouldDowngrade = requestedStatusRank < currentStatusRank || requestedStageRank < currentStageRank;

  if (wouldDowngrade) {
    return {
      allowed: false,
      status: input.currentStatus || undefined,
      pipelineStage: input.currentPipelineStage || undefined,
      blockedReason: 'crm_downgrade_blocked',
      log: {
        reason: input.reason,
        source: input.source,
        from: { status: input.currentStatus, pipelineStage: input.currentPipelineStage },
        requested: { status: input.requestedStatus, pipelineStage: input.requestedPipelineStage },
        applied: { status: input.currentStatus || undefined, pipelineStage: input.currentPipelineStage || undefined },
      },
    };
  }

  return {
    allowed: true,
    status: input.requestedStatus || input.currentStatus || undefined,
    pipelineStage: input.requestedPipelineStage || input.currentPipelineStage || undefined,
    log: {
      reason: input.reason,
      source: input.source,
      from: { status: input.currentStatus, pipelineStage: input.currentPipelineStage },
      requested: { status: input.requestedStatus, pipelineStage: input.requestedPipelineStage },
      applied: { status: input.requestedStatus || input.currentStatus || undefined, pipelineStage: input.requestedPipelineStage || input.currentPipelineStage || undefined },
    },
  };
}

export function shouldRouteBookingMutationToHumanReview(message: string): boolean {
  return /(cancel|unbook|remove|reschedule|change)\s+(my\s+)?(booking|class|trial|appointment)|can't\s+make\s+it|cant\s+make\s+it/i.test(
    (message || '').toLowerCase().replace(/[’‘]/g, "'"),
  );
}

function cleanSms(text: string, max = 320): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, max);
}

function firstName(name?: string | null): string {
  return (name || '').trim().split(/\s+/)[0] || '';
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function relevantLines(text: string | null | undefined, patterns: RegExp[], limit = 2): string[] {
  return (text || '')
    .split(/\n+/)
    .map((line) => cleanSms(line, 180))
    .filter(Boolean)
    .filter((line) => hasAny(line.toLowerCase(), patterns))
    .slice(0, limit);
}

function compactSchedule(scheduleText?: string | null, leadMessage = ''): string {
  const lines = (scheduleText || '')
    .split(/\n+/)
    .map((line) => cleanSms(line, 120))
    .filter(Boolean)
    .filter((line) => !/no classes scheduled/i.test(line));

  if (lines.length === 0) {
    return 'I can help with the schedule — what class are you looking at?';
  }

  const msg = leadMessage.toLowerCase();
  const hint = msg.includes('muay thai') ? /muay thai/i
    : msg.includes('kickboxing') ? /kickboxing/i
    : msg.includes('boxing') ? /boxing/i
    : msg.includes('mma') ? /mma/i
    : msg.includes('grappling') || msg.includes('bjj') || msg.includes('jiu') ? /grappling|bjj|jiu/i
    : null;
  const relevant = hint ? lines.filter((line) => hint.test(line)) : lines;

  return `Current schedule: ${(relevant.length ? relevant : lines).slice(0, 8).join('; ')}.`;
}

export function detectBookingGuardrail(leadMessage: string, historyText?: string | null): BookingGuardrailResult | null {
  const msg = (leadMessage || '').toLowerCase().replace(/[’‘]/g, "'");
  const history = (historyText || '').toLowerCase();
  const hasPriorBookingSignal = /booked|scheduled|confirmed|team will expect|see you/i.test(history);

  if (/(don't|do not|dont)\s+(book|schedule)|not\s+(yet|now|ready)|hold off|wait\s+(to|on)\s+(book|schedule)/i.test(msg)) {
    return {
      kind: 'dont_book',
      message: "No problem — I won't book it yet. Ask me when you're ready, or tell me what class/time you’re considering.",
      suppressBooking: true,
      needsHumanReview: hasPriorBookingSignal,
    };
  }

  if (/(cancel|unbook|remove|reschedule|change)\s+(my\s+)?(booking|class|trial|appointment)|can't\s+make\s+it|cant\s+make\s+it/i.test(msg)) {
    return {
      kind: 'cancel_booking',
      message: "Got it — I’ll flag this so the team can update your booking. What day/time should they change it to, if any?",
      suppressBooking: true,
      needsHumanReview: true,
    };
  }

  if (/(am i|was i|did you|get me|do i have).{0,20}(booked|scheduled|confirmed)|check\s+(my\s+)?(booking|appointment|trial)/i.test(msg)) {
    return {
      kind: 'booking_status',
      message: hasPriorBookingSignal
        ? 'I see we discussed a booking, but I want staff to verify the exact status. I’ll flag it for confirmation.'
        : 'I don’t see a confirmed booking in this chat yet. Tell me the class/day/time and I can help set it up.',
      suppressBooking: true,
      needsHumanReview: hasPriorBookingSignal,
    };
  }

  return null;
}

export function buildDeterministicFallbackResponse(options: FallbackOptions): string {
  const name = firstName(options.contactName);
  const prefix = name ? `Hey ${name} — ` : '';
  const msg = (options.leadMessage || '').toLowerCase();
  const knowledge = options.knowledgeText || '';

  const youthIntent = /(kid|kids|child|children|teen|teens|youth|son|daughter|\b\d{1,2}\s*(year|yr)|age|ages)/i.test(msg);
  const priceIntent = /(price|cost|how much|membership|monthly|fee|rate|rates|tuition)/i.test(msg);
  const scheduleIntent = /(schedule|what time|times|hours|class times|when|days)/i.test(msg);
  const consentIntent = /(parent|guardian|minor|under\s*18|consent|waiver)/i.test(msg);
  const classIntent = /(boxing|muay thai|bjj|jiu.?jitsu|mma|wrestling|fitness|class|classes|program)/i.test(msg);

  if (consentIntent || (youthIntent && /(waiver|parent|guardian|minor|consent)/i.test(msg))) {
    return cleanSms(`${prefix}For minors, a parent/guardian should be involved for the waiver and trial setup. What age and class are you looking at?`);
  }

  if (youthIntent && priceIntent) {
    const priceLines = relevantLines(knowledge, [/youth|kid|teen|price|cost|membership|monthly|fee|rate/], 2);
    const answer = priceLines.length > 0
      ? priceLines.join(' ')
      : 'Youth pricing depends on age/program; staff can confirm the best fit.';
    return cleanSms(`${prefix}${answer} What ages are they and are they interested in boxing, MMA, or fitness?`);
  }

  if (youthIntent || (classIntent && /(son|daughter|kid|teen|age|ages)/i.test(msg))) {
    const youthLines = relevantLines(knowledge, [/youth|kid|teen|children|age|ages|boxing|mma|fitness/], 2);
    const answer = youthLines.length > 0
      ? youthLines.join(' ')
      : 'We can help with youth boxing/MMA/fitness options by age fit.';
    return cleanSms(`${prefix}${answer} How old is your child and what are they hoping to work on?`);
  }

  if (priceIntent) {
    const priceLines = relevantLines(knowledge, [/price|cost|membership|monthly|fee|rate|unlimited|adult|youth/], 2);
    const answer = priceLines.length > 0
      ? priceLines.join(' ')
      : 'Pricing depends on program and membership type; Scott can confirm the right option.';
    return cleanSms(`${prefix}${answer} Want to try a free class first?`);
  }

  if (scheduleIntent) {
    return cleanSms(`${prefix}${compactSchedule(options.scheduleText, options.leadMessage)} Which day works for a free class?`);
  }

  if (classIntent) {
    return cleanSms(`${prefix}We offer MMA/fitness classes including Muay Thai, boxing, and grappling. Want to try a free class?`);
  }

  return cleanSms(`Hey${name ? ` ${name}` : ''}! Thanks for reaching out to ${options.businessName || 'Fight Flow Academy'}. What info can I help you with?`);
}

export function validateFightFlowOutbound(input: FightFlowOutboundValidationInput): FightFlowOutboundValidationResult {
  const originalMessage = cleanSms(input.message || '', 500);
  const lower = originalMessage.toLowerCase().replace(/[’‘]/g, "'");
  const reasons: FightFlowOutboundValidationReason[] = [];

  const isSms = input.channel === 'sms';
  const hasPhoneInput = input.hasPhone !== undefined || input.contactPhone !== undefined;
  const hasEmailInput = input.hasEmail !== undefined;
  const effectiveHasPhone = input.hasPhone ?? Boolean(input.contactPhone);
  const effectiveHasEmail = input.hasEmail ?? false;
  const hasAnyChannel = Boolean(effectiveHasPhone || effectiveHasEmail);
  const shouldValidateReachability = isSms || hasPhoneInput || hasEmailInput;
  const bookingConfirmed = Boolean(input.bookingExistsOrCreated || input.bookingAlreadyConfirmed);

  if (shouldValidateReachability && !hasAnyChannel) reasons.push('no_reachable_channel');
  if (isSms && !effectiveHasPhone) reasons.push('no_valid_sms_channel');
  if (input.smsConsent === false) reasons.push('no_sms_consent', 'missing_sms_consent');
  if (!originalMessage || originalMessage.length < 3) reasons.push('empty_message');

  const leadHasSpecificIntent = /(price|cost|how much|schedule|what time|when|class|classes|boxing|muay thai|mma|bjj|grappling|age|kid|teen|waiver|parent)/i.test(input.leadMessage || '');
  const isGenericDeadEnd = /someone (will|would) get back to you/i.test(originalMessage)
    || /what info can i help you with\??$/i.test(originalMessage)
    || (leadHasSpecificIntent && /thanks for reaching out|can i answer any questions|how can i help/i.test(originalMessage));
  if (isGenericDeadEnd && input.hasRealInquiry) reasons.push('generic_dead_end');

  if (/(typeerror|referenceerror|syntaxerror|stack trace|cannot read propert|undefined is not|null is not|jwt|api key|unauthorized|forbidden|internal server error|bad gateway|exception in)/i.test(originalMessage)) {
    reasons.push('technical_text');
  }

  if (/\[[^\]]+\]|\{\{[^}]+\}\}|<[^>]+>|TODO|INSERT_|YOUR_|TBD/i.test(originalMessage)) {
    reasons.push('placeholder_text');
  }

  const claimsBooking = /(you're|you are|you’re|we have you|got you|all set).{0,40}(booked|scheduled|confirmed)|team will expect you|see you (at|for|on)|confirmed for/i.test(lower);
  if (claimsBooking && !bookingConfirmed) {
    reasons.push('booking_confirmation_without_booking');
  }

  const bookingDefer = /(won't|will not|don't|do not|not going to).{0,25}(book|schedule)|not book(ing)? (it|anything)? yet/i.test(lower);
  if (bookingDefer && !input.hasRealInquiry) {
    reasons.push('bare_form_booking_defer', 'booking_defer_on_bare_form');
  }

  const unsupportedPriceOrSchedule = /\b(\$\d+|\d+\s*(am|pm)|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(originalMessage)
    && input.hasRealInquiry
    && !input.knowledgeText
    && !input.scheduleText
    && /not sure|maybe|probably|i think|should be/i.test(originalMessage);
  if (unsupportedPriceOrSchedule) reasons.push('unsupported_schedule_or_price');

  const safeFallback = buildDeterministicFallbackResponse({
    contactName: input.contactName,
    businessName: input.businessName,
    leadMessage: input.leadMessage || '',
    knowledgeText: input.knowledgeText,
    scheduleText: input.scheduleText,
    historyText: input.historyText,
  });

  const blockingReasons = new Set<FightFlowOutboundValidationReason>([
    'empty_message',
    'technical_text',
    'placeholder_text',
    'booking_confirmation_without_booking',
    'bare_form_booking_defer',
    'booking_defer_on_bare_form',
    'unsupported_schedule_or_price',
    'no_reachable_channel',
    'no_valid_sms_channel',
    'no_sms_consent',
    'missing_sms_consent',
  ]);

  const hasBlockingReason = reasons.some((reason) => blockingReasons.has(reason));
  if (hasBlockingReason) {
    const safeMessage = reasons.includes('technical_text') || reasons.includes('placeholder_text') ? '' : safeFallback;
    return {
      action: 'block',
      allowed: false,
      safeMessage,
      message: safeMessage,
      reasons,
      needsHumanReview: true,
    };
  }

  if (reasons.includes('generic_dead_end')) {
    return {
      action: 'rewrite',
      allowed: true,
      safeMessage: safeFallback,
      message: safeFallback,
      reasons,
      needsHumanReview: false,
    };
  }

  return {
    action: 'allow',
    allowed: true,
    safeMessage: originalMessage,
    message: originalMessage,
    reasons,
    needsHumanReview: false,
  };
}
