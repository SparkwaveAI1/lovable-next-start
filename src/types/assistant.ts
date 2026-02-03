// Types for the Client AI Assistant

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: AssistantAction;
}

export interface AssistantAction {
  id: string;
  function_name: string;
  function_args: Record<string, unknown>;
  status: 'pending' | 'approved' | 'denied' | 'executed' | 'failed';
  result?: unknown;
  error?: string;
  requires_confirmation: boolean;
}

export interface AssistantConversation {
  id: string;
  business_id: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
  messages: AssistantMessage[];
}

export interface PendingConfirmation {
  action: AssistantAction;
  message: AssistantMessage;
}

// Function display names and descriptions for the UI
export const FUNCTION_DISPLAY_INFO: Record<string, { name: string; icon: string; description: string }> = {
  lookup_contact: {
    name: 'Look up Contact',
    icon: '🔍',
    description: 'Search for a contact in your CRM',
  },
  send_email: {
    name: 'Send Email',
    icon: '📧',
    description: 'Send an email to a contact',
  },
  send_sms: {
    name: 'Send SMS',
    icon: '💬',
    description: 'Send a text message to a contact',
  },
  create_task: {
    name: 'Create Task',
    icon: '✅',
    description: 'Create a new task in your task list',
  },
  post_social: {
    name: 'Post to Social Media',
    icon: '📱',
    description: 'Create a post on social media',
  },
  query_bookings: {
    name: 'Query Bookings',
    icon: '📅',
    description: 'Look up booking information',
  },
  apply_promotion: {
    name: 'Apply Promotion',
    icon: '🏷️',
    description: 'Apply a promotion or tag to a contact',
  },
  get_contact_details: {
    name: 'Get Contact Details',
    icon: '👤',
    description: 'Fetch detailed information about a contact',
  },
  schedule_booking: {
    name: 'Schedule Booking',
    icon: '📆',
    description: 'Book a contact into a class or appointment',
  },
};
