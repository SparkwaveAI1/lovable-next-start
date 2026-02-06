import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { withRetry, SMS_RETRY_OPTIONS } from "../_shared/retry.ts";
import { checkContactForOutreach, logSendDecision } from "../_shared/contact-checks.ts";

/**
 * Send SMS Edge Function (v6.0 - with pre-send contact checks)
 * 
 * REQUIRED ENVIRONMENT SECRETS:
 * - TWILIO_ACCOUNT_SID (or TWILIO_SID): Your Twilio Account SID
 * - TWILIO_AUTH_TOKEN: Your Twilio Auth Token  
 * - TWILIO_PHONE_NUMBER: Your Twilio phone number in E.164 format
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Phone normalization function for E.164 format
function normalizePhoneNumber(phoneNumber: string): string | null {
  if (!phoneNumber) return null;
  
  const digits = phoneNumber.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return '+1' + digits;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return '+' + digits;
  }
  
  console.warn(`Invalid phone number format: ${phoneNumber}`);
  return null;
}

// Twilio API call with retry
async function sendViaTwilio(
  accountSid: string,
  authToken: string,
  fromNumber: string,
  toNumber: string,
  message: string
): Promise<{ sid: string }> {
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: toNumber,
        Body: message
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] SMS function started`);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request
    const rawBody = await req.text();
    const requestBody = JSON.parse(rawBody);
    const { to, message, businessId, contactId, skipContactCheck } = requestBody;
    
    console.log(`[${requestId}] Request:`, { 
      to: to?.slice(0, 3) + '***', 
      messageLength: message?.length,
      businessId,
      contactId: contactId?.slice(0, 8),
      skipContactCheck
    });

    // Initialize Supabase for contact checks
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // PRE-SEND CONTACT CHECK (LR-001)
    // Skip only if explicitly requested (for system messages, tests, etc.)
    if (contactId && !skipContactCheck) {
      console.log(`[${requestId}] Running contact check for ${contactId.slice(0, 8)}...`);
      
      const checkResult = await checkContactForOutreach(supabase, contactId);
      
      // Log the decision for audit trail
      await logSendDecision(supabase, contactId, businessId, checkResult, 'sms', message);
      
      if (!checkResult.canSend) {
        console.log(`[${requestId}] BLOCKED: ${checkResult.reason}`);
        return new Response(JSON.stringify({
          success: false,
          blocked: true,
          reason: checkResult.reason,
          requiresReview: checkResult.requiresReview,
          recentMessages: checkResult.recentMessages
        }), {
          status: 200, // Not an error, just blocked
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (checkResult.requiresReview) {
        console.log(`[${requestId}] REVIEW REQUIRED: ${checkResult.reason}`);
        // For now, still send but log warning
        // Future: Route to approval queue
      }
      
      console.log(`[${requestId}] Contact check passed: ${checkResult.reason}`);
    }

    // Validate credentials
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || Deno.env.get('TWILIO_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio credentials not configured');
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(to);
    if (!normalizedPhone) {
      throw new Error(`Invalid phone number format: ${to}`);
    }

    console.log(`[${requestId}] Sending to ${normalizedPhone.slice(0, 5)}***`);

    // Send with retry logic
    const result = await withRetry(
      () => sendViaTwilio(accountSid, authToken, fromNumber, normalizedPhone, message),
      {
        ...SMS_RETRY_OPTIONS,
        onRetry: (error, attempt) => {
          console.log(`[${requestId}] Retry ${attempt}: ${error.message}`);
        }
      }
    );

    console.log(`[${requestId}] SMS sent successfully: ${result.sid}`);

    return new Response(JSON.stringify({
      success: true,
      messageSid: result.sid
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error(`[${requestId}] SMS failed:`, error.message);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Deployment v5.0 - Added retry logic with exponential backoff
