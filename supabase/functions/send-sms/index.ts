import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, message, businessId } = await req.json();

    // Normalize phone number to E.164 format
    const normalizedPhone = normalizePhoneNumber(to);
    
    if (!normalizedPhone) {
      throw new Error(`Invalid phone number format: ${to}`);
    }
    
    console.log(`Normalized phone: ${to} -> ${normalizedPhone}`);

    // Get Twilio credentials from environment
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

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