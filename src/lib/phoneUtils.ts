/**
 * Normalize phone number to E.164 format for Twilio SMS
 * Handles various US phone number formats
 */
export function normalizePhoneNumber(phoneNumber: string): string | null {
  if (!phoneNumber) return null;
  
  // Remove all non-numeric characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Handle different digit lengths
  let normalizedDigits = '';
  
  if (digits.length === 10) {
    // 10 digits: assume US number, add country code
    normalizedDigits = '1' + digits;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // 11 digits starting with 1: already has US country code
    normalizedDigits = digits;
  } else {
    // Invalid length for US phone number
    console.warn(`Invalid phone number format: ${phoneNumber}`);
    return null;
  }
  
  // Validate US phone number (must be 11 digits starting with 1)
  if (normalizedDigits.length !== 11 || !normalizedDigits.startsWith('1')) {
    console.warn(`Invalid US phone number: ${phoneNumber}`);
    return null;
  }
  
  // Return E.164 format with + prefix
  return '+' + normalizedDigits;
}

/**
 * Format phone number for display in UI
 */
export function formatPhoneDisplay(phoneNumber: string): string {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return phoneNumber;
  
  // Convert +1XXXXXXXXXX to (XXX) XXX-XXXX format
  const digits = normalized.slice(2); // Remove +1
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
}

/**
 * Validate if phone number can be normalized
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  return normalizePhoneNumber(phoneNumber) !== null;
}