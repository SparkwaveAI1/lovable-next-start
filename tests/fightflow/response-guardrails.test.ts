import { describe, expect, it } from 'vitest';
import { buildDeterministicFallbackResponse, detectBookingGuardrail, validateFightFlowOutbound } from '../../supabase/functions/_shared/fightflow-response-guardrails';

describe('detectBookingGuardrail', () => {
  it('pauses booking when the lead says not to book yet', () => {
    const result = detectBookingGuardrail("Don't book just yet, I need to ask my parents", 'AI: You are booked Tuesday at 2 PM');

    expect(result?.kind).toBe('dont_book');
    expect(result?.suppressBooking).toBe(true);
    expect(result?.message).toContain("won't book it yet");
    expect(result?.needsHumanReview).toBe(true);
  });

  it('pauses booking when the lead uses curly apostrophe in do not book yet', () => {
    const result = detectBookingGuardrail("Don’t book just yet", 'AI: Want me to pencil you in?');

    expect(result?.kind).toBe('dont_book');
    expect(result?.suppressBooking).toBe(true);
  });

  it('flags cancellation/unbook requests for staff review', () => {
    const result = detectBookingGuardrail('Can you cancel my trial class?', 'AI: You are booked Friday at 7 PM');

    expect(result?.kind).toBe('cancel_booking');
    expect(result?.needsHumanReview).toBe(true);
    expect(result?.message).toContain('flag this');
  });

  it('answers booking-status questions clearly without making a new booking', () => {
    const result = detectBookingGuardrail('Am I booked?', 'AI: You are booked Monday at 6 PM');

    expect(result?.kind).toBe('booking_status');
    expect(result?.suppressBooking).toBe(true);
    expect(result?.message).toContain('verify the exact status');
  });
});

