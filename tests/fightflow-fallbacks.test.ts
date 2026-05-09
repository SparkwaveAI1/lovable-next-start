import { describe, expect, it } from 'vitest';
import {
  buildDeterministicFightFlowFallback,
  detectFightFlowFallbackCategory,
} from '../supabase/functions/_shared/fightflow-fallbacks';

const maxSmsLength = 160;

describe('FightFlow deterministic fallback templates', () => {
  it('answers youth ages/classes with a parent-focused trial next step', () => {
    const category = detectFightFlowFallbackCategory('My son is 12. Do you have youth classes?');
    const fallback = buildDeterministicFightFlowFallback({ latestMessage: 'My son is 12. Do you have youth classes?' });

    expect(category).toBe('youth');
    expect(fallback.message).toContain('kids');
    expect(fallback.message).toContain('free trial');
    expect(fallback.shouldHandoff).toBe(false);
    expect(fallback.message.length).toBeLessThanOrEqual(maxSmsLength);
  });

  it('answers pricing without inventing exact rates and flags human follow-up', () => {
    const fallback = buildDeterministicFightFlowFallback({ latestMessage: 'How much does it cost for my daughter?' });

    expect(fallback.category).toBe('pricing');
    expect(fallback.message).toContain('depends');
    expect(fallback.message).toContain('Scott');
    expect(fallback.shouldHandoff).toBe(true);
    expect(fallback.message.length).toBeLessThanOrEqual(maxSmsLength);
  });

  it('uses loaded schedule details when schedule fallback is needed', () => {
    const fallback = buildDeterministicFightFlowFallback({
      latestMessage: 'What times are classes tonight?',
      schedule: 'Monday: Boxing at 6:00 PM\nTuesday: BJJ at 7:00 PM',
    });

    expect(fallback.category).toBe('schedule');
    expect(fallback.message).toContain('Monday: Boxing at 6:00 PM');
    expect(fallback.message.length).toBeLessThanOrEqual(maxSmsLength);
  });

  it('gives a concrete trial booking prompt for booking attempts', () => {
    const fallback = buildDeterministicFightFlowFallback({ latestMessage: 'Can I book a free trial this week?' });

    expect(fallback.category).toBe('trial_booking');
    expect(fallback.message).toContain('free trial');
    expect(fallback.message).toContain('best day');
    expect(fallback.message.length).toBeLessThanOrEqual(maxSmsLength);
  });

  it('answers parent consent/minor policy safely', () => {
    const fallback = buildDeterministicFightFlowFallback({ latestMessage: 'Does my 15 year old need a waiver or parent consent?' });

    expect(fallback.category).toBe('parent_consent');
    expect(fallback.message).toContain('Parent/guardian');
    expect(fallback.message).toContain('consent');
    expect(fallback.message.length).toBeLessThanOrEqual(maxSmsLength);
  });

  it('falls back to generic handoff for uncategorized messages', () => {
    const fallback = buildDeterministicFightFlowFallback({ latestMessage: 'Can you explain everything?' });

    expect(fallback.category).toBe('generic');
    expect(fallback.shouldHandoff).toBe(true);
    expect(fallback.message).toContain('Scott');
    expect(fallback.message.length).toBeLessThanOrEqual(maxSmsLength);
  });
});
