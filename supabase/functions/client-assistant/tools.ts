// Tools module - Function definitions and execution
// Task 1.3 will implement the full tool schema
// Task 2.x will implement individual tool executors

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AssistantConfig {
  allowed_functions: string[];
  blocked_functions: string[];
}

// Tool definitions for Claude (will be expanded in Task 1.3)
const TOOL_DEFINITIONS = [
  {
    name: "lookup_contact",
    description: "Search for a contact in the CRM by name, email, or phone number",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name, email, or phone to search for" }
      },
      required: ["query"]
    }
  },
  {
    name: "get_contact_details",
    description: "Get full details for a specific contact by ID",
    input_schema: {
      type: "object",
      properties: {
        contact_id: { type: "string", description: "Contact ID" }
      },
      required: ["contact_id"]
    }
  },
  {
    name: "send_email",
    description: "Send an email to a contact",
    input_schema: {
      type: "object",
      properties: {
        contact_id: { type: "string", description: "Contact ID to email" },
        subject: { type: "string", description: "Email subject line" },
        body: { type: "string", description: "Email body content" }
      },
      required: ["contact_id", "subject", "body"]
    }
  },
  {
    name: "send_sms",
    description: "Send an SMS text message to a contact",
    input_schema: {
      type: "object",
      properties: {
        contact_id: { type: "string", description: "Contact ID to text" },
        message: { type: "string", description: "SMS message content" }
      },
      required: ["contact_id", "message"]
    }
  },
  {
    name: "create_task",
    description: "Create a new task in the task list",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Task description" },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Task priority" },
        due_date: { type: "string", description: "Due date (YYYY-MM-DD format)" }
      },
      required: ["title"]
    }
  },
  {
    name: "query_bookings",
    description: "Look up class bookings and schedule",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date to query (YYYY-MM-DD)" },
        class_name: { type: "string", description: "Optional: filter by class name" },
        contact_id: { type: "string", description: "Optional: bookings for specific contact" }
      }
    }
  },
  {
    name: "post_social",
    description: "Create and post content to social media",
    input_schema: {
      type: "object",
      properties: {
        platform: { type: "string", enum: ["twitter", "linkedin"], description: "Social platform" },
        content: { type: "string", description: "Post content" },
        schedule_for: { type: "string", description: "Optional: schedule for later (ISO datetime)" }
      },
      required: ["platform", "content"]
    }
  },
  {
    name: "apply_promotion",
    description: "Apply a promotion or tag to a contact",
    input_schema: {
      type: "object",
      properties: {
        contact_id: { type: "string", description: "Contact ID" },
        promotion: { type: "string", description: "Promotion name or code to apply" }
      },
      required: ["contact_id", "promotion"]
    }
  },
  {
    name: "schedule_booking",
    description: "Book a contact into a class on a specific date",
    input_schema: {
      type: "object",
      properties: {
        contact_id: { type: "string", description: "Contact ID to book" },
        class_schedule_id: { type: "string", description: "ID of the class schedule" },
        booking_date: { type: "string", description: "Date for the booking (YYYY-MM-DD)" },
        notes: { type: "string", description: "Optional booking notes" }
      },
      required: ["contact_id", "class_schedule_id", "booking_date"]
    }
  }
];

/**
 * Get available tools filtered by business permissions
 */
export function getAvailableTools(config: AssistantConfig): any[] {
  return TOOL_DEFINITIONS.filter(tool => {
    // Check if blocked (takes precedence)
    if (config.blocked_functions.includes(tool.name)) {
      return false;
    }

    // If allowed_functions is empty, allow all non-blocked
    if (config.allowed_functions.length === 0) {
      return true;
    }

    // Check if allowed
    return config.allowed_functions.includes(tool.name);
  });
}

/**
 * Execute a tool call (stub - will be implemented in Phase 2)
 */
