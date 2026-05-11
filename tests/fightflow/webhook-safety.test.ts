import { describe, expect, it } from 'vitest';
import {
  buildWebhookIdempotencyKey,
  extractExplicitSmsConsent,
  validateLeadReachability,
  verifyWebhookSharedSecret,
} from '../../supabase/functions/_shared/fightflow-webhook-safety';

describe('verifyWebhookSharedSecret', () => {
  it('allows webhooks when no endpoint secret is configured', () => {
    const result = verifyWebhookSharedSecret(new Headers(), null, false);
    expect(result).toEqual({ allowed: true, reason: 'no_secret_configured' });
  });

  it('allows legacy webhooks by default until shared-secret enforcement is explicitly enabled', () => {
    const result = verifyWebhookSharedSecret(new Headers(), 'expected-secret', false);
    expect(result).toEqual({ allowed: true, reason: 'legacy_secret_not_enforced' });
  });

  it('rejects missing secret header when endpoint secret is configured and enforcement is enabled', () => {
    const result = verifyWebhookSharedSecret(new Headers(), 'expected-secret', false, true);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('missing_secret_header');
  });

  it('rejects invalid secret header when enforcement is enabled', () => {
    const headers = new Headers({ 'x-webhook-secret': 'wrong-secret' });
    const result = verifyWebhookSharedSecret(headers, 'expected-secret', false, true);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('invalid_secret_header');
  });

  it('allows matching secret header when enforcement is enabled', () => {
    const headers = new Headers({ 'x-webhook-secret': 'expected-secret' });
    const result = verifyWebhookSharedSecret(headers, 'expected-secret', false, true);
    expect(result).toEqual({ allowed: true, reason: 'secret_header_match' });
  });
});

describe('buildWebhookIdempotencyKey', () => {
  it('prefers Wix submissionId when present', async () => {
    await expect(buildWebhookIdempotencyKey({ data: { submissionId: 'sub-123' } })).resolves.toEqual({
      key: 'sub-123',
      source: 'submission_id',
    });
  });

  it('builds a stable payload hash when submissionId is absent', async () => {
    const a = await buildWebhookIdempotencyKey({ data: { email: 'lead@example.com', formName: 'Trial', submissions: [] } });
    const b = await buildWebhookIdempotencyKey({ data: { submissions: [], formName: 'Trial', email: 'lead@example.com' } });
    expect(a.source).toBe('payload_hash');
    expect(a.key).toMatch(/^payload:/);
    expect(a.key).toBe(b.key);
  });
});

describe('extractExplicitSmsConsent', () => {
  it('defaults to false when only a phone number exists', () => {
    expect(extractExplicitSmsConsent({ phone: '+15555551212' })).toBe(false);
  });

  it('detects explicit direct opt-in fields', () => {
    expect(extractExplicitSmsConsent({ smsConsent: true })).toBe(true);
    expect(extractExplicitSmsConsent({ text_consent: 'yes' })).toBe(true);
  });

  it('detects checked SMS consent fields in Wix submissions', () => {
    expect(extractExplicitSmsConsent({
      submissions: [{ label: 'I agree to receive text/SMS messages', value: 'checked' }],
    })).toBe(true);
  });
});

describe('validateLeadReachability', () => {
  it('marks phone-only leads without explicit consent as not SMS reachable', () => {
    const result = validateLeadReachability({ phone: '+15555551212', smsConsent: false });
    expect(result.canSms).toBe(false);
    expect(result.reasons).toContain('missing_sms_consent');
    expect(result.quarantine).toBe(true);
  });

  it('allows SMS only when phone is valid and consent is explicit', () => {
    const result = validateLeadReachability({ phone: '+15555551212', smsConsent: true });
    expect(result.canSms).toBe(true);
    expect(result.quarantine).toBe(false);
  });

  it('keeps email reachable even when SMS consent is missing', () => {
    const result = validateLeadReachability({ phone: '+15555551212', email: 'lead@example.com', smsConsent: false });
    expect(result.canSms).toBe(false);
    expect(result.canEmail).toBe(true);
    expect(result.quarantine).toBe(false);
  });
});
