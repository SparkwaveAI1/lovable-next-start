import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wix-signature, x-wix-webhook-signature',
};

// Fight Flow business ID
const FIGHT_FLOW_BUSINESS_ID = '456dc53b-d9d9-41b0-bc33-4f4c4a791eff';

// Normalize phone to E.164 format
function normalizePhoneNumber(phone: string | undefined | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  if (phone.startsWith('+')) return phone;
  return phone;
}

// Extract contact info from various Wix webhook payloads
function extractContactInfo(eventType: string, data: any): {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  wixContactId?: string;
  wixMemberId?: string;
} {
  const result: any = {};

  // Contact webhooks (contacts/v4)
  if (data.email || data.emails) {
    result.email = data.email || data.emails?.[0]?.email || data.primaryInfo?.email;
  }
  if (data.phone || data.phones) {
    result.phone = data.phone || data.phones?.[0]?.phone || data.primaryInfo?.phone;
  }
  if (data.firstName || data.name?.first) {
    result.firstName = data.firstName || data.name?.first;
  }
  if (data.lastName || data.name?.last) {
    result.lastName = data.lastName || data.name?.last;
  }
  if (data.id) {
    result.wixContactId = data.id;
  }

  // Booking webhooks - contact info nested
  if (data.contactDetails) {
    result.email = result.email || data.contactDetails.email;
    result.phone = result.phone || data.contactDetails.phone;
    result.firstName = result.firstName || data.contactDetails.firstName;
    result.lastName = result.lastName || data.contactDetails.lastName;
    result.wixContactId = result.wixContactId || data.contactDetails.contactId;
  }

  // Member webhooks
  if (data.contact) {
    result.email = result.email || data.contact.email || data.contact.loginEmail;
    result.phone = result.phone || data.contact.phones?.[0];
    result.firstName = result.firstName || data.contact.firstName;
    result.lastName = result.lastName || data.contact.lastName;
    result.wixContactId = result.wixContactId || data.contact.contactId;
  }
  if (data.member) {
    result.email = result.email || data.member.loginEmail;
    result.wixMemberId = data.member.id || data.memberId;
  }

  // Form submission webhook
  if (data.submission || data.formData) {
    const formData = data.submission?.values || data.formData || {};
    // Common form field names
    for (const [key, value] of Object.entries(formData)) {
      const lowerKey = key.toLowerCase();
      if ((lowerKey.includes('email') || lowerKey === 'e-mail') && !result.email) {
        result.email = value as string;
      }
      if ((lowerKey.includes('phone') || lowerKey.includes('tel')) && !result.phone) {
        result.phone = value as string;
      }
      if ((lowerKey.includes('first') && lowerKey.includes('name')) || lowerKey === 'firstname') {
        result.firstName = value as string;
      }
      if ((lowerKey.includes('last') && lowerKey.includes('name')) || lowerKey === 'lastname') {
        result.lastName = value as string;
      }
      if (lowerKey === 'name' && !result.firstName) {
        const parts = (value as string).split(' ');
        result.firstName = parts[0];
        result.lastName = parts.slice(1).join(' ') || undefined;
      }
    }
  }

  return result;
}

// Upsert contact to Sparkwave
async function upsertContact(
  supabase: any,
  businessId: string,
  contactInfo: ReturnType<typeof extractContactInfo>,
  source: string,
  pipelineStage?: string
): Promise<{ id: string; isNew: boolean }> {
  const normalizedPhone = normalizePhoneNumber(contactInfo.phone);

  // Try to find existing contact by email or phone
  let existingContact = null;

  if (contactInfo.email) {
    const { data } = await supabase
      .from('contacts')
      .select('id')
      .eq('business_id', businessId)
      .ilike('email', contactInfo.email)
      .single();
    existingContact = data;
  }

  if (!existingContact && normalizedPhone) {
    const { data } = await supabase
      .from('contacts')
      .select('id')
      .eq('business_id', businessId)
      .eq('phone', normalizedPhone)
      .single();
    existingContact = data;
  }

  // Also try by Wix contact ID if stored in metadata
  if (!existingContact && contactInfo.wixContactId) {
    const { data } = await supabase
      .from('contacts')
      .select('id')
      .eq('business_id', businessId)
      .contains('metadata', { wix_contact_id: contactInfo.wixContactId })
      .single();
    existingContact = data;
  }

  if (existingContact) {
    // Update existing contact
    const updateData: any = {
      updated_at: new Date().toISOString(),
      last_activity_date: new Date().toISOString(),
    };

    if (contactInfo.firstName) updateData.first_name = contactInfo.firstName;
    if (contactInfo.lastName) updateData.last_name = contactInfo.lastName;
    if (contactInfo.email) updateData.email = contactInfo.email;
    if (normalizedPhone) updateData.phone = normalizedPhone;
    if (pipelineStage) updateData.pipeline_stage = pipelineStage;
    if (contactInfo.wixContactId || contactInfo.wixMemberId) {
      updateData.metadata = supabase.sql`
        metadata || ${JSON.stringify({
          wix_contact_id: contactInfo.wixContactId,
          wix_member_id: contactInfo.wixMemberId,
        })}::jsonb
      `;
    }

    await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', existingContact.id);

    return { id: existingContact.id, isNew: false };
  }

  // Create new contact
  const insertData: any = {
    business_id: businessId,
    first_name: contactInfo.firstName || 'Wix Contact',
    last_name: contactInfo.lastName || '',
    email: contactInfo.email || null,
    phone: normalizedPhone || null,
    source: source,
    status: 'new_lead',
    pipeline_stage: pipelineStage || 'new',
    lead_type: 'sales_lead',
    metadata: {
      wix_contact_id: contactInfo.wixContactId,
      wix_member_id: contactInfo.wixMemberId,
    },
  };

  const { data: newContact, error } = await supabase
    .from('contacts')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create contact:', error);
    throw new Error(`Failed to create contact: ${error.message}`);
  }

  return { id: newContact.id, isNew: true };
}

