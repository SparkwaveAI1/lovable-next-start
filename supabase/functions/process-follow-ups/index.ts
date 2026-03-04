import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Process Follow-Ups Edge Function
 * 
 * This function processes due follow-up messages for lead nurturing.
 * It should be called periodically (e.g., every hour via cron).
 * 
 * Flow:
 * 1. Find all contact_follow_ups where next_step_due_at <= now() and status = 'active'
 * 2. For each, get the next step from follow_up_steps
 * 3. Send the message (SMS or email) with personalization
 * 4. Update the contact_follow_up record
 * 5. If no more steps, mark as completed
 */

interface ContactFollowUp {
  id: string;
  contact_id: string;
  sequence_id: string;
  business_id: string;
  current_step: number;
}

interface FollowUpStep {
  id: string;
  step_order: number;
  delay_hours: number;
  channel: 'sms' | 'email';
  message_template: string;
  subject_template?: string;
}

interface Contact {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
}

// Invalid US area codes (fake, reserved, or unusable for SMS)
const INVALID_AREA_CODES = new Set([
  '000', '111', '222', '333', '444', '555', '666', '777', '888', '999', // Repeated digits
  '911', '411', '611', '711', '811', // Service codes
  '100', '200', '300', '400', '500', '600', '700', '800', '900', // N00 codes (mostly special)
]);

// Blocked country codes (non-US/Canada that start with +1)
const BLOCKED_COUNTRY_CODES = new Set([
  '242', // Bahamas
  '246', // Barbados
  '264', // Anguilla
  '268', // Antigua
  '284', // British Virgin Islands
  '340', // US Virgin Islands (high fraud)
  '345', // Cayman Islands
  '441', // Bermuda
  '473', // Grenada
  '649', // Turks and Caicos
  '664', // Montserrat
  '721', // Sint Maarten
  '758', // Saint Lucia
  '767', // Dominica
  '784', // St Vincent
  '809', // Dominican Republic
  '829', // Dominican Republic
  '849', // Dominican Republic
  '868', // Trinidad and Tobago
  '869', // St Kitts
  '876', // Jamaica
]);

/**
 * Validate phone number for US SMS delivery
 * Returns { valid: boolean, reason?: string }
 */
function validatePhoneForSMS(phone: string | undefined | null): { valid: boolean; reason?: string } {
  if (!phone) {
    return { valid: false, reason: 'no_phone' };
  }

  // Must start with +1 (US/Canada)
  if (!phone.startsWith('+1')) {
    return { valid: false, reason: 'not_us_number' };
  }

  // Must be exactly 12 characters (+1 + 10 digits)
  if (phone.length !== 12) {
    return { valid: false, reason: 'invalid_length' };
  }

  // Must be all digits after +1
  const digits = phone.slice(2);
  if (!/^\d{10}$/.test(digits)) {
    return { valid: false, reason: 'invalid_format' };
  }

  // Extract area code (first 3 digits after +1)
  const areaCode = digits.slice(0, 3);

  // Check for invalid/reserved area codes
  if (INVALID_AREA_CODES.has(areaCode)) {
    return { valid: false, reason: `invalid_area_code_${areaCode}` };
  }

  // Check for blocked Caribbean/international +1 codes
  if (BLOCKED_COUNTRY_CODES.has(areaCode)) {
    return { valid: false, reason: `blocked_region_${areaCode}` };
  }

  // Area code can't start with 0 or 1
  if (areaCode.startsWith('0') || areaCode.startsWith('1')) {
    return { valid: false, reason: 'invalid_area_code_start' };
  }

  return { valid: true };
}

