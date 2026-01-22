import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgentConfig {
  agent_name: string;
  personality_prompt: string;
  greeting_message: string;
  fallback_message: string;
  booking_enabled: boolean;
  max_response_length: number;
  model: string;
  temperature: number;
}

interface ClassSchedule {
  id: string;
  class_name: string;
  instructor: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

// Intent detection patterns
const INTENT_PATTERNS = {
  PRICING_INQUIRY: [
    'price', 'cost', 'how much', 'rate', 'fee', 'membership', 'monthly',
    'afford', 'payment', 'pay', 'expensive', 'cheap', 'deal'
  ],
  SCHEDULE_INQUIRY: [
    'schedule', 'when', 'time', 'class times', 'hours', 'what days',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ],
  BOOK_TRIAL: [
    'book', 'schedule', 'sign up', 'signup', 'try', 'trial', 'free class',
    'start', 'begin', 'join', 'register', 'first class', 'want to come',
    'come in', 'stop by', 'visit', 'check it out'
  ],
  BOOKING_CONFIRMATION: [
    'yes', 'yeah', 'yep', 'sure', 'sounds good', 'perfect', 'that works',
    'book it', 'sign me up', 'let\'s do it', 'i\'ll be there', 'see you then',
    'confirm', 'ok', 'okay'
  ],
  GENERAL_QUESTION: [
    'what', 'how', 'where', 'who', 'why', 'tell me', 'explain', 'info',
    'information', 'about', 'learn'
  ],
  GREETING: [
    'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
    'whats up', "what's up", 'yo', 'sup'
  ]
};

// Class type patterns for extraction
const CLASS_TYPE_PATTERNS: Record<string, string[]> = {
  'Submission Grappling': ['bjj', 'jiu jitsu', 'jiujitsu', 'grappling', 'submission', 'wrestling', 'ground'],
  'Muay Thai': ['muay thai', 'thai boxing', 'kickboxing', 'striking', 'kicks'],
  'MMA Skills and Sparring': ['mma', 'mixed martial arts', 'ufc', 'cage'],
  'Boxing Skills': ['boxing', 'box', 'punch'],
  'Boxing Bootcamp': ['bootcamp', 'fitness', 'cardio', 'workout'],
  'Kickboxing Bootcamp': ['kickboxing bootcamp'],
  'Self Defense': ['self defense', 'self-defense', 'protection'],
  'Fight Flow Juniors': ['kids', 'youth', 'junior', 'child', 'children', 'son', 'daughter'],
  'Youth Boxing': ['kids boxing', 'youth boxing']
};

// Day patterns
const DAY_PATTERNS: Record<number, string[]> = {
  0: ['sunday', 'sun'],
  1: ['monday', 'mon'],
  2: ['tuesday', 'tue', 'tues'],
  3: ['wednesday', 'wed'],
  4: ['thursday', 'thu', 'thur', 'thurs'],
  5: ['friday', 'fri'],
  6: ['saturday', 'sat']
};

// Time period patterns
const TIME_PATTERNS = {
  morning: ['morning', 'am', 'early', '6am', '7am', '8am', '9am', '10am', '11am'],
  afternoon: ['afternoon', 'noon', 'lunch', '12pm', '1pm', '2pm', '3pm', '4pm'],
  evening: ['evening', 'night', 'pm', 'after work', '5pm', '6pm', '7pm', '8pm', '9pm']
};

function detectIntent(message: string): string[] {
  const lowerMessage = message.toLowerCase();
  const detectedIntents: string[] = [];

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerMessage.includes(pattern)) {
        detectedIntents.push(intent);
        break;
      }
    }
  }

  return detectedIntents.length > 0 ? detectedIntents : ['GENERAL_QUESTION'];
}

// Extract class type preference from message
function extractClassType(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  for (const [className, patterns] of Object.entries(CLASS_TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerMessage.includes(pattern)) {
        return className;
      }
    }
  }
  return null;
}

// Extract day preference from message
function extractDay(message: string): number | null {
  const lowerMessage = message.toLowerCase();
  for (const [day, patterns] of Object.entries(DAY_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerMessage.includes(pattern)) {
        return parseInt(day);
      }
    }
  }
  return null;
}

