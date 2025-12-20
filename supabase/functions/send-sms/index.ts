import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * REQUIRED ENVIRONMENT SECRETS (set in Supabase Dashboard -> Edge Functions -> Secrets):
 * - TWILIO_ACCOUNT_SID (or TWILIO_SID): Your Twilio Account SID
 * - TWILIO_AUTH_TOKEN: Your Twilio Auth Token  
 * - TWILIO_PHONE_NUMBER: Your Twilio phone number in E.164 format (e.g., +1234567890)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Phone normalization function for E.164 format
function normalizePhoneNumber(phoneNumber: string): string | null {
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

serve(async (req) => {
  // Add debug logging immediately at function start
  console.log('=== SMS FUNCTION STARTED ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Timestamp:', new Date().toISOString());
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== PARSING REQUEST BODY ===');
    
    // Get raw request body first for debugging
    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);
    console.log('Raw body length:', rawBody.length);
    console.log('Raw body type:', typeof rawBody);
    
    // Try to parse as JSON with better error handling
    let requestBody;
    try {
      requestBody = JSON.parse(rawBody);
      console.log('JSON parsing successful');
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError.message);
      console.error('Raw body content:', JSON.stringify(rawBody));
      throw new Error(`Invalid JSON in request body: ${parseError.message}`);
    }
    
    console.log('Request body received:', { 
      hasTo: !!requestBody.to, 
      hasMessage: !!requestBody.message, 
      hasBusinessId: !!requestBody.businessId 
    });
    
    const { to, message, businessId } = requestBody;
    console.log('Extracted parameters:', { to: to?.substring(0, 3) + '...', messageLength: message?.length });

    console.log('=== CHECKING ENVIRONMENT VARIABLES INDIVIDUALLY ===');
    // Support both naming conventions for account SID
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || Deno.env.get('TWILIO_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    console.log('TWILIO_SID check:', {
      exists: !!accountSid,
      length: accountSid?.length || 0,
      startsWithAC: accountSid?.startsWith('AC') || false
    });

    console.log('TWILIO_AUTH_TOKEN check:', {
      exists: !!authToken,
      length: authToken?.length || 0
    });

    console.log('TWILIO_PHONE_NUMBER check:', {
      exists: !!fromNumber,
      length: fromNumber?.length || 0,
      value: fromNumber
    });

    // Test each credential separately
    if (!accountSid) {
      throw new Error('TWILIO_SID is missing or null');
    }
    if (!authToken) {
      throw new Error('TWILIO_AUTH_TOKEN is missing or null');
    }
    if (!fromNumber) {
      throw new Error('TWILIO_PHONE_NUMBER is missing or null');
    }

    console.log('All Twilio credentials verified successfully');

    // Normalize phone number to E.164 format
    const normalizedPhone = normalizePhoneNumber(to);
    
    if (!normalizedPhone) {
      throw new Error(`Invalid phone number format: ${to}`);
    }
    
    console.log(`Normalized phone: ${to} -> ${normalizedPhone}`);

    // Get Twilio credentials from environment
    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio credentials not configured');
    }

    // Send SMS via Twilio API
    const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: normalizedPhone,
        Body: message
      })
    });

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.text();
      throw new Error(`Twilio API error: ${errorData}`);
    }

    const twilioResult = await twilioResponse.json();

    return new Response(JSON.stringify({
      success: true,
      messageSid: twilioResult.sid
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('SMS sending error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Deployment v4.0 - Using TWILIO_SID to bypass secret access issue