/**
 * Contact Pre-Send Checks
 * 
 * Shared functions for validating contacts before sending messages.
 * CRITICAL: Always call these before any outreach!
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Statuses that should NEVER receive automated outreach
const BLOCKED_STATUSES = [
  'active_member',   // Already a customer
  'opted_out',       // Unsubscribed
  'do_not_contact',  // Manual block
  'spam',            // Marked as spam
];

// Statuses that need human review before outreach
const REVIEW_STATUSES = [
  'booked',          // Has upcoming appointment
  'qualified',       // May already be in conversation
];

export interface ContactCheckResult {
  canSend: boolean;
  reason: string;
  requiresReview: boolean;
  recentMessages: number;
  lastMessageAt: string | null;
  lastMessageDirection: 'inbound' | 'outbound' | null;
  contactStatus: string | null;
}

/**
 * Check if a contact should receive automated outreach
 * 
 * Returns detailed result including:
 * - Whether we can send
 * - Why or why not
 * - Recent message history
 */
export async function checkContactForOutreach(
  supabase: SupabaseClient,
  contactId: string,
  options: {
    lookbackDays?: number;       // How far back to check (default: 7)
    requireSilenceDays?: number; // Min days since last message (default: 3)
    allowIfTheyMessaged?: boolean; // Allow if their last msg was inbound (default: true)
  } = {}
): Promise<ContactCheckResult> {
  const {
    lookbackDays = 7,
    requireSilenceDays = 3,
    allowIfTheyMessaged = true,
  } = options;

  // Default result
  const result: ContactCheckResult = {
    canSend: false,
    reason: 'Unknown',
    requiresReview: false,
    recentMessages: 0,
    lastMessageAt: null,
    lastMessageDirection: null,
    contactStatus: null,
  };

  try {
    // 1. Get contact status
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, status, sms_status, email_status, first_name, last_name')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      result.reason = 'Contact not found';
      return result;
    }

    result.contactStatus = contact.status;

    // 2. Check blocked statuses
    if (BLOCKED_STATUSES.includes(contact.status)) {
      result.reason = `Blocked status: ${contact.status}`;
      return result;
    }

    // 3. Check SMS/email opt-out
    if (contact.sms_status === 'opted_out') {
      result.reason = 'SMS opted out';
      return result;
    }

    // 4. Check review statuses
    if (REVIEW_STATUSES.includes(contact.status)) {
      result.requiresReview = true;
    }

    // 5. Get recent message history
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

    const { data: messages, error: msgError } = await supabase
      .from('sms_messages')
      .select('id, direction, created_at, message')
      .eq('contact_id', contactId)
      .gte('created_at', lookbackDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (msgError) {
      console.error('Error fetching messages:', msgError);
      result.reason = 'Error checking message history';
      return result;
    }

    result.recentMessages = messages?.length || 0;

    if (messages && messages.length > 0) {
      const lastMessage = messages[0];
      result.lastMessageAt = lastMessage.created_at;
      result.lastMessageDirection = lastMessage.direction;

      // Calculate days since last message
      const lastMsgDate = new Date(lastMessage.created_at);
      const daysSinceLastMsg = (Date.now() - lastMsgDate.getTime()) / (1000 * 60 * 60 * 24);

      // If last message was from them (inbound) and recent, they're in active conversation
      if (lastMessage.direction === 'inbound' && daysSinceLastMsg < 1) {
        if (allowIfTheyMessaged) {
          result.canSend = true;
          result.reason = 'Active conversation - they messaged recently';
          result.requiresReview = true; // Still flag for review
          return result;
        }
      }

      // If we messaged them recently, don't spam
      if (lastMessage.direction === 'outbound' && daysSinceLastMsg < requireSilenceDays) {
        result.reason = `Already messaged ${daysSinceLastMsg.toFixed(1)} days ago`;
        result.requiresReview = true;
        return result;
      }

      // If there's been back-and-forth recently, flag for review
      if (result.recentMessages >= 3) {
        result.requiresReview = true;
        result.reason = 'Active conversation history';
      }
    }

    // 6. Check if they've booked a class
    const { data: bookings } = await supabase
      .from('class_bookings')
      .select('id, booking_date, status')
      .eq('contact_id', contactId)
      .in('status', ['confirmed', 'attended'])
      .order('booking_date', { ascending: false })
      .limit(1);

    if (bookings && bookings.length > 0) {
      const booking = bookings[0];
      const bookingDate = new Date(booking.booking_date);
      const daysSinceBooking = (Date.now() - bookingDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceBooking < 7) {
        result.reason = `Recent booking: ${booking.status} on ${booking.booking_date}`;
        result.requiresReview = true;
        // Don't block, but definitely review
      }

      if (booking.status === 'attended') {
        result.reason = 'Already attended a class - may be member';
        result.requiresReview = true;
      }
    }

    // If we got here and no blocking reason, allow with possible review
    if (!result.reason.includes('Blocked') && !result.reason.includes('opted out')) {
      result.canSend = true;
      if (!result.requiresReview && result.recentMessages === 0) {
        result.reason = 'New contact - OK to send';
      } else if (result.recentMessages > 0) {
        result.reason = `${result.recentMessages} messages in last ${lookbackDays} days`;
      }
    }

    return result;

  } catch (error: any) {
    console.error('Contact check error:', error);
    result.reason = `Error: ${error.message}`;
    return result;
  }
}

/**
 * Quick check - just returns boolean
 * Use checkContactForOutreach() for detailed info
 */
export async function canSendToContact(
  supabase: SupabaseClient,
  contactId: string
): Promise<boolean> {
  const result = await checkContactForOutreach(supabase, contactId);
  return result.canSend && !result.requiresReview;
}

/**
 * Queue a message for human approval
 */
export async function queueForApproval(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    contactId: string;
    channel: 'sms' | 'email';
    messageType: string;
    recipientPhone?: string;
    recipientEmail?: string;
    subject?: string;
    messageBody: string;
    reviewReason: string;
    contactName?: string;
    recentMessageCount?: number;
    lastMessageDirection?: 'inbound' | 'outbound' | null;
    flags?: string[];
  }
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('message_approval_queue')
      .insert({
        business_id: params.businessId,
        contact_id: params.contactId,
        channel: params.channel,
        message_type: params.messageType,
        recipient_phone: params.recipientPhone,
        recipient_email: params.recipientEmail,
        subject: params.subject,
        message_body: params.messageBody,
        status: 'pending',
        review_reason: params.reviewReason,
        contact_name: params.contactName,
        recent_message_count: params.recentMessageCount,
        last_message_direction: params.lastMessageDirection,
        flags: params.flags || [],
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h expiry
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to queue for approval:', error);
      return null;
    }

    console.log(`📋 Queued message for approval: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error('Queue approval error:', error);
    return null;
  }
}

/**
 * Log a send decision for audit trail
 */
export async function logSendDecision(
  supabase: SupabaseClient,
  contactId: string,
  businessId: string,
  decision: ContactCheckResult,
  channel: 'sms' | 'email',
  messagePreview: string
): Promise<void> {
  try {
    await supabase.from('automation_logs').insert({
      business_id: businessId,
      automation_type: 'send_decision',
      status: decision.canSend ? 'approved' : 'blocked',
      processed_data: {
        contact_id: contactId,
        channel,
        decision: decision.reason,
        requires_review: decision.requiresReview,
        recent_messages: decision.recentMessages,
        last_message_at: decision.lastMessageAt,
        contact_status: decision.contactStatus,
        message_preview: messagePreview.substring(0, 100),
      },
    });
  } catch (error) {
    console.error('Failed to log send decision:', error);
  }
}