// Extract time preference from message
function extractTimePeriod(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  for (const [period, patterns] of Object.entries(TIME_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerMessage.includes(pattern)) {
        return period;
      }
    }
  }
  return null;
}

// Find matching classes based on preferences
function findMatchingClasses(
  classes: ClassSchedule[],
  classType: string | null,
  day: number | null,
  timePeriod: string | null
): ClassSchedule[] {
  return classes.filter(cls => {
    // Filter by class type if specified
    if (classType && !cls.class_name.toLowerCase().includes(classType.toLowerCase())) {
      // Also check partial matches
      const classTypeLower = classType.toLowerCase();
      const classNameLower = cls.class_name.toLowerCase();
      if (!classNameLower.includes(classTypeLower.split(' ')[0])) {
        return false;
      }
    }

    // Filter by day if specified
    if (day !== null && cls.day_of_week !== day) {
      return false;
    }

    // Filter by time period if specified
    if (timePeriod) {
      const hour = parseInt(cls.start_time.split(':')[0]);
      if (timePeriod === 'morning' && hour >= 12) return false;
      if (timePeriod === 'afternoon' && (hour < 12 || hour >= 17)) return false;
      if (timePeriod === 'evening' && hour < 17) return false;
    }

    return true;
  });
}

// Format class option for AI to present
function formatClassOption(cls: ClassSchedule): string {
  return `${cls.class_name} on ${getDayName(cls.day_of_week)} at ${cls.start_time} with ${cls.instructor}`;
}

interface BookingState {
  classType: string | null;
  preferredDay: number | null;
  preferredTime: string | null;
  suggestedClass: ClassSchedule | null;
  awaitingConfirmation: boolean;
}

// Human escalation trigger patterns
const ESCALATION_PATTERNS = {
  WANTS_HUMAN: [
    'talk to a person', 'speak to someone', 'real person', 'human',
    'talk to manager', 'speak to owner', 'call me', 'can someone call',
    'need to talk to', 'want to speak with', 'get someone'
  ],
  FRUSTRATED: [
    'this is ridiculous', 'frustrated', 'angry', 'terrible', 'worst',
    'waste of time', 'not helpful', 'doesn\'t work', 'broken', 'useless',
    'stop', 'quit messaging', 'leave me alone', 'unsubscribe'
  ],
  MEDICAL_LEGAL: [
    'injury', 'injured', 'hurt', 'pain', 'doctor', 'medical',
    'lawyer', 'sue', 'legal', 'liability', 'waiver'
  ],
  COMPLAINT: [
    'complaint', 'complain', 'refund', 'money back', 'charged',
    'billing issue', 'overcharged', 'cancel membership', 'not happy'
  ]
};

// Detect if message should trigger human escalation
function detectEscalation(message: string): { shouldEscalate: boolean; reason: string | null } {
  const lowerMessage = message.toLowerCase();

  for (const [category, patterns] of Object.entries(ESCALATION_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerMessage.includes(pattern)) {
        return { shouldEscalate: true, reason: category };
      }
    }
  }

  return { shouldEscalate: false, reason: null };
}

function getDayName(dayNum: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNum] || 'Unknown';
}

