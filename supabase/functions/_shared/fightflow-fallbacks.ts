export type FightFlowFallbackCategory =
  | 'youth'
  | 'pricing'
  | 'schedule'
  | 'trial_booking'
  | 'parent_consent'
  | 'generic';

export interface FightFlowFallbackInput {
  latestMessage: string;
  schedule?: string;
  contactName?: string | null;
}

export interface FightFlowFallbackResult {
  category: FightFlowFallbackCategory;
  message: string;
  shouldHandoff: boolean;
}

const MAX_SMS_CHARS = 160;

function includesAny(text: string, signals: string[]): boolean {
  return signals.some((signal) => text.includes(signal));
}

function truncateSms(text: string): string {
  return text.length <= MAX_SMS_CHARS ? text : `${text.slice(0, MAX_SMS_CHARS - 1).trimEnd()}…`;
}

export function detectFightFlowFallbackCategory(message: string): FightFlowFallbackCategory {
  const text = message.toLowerCase();

  if (includesAny(text, ['consent', 'waiver', 'minor policy', 'parent sign', 'guardian'])) {
    return 'parent_consent';
  }

  if (includesAny(text, ['price', 'pricing', 'cost', 'how much', 'rate', 'rates', 'fee', 'fees', 'membership', 'monthly'])) {
    return 'pricing';
  }

  if (includesAny(text, ['kid', 'kids', 'youth', 'child', 'children', 'son', 'daughter', 'teen', 'teenager'])
    || /\b(?:[6-9]|1[0-7])\s*(?:yo|year old|yr old|years old)\b/.test(text)) {
    return 'youth';
  }

  if (includesAny(text, ['book', 'booking', 'trial', 'free class', 'try a class', 'first class', 'come in', 'come by', 'sign up'])) {
    return 'trial_booking';
  }

  if (includesAny(text, ['schedule', 'class time', 'class times', 'what time', 'what times', 'hours', 'tonight', 'today', 'tomorrow', 'when are'])) {
    return 'schedule';
  }

  return 'generic';
}

function firstScheduleLine(schedule?: string): string | null {
  const line = schedule?.split('\n').map((entry) => entry.trim()).find(Boolean);
  return line ? truncateSms(line) : null;
}

export function buildDeterministicFightFlowFallback(input: FightFlowFallbackInput): FightFlowFallbackResult {
  const category = detectFightFlowFallbackCategory(input.latestMessage);
  const scheduleLine = firstScheduleLine(input.schedule);

  const templates: Record<FightFlowFallbackCategory, FightFlowFallbackResult> = {
    youth: {
      category,
      shouldHandoff: false,
      message: 'We do have kids/youth options. Best next step is a free trial so Scott can place them by age and experience. What age are they?',
    },
    pricing: {
      category,
      shouldHandoff: true,
      message: 'Pricing depends on program and schedule. Scott can give the right rate quickly — want me to have him text you the options?',
    },
    schedule: {
      category,
      shouldHandoff: false,
      message: scheduleLine
        ? `${scheduleLine}. Want to come in for a free trial?`
        : 'Class times vary by program. Want to come in for a free trial, and Scott can point you to the right class time?',
    },
    trial_booking: {
      category,
      shouldHandoff: false,
      message: 'Yes — you can do a free trial. What is the best day this week for you to come in?',
    },
    parent_consent: {
      category,
      shouldHandoff: false,
      message: 'Parent/guardian consent is needed for minors. Bring a parent for the first visit, and Scott can help with the waiver.',
    },
    generic: {
      category,
      shouldHandoff: true,
      message: 'I want to make sure you get the right answer. I’ll have Scott reach out shortly — he can help directly.',
    },
  };

  const fallback = templates[category];
  return {
    ...fallback,
    category,
    message: truncateSms(fallback.message),
  };
}