describe('validateFightFlowOutbound', () => {
  it('rewrites generic dead-end responses before send', async () => {
    const result = await validateFightFlowOutbound({
      message: 'Thanks for reaching out. What info can I help you with?',
      leadMessage: 'What times are Muay Thai classes?',
      hasRealInquiry: true,
      scheduleText: 'Monday: Muay Thai with Anthony (19:00-20:00)',
      businessName: 'Fight Flow Academy',
      contactName: 'Olandis',
      channel: 'sms',
      contactPhone: '+15551234567',
      smsConsent: true,
    });

    expect(result.allowed).toBe(true);
    expect(result.message).toContain('Monday: Muay Thai');
    expect(result.reasons).toContain('generic_dead_end');
    expect(result.needsHumanReview).toBe(false);
  });

  it('blocks booking confirmations when no matching booking exists', async () => {
    const result = await validateFightFlowOutbound({
      message: "You're booked for Muay Thai Monday at 7 PM — the team will expect you!",
      leadMessage: 'Monday 7 works',
      hasRealInquiry: true,
      businessName: 'Fight Flow Academy',
      contactName: 'Olandis',
      channel: 'sms',
      contactPhone: '+15551234567',
      smsConsent: true,
      bookingAlreadyConfirmed: false,
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain('booking_confirmation_without_booking');
    expect(result.message).not.toMatch(/booked|confirmed|team will expect|see you/i);
    expect(result.needsHumanReview).toBe(true);
  });

  it('allows booking confirmations when a booking row is confirmed', async () => {
    const result = await validateFightFlowOutbound({
      message: "You're booked for Muay Thai Monday at 7 PM — the team will expect you!",
      leadMessage: 'Monday 7 works',
      hasRealInquiry: true,
      channel: 'sms',
      contactPhone: '+15551234567',
      smsConsent: true,
      bookingAlreadyConfirmed: true,
    });

    expect(result.allowed).toBe(true);
    expect(result.reasons).not.toContain('booking_confirmation_without_booking');
  });

  it('blocks SMS when there is no valid phone or consent', async () => {
    const result = await validateFightFlowOutbound({
      message: 'Want to try a free class?',
      channel: 'sms',
      contactPhone: null,
      smsConsent: false,
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining(['no_valid_sms_channel', 'missing_sms_consent']));
  });

  it('rewrites booking-defer language on bare form submissions', async () => {
    const result = await validateFightFlowOutbound({
      message: "No problem — I won't book anything yet.",
      leadMessage: '',
      hasRealInquiry: false,
      businessName: 'Fight Flow Academy',
      contactName: 'Olandis',
      channel: 'sms',
      contactPhone: '+15551234567',
      smsConsent: true,
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain('booking_defer_on_bare_form');
    expect(result.message).toContain('Thanks for reaching out');
    expect(result.message).not.toMatch(/won't book|don.?t book/i);
  });
});

describe('buildDeterministicFallbackResponse', () => {
  it('answers youth price/age fallback without generic dead-end text', () => {
    const response = buildDeterministicFallbackResponse({
      contactName: 'Takrika Maryland',
      businessName: 'Fight Flow Academy',
      leadMessage: 'Prices and ages for classes',
      knowledgeText: 'Youth boxing: best fit by age and goals. Adult unlimited: $159/month.',
      scheduleText: 'Monday: Boxing (16:30-17:30)',
    });

    expect(response).toContain('Takrika');
    expect(response).toMatch(/Youth|youth|Adult|\$159/);
    expect(response).toContain('What ages');
    expect(response).not.toContain('What info can I help you with');
  });

  it('uses full matching schedule fallback when the lead asks class times', () => {
    const response = buildDeterministicFallbackResponse({
      leadMessage: 'What times are Muay Thai classes?',
      scheduleText: 'Sunday: Muay Thai with Daison (16:30-18:00)\nMonday: Muay Thai with Anthony (19:00-20:00)\nTuesday: Muay Thai with Anthony (18:00-19:00)\nWednesday: Muay Thai with Daison (19:00-20:00)\nThursday: Muay Thai with Anthony (18:00-19:00)\nFriday: Muay Thai with Mavrick (19:00-20:15)\nMonday: Boxing Skills (17:30-18:15)',
    });

    expect(response).toContain('Current schedule');
    expect(response).toContain('Sunday: Muay Thai');
    expect(response).toContain('Friday: Muay Thai');
    expect(response).not.toContain('Boxing Skills');
    expect(response).not.toMatch(/pencil|booked|confirmed/i);
  });

  it('gives minor consent policy fallback', () => {
    const response = buildDeterministicFallbackResponse({
      leadMessage: 'Does my 16 year old need a parent waiver?',
    });

    expect(response).toContain('parent/guardian');
    expect(response).toContain('waiver');
  });
});

describe('validateFightFlowOutbound', () => {
  it('allows a real schedule/pricing answer with a reachable and consented SMS channel', () => {
    const result = validateFightFlowOutbound({
      message: 'Adult unlimited is $159/month. Muay Thai: Mon 7p; Wed 7p. Want to try a free class?',
      leadMessage: 'How much and when are Muay Thai classes?',
      hasRealInquiry: true,
      hasPhone: true,
      smsConsent: true,
      bookingExistsOrCreated: false,
    });

    expect(result.action).toBe('allow');
    expect(result.safeMessage).toContain('$159');
  });

  it('rewrites generic dead-ends instead of allowing them to be sent', () => {
    const result = validateFightFlowOutbound({
      message: 'Thanks for reaching out. What info can I help you with?',
      leadMessage: 'How much are adult classes?',
      contactName: 'Jamie Smith',
      businessName: 'Fight Flow Academy',
      knowledgeText: 'Adult unlimited: $159/month. Registration fee: $50.',
      hasRealInquiry: true,
      hasPhone: true,
      smsConsent: true,
      bookingExistsOrCreated: false,
    });

    expect(result.action).toBe('rewrite');
    expect(result.reasons).toContain('generic_dead_end');
    expect(result.safeMessage).toContain('$159');
    expect(result.needsHumanReview).toBe(false);
  });

  it('blocks technical text before Twilio send', () => {
    const result = validateFightFlowOutbound({
      message: 'TypeError: Cannot read properties of undefined (reading token)',
      leadMessage: 'Do you have boxing?',
      hasRealInquiry: true,
      hasPhone: true,
      smsConsent: true,
      bookingExistsOrCreated: false,
    });

    expect(result.action).toBe('block');
    expect(result.reasons).toContain('technical_text');
    expect(result.needsHumanReview).toBe(true);
  });

  it('blocks booking confirmations unless a matching booking exists or was created first', () => {
    const result = validateFightFlowOutbound({
      message: "You're booked for Muay Thai Monday at 7 PM. The team will expect you.",
      leadMessage: 'Monday works',
      hasRealInquiry: true,
      hasPhone: true,
      smsConsent: true,
      bookingExistsOrCreated: false,
    });

    expect(result.action).toBe('block');
    expect(result.reasons).toContain('booking_confirmation_without_booking');
    expect(result.needsHumanReview).toBe(true);
  });

  it('blocks booking-defer language on bare Wix forms with no real inquiry', () => {
    const result = validateFightFlowOutbound({
      message: "No problem — I won't book it yet. Ask me when you're ready.",
      hasRealInquiry: false,
      hasPhone: true,
      smsConsent: true,
      bookingExistsOrCreated: false,
    });

    expect(result.action).toBe('block');
    expect(result.reasons).toContain('bare_form_booking_defer');
    expect(result.needsHumanReview).toBe(true);
  });

  it('blocks no channel or no consent before attempting SMS', () => {
    const noChannel = validateFightFlowOutbound({
      message: 'Hey! Want to try a free class?',
      hasRealInquiry: false,
      hasPhone: false,
      hasEmail: false,
      smsConsent: true,
      bookingExistsOrCreated: false,
    });
    const noConsent = validateFightFlowOutbound({
      message: 'Hey! Want to try a free class?',
      hasRealInquiry: false,
      hasPhone: true,
      smsConsent: false,
      bookingExistsOrCreated: false,
    });

    expect(noChannel.action).toBe('block');
    expect(noChannel.reasons).toContain('no_reachable_channel');
    expect(noConsent.action).toBe('block');
    expect(noConsent.reasons).toContain('no_sms_consent');
  });
});
