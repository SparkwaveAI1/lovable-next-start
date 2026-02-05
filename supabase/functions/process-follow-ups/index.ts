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
    errors: [] as string[],
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
          .select('id, first_name, last_name, email, phone, sms_status, email_status')
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

        if (step.channel === 'sms' && contact.phone && contact.sms_status !== 'opted_out') {
          // Send SMS
          console.log(`📱 Sending SMS to ${contact.phone}`);
          
          const smsResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
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

        } else if (step.channel === 'email' && contact.email && contact.email_status !== 'unsubscribed') {
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
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
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
          }

        } else {
          // Can't send via preferred channel - try fallback or pause
          console.warn(`⚠️ Cannot send ${step.channel} to contact ${contact.id} - missing info or opted out`);
          
          // Try email as fallback if SMS failed and contact has email
          if (step.channel === 'sms' && contact.email && contact.email_status !== 'unsubscribed') {
            console.log(`📧 Falling back to email for ${contact.email}`);
            
            const { data: business } = await supabase
              .from('businesses')
              .select('name')
              .eq('id', followUp.business_id)
              .single();

            const { data: agentConfig } = await supabase
              .from('agent_config')
              .select('from_email, from_name')
              .eq('business_id', followUp.business_id)
              .single();

            const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: contact.email,
                subject: 'Following up',
                html: message,
                from_email: agentConfig?.from_email,
                from_name: agentConfig?.from_name || business?.name,
                contact_id: contact.id,
              }),
            });

            if (emailResponse.ok) {
              sendSuccess = true;
              results.emailSent++;
              console.log(`✅ Fallback email sent to ${contact.email}`);
            } else {
              const errorText = await emailResponse.text();
              console.error(`❌ Fallback email failed: ${errorText}`);
              results.errors.push(`Fallback email failed for ${contact.id}: ${errorText}`);
            }
          } else {
            // No fallback available - pause the follow-up
            console.warn(`⏸️ Pausing follow-up for ${contact.id} - no valid channel`);
            await supabase
              .from('contact_follow_ups')
              .update({ status: 'paused' })
              .eq('id', followUp.id);
            results.errors.push(`Paused follow-up for ${contact.id} - no valid channel`);
          }
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
