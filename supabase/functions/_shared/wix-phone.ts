type WixPhoneExtraction = {
  phone: string;
  source: string;
  originalPhone: string;
};

function toTrimmedString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function digitCount(value: string): number {
  return (value.match(/\d/g) || []).length;
}

function isPhoneLike(value: string): boolean {
  return digitCount(value) >= 7;
}

function readPhoneValue(phoneRecord: any, keys: string[]): string {
  if (!phoneRecord) return '';

  if (typeof phoneRecord === 'string' || typeof phoneRecord === 'number') {
    return toTrimmedString(phoneRecord);
  }

  for (const key of keys) {
    const value = toTrimmedString(phoneRecord[key]);
    if (value) return value;
  }

  return '';
}

function pickFromPhoneArray(phones: any[], keys: string[]): string {
  const orderedPhones = [
    ...phones.filter((phone) => phone?.primary),
    ...phones.filter((phone) => !phone?.primary),
  ];

  for (const phoneRecord of orderedPhones) {
    const value = readPhoneValue(phoneRecord, keys);
    if (value) return value;
  }

  return '';
}

/**
 * Normalize common US phone inputs to E.164. Empty values return null; values
 * that cannot be confidently normalized are returned trimmed as supplied.
 */
export function normalizePhoneNumber(phoneNumber: string): string | null {
  const trimmed = toTrimmedString(phoneNumber);
  if (!trimmed) return null;

  const cleaned = trimmed.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+') && digitCount(cleaned) >= 7) {
    return cleaned;
  }

  const digits = trimmed.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return trimmed;
}

export function extractWixPhone(formData: any, contactData: any): WixPhoneExtraction {
  const safeFormData = formData || {};
  const safeContactData = contactData || {};

  const candidates: Array<{ source: string; value: string }> = [
    { source: 'form_field', value: toTrimmedString(safeFormData['field:comp-l3j29uwo']) },
    { source: 'form_data', value: toTrimmedString(safeFormData.phone) },
    { source: 'contact_direct', value: toTrimmedString(safeContactData.phone) },
  ];

  if (Array.isArray(safeContactData.phones)) {
    candidates.push({
      source: 'contact_array',
      value: pickFromPhoneArray(safeContactData.phones, ['phone', 'formattedPhone', 'e164Phone']),
    });
  }

  if (Array.isArray(safeContactData.phones?.items)) {
    candidates.push({
      source: 'contact_phones_items',
      value: pickFromPhoneArray(safeContactData.phones.items, ['e164Phone', 'formattedPhone', 'phone']),
    });
  }

  if (Array.isArray(safeFormData.submissions)) {
    const phoneSubmission = safeFormData.submissions.find((submission: any) => {
      const label = toTrimmedString(submission?.label).toLowerCase();
      const value = toTrimmedString(submission?.value);
      return (
        (label.includes('phone') || label.includes('mobile') || label.includes('cell')) &&
        isPhoneLike(value)
      );
    });

    candidates.push({
      source: 'form_submission_phone',
      value: toTrimmedString(phoneSubmission?.value),
    });
  }

  const fieldScanEntry = Object.entries(safeFormData).find(([key, value]) => {
    const stringValue = toTrimmedString(value);
    return key.startsWith('field:') && key !== 'field:comp-l3j29uwo' && isPhoneLike(stringValue);
  });

  if (fieldScanEntry) {
    candidates.push({
      source: 'form_field_scan',
      value: toTrimmedString(fieldScanEntry[1]),
    });
  }

  for (const candidate of candidates) {
    if (!candidate.value) continue;

    return {
      phone: normalizePhoneNumber(candidate.value) || '',
      source: candidate.source,
      originalPhone: candidate.value,
    };
  }

  return {
    phone: '',
    source: 'none',
    originalPhone: '',
  };
}
