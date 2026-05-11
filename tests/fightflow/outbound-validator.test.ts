import { describe, expect, it } from 'vitest';
import { validateFightFlowOutbound } from '../../supabase/functions/_shared/fightflow-response-guardrails';

describe('validateFightFlowOutbound', () => {
  it('rewrites generic dead-end responses to real lead questions before Twilio', () => {
    const result = validateFightFlowOutbound({
      message: 'What info can I help you with?',
      leadMessage: 'What are your youth boxing prices?',
      hasRealInquiry: true,
    });

    expect(result.action).toBe('rewrite');
    expect(result.needsHumanReview).toBe(false);
    expect(result.reasons).toContain('generic_dead_end');
    expect(result.safeMessage).not.toContain('What info can I help you with');
  });

  it('blocks technical error text before Twilio', () => {
    const result = validateFightFlowOutbound({
      message: 'TypeError: Cannot read properties of undefined',
      leadMessage: 'Do you have Muay Thai tonight?',
      hasRealInquiry: true,
    });

    expect(result.action).toBe('block');
    expect(result.needsHumanReview).toBe(true);
    expect(result.reasons).toContain('technical_text');
  });

  it('blocks booking confirmation language unless a booking was created first', () => {
    const result = validateFightFlowOutbound({
      message: 'You are confirmed for Tuesday at 6pm. See you then!',
      leadMessage: 'Can I try Tuesday?',
      hasRealInquiry: true,
      bookingExistsOrCreated: false,
    });

    expect(result.action).toBe('block');
    expect(result.reasons).toContain('booking_confirmation_without_booking');
  });

  it('allows deterministic booking pause guardrail copy', () => {
    const result = validateFightFlowOutbound({
      message: "No problem — I won't book it yet. Ask me when you're ready, or tell me what class/time you’re considering.",
      leadMessage: "Don't book me yet",
      hasRealInquiry: true,
    });

    expect(result.action).toBe('allow');
  });
});
