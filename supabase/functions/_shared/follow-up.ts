/**
 * Follow-Up System Utilities
 * 
 * Shared functions for enrolling contacts in follow-up sequences.
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type FollowUpTrigger = 
  | 'new_lead' 
  | 'no_response' 
  | 'missed_class' 
  | 'attended_no_signup' 
  | 'conversation_dropped';

interface EnrollOptions {
  contactId: string;
  businessId: string;
  trigger: FollowUpTrigger;
  /** Override the default delay for the first step (in hours) */
  initialDelayHours?: number;
}

/**
 * Enroll a contact in a follow-up sequence.
 * 
 * This will:
 * 1. Find the active sequence for the trigger type and business
 * 2. Check if contact is already enrolled (skip if so)
 * 3. Create the enrollment with next_step_due_at calculated
 * 
 * @returns true if enrolled, false if already enrolled or no sequence exists
 */
export async function enrollInFollowUp(
  supabase: SupabaseClient,
  options: EnrollOptions
): Promise<{ enrolled: boolean; reason?: string }> {
  const { contactId, businessId, trigger, initialDelayHours } = options;

  console.log(`📋 Attempting to enroll contact ${contactId} in ${trigger} sequence`);

  // Find active sequence for this trigger and business
  const { data: sequence, error: seqError } = await supabase
    .from('follow_up_sequences')
    .select('id')
    .eq('business_id', businessId)
    .eq('trigger_type', trigger)
    .eq('is_active', true)
    .single();

  if (seqError || !sequence) {
    console.log(`📋 No active ${trigger} sequence for business ${businessId}`);
    return { enrolled: false, reason: 'no_sequence' };
  }

  // Check if already enrolled in this sequence
  const { data: existing } = await supabase
    .from('contact_follow_ups')
    .select('id, status')
    .eq('contact_id', contactId)
    .eq('sequence_id', sequence.id)
    .single();

  if (existing && existing.status === 'active') {
    console.log(`📋 Contact already enrolled in ${trigger} sequence`);
    return { enrolled: false, reason: 'already_enrolled' };
  }

  // Get the first step to calculate initial delay
  const { data: firstStep } = await supabase
    .from('follow_up_steps')
    .select('delay_hours')
    .eq('sequence_id', sequence.id)
    .eq('step_order', 1)
    .single();

  const delayHours = initialDelayHours ?? firstStep?.delay_hours ?? 24;
  const nextStepDue = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();

  // Create or update enrollment
  if (existing) {
    // Re-enroll (was completed/paused/responded before)
    const { error: updateError } = await supabase
      .from('contact_follow_ups')
      .update({
        status: 'active',
        current_step: 0,
        enrolled_at: new Date().toISOString(),
        next_step_due_at: nextStepDue,
        last_step_sent_at: null,
        completed_at: null,
        pause_reason: null,
      })
      .eq('id', existing.id);

    if (updateError) {
      console.error(`📋 Failed to re-enroll: ${updateError.message}`);
      return { enrolled: false, reason: 'update_error' };
    }
  } else {
    // New enrollment
    const { error: insertError } = await supabase
      .from('contact_follow_ups')
      .insert({
        contact_id: contactId,
        sequence_id: sequence.id,
        business_id: businessId,
        status: 'active',
        current_step: 0,
        next_step_due_at: nextStepDue,
      });

    if (insertError) {
      // Handle unique constraint violation (race condition)
      if (insertError.code === '23505') {
        console.log(`📋 Contact already enrolled (race condition)`);
        return { enrolled: false, reason: 'already_enrolled' };
      }
      console.error(`📋 Failed to enroll: ${insertError.message}`);
      return { enrolled: false, reason: 'insert_error' };
    }
  }

  console.log(`✅ Contact ${contactId} enrolled in ${trigger} sequence, first step due: ${nextStepDue}`);
  return { enrolled: true };
}

/**
 * Pause a contact's follow-up when they respond.
 * 
 * Call this when a contact sends a message (in sms-webhook) to stop
 * the automated sequence and let the conversation flow naturally.
 */
export async function pauseFollowUpOnResponse(
  supabase: SupabaseClient,
  contactId: string
): Promise<void> {
  const { data: activeFollowUps, error } = await supabase
    .from('contact_follow_ups')
    .select('id')
    .eq('contact_id', contactId)
    .eq('status', 'active');

  if (error || !activeFollowUps || activeFollowUps.length === 0) {
    return; // No active follow-ups to pause
  }

  console.log(`⏸️ Pausing ${activeFollowUps.length} follow-up(s) for contact ${contactId} due to response`);

  await supabase
    .from('contact_follow_ups')
    .update({
      status: 'responded',
      pause_reason: 'Contact responded',
    })
    .eq('contact_id', contactId)
    .eq('status', 'active');
}

/**
 * Cancel all follow-ups for a contact (e.g., when they convert or opt out).
 */
export async function cancelFollowUps(
  supabase: SupabaseClient,
  contactId: string,
  reason: string
): Promise<void> {
  await supabase
    .from('contact_follow_ups')
    .update({
      status: 'cancelled',
      pause_reason: reason,
    })
    .eq('contact_id', contactId)
    .eq('status', 'active');
}
