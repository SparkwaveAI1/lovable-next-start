import { describe, expect, it } from 'vitest';
import { extractWixPhone, normalizePhoneNumber } from '../../supabase/functions/_shared/wix-phone';

describe('normalizePhoneNumber', () => {
  it.each([
    ['9195101977', '+19195101977'],
    ['(919) 510-1977', '+19195101977'],
    ['1 919 510 1977', '+19195101977'],
    ['+19195101977', '+19195101977'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizePhoneNumber(input)).toBe(expected);
  });

  it('returns null only for empty input', () => {
    expect(normalizePhoneNumber('')).toBeNull();
    expect(normalizePhoneNumber('   ')).toBeNull();
  });

  it('keeps non-normalizable strings trimmed', () => {
    expect(normalizePhoneNumber(' call me maybe ')).toBe('call me maybe');
  });
});

describe('extractWixPhone', () => {
  it('extracts a phone number from Wix submissions when contact phone is blank', () => {
    const result = extractWixPhone(
      {
        submissions: [
          { label: 'First Name', value: 'Jane' },
          { label: 'Phone', value: '9195101977' },
        ],
      },
      { phone: '' },
    );

    expect(result).toEqual({
      phone: '+19195101977',
      source: 'form_submission_phone',
      originalPhone: '9195101977',
    });
  });

  it('supports Wix Contacts API phones.items[].e164Phone', () => {
    const result = extractWixPhone(
      {},
      {
        phones: {
          items: [{ e164Phone: '+19195101977', formattedPhone: '(919) 510-1977' }],
        },
      },
    );

    expect(result).toEqual({
      phone: '+19195101977',
      source: 'contact_phones_items',
      originalPhone: '+19195101977',
    });
  });

  it('uses the documented extraction priority order', () => {
    const result = extractWixPhone(
      {
        'field:comp-l3j29uwo': '(919) 510-1977',
        phone: '9195100000',
        submissions: [{ label: 'Mobile', value: '9195101111' }],
      },
      { phone: '9195102222' },
    );

    expect(result).toEqual({
      phone: '+19195101977',
      source: 'form_field',
      originalPhone: '(919) 510-1977',
    });
  });

  it('supports contactData.phones arrays with e164Phone, formattedPhone, or phone', () => {
    const result = extractWixPhone(
      {},
      { phones: [{ formattedPhone: '' }, { primary: true, e164Phone: '+19195101977' }] },
    );

    expect(result).toEqual({
      phone: '+19195101977',
      source: 'contact_array',
      originalPhone: '+19195101977',
    });
  });

  it('falls back to phone-like field:* values', () => {
    const result = extractWixPhone(
      { 'field:random': '919.510.1977' },
      {},
    );

    expect(result).toEqual({
      phone: '+19195101977',
      source: 'form_field_scan',
      originalPhone: '919.510.1977',
    });
  });

  it('returns empty values when no phone is present', () => {
    expect(extractWixPhone({ submissions: [{ label: 'Message', value: 'hello' }] }, {})).toEqual({
      phone: '',
      source: 'none',
      originalPhone: '',
    });
  });
});
