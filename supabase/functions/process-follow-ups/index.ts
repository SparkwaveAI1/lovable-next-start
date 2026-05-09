import { createClient } from "npm:@supabase/supabase-js@2";

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
  sms_status?: string;
  email_status?: string;
  status?: string;
  pipeline_stage?: string;
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

function getServiceRoleJwt(): string {
  const jwt = Deno.env.get('SERVICE_ROLE_JWT') || '';
  if (!jwt || !jwt.startsWith('eyJ')) {
    throw new Error('SERVICE_ROLE_JWT missing or invalid; do not use SUPABASE_SERVICE_ROLE_KEY in edge runtime');
  }
  return jwt;
}

function containsPlaceholder(message: string): boolean {
  return /\[[^\]]+\]|\{\{[^}]+\}\}|\bTODO\b|INSERT_LINK|BOOKING_LINK/i.test(message);
}

function hasBookingIntent(message: string): boolean {
  return /free trial|trial class|book|booking|schedule|come try|visit|see you/i.test(message);
}

function canUseEmail(contact: Contact): boolean {
  return Boolean(contact.email && contact.email_status !== 'unsubscribed');
}

function canUseSms(contact: Contact): boolean {
  return Boolean(contact.phone && contact.sms_status !== 'opted_out');
}

async function parseJsonBody(req: Request): Promise<Record<string, any>> {
  if (req.method === 'GET') return {};
  try {
    const raw = await req.text();
    return raw ? JSON.parse(raw) : {};
  } catch (_error) {
    return {};
  }
}

async function logFollowUpAlert(
  supabase: any,
  businessId: string,
  contactId: string,
  alertType: string,
  message: string,
  data: Record<string, any> = {},
) {
  await supabase.from('automation_logs').insert({
    business_id: businessId,
    automation_type: 'fightflow_follow_up_alert',
    status: 'warning',
    error_message: message,
    processed_data: {
      contact_id: contactId,
      alert_type: alertType,
      ...data,
    },
  });
}

