import { describe, expect, it } from 'vitest';
import { buildDeterministicFallbackResponse, detectBookingGuardrail } from '../../supabase/functions/_shared/fightflow-response-guardrails';

describe('detectBookingGuardrail', () => {
  it('pauses booking when the lead says not to book yet', () => {
    const result = detectBookingGuardrail("Don't book just yet, I need to ask my parents", 'AI: You are booked Tuesday at 2 PM');

    expect(result?.kind).toBe('dont_book');
    expect(result?.suppressBooking).toBe(true);
    expect(result?.message).toContain("won't book it yet");
    expect(result?.needsHumanReview).toBe(true);
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

  it('uses schedule fallback when the lead asks class times', () => {
    const response = buildDeterministicFallbackResponse({
      leadMessage: 'What times are Muay Thai classes?',
      scheduleText: 'Monday: Muay Thai with Scott (18:00-19:00)\nWednesday: Muay Thai with Scott (18:00-19:00)',
    });

    expect(response).toContain('Current schedule');
    expect(response).toContain('Muay Thai');
  });

  it('gives minor consent policy fallback', () => {
    const response = buildDeterministicFallbackResponse({
      leadMessage: 'Does my 16 year old need a parent waiver?',
    });

    expect(response).toContain('parent/guardian');
    expect(response).toContain('waiver');
  });
});