function formatClassSchedule(classes: ClassSchedule[]): string {
  if (!classes || classes.length === 0) {
    return 'No classes currently scheduled.';
  }

  // Group by day
  const byDay: Record<number, ClassSchedule[]> = {};
  classes.forEach(cls => {
    if (!byDay[cls.day_of_week]) byDay[cls.day_of_week] = [];
    byDay[cls.day_of_week].push(cls);
  });

  let schedule = '';
  for (let day = 0; day < 7; day++) {
    if (byDay[day] && byDay[day].length > 0) {
      schedule += `${getDayName(day)}:\n`;
      byDay[day].forEach(cls => {
        schedule += `  - ${cls.class_name} at ${cls.start_time} (${cls.instructor})\n`;
      });
    }
  }

  return schedule || 'No classes currently scheduled.';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { messages, businessId, businessContext, classSchedule, contactName, threadId, knowledgeBase } = await req.json();

    // Get the latest user message for context
    const latestMessage = messages[messages.length - 1]?.content || '';
    const detectedIntents = detectIntent(latestMessage);

    console.log('Processing message:', latestMessage);
    console.log('Detected intents:', detectedIntents);

    // Check for escalation triggers
    const escalation = detectEscalation(latestMessage);
    if (escalation.shouldEscalate) {
      console.log('Escalation triggered:', escalation.reason);
    }

    // Get agent configuration
    let agentConfig: AgentConfig | null = null;
    if (businessId) {
      const { data: configData } = await supabase
        .from('agent_config')
        .select('*')
        .eq('business_id', businessId)
        .single();

      if (configData) {
        agentConfig = configData as AgentConfig;
      }
    }

    // Use pre-loaded knowledge base - the LLM can find relevant info itself
    let knowledgeContext = '';
    if (knowledgeBase && knowledgeBase.length > 0) {
      knowledgeContext = '\n\nBUSINESS KNOWLEDGE BASE:\n' + knowledgeBase;
      console.log('Using pre-loaded knowledge base:', knowledgeBase.length, 'chars');
    }

    // Extract booking preferences from ENTIRE conversation history
    const fullConversation = messages.map((m: any) => m.content).join(' ');
    const bookingState: BookingState = {
      classType: extractClassType(fullConversation),
      preferredDay: extractDay(fullConversation),
      preferredTime: extractTimePeriod(fullConversation),
      suggestedClass: null,
      awaitingConfirmation: false
    };

    console.log('Booking state extracted:', bookingState);

    // Find matching classes based on preferences
    let suggestedClasses: ClassSchedule[] = [];
    let bookingContext = '';

    if (classSchedule && classSchedule.length > 0) {
      // If we have preferences, find matching classes
      if (bookingState.classType || bookingState.preferredDay !== null || bookingState.preferredTime) {
        suggestedClasses = findMatchingClasses(
          classSchedule,
          bookingState.classType,
          bookingState.preferredDay,
          bookingState.preferredTime
        );

        if (suggestedClasses.length > 0) {
          bookingContext = '\n\nMATCHING CLASSES FOR THIS CUSTOMER:\n';
          suggestedClasses.slice(0, 5).forEach((cls, idx) => {
            bookingContext += `${idx + 1}. ${formatClassOption(cls)}\n`;
          });
          bookingContext += '\nSuggest one of these specific classes to the customer!';
        }
      }
    }

    // Format full class schedule for reference
    const scheduleContext = classSchedule && classSchedule.length > 0
      ? `\n\nFULL CLASS SCHEDULE:\n${formatClassSchedule(classSchedule)}`
      : '';

    // Check if the customer is confirming a suggested class
    const isConfirmation = detectedIntents.includes('BOOKING_CONFIRMATION');
    const lastAssistantMessage = messages.filter((m: any) => m.role === 'assistant').pop()?.content || '';

    // Check if the last assistant message suggested a specific class
    const suggestedClassInLastMessage = classSchedule?.find((cls: ClassSchedule) =>
      lastAssistantMessage.toLowerCase().includes(cls.class_name.toLowerCase()) &&
      lastAssistantMessage.toLowerCase().includes(getDayName(cls.day_of_week).toLowerCase())
    );

    if (isConfirmation && suggestedClassInLastMessage) {
      bookingState.suggestedClass = suggestedClassInLastMessage;
      bookingState.awaitingConfirmation = true;
    }

    // Build the system prompt
    const personalityPrompt = agentConfig?.personality_prompt || `You are a helpful AI assistant for ${businessContext}. Be friendly and professional.`;

    // Only include matching classes context if we have BOTH class type AND day/time preference
    const hasFullPreferences = bookingState.classType && (bookingState.preferredDay !== null || bookingState.preferredTime);
    const recommendationContext = hasFullPreferences && suggestedClasses.length > 0
      ? `\n\nRECOMMENDED CLASSES (based on customer preferences):\n${suggestedClasses.slice(0, 3).map(cls =>
          `- ${cls.class_name} on ${getDayName(cls.day_of_week)} at ${cls.start_time}`
        ).join('\n')}\nONLY suggest from this list.`
      : '';

    const systemPrompt = `${personalityPrompt}

BUSINESS: ${businessContext || 'the gym'}
${contactName ? `CUSTOMER NAME: ${contactName}` : ''}
${knowledgeContext}
${recommendationContext}

DETECTED INTENT(S): ${detectedIntents.join(', ')}
${bookingState.classType ? `CUSTOMER INTERESTED IN: ${bookingState.classType}` : 'CLASS TYPE: Not yet known - ASK THEM'}
${bookingState.preferredDay !== null ? `PREFERRED DAY: ${getDayName(bookingState.preferredDay)}` : 'PREFERRED DAY: Not yet known - ASK THEM'}
${bookingState.preferredTime ? `PREFERRED TIME: ${bookingState.preferredTime}` : 'PREFERRED TIME: Not yet known - ASK THEM'}

YOUR GOALS (in order of priority):
1. ANSWER any direct questions first (pricing, schedule, location, etc.)
2. DISCOVER their preferences through questions (don't assume!)
3. RECOMMEND a specific class only after you know what they want
4. Get them to book a FREE TRIAL CLASS

CRITICAL RULES - NEVER BREAK THESE:
1. NEVER assume or randomly pick a class type, day, or time
2. NEVER mention instructor names - just give class name, day, and time
3. NEVER recommend a specific class until you know BOTH:
   - What TYPE of training they want (MMA, Muay Thai, Boxing, Grappling, Self Defense, Fitness)
   - What DAYS/TIMES work for them
4. If they say "interested in a free class" but haven't specified type or time, ASK THEM

BOOKING CONVERSATION FLOW:
Step 1 - If class type is unknown, ask:
"We offer MMA, Muay Thai, Boxing, Submission Grappling, and Self Defense. What sounds interesting to you?"

Step 2 - If days/times unknown, ask:
"What days and times work best for you? We have morning, afternoon, and evening classes."

Step 3 - ONLY after you know both type AND time, recommend:
"Great! For [their interest] we have [class name] on [day] at [time]. Would you like to try that one?"

Step 4 - If they confirm, get their name if you don't have it, then confirm the booking.

RESPONSE GUIDELINES:
- Start your message with "Hi [name]" using the customer's name if provided above
- ANSWER direct questions first, then ask follow-up questions
- Keep responses concise for SMS (under ${agentConfig?.max_response_length || 320} chars)
- Be warm and conversational, not salesy
- Always end with a question to keep the conversation going

IMPORTANT: Respond ONLY with the message to send to the customer. No prefixes, no explanations, just the response text.`;

    // Determine model to use (OpenRouter model format)
    const model = agentConfig?.model || 'openai/gpt-4o-mini';
    const temperature = agentConfig?.temperature || 0.7;

    console.log('Using model:', model, 'temperature:', temperature);

    // Call OpenRouter API (OpenAI-compatible)
    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY not configured');
      throw new Error('AI service not configured');
    }

    const openaiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://fightflowacademy.com',
        'X-Title': 'Fight Flow AI Assistant'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 300,
        temperature: temperature
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenRouter API error:', errorText);
      throw new Error(`OpenRouter API error: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();
    const aiMessage = data.choices[0]?.message?.content ||
      (agentConfig?.fallback_message || 'Sorry, I had trouble understanding. Can you please rephrase?');

    console.log('AI Response:', aiMessage);

    // Detect if this is a booking confirmation from the AI response
    const bookingIndicators = [
      'booked', 'confirmed', 'scheduled', 'see you', 'you\'re all set',
      'got you down', 'reserved', 'looking forward', 'you\'re set'
    ];
    const aiConfirmedBooking = bookingIndicators.some(indicator =>
      aiMessage.toLowerCase().includes(indicator)
    );

    // Try to extract the specific class from the AI response
    let classDetails = undefined;
    let shouldBook = false;

    // Method 1: Customer confirmed a previously suggested class
    if (bookingState.awaitingConfirmation && bookingState.suggestedClass) {
      shouldBook = true;
      classDetails = {
        className: bookingState.suggestedClass.class_name,
        day: getDayName(bookingState.suggestedClass.day_of_week),
        dayOfWeek: bookingState.suggestedClass.day_of_week,
        time: bookingState.suggestedClass.start_time,
        instructor: bookingState.suggestedClass.instructor,
        classScheduleId: bookingState.suggestedClass.id
      };
      console.log('Booking confirmed via customer confirmation:', classDetails);
    }
    // Method 2: AI response indicates booking was made - extract from AI message
    else if (aiConfirmedBooking && classSchedule && classSchedule.length > 0) {
      const aiMessageLower = aiMessage.toLowerCase();

      // Find which class the AI mentioned in its confirmation
      for (const cls of classSchedule) {
        const classNameLower = cls.class_name.toLowerCase();
        const dayName = getDayName(cls.day_of_week).toLowerCase();

        // Check if AI message contains both class name and day
        if (aiMessageLower.includes(classNameLower) ||
            (aiMessageLower.includes(classNameLower.split(' ')[0]) && aiMessageLower.includes(dayName))) {
          shouldBook = true;
          classDetails = {
            className: cls.class_name,
            day: getDayName(cls.day_of_week),
            dayOfWeek: cls.day_of_week,
            time: cls.start_time,
            instructor: cls.instructor,
            classScheduleId: cls.id
          };
          console.log('Booking detected from AI confirmation:', classDetails);
          break;
        }
      }

      // Fallback: If AI confirmed but we couldn't match specific class, use preferences
      if (!classDetails && suggestedClasses.length > 0) {
        const firstMatch = suggestedClasses[0];
        shouldBook = true;
        classDetails = {
          className: firstMatch.class_name,
          day: getDayName(firstMatch.day_of_week),
          dayOfWeek: firstMatch.day_of_week,
          time: firstMatch.start_time,
          instructor: firstMatch.instructor,
          classScheduleId: firstMatch.id
        };
        console.log('Booking using first matching class:', classDetails);
      }
    }

    // Update conversation state if threadId provided
    if (threadId && businessId) {
      const newState = shouldBook ? 'class_scheduled' :
        (detectedIntents.includes('BOOK_TRIAL') ? 'collecting_booking_info' : 'answering_questions');

      try {
        const updateData: any = {
          conversation_state: newState,
          last_bot_message_at: new Date().toISOString()
        };

        // Set human review flag if escalation triggered
        if (escalation.shouldEscalate) {
          updateData.needs_human_review = true;
          updateData.state_data = {
            escalation_reason: escalation.reason,
            escalation_time: new Date().toISOString(),
            escalation_message: latestMessage.substring(0, 200)
          };
        }

        await supabase
          .from('conversation_threads')
          .update(updateData)
          .eq('id', threadId);

        // Log escalation for visibility
        if (escalation.shouldEscalate) {
          await supabase
            .from('automation_logs')
            .insert({
              business_id: businessId,
              automation_type: 'human_escalation',
              status: 'triggered',
              processed_data: {
                thread_id: threadId,
                reason: escalation.reason,
                message_preview: latestMessage.substring(0, 100)
              }
            });
        }
      } catch (updateError) {
        console.error('Error updating conversation state:', updateError);
        // Don't fail the whole request if state update fails
      }
    }

    return new Response(JSON.stringify({
      message: aiMessage,
      shouldBook,
      classDetails,
      detectedIntents,
      knowledgeUsed: knowledgeBase ? 'full knowledge base' : 'none',
      bookingState: {
        classType: bookingState.classType,
        preferredDay: bookingState.preferredDay !== null ? getDayName(bookingState.preferredDay) : null,
        preferredTime: bookingState.preferredTime,
        suggestedClassesCount: suggestedClasses.length
      },
      escalation: escalation.shouldEscalate ? {
        triggered: true,
        reason: escalation.reason
      } : null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('AI response error:', error);
    return new Response(JSON.stringify({
      message: 'Sorry, I had a technical issue. Please try again or call us directly.',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