// Log activity to Mission Control
async function logActivity(
  supabase: any,
  businessId: string,
  message: string,
  metadata: any
) {
  try {
    await supabase.from('mc_activities').insert({
      type: 'task_updated',
      business_id: businessId,
      message: message,
      metadata: metadata,
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
    // Don't throw - logging shouldn't break the webhook
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse the webhook payload
    const payload = await req.json();
    console.log('📥 Wix webhook received:', JSON.stringify(payload).substring(0, 500));

    // Extract event type and data
    // Wix webhooks can have different structures
    const eventType = payload.eventType || payload.event || payload.type || 'unknown';
    const data = payload.data || payload.entity || payload;
    const instanceId = payload.instanceId || payload.instance_id;
    const timestamp = payload.timestamp || new Date().toISOString();

    console.log(`📥 Event type: ${eventType}, Instance: ${instanceId}`);

    // Extract contact info from the payload
    const contactInfo = extractContactInfo(eventType, data);
    console.log('📥 Extracted contact info:', contactInfo);

    // Skip if no identifiable info
    if (!contactInfo.email && !contactInfo.phone && !contactInfo.wixContactId) {
      console.log('📥 No contact info found, skipping');
      return new Response(JSON.stringify({ status: 'skipped', reason: 'no_contact_info' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine source and pipeline stage based on event type
    let source = 'wix_webhook';
    let pipelineStage: string | undefined;
    let activityMessage = '';

    const eventLower = eventType.toLowerCase();

    if (eventLower.includes('contact/created') || eventLower.includes('contacts_created')) {
      source = 'wix_contact';
      pipelineStage = 'new';
      activityMessage = `New Wix contact: ${contactInfo.firstName || contactInfo.email || 'Unknown'}`;
    } else if (eventLower.includes('contact/updated') || eventLower.includes('contacts_updated')) {
      source = 'wix_contact';
      activityMessage = `Wix contact updated: ${contactInfo.firstName || contactInfo.email || 'Unknown'}`;
    } else if (eventLower.includes('booking/created') || eventLower.includes('bookings_created') ||
               eventLower.includes('booking/confirmed') || eventLower.includes('bookings_confirmed')) {
      source = 'wix_booking';
      pipelineStage = 'booked_class';
      activityMessage = `Wix booking: ${contactInfo.firstName || contactInfo.email || 'Unknown'} booked a class`;
    } else if (eventLower.includes('member/created') || eventLower.includes('members_created')) {
      source = 'wix_member';
      pipelineStage = 'member';
      activityMessage = `New Wix member: ${contactInfo.firstName || contactInfo.email || 'Unknown'}`;
    } else if (eventLower.includes('form') || eventLower.includes('submission')) {
      source = 'wix_form';
      pipelineStage = 'new';
      activityMessage = `Wix form submission: ${contactInfo.firstName || contactInfo.email || 'Unknown'}`;
    } else {
      activityMessage = `Wix webhook (${eventType}): ${contactInfo.firstName || contactInfo.email || 'Unknown'}`;
    }

    // Upsert the contact
    const { id: contactId, isNew } = await upsertContact(
      supabase,
      FIGHT_FLOW_BUSINESS_ID,
      contactInfo,
      source,
      pipelineStage
    );

    console.log(`📥 Contact ${isNew ? 'created' : 'updated'}: ${contactId}`);

    // Log to Mission Control
    await logActivity(supabase, FIGHT_FLOW_BUSINESS_ID, activityMessage, {
      event_type: eventType,
      contact_id: contactId,
      is_new_contact: isNew,
      wix_contact_id: contactInfo.wixContactId,
      wix_instance_id: instanceId,
      source: source,
      pipeline_stage: pipelineStage,
      timestamp: timestamp,
    });

    return new Response(
      JSON.stringify({
        status: 'success',
        contact_id: contactId,
        is_new: isNew,
        event_type: eventType,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ Wix webhook error:', error);

    // Still return 200 to prevent Wix from retrying
    // (we don't want to spam the webhook with retries for bad data)
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error.message,
      }),
      {
        status: 200, // Return 200 even on error to acknowledge receipt
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
