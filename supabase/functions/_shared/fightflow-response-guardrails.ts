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

function compactSchedule(scheduleText?: string | null): string {
  const lines = (scheduleText || '')
    .split(/\n+/)
    .map((line) => cleanSms(line, 120))
    .filter(Boolean)
    .filter((line) => !/no classes scheduled/i.test(line));

  if (lines.length === 0) {
    return 'I can help with the schedule — what class are you looking at?';
  }

  return `Current schedule: ${lines.slice(0, 3).join('; ')}.`;
}

export function detectBookingGuardrail(leadMessage: string, historyText?: string | null): BookingGuardrailResult | null {
  const msg = (leadMessage || '').toLowerCase();
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
    return cleanSms(`${prefix}${compactSchedule(options.scheduleText)} Which class are you interested in?`);
  }

  if (classIntent) {
    return cleanSms(`${prefix}We offer MMA/fitness classes including Muay Thai, boxing, and grappling. Want to try a free class?`);
  }

  return cleanSms(`Hey${name ? ` ${name}` : ''}! Thanks for reaching out to ${options.businessName || 'Fight Flow Academy'}. What info can I help you with?`);
}
