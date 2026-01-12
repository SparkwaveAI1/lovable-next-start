import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  content: string;
  relevance_score: number;
}

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
    'start', 'begin', 'join', 'register', 'first class', 'want to come'
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

    const { messages, businessId, businessContext, classSchedule, contactName, threadId } = await req.json();

    // Get the latest user message for context
    const latestMessage = messages[messages.length - 1]?.content || '';
    const detectedIntents = detectIntent(latestMessage);

    console.log('Processing message:', latestMessage);
    console.log('Detected intents:', detectedIntents);

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

    // Search knowledge base for relevant information
    let relevantKnowledge: KnowledgeItem[] = [];
    if (businessId) {
      const { data: knowledgeData, error: knowledgeError } = await supabase
        .rpc('search_business_knowledge', {
          p_business_id: businessId,
          p_query: latestMessage,
          p_limit: 5
        });

      if (knowledgeError) {
        console.error('Knowledge search error:', knowledgeError);
      } else if (knowledgeData) {
        relevantKnowledge = knowledgeData as KnowledgeItem[];
        console.log('Found relevant knowledge:', relevantKnowledge.length, 'items');
      }
    }

    // Build knowledge context
    let knowledgeContext = '';
    if (relevantKnowledge.length > 0) {
      knowledgeContext = '\n\nRELEVANT INFORMATION FROM KNOWLEDGE BASE:\n';
      relevantKnowledge.forEach((item, idx) => {
        knowledgeContext += `\n${idx + 1}. [${item.category.toUpperCase()}] ${item.title}:\n${item.content}\n`;
      });
    }

    // Format class schedule
    const scheduleContext = classSchedule && classSchedule.length > 0
      ? `\n\nCLASS SCHEDULE:\n${formatClassSchedule(classSchedule)}`
      : '';

    // Build the system prompt
    const personalityPrompt = agentConfig?.personality_prompt || `You are a helpful AI assistant for ${businessContext}. Be friendly and professional.`;

    const systemPrompt = `${personalityPrompt}

BUSINESS: ${businessContext || 'the gym'}
${contactName ? `CUSTOMER NAME: ${contactName}` : ''}
${knowledgeContext}
${scheduleContext}

DETECTED INTENT(S): ${detectedIntents.join(', ')}

RESPONSE GUIDELINES:
1. Keep responses concise - ideally under ${agentConfig?.max_response_length || 160} characters for SMS
2. If the response needs to be longer (like pricing info), that's OK - clarity is more important
3. Always be helpful, friendly, and encouraging
4. If someone asks about pricing, give them the specific prices from the knowledge base
5. If someone wants to try a class, enthusiastically help them book a free trial
6. If you don't know something specific, offer to have a team member follow up
7. End with a question or clear next step when appropriate
8. Never make up information - only use what's in the knowledge base
9. If this is a greeting, respond warmly and ask how you can help

BOOKING FLOW:
- If someone wants to book a trial, ask what type of class they're interested in (BJJ, Kickboxing, Fitness)
- Then ask what day/time works best for them
- Confirm the booking details before finalizing
- After booking, remind them what to wear and that you're excited to see them

IMPORTANT: Respond ONLY with the message to send to the customer. No prefixes, no explanations, just the response text.`;

    // Determine model to use
    const model = agentConfig?.model || 'gpt-4o-mini';
    const temperature = agentConfig?.temperature || 0.7;

    console.log('Using model:', model, 'temperature:', temperature);

    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
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
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();
    const aiMessage = data.choices[0]?.message?.content ||
      (agentConfig?.fallback_message || 'Sorry, I had trouble understanding. Can you please rephrase?');

    console.log('AI Response:', aiMessage);

    // Detect if this is a booking confirmation
    const bookingIndicators = [
      'booked', 'confirmed', 'scheduled', 'see you', 'you\'re all set',
      'got you down', 'reserved', 'looking forward'
    ];
    const shouldBook = bookingIndicators.some(indicator =>
      aiMessage.toLowerCase().includes(indicator)
    );

    // Try to extract class details if booking
    let classDetails = undefined;
    if (shouldBook) {
      // Simple extraction - could be enhanced with structured output
      const classTypes = ['bjj', 'jiu jitsu', 'kickboxing', 'fitness'];
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

      let detectedClass = '';
      let detectedDay = '';

      const lowerMessage = (latestMessage + ' ' + aiMessage).toLowerCase();

      for (const classType of classTypes) {
        if (lowerMessage.includes(classType)) {
          detectedClass = classType === 'jiu jitsu' ? 'BJJ' : classType.charAt(0).toUpperCase() + classType.slice(1);
          break;
        }
      }

      for (const day of days) {
        if (lowerMessage.includes(day)) {
          detectedDay = day.charAt(0).toUpperCase() + day.slice(1);
          break;
        }
      }

      if (detectedClass || detectedDay) {
        classDetails = {
          className: detectedClass || 'Beginner Class',
          day: detectedDay || 'TBD',
          time: 'TBD'
        };
      }
    }

    // Update conversation state if threadId provided
    if (threadId && businessId) {
      const newState = shouldBook ? 'class_scheduled' :
        (detectedIntents.includes('BOOK_TRIAL') ? 'collecting_booking_info' : 'answering_questions');

      try {
        await supabase
          .from('conversation_threads')
          .update({
            conversation_state: newState,
            last_bot_message_at: new Date().toISOString()
          })
          .eq('id', threadId);
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
      knowledgeUsed: relevantKnowledge.map(k => k.title)
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