// Personalize message template with contact data
function personalizeMessage(template: string, contact: Contact): string {
  return template
    .replace(/\{\{first_name\}\}/gi, contact.first_name || 'there')
    .replace(/\{\{last_name\}\}/gi, contact.last_name || '')
    .replace(/\{\{email\}\}/gi, contact.email || '')
    .replace(/\{\{phone\}\}/gi, contact.phone || '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const startTime = Date.now();
  const results = {
    processed: 0,
    smsSent: 0,
    emailSent: 0,
    completed: 0,
    skippedInvalidPhone: 0,
    errors: [] as string[],
    invalidPhoneContacts: [] as { contactId: string; phone: string; reason: string }[],
  };

  try {
    console.log('🔄 Processing follow-ups...');

    // Find all due follow-ups
    const { data: dueFollowUps, error: fetchError } = await supabase
      .from('contact_follow_ups')
      .select(`
        id,
        contact_id,
        sequence_id,
        business_id,
        current_step
      `)
      .eq('status', 'active')
      .lte('next_step_due_at', new Date().toISOString())
      .limit(50); // Process in batches

    if (fetchError) {
      throw new Error(`Failed to fetch due follow-ups: ${fetchError.message}`);
    }

    if (!dueFollowUps || dueFollowUps.length === 0) {
      console.log('✅ No follow-ups due');
      return new Response(
        JSON.stringify({ success: true, message: 'No follow-ups due', results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${dueFollowUps.length} due follow-ups`);

    for (const followUp of dueFollowUps) {
      try {
        // Get the next step (current_step + 1)
        const nextStepOrder = followUp.current_step + 1;
        
        const { data: step, error: stepError } = await supabase
          .from('follow_up_steps')
          .select('*')
          .eq('sequence_id', followUp.sequence_id)
          .eq('step_order', nextStepOrder)
          .single();

        if (stepError || !step) {
          // No more steps - mark as completed
          console.log(`✅ Sequence completed for contact ${followUp.contact_id}`);
          await supabase
            .from('contact_follow_ups')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', followUp.id);
          results.completed++;
          continue;
        }

        // Get contact details
        const { data: contact, error: contactError } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email, phone, sms_status, email_status, tags')
          .eq('id', followUp.contact_id)
          .single();

        if (contactError || !contact) {
          console.error(`Contact not found: ${followUp.contact_id}`);
          results.errors.push(`Contact not found: ${followUp.contact_id}`);
          continue;
        }

        // Personalize the message
        const message = personalizeMessage(step.message_template, contact);
        const subject = step.subject_template 
          ? personalizeMessage(step.subject_template, contact)
          : undefined;

        // Send the message
        let sendSuccess = false;
        let smsSkippedDueToInvalidPhone = false;

        if (step.channel === 'sms' && contact.phone && contact.sms_status !== 'opted_out') {
          // Validate phone number before attempting SMS
          const phoneValidation = validatePhoneForSMS(contact.phone);
          
          if (!phoneValidation.valid) {
            // Invalid phone - log it and mark the contact
            console.warn(`⚠️ Invalid phone for SMS: ${contact.phone} (${phoneValidation.reason})`);
            results.skippedInvalidPhone++;
            results.invalidPhoneContacts.push({
              contactId: contact.id,
              phone: contact.phone,
              reason: phoneValidation.reason || 'unknown',
            });
            smsSkippedDueToInvalidPhone = true;

            // Add "invalid_phone" tag to contact if not already present
            const currentTags = contact.tags || [];
            if (!currentTags.includes('invalid_phone')) {
              await supabase
                .from('contacts')
                .update({ tags: [...currentTags, 'invalid_phone'] })
                .eq('id', contact.id);
              console.log(`🏷️ Added 'invalid_phone' tag to contact ${contact.id}`);
            }

            // Log the skip to automation_logs
            await supabase.from('automation_logs').insert({
              business_id: followUp.business_id,
              automation_type: 'sms_skipped_invalid_phone',
              status: 'skipped',
              processed_data: {
                contact_id: contact.id,
                phone: contact.phone,
                reason: phoneValidation.reason,
                sequence_id: followUp.sequence_id,
                step_order: nextStepOrder,
              },
            });

            // Fall through to try email fallback below
          } else {
            // Valid phone - send SMS
            console.log(`📱 Sending SMS to ${contact.phone}`);
            
            const smsResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SERVICE_ROLE_JWT') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: contact.phone,
                message: message,
                businessId: followUp.business_id,
                contactId: contact.id,
              }),
            });

            if (smsResponse.ok) {
              sendSuccess = true;
              results.smsSent++;
              console.log(`✅ SMS sent to ${contact.phone}`);
            } else {
              const errorText = await smsResponse.text();
              console.error(`❌ SMS failed: ${errorText}`);
              results.errors.push(`SMS failed for ${contact.id}: ${errorText}`);
            }
          }
        }
        
        // Handle email channel OR fallback from invalid SMS phone
        if (!sendSuccess && (step.channel === 'email' || smsSkippedDueToInvalidPhone) && contact.email && contact.email_status !== 'unsubscribed') {
          // Send Email
          console.log(`📧 Sending email to ${contact.email}`);

          // Get business info for from address
          const { data: business } = await supabase
            .from('businesses')
            .select('name')
            .eq('id', followUp.business_id)
            .single();

          // Get agent config for email settings
          const { data: agentConfig } = await supabase
            .from('agent_config')
            .select('from_email, from_name')
            .eq('business_id', followUp.business_id)
            .single();

          const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SERVICE_ROLE_JWT') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: contact.email,
              subject: subject || 'Following up',
              html: message,
              from_email: agentConfig?.from_email,
              from_name: agentConfig?.from_name || business?.name,
              contact_id: contact.id,
            }),
          });

          if (emailResponse.ok) {
            sendSuccess = true;
            results.emailSent++;
            console.log(`✅ Email sent to ${contact.email}`);
          } else {
            const errorText = await emailResponse.text();
            console.error(`❌ Email failed: ${errorText}`);
            results.errors.push(`Email failed for ${contact.id}: ${errorText}`);
            
            // Email failed - pause follow-up to prevent infinite retries
            console.warn(`⏸️ Pausing follow-up for ${contact.id} - email send failed`);
            await supabase
              .from('contact_follow_ups')
              .update({ 
                status: 'paused',
                pause_reason: `Email failed: ${errorText.substring(0, 200)}`
              })
              .eq('id', followUp.id);
            results.errors.push(`Paused follow-up for ${contact.id} - email failed`);
          }

        } else if (!sendSuccess) {
          // Can't send via preferred channel and no fallback worked
          console.warn(`⚠️ Cannot send ${step.channel} to contact ${contact.id} - missing info or opted out`);
          
          // No fallback available - pause the follow-up
          console.warn(`⏸️ Pausing follow-up for ${contact.id} - no valid channel`);
          await supabase
            .from('contact_follow_ups')
            .update({ status: 'paused' })
            .eq('id', followUp.id);
          results.errors.push(`Paused follow-up for ${contact.id} - no valid channel`);
        }

        // Update the follow-up record
        if (sendSuccess) {
          // Check if there's a next step
          const { data: nextStep } = await supabase
            .from('follow_up_steps')
            .select('delay_hours')
            .eq('sequence_id', followUp.sequence_id)
            .eq('step_order', nextStepOrder + 1)
            .single();

          const nextStepDue = nextStep
            ? new Date(Date.now() + nextStep.delay_hours * 60 * 60 * 1000).toISOString()
            : null;

          await supabase
            .from('contact_follow_ups')
            .update({
              current_step: nextStepOrder,
              last_step_sent_at: new Date().toISOString(),
              next_step_due_at: nextStepDue,
              status: nextStepDue ? 'active' : 'completed',
              completed_at: nextStepDue ? null : new Date().toISOString(),
            })
            .eq('id', followUp.id);

          results.processed++;
        }

        // Log to automation_logs
        await supabase.from('automation_logs').insert({
          business_id: followUp.business_id,
          automation_type: 'follow_up_sent',
          status: sendSuccess ? 'success' : 'error',
          processed_data: {
            contact_id: contact.id,
            sequence_id: followUp.sequence_id,
            step_order: nextStepOrder,
            channel: step.channel,
            message_preview: message.substring(0, 100),
          },
          error_message: sendSuccess ? null : results.errors[results.errors.length - 1],
        });

      } catch (itemError: any) {
        console.error(`Error processing follow-up ${followUp.id}:`, itemError);
        results.errors.push(`Error for ${followUp.id}: ${itemError.message}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Follow-up processing complete in ${duration}ms`, results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${results.processed} follow-ups`,
        results,
        durationMs: duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Follow-up processing error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message, results }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
