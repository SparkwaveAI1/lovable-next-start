import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Mail, Phone, Clock, User, CheckCircle, AlertCircle, Hourglass, UserCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  thread_id: string;
  contact_id: string;
  contact_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  last_message: string;
  last_message_time: string;
  last_message_direction: string;
  channel: 'sms' | 'email';
  thread_created_at: string;
  needs_human_review: boolean;
  has_booking: boolean;
}

interface TodaysConversationsProps {
  businessId: string;
  onContactClick: (contactId: string) => void;
}

type ConversationStatus = 'booked' | 'needs_human' | 'waiting_customer' | 'needs_response' | 'new' | 'inactive';

function getConversationStatus(conv: Conversation): ConversationStatus {
  const now = new Date();
  const lastMessageTime = new Date(conv.last_message_time);
  const threadCreatedAt = new Date(conv.thread_created_at);
  const hoursSinceLastMessage = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);
  const hoursSinceCreated = (now.getTime() - threadCreatedAt.getTime()) / (1000 * 60 * 60);

  // Check for booking first
  if (conv.has_booking) {
    return 'booked';
  }

  // Check for human review flag
  if (conv.needs_human_review) {
    return 'needs_human';
  }

  // Inactive if no messages in 24 hours
  if (hoursSinceLastMessage > 24) {
    return 'inactive';
  }

  // New if conversation started less than 1 hour ago
  if (hoursSinceCreated < 1) {
    return 'new';
  }

  // Check direction of last message
  if (conv.last_message_direction === 'outbound') {
    return 'waiting_customer';
  }

  // Inbound message - check if we need to respond
  if (conv.last_message_direction === 'inbound' && hoursSinceLastMessage > 1) {
    return 'needs_response';
  }

  return 'new';
}

function StatusBadge({ status }: { status: ConversationStatus }) {
  const config = {
    booked: { label: 'Booked', className: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
    needs_human: { label: 'Needs Human', className: 'bg-red-100 text-red-800 border-red-300', icon: UserCheck },
    waiting_customer: { label: 'Waiting', className: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Hourglass },
    needs_response: { label: 'Needs Response', className: 'bg-orange-100 text-orange-800 border-orange-300', icon: AlertCircle },
    new: { label: 'New Lead', className: 'bg-blue-100 text-blue-800 border-blue-300', icon: MessageSquare },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700 border-gray-300', icon: Clock },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export function TodaysConversations({ businessId, onContactClick }: TodaysConversationsProps) {
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['todays-conversations', businessId],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Get recent messages with thread and contact info
      const { data: messages, error } = await supabase
        .from('sms_messages')
        .select(`
          id,
          thread_id,
          contact_id,
          message,
          direction,
          created_at,
          conversation_threads!inner (
            id,
            status,
            needs_human_review,
            created_at,
            contacts!inner (
              id,
              first_name,
              last_name,
              phone,
              email
            )
          )
        `)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }

      // Group by thread_id and get the most recent message per thread
      const threadMap = new Map<string, any>();

      for (const msg of messages || []) {
        const threadId = msg.thread_id;
        if (!threadId) continue;

        if (!threadMap.has(threadId)) {
          threadMap.set(threadId, msg);
        }
      }

      // Get unique contact IDs to check for bookings
      const contactIds = [...new Set([...threadMap.values()].map(m => m.contact_id))];

      // Check for bookings for these contacts
      const { data: bookings } = await supabase
        .from('class_bookings')
        .select('contact_id, created_at')
        .in('contact_id', contactIds)
        .gte('created_at', twentyFourHoursAgo);

      const contactsWithBookings = new Set(bookings?.map(b => b.contact_id) || []);

      // Transform to conversation format
      const conversations: Conversation[] = [...threadMap.values()].map(msg => {
        const thread = msg.conversation_threads;
        const contact = thread?.contacts;

        return {
          thread_id: msg.thread_id,
          contact_id: msg.contact_id,
          contact_name: contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
          contact_phone: contact?.phone || null,
          contact_email: contact?.email || null,
          last_message: msg.message || '',
          last_message_time: msg.created_at,
          last_message_direction: msg.direction,
          channel: contact?.phone ? 'sms' : 'email',
          thread_created_at: thread?.created_at || msg.created_at,
          needs_human_review: thread?.needs_human_review || false,
          has_booking: contactsWithBookings.has(msg.contact_id),
        };
      });

      // Sort by most recent and limit to 10
      return conversations
        .sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime())
        .slice(0, 10);
    },
    enabled: !!businessId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-indigo-600" />
            Today's Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                <div className="h-10 w-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-3 w-48 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-600" />
            Today's Conversations
          </span>
          <Badge variant="secondary" className="font-normal">
            {conversations.length} active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No conversations in the last 24 hours</p>
            <p className="text-sm">New leads will appear here automatically</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => {
              const status = getConversationStatus(conv);
              return (
                <div
                  key={conv.thread_id}
                  onClick={() => onContactClick(conv.contact_id)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200"
                >
                  {/* Avatar / Icon */}
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    conv.channel === 'sms' ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    {conv.channel === 'sms' ? (
                      <Phone className="h-5 w-5 text-green-600" />
                    ) : (
                      <Mail className="h-5 w-5 text-blue-600" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {conv.contact_name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {conv.last_message_direction === 'outbound' && (
                        <span className="text-gray-400">You: </span>
                      )}
                      {conv.last_message.substring(0, 50)}
                      {conv.last_message.length > 50 && '...'}
                    </p>
                  </div>

                  {/* Time and Status */}
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: true })}
                    </span>
                    <StatusBadge status={status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