async function updateCrmStage(
  supabase: any,
  contact: Contact,
  stage: 'nurture' | 'needs_human' | 'trial_pending',
) {
  const terminalStages = new Set(['booked', 'won', 'lost', 'cancelled', 'do_not_contact']);
  if (contact.pipeline_stage && terminalStages.has(contact.pipeline_stage)) return;

  const update = stage === 'trial_pending'
    ? { pipeline_stage: 'trial_pending', status: 'qualified', last_activity_date: new Date().toISOString() }
    : stage === 'needs_human'
      ? { pipeline_stage: 'needs_human', status: 'needs_human', last_activity_date: new Date().toISOString() }
      : { pipeline_stage: 'nurture', status: contact.status || 'new_lead', last_activity_date: new Date().toISOString() };

  await supabase.from('contacts').update(update).eq('id', contact.id);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestBody = await parseJsonBody(req);
  const dryRun = requestBody.dryRun === true;
  const scopedContactId = typeof requestBody.contactId === 'string' ? requestBody.contactId : null;
  const serviceRoleJwt = getServiceRoleJwt();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabase = createClient(
    supabaseUrl,
    serviceRoleJwt
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
    let dueFollowUpsQuery = supabase
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

    if (scopedContactId) {
      dueFollowUpsQuery = dueFollowUpsQuery.eq('contact_id', scopedContactId);
    }

    const { data: dueFollowUps, error: fetchError } = await dueFollowUpsQuery;

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
          .select('id, first_name, last_name, email, phone, sms_status, email_status, status, pipeline_stage, tags')
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
        let deliveryChannel: 'sms' | 'email' | null = null;
        let shouldTryEmail = step.channel === 'email';

        if (containsPlaceholder(message) || (subject && containsPlaceholder(subject))) {
          const reason = 'Paused follow-up: unresolved placeholder in follow-up template';
          console.warn(`⏸️ ${reason} for ${contact.id}`);
          await supabase
            .from('contact_follow_ups')
            .update({ status: 'paused', pause_reason: reason })
            .eq('id', followUp.id);
          await updateCrmStage(supabase, contact, 'needs_human');
          await logFollowUpAlert(supabase, followUp.business_id, contact.id, 'placeholder_detected', reason, {
            sequence_id: followUp.sequence_id,
            step_order: nextStepOrder,
            message_preview: message.substring(0, 160),
          });
          results.errors.push(`${reason} for ${contact.id}`);
          continue;
        }

        if (step.channel === 'sms') {
          if (canUseSms(contact)) {
            // Validate phone number before attempting SMS
            const phoneValidation = validatePhoneForSMS(contact.phone);
            
            if (!phoneValidation.valid) {
              // Invalid phone - log it and mark the contact
              console.warn(`⚠️ Invalid phone for SMS: ${contact.phone} (${phoneValidation.reason})`);
              results.skippedInvalidPhone++;
              results.invalidPhoneContacts.push({
                contactId: contact.id,
                phone: contact.phone || '',
                reason: phoneValidation.reason || 'unknown',
              });
              shouldTryEmail = canUseEmail(contact);

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
              await logFollowUpAlert(supabase, followUp.business_id, contact.id, 'invalid_phone_email_fallback', 'SMS follow-up skipped due invalid phone; trying email fallback', {
                phone: contact.phone,
                reason: phoneValidation.reason,
                has_email: canUseEmail(contact),
              });
            } else if (dryRun) {
              console.log(`[DRY RUN] Would send SMS to ${contact.phone}`);
              sendSuccess = true;
              deliveryChannel = 'sms';
              results.smsSent++;
            } else {
              // Valid phone - send SMS
              console.log(`📱 Sending SMS to ${contact.phone}`);
              const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${serviceRoleJwt}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  to: contact.phone,
                  message: message,
                  businessId: followUp.business_id,
                  contactId: contact.id,
                }),
              });

              const smsText = await smsResponse.text();
              let smsResult: any = {};
              try { smsResult = smsText ? JSON.parse(smsText) : {}; } catch (_error) { smsResult = { raw: smsText }; }

              if (smsResponse.ok && smsResult.success === true && smsResult.messageSid) {
                sendSuccess = true;
                deliveryChannel = 'sms';
                results.smsSent++;
                console.log(`✅ SMS sent to ${contact.phone}`);
              } else {
                const errorText = smsResult.error || smsResult.reason || smsText || `HTTP ${smsResponse.status}`;
                console.error(`❌ SMS failed/blocked: ${errorText}`);
                results.errors.push(`SMS failed for ${contact.id}: ${errorText}`);
                await logFollowUpAlert(supabase, followUp.business_id, contact.id, smsResult.blocked ? 'sms_blocked' : 'sms_failed', `SMS follow-up failed: ${String(errorText).substring(0, 200)}`, {
                  http_status: smsResponse.status,
                  response: smsResult,
                });
                shouldTryEmail = canUseEmail(contact);
              }
            }
          } else {
            shouldTryEmail = canUseEmail(contact);
            await logFollowUpAlert(supabase, followUp.business_id, contact.id, contact.phone ? 'sms_opted_out_email_fallback' : 'no_phone_email_fallback', 'SMS follow-up cannot be sent; trying email fallback if available', {
              has_phone: Boolean(contact.phone),
              sms_status: contact.sms_status,
              has_email: canUseEmail(contact),
            });
          }
        }
        
        // Handle email channel OR fallback from SMS-ineligible/failed contacts.
        if (!sendSuccess && shouldTryEmail && canUseEmail(contact)) {
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

          if (dryRun) {
            console.log(`[DRY RUN] Would send email to ${contact.email}`);
            sendSuccess = true;
            deliveryChannel = 'email';
            results.emailSent++;
          } else {
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${serviceRoleJwt}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: contact.email,
                subject: subject || 'Following up',
                html: message,
                from_email: agentConfig?.from_email,
                from_name: agentConfig?.from_name || business?.name,
                business_id: followUp.business_id,
                contact_id: contact.id,
              }),
            });

            const emailText = await emailResponse.text();
            let emailResult: any = {};
            try { emailResult = emailText ? JSON.parse(emailText) : {}; } catch (_error) { emailResult = { raw: emailText }; }

            if (emailResponse.ok && emailResult.success === true) {
              sendSuccess = true;
              deliveryChannel = 'email';
              results.emailSent++;
              console.log(`✅ Email sent to ${contact.email}`);
            } else {
              const errorText = emailResult.error || emailResult.message || emailText || `HTTP ${emailResponse.status}`;
              console.error(`❌ Email failed: ${errorText}`);
              results.errors.push(`Email failed for ${contact.id}: ${errorText}`);
              
              // Email failed - pause follow-up to prevent infinite retries
              const pauseReason = `Email failed: ${String(errorText).substring(0, 200)}`;
              console.warn(`⏸️ Pausing follow-up for ${contact.id} - email send failed`);
              await supabase
                .from('contact_follow_ups')
                .update({ 
                  status: 'paused',
                  pause_reason: pauseReason
                })
                .eq('id', followUp.id);
              await updateCrmStage(supabase, contact, 'needs_human');
              await logFollowUpAlert(supabase, followUp.business_id, contact.id, 'email_failed', pauseReason, {
                http_status: emailResponse.status,
                response: emailResult,
              });
              results.errors.push(`Paused follow-up for ${contact.id} - email failed`);
            }
          }

        } else if (!sendSuccess) {
          // Can't send via preferred channel and no fallback worked
          console.warn(`⚠️ Cannot send ${step.channel} to contact ${contact.id} - missing info or opted out`);
          
          // No fallback available - pause the follow-up
          const pauseReason = `No valid channel: sms=${canUseSms(contact)} email=${canUseEmail(contact)}`;
          console.warn(`⏸️ Pausing follow-up for ${contact.id} - ${pauseReason}`);
          await supabase
            .from('contact_follow_ups')
            .update({ status: 'paused', pause_reason: pauseReason })
            .eq('id', followUp.id);
          await updateCrmStage(supabase, contact, 'needs_human');
          await logFollowUpAlert(supabase, followUp.business_id, contact.id, 'no_valid_channel', pauseReason, {
            has_phone: Boolean(contact.phone),
            sms_status: contact.sms_status,
            has_email: Boolean(contact.email),
            email_status: contact.email_status,
          });
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

          if (!dryRun) {
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

            await updateCrmStage(supabase, contact, hasBookingIntent(message) ? 'trial_pending' : 'nurture');
          }

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
            delivery_channel: deliveryChannel,
            dry_run: dryRun,
            crm_stage_target: sendSuccess ? (hasBookingIntent(message) ? 'trial_pending' : 'nurture') : 'needs_human',
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