export async function executeToolCall(
  supabase: SupabaseClient,
  toolName: string,
  input: any,
  businessId: string,
  userId: string
): Promise<any> {
  console.log(`Executing tool: ${toolName}`, input);

  // Dispatch to appropriate executor
  switch (toolName) {
    case 'lookup_contact':
      return await executeLookupContact(supabase, input, businessId);
    
    case 'get_contact_details':
      return await executeGetContactDetails(supabase, input, businessId);
    
    case 'create_task':
      return await executeCreateTask(supabase, input, businessId, userId);
    
    case 'query_bookings':
      return await executeQueryBookings(supabase, input, businessId);
    
    case 'send_email':
      return await executeSendEmail(supabase, input, businessId);
    
    case 'send_sms':
      return await executeSendSms(supabase, input, businessId);
    
    case 'post_social':
      return await executePostSocial(supabase, input, businessId);
    
    case 'apply_promotion':
      return await executeApplyPromotion(supabase, input, businessId);
    
    case 'schedule_booking':
      return await executeScheduleBooking(supabase, input, businessId);
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Tool executors (stubs - will be fully implemented in Phase 2)

async function executeLookupContact(
  supabase: SupabaseClient,
  input: { query: string },
  businessId: string
): Promise<any> {
  const query = input.query.trim();
  
  if (!query) {
    return {
      contacts: [],
      message: 'Please provide a search query (name, email, or phone)'
    };
  }

  // Search by name, email, or phone using ilike for fuzzy matching
  const searchPattern = `%${query}%`;
  
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, status, created_at')
    .eq('business_id', businessId)
    .or(`first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Contact lookup error:', error);
    throw new Error(`Failed to search contacts: ${error.message}`);
  }

  // Format results for Claude
  const formattedContacts = (contacts || []).map(c => ({
    id: c.id,
    name: [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unknown',
    email: c.email || null,
    phone: c.phone || null,
    status: c.status
  }));

  if (formattedContacts.length === 0) {
    return {
      contacts: [],
      message: `No contacts found matching "${query}". Try a different search term.`
    };
  }

  return {
    contacts: formattedContacts,
    message: `Found ${formattedContacts.length} contact${formattedContacts.length !== 1 ? 's' : ''} matching "${query}"`
  };
}

async function executeGetContactDetails(
  supabase: SupabaseClient,
  input: { contact_id: string },
  businessId: string
): Promise<any> {
  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', input.contact_id)
    .eq('business_id', businessId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error(`Contact not found with ID: ${input.contact_id}`);
    }
    throw new Error(`Failed to get contact: ${error.message}`);
  }

  return {
    id: contact.id,
    name: [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unknown',
    first_name: contact.first_name,
    last_name: contact.last_name,
    email: contact.email,
    phone: contact.phone,
    status: contact.status,
    status_notes: contact.status_notes,
    source: contact.source,
    created_at: contact.created_at,
    updated_at: contact.updated_at
  };
}

async function executeCreateTask(
  supabase: SupabaseClient,
  input: { title: string; description?: string; priority?: string; due_date?: string },
  businessId: string,
  userId: string
): Promise<any> {
  // Map priority to allowed values
  const priorityMap: Record<string, string> = {
    'low': 'low',
    'medium': 'medium',
    'high': 'high',
    'critical': 'urgent'
  };
  
  const priority = priorityMap[input.priority || 'medium'] || 'medium';

  // Create task with business context in tags
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description || null,
      priority,
      status: 'inbox',
      tags: [`business:${businessId}`, `user:${userId}`],
      external_source: 'manual'
    })
    .select('id, title, status, priority')
    .single();

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }

  return {
    success: true,
    task_id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    message: `Task "${input.title}" created successfully`
  };
}

async function executeQueryBookings(
  supabase: SupabaseClient,
  input: { date?: string; class_name?: string; contact_id?: string },
  businessId: string
): Promise<any> {
  // Build query for class bookings with schedule info
  let query = supabase
    .from('class_bookings')
    .select(`
      id,
      booking_date,
      status,
      notes,
      contact:contacts(id, first_name, last_name, email, phone),
      class:class_schedule(id, class_name, instructor, day_of_week, start_time, end_time)
    `)
    .eq('class.business_id', businessId);

  // Apply filters
  if (input.date) {
    query = query.eq('booking_date', input.date);
  }

  if (input.contact_id) {
    query = query.eq('contact_id', input.contact_id);
  }

  // Order by date and time
  query = query.order('booking_date', { ascending: true }).limit(20);

  const { data: bookings, error } = await query;

  if (error) {
    console.error('Query bookings error:', error);
    throw new Error(`Failed to query bookings: ${error.message}`);
  }

  // Filter by class_name if provided (can't easily do this in query)
  let filteredBookings = bookings || [];
  if (input.class_name) {
    const searchTerm = input.class_name.toLowerCase();
    filteredBookings = filteredBookings.filter(b => 
      b.class?.class_name?.toLowerCase().includes(searchTerm)
    );
  }

  // Format for response
  const formattedBookings = filteredBookings.map(b => ({
    id: b.id,
    date: b.booking_date,
    status: b.status,
    class_name: b.class?.class_name || 'Unknown',
    instructor: b.class?.instructor || 'Unknown',
    time: b.class?.start_time ? formatTime(b.class.start_time) : 'Unknown',
    contact_name: b.contact ? [b.contact.first_name, b.contact.last_name].filter(Boolean).join(' ') : 'Unknown',
    contact_email: b.contact?.email,
    notes: b.notes
  }));

  if (formattedBookings.length === 0) {
    // If no bookings found, also return available classes for the date
    if (input.date) {
      const dayOfWeek = new Date(input.date).getDay();
      const { data: classes } = await supabase
        .from('class_schedule')
        .select('class_name, instructor, start_time, end_time, max_capacity')
        .eq('business_id', businessId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);

      if (classes && classes.length > 0) {
        return {
          bookings: [],
          available_classes: classes.map(c => ({
            class_name: c.class_name,
            instructor: c.instructor,
            time: formatTime(c.start_time),
            capacity: c.max_capacity
          })),
          message: `No bookings found for ${input.date}, but ${classes.length} class${classes.length !== 1 ? 'es' : ''} available that day`
        };
      }
    }
    return {
      bookings: [],
      message: 'No bookings found for the specified criteria'
    };
  }

  return {
    bookings: formattedBookings,
    message: `Found ${formattedBookings.length} booking${formattedBookings.length !== 1 ? 's' : ''}`
  };
}

// Helper to format time for display
function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

async function executeSendEmail(
  supabase: SupabaseClient,
  input: { contact_id: string; subject: string; body: string },
  businessId: string
): Promise<any> {
  // First get contact details
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email')
    .eq('id', input.contact_id)
    .eq('business_id', businessId)
    .single();

  if (contactError || !contact) {
    throw new Error(`Contact not found: ${input.contact_id}`);
  }

  if (!contact.email) {
    throw new Error(`Contact ${contact.first_name} ${contact.last_name} has no email address`);
  }

  // Call the send-email edge function
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: contact.email,
      subject: input.subject,
      html: input.body.replace(/\n/g, '<br>'),
      text: input.body,
      business_id: businessId,
      contact_id: input.contact_id
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email: ${errorText}`);
  }

  const result = await response.json();
  const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');

  return {
    success: true,
    email_id: result.id,
    recipient: contact.email,
    contact_name: contactName,
    message: `Email "${input.subject}" sent to ${contactName} (${contact.email})`
  };
}

async function executeSendSms(
  supabase: SupabaseClient,
  input: { contact_id: string; message: string },
  businessId: string
): Promise<any> {
  // First get contact details
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, phone')
    .eq('id', input.contact_id)
    .eq('business_id', businessId)
    .single();

  if (contactError || !contact) {
    throw new Error(`Contact not found: ${input.contact_id}`);
  }

  if (!contact.phone) {
    throw new Error(`Contact ${contact.first_name} ${contact.last_name} has no phone number`);
  }

  // Call the send-sms edge function
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const response = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: contact.phone,
      message: input.message
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send SMS: ${errorText}`);
  }

  const result = await response.json();
  const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');

  return {
    success: true,
    sms_sid: result.sid,
    recipient: contact.phone,
    contact_name: contactName,
    message: `SMS sent to ${contactName} (${contact.phone})`
  };
}

async function executePostSocial(
  supabase: SupabaseClient,
  input: { platform: string; content: string; schedule_for?: string },
  businessId: string
): Promise<any> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (input.platform === 'twitter') {
    // Use the existing post-tweet edge function (via GAME platform)
    const response = await fetch(`${supabaseUrl}/functions/v1/post-tweet`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: input.content,
        businessId: businessId
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to post tweet');
    }

    return {
      success: true,
      platform: 'twitter',
      tweet_id: result.tweetId,
      message: `Tweet posted successfully: "${input.content.substring(0, 50)}${input.content.length > 50 ? '...' : ''}"`
    };
  }

  if (input.platform === 'linkedin') {
    // LinkedIn posting would need separate integration
    // For now, return that it's not yet supported
    throw new Error('LinkedIn posting is not yet configured for this business. Contact support to enable it.');
  }

  throw new Error(`Unsupported platform: ${input.platform}. Supported: twitter, linkedin`);
}

async function executeApplyPromotion(
  supabase: SupabaseClient,
  input: { contact_id: string; promotion: string },
  businessId: string
): Promise<any> {
  // First verify contact exists and belongs to this business
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, status, status_notes')
    .eq('id', input.contact_id)
    .eq('business_id', businessId)
    .single();

  if (contactError || !contact) {
    throw new Error(`Contact not found: ${input.contact_id}`);
  }

  // Update contact status_notes with the promotion
  const existingNotes = contact.status_notes || '';
  const timestamp = new Date().toISOString();
  const newNote = `[${timestamp}] Promotion applied: ${input.promotion}`;
  const updatedNotes = existingNotes ? `${existingNotes}\n${newNote}` : newNote;

  const { error: updateError } = await supabase
    .from('contacts')
    .update({
      status_notes: updatedNotes,
      updated_at: new Date().toISOString()
    })
    .eq('id', input.contact_id);

  if (updateError) {
    throw new Error(`Failed to apply promotion: ${updateError.message}`);
  }

  const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');

  return {
    success: true,
    contact_id: input.contact_id,
    contact_name: contactName,
    promotion: input.promotion,
    message: `Promotion "${input.promotion}" applied to ${contactName}`
  };
}

async function executeScheduleBooking(
  supabase: SupabaseClient,
  input: { contact_id: string; class_schedule_id: string; booking_date: string; notes?: string },
  businessId: string
): Promise<any> {
  // Verify contact exists and belongs to this business
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone')
    .eq('id', input.contact_id)
    .eq('business_id', businessId)
    .single();

  if (contactError || !contact) {
    throw new Error(`Contact not found: ${input.contact_id}`);
  }

  // Verify class schedule exists and belongs to this business
  const { data: classSchedule, error: classError } = await supabase
    .from('class_schedule')
    .select('id, class_name, instructor, day_of_week, start_time, end_time, max_capacity')
    .eq('id', input.class_schedule_id)
    .eq('business_id', businessId)
    .eq('is_active', true)
    .single();

  if (classError || !classSchedule) {
    throw new Error(`Class schedule not found: ${input.class_schedule_id}`);
  }

  // Verify the booking date matches the class day of week
  const bookingDate = new Date(input.booking_date);
  if (bookingDate.getDay() !== classSchedule.day_of_week) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    throw new Error(
      `${classSchedule.class_name} is on ${dayNames[classSchedule.day_of_week]}, ` +
      `but ${input.booking_date} is a ${dayNames[bookingDate.getDay()]}`
    );
  }

  // Check if booking already exists
  const { data: existingBooking } = await supabase
    .from('class_bookings')
    .select('id')
    .eq('contact_id', input.contact_id)
    .eq('class_schedule_id', input.class_schedule_id)
    .eq('booking_date', input.booking_date)
    .single();

  if (existingBooking) {
    throw new Error(`Contact already has a booking for this class on ${input.booking_date}`);
  }

  // Check capacity
  const { count: currentBookings } = await supabase
    .from('class_bookings')
    .select('*', { count: 'exact', head: true })
    .eq('class_schedule_id', input.class_schedule_id)
    .eq('booking_date', input.booking_date)
    .eq('status', 'confirmed');

  if (classSchedule.max_capacity && (currentBookings || 0) >= classSchedule.max_capacity) {
    throw new Error(`Class is full (${classSchedule.max_capacity} spots). Try another date or class.`);
  }

  // Create the booking
  const { data: booking, error: bookingError } = await supabase
    .from('class_bookings')
    .insert({
      contact_id: input.contact_id,
      class_schedule_id: input.class_schedule_id,
      booking_date: input.booking_date,
      status: 'confirmed',
      notes: input.notes || null
    })
    .select('id')
    .single();

  if (bookingError) {
    throw new Error(`Failed to create booking: ${bookingError.message}`);
  }

  const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
  const classTime = formatTime(classSchedule.start_time);

  return {
    success: true,
    booking_id: booking.id,
    contact_name: contactName,
    class_name: classSchedule.class_name,
    instructor: classSchedule.instructor,
    date: input.booking_date,
    time: classTime,
    message: `Booked ${contactName} for ${classSchedule.class_name} on ${input.booking_date} at ${classTime} with ${classSchedule.instructor}`
  };
}
