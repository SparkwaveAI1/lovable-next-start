export type WebhookAuthDecision =
  | { allowed: true; reason: 'no_secret_configured' | 'secret_header_match' | 'test_mode' | 'legacy_secret_not_enforced' }
  | { allowed: false; status: 401 | 403; reason: 'missing_secret_header' | 'invalid_secret_header' };

export interface LeadReachabilityInput {
  phone?: string | null;
  email?: string | null;
  smsConsent?: boolean;
}

export interface LeadReachabilityDecision {
  reachable: boolean;
  hasValidPhone: boolean;
  hasValidEmail: boolean;
  canSms: boolean;
  canEmail: boolean;
  quarantine: boolean;
  reasons: Array<'invalid_phone' | 'invalid_email' | 'no_reachable_channel' | 'missing_sms_consent'>;
}

export function verifyWebhookSharedSecret(headers: Headers, configuredSecret?: string | null, isTest = false, enforceSecret = false): WebhookAuthDecision {
  const secret = (configuredSecret || '').trim();
  if (isTest) return { allowed: true, reason: 'test_mode' };
  if (!secret) return { allowed: true, reason: 'no_secret_configured' };
  // Legacy Wix webhooks were configured before a shared-secret header contract existed.
  // Do not hard-block live leads until Wix is confirmed to send the header and
  // FIGHTFLOW_ENFORCE_WEBHOOK_SECRET is explicitly enabled.
  if (!enforceSecret) return { allowed: true, reason: 'legacy_secret_not_enforced' };

  const provided =
    headers.get('x-webhook-secret') ||
    headers.get('x-wix-webhook-secret') ||
    headers.get('x-sparkwave-webhook-secret') ||
    '';

  if (!provided) return { allowed: false, status: 401, reason: 'missing_secret_header' };
  if (provided.trim() !== secret) return { allowed: false, status: 403, reason: 'invalid_secret_header' };
  return { allowed: true, reason: 'secret_header_match' };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(',')}}`;
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function buildWebhookIdempotencyKey(payload: any): Promise<{ key: string; source: 'submission_id' | 'payload_hash' }> {
  const formData = payload?.data || payload || {};
  const submissionId = formData.submissionId || payload?.submissionId;
  if (submissionId && String(submissionId).trim()) {
    return { key: String(submissionId).trim(), source: 'submission_id' };
  }

  const canonical = stableStringify({
    contact: formData.contact || null,
    email: formData.email || formData['field:comp-l3j29uwg'] || null,
    phone: formData.phone || null,
    submissions: formData.submissions || null,
    formName: formData.formName || formData.formType || null,
    createdDate: formData.createdDate || formData.created_at || payload?.createdDate || null,
  });
  const hash = await sha256Hex(canonical);
  return { key: `payload:${hash}`, source: 'payload_hash' };
}

export function extractExplicitSmsConsent(formData: any, contactData: any = {}): boolean {
  const directValues = [
    formData?.smsConsent,
    formData?.sms_consent,
    formData?.textConsent,
    formData?.text_consent,
    formData?.optInSms,
    formData?.opt_in_sms,
    formData?.consent_sms,
    contactData?.smsConsent,
    contactData?.textConsent,
  ];

  for (const value of directValues) {
    if (value === true) return true;
    if (typeof value === 'string' && /^(true|yes|checked|1|opted in|opt-in)$/i.test(value.trim())) return true;
  }

  const submissions = Array.isArray(formData?.submissions) ? formData.submissions : [];
  return submissions.some((submission: any) => {
    const label = String(submission?.label || '').toLowerCase();
    const value = String(submission?.value || '').trim().toLowerCase();
    const isSmsConsentLabel =
      (label.includes('sms') || label.includes('text') || label.includes('phone')) &&
      (label.includes('consent') || label.includes('opt') || label.includes('agree') || label.includes('permission'));
    return isSmsConsentLabel && /^(checked|true|yes|1|i agree|agree|opt in|opt-in)$/i.test(value);
  });
}

function isValidEmail(email?: string | null): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function isValidPhone(phone?: string | null): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

export function validateLeadReachability(input: LeadReachabilityInput): LeadReachabilityDecision {
  const hasPhoneText = Boolean(input.phone && input.phone.trim());
  const hasEmailText = Boolean(input.email && input.email.trim());
  const hasValidPhone = isValidPhone(input.phone || null);
  const hasValidEmail = isValidEmail(input.email || null);
  const canSms = hasValidPhone && input.smsConsent === true;
  const canEmail = hasValidEmail;
  const reasons: LeadReachabilityDecision['reasons'] = [];

  if (hasPhoneText && !hasValidPhone) reasons.push('invalid_phone');
  if (hasEmailText && !hasValidEmail) reasons.push('invalid_email');
  if (hasValidPhone && input.smsConsent !== true) reasons.push('missing_sms_consent');
  if (!canSms && !canEmail) reasons.push('no_reachable_channel');

  return {
    reachable: canSms || canEmail,
    hasValidPhone,
    hasValidEmail,
    canSms,
    canEmail,
    quarantine: !canSms && !canEmail,
    reasons,
  };
}
