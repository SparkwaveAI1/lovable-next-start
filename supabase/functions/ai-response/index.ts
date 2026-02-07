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
  evaluation_enabled?: boolean; // New: toggle self-improvement loop
}

interface ClassSchedule {
  id: string;
  class_name: string;
  instructor: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface EvaluationResult {
  allPass: boolean;
  failures: string[];
  scores: {
    relevance: { pass: boolean; reason: string };
    questionAnswered: { pass: boolean; reason: string; questions: string[] };
    detailEcho: { pass: boolean; reason: string; details: string[] };
    contextAware: { pass: boolean; reason: string };
    accuracy: { pass: boolean; reason: string };
    ctaAppropriate: { pass: boolean; reason: string };
  };
  iteration: number;
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
  return `${cls.class_name} on ${getDayName(cls.day_of_week)} at ${formatTime(cls.start_time)} with ${cls.instructor}`;
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

// Patterns that indicate AI should escalate to human (Scott)
const NEEDS_HUMAN_PATTERNS = [
  'let scott know', 'i\'ll let scott', 'scott know and he',
  'he\'ll be in touch', 'will be in touch', 'get in touch',
  'have scott', 'talk to scott', 'speak to scott',
  'beyond what i can', 'can\'t answer that', 'not sure about that'
];

// Polite rejection patterns - customer is saying NO
const REJECTION_PATTERNS = [
  'i\'m good', 'im good', 'i am good',
  'no thanks', 'no thank you', 'not interested',
  'not right now', 'not at this time', 'maybe later',
  'i\'ll pass', 'pass for now', 'gonna pass',
  'already found', 'went with', 'chose another', 'signed up elsewhere',
  'too expensive', 'can\'t afford', 'out of my budget',
  'too far', 'not convenient', 'location doesn\'t work',
  'don\'t have time', 'too busy', 'schedule doesn\'t work',
  'not for me', 'changed my mind', 'decided against',
  'thank you for the offer', 'thanks for the offer', 'thanks anyway'
];

// Detect if customer is politely declining
function detectRejection(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return REJECTION_PATTERNS.some(pattern => lowerMessage.includes(pattern));
}

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

// Convert 24-hour time to 12-hour AM/PM format
function formatTime(time24: string): string {
  if (!time24) return '';
  
  const parts = time24.split(':');
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] || '00';
  
  const period = hours >= 12 ? 'PM' : 'AM';
  
  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours = hours - 12;
  }
  
  return `${hours}:${minutes} ${period}`;
}

function formatClassSchedule(classes: ClassSchedule[]): string {
  if (!classes || classes.length === 0) {
    return 'No classes currently scheduled.';
  }

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
        schedule += `  - ${cls.class_name} at ${formatTime(cls.start_time)} (${cls.instructor})\n`;
      });
    }
  }

  return schedule || 'No classes currently scheduled.';
}

// ============================================
// SELF-IMPROVEMENT EVALUATION SYSTEM
// ============================================

/**
 * Extract questions from a message using multiple detection methods
 */
function extractQuestions(message: string): string[] {
  const questions: string[] = [];
  const lowerMessage = message.toLowerCase();
  
  // Method 1: Direct question marks
  const questionMarkSentences = message.split(/[.!]/).filter(s => s.includes('?'));
  questions.push(...questionMarkSentences.map(q => q.trim()).filter(q => q.length > 0));
  
  // Method 2: Question words without question marks (common in texts)
  const questionPatterns = [
    /what (?:time|day|days|are|is|do|about|if)/gi,
    /when (?:are|is|do|can|does)/gi,
    /how much (?:is|are|does|do)/gi,
    /how (?:long|many|often|do|can)/gi,
    /where (?:is|are|do|can)/gi,
    /do you (?:have|offer|provide)/gi,
    /can (?:i|you|we)/gi,
    /is there/gi,
    /are there/gi
  ];
  
  for (const pattern of questionPatterns) {
    const matches = message.match(pattern);
    if (matches) {
      questions.push(...matches.map(m => m.trim()));
    }
  }
  
  return [...new Set(questions)]; // Deduplicate
}

/**
 * Extract specific details mentioned by the lead (times, days, names, constraints)
 */
function extractLeadDetails(message: string): string[] {
  const details: string[] = [];
  const lowerMessage = message.toLowerCase();
  
  // Time patterns
  const timePatterns = [
    /(\d{1,2})\s*(am|pm)/gi,
    /(\d{1,2}):(\d{2})/g,
    /(morning|afternoon|evening|night)/gi,
    /after (\d{1,2}|work|school)/gi,
    /before (\d{1,2}|work|school)/gi,
    /until (\d{1,2}|work|school)/gi
  ];
  
  for (const pattern of timePatterns) {
    const matches = message.match(pattern);
    if (matches) {
      details.push(...matches.map(m => m.trim()));
    }
  }
  
  // Day patterns
  const dayMatches = message.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekday|weekend)/gi);
  if (dayMatches) {
    details.push(...dayMatches.map(m => m.trim()));
  }
  
  // Constraint patterns (work until X, kids, etc.)
  const constraintPatterns = [
    /i work (?:until|til|till|from|at) [^.!?]+/gi,
    /my (?:son|daughter|kid|child|wife|husband) [^.!?]+/gi,
    /i(?:'m| am) (?:busy|available|free) [^.!?]+/gi,
    /only (?:available|free) [^.!?]+/gi
  ];
  
  for (const pattern of constraintPatterns) {
    const matches = message.match(pattern);
    if (matches) {
      details.push(...matches.map(m => m.trim()));
    }
  }
  
  return [...new Set(details)];
}

/**
 * Evaluate response quality against the lead message
 * Uses LLM for nuanced evaluation with structured output
 */
async function evaluateResponse(
  draft: string,
  leadMessage: string,
  conversationHistory: any[],
  knowledgeBase: string,
  classSchedule: ClassSchedule[],
  apiKey: string,
  iteration: number
): Promise<EvaluationResult> {
  const extractedQuestions = extractQuestions(leadMessage);
  const extractedDetails = extractLeadDetails(leadMessage);
  
  // Build context for evaluation
  const historyContext = conversationHistory.slice(-6).map(m => 
    `${m.role.toUpperCase()}: ${m.content}`
  ).join('\n');
  
  const scheduleContext = formatClassSchedule(classSchedule);
  
  const evaluationPrompt = `You are a quality evaluator for customer service responses. Analyze this response critically.

LEAD MESSAGE: "${leadMessage}"

DRAFT RESPONSE: "${draft}"

CONVERSATION HISTORY:
${historyContext || 'None'}

EXTRACTED QUESTIONS FROM LEAD: ${JSON.stringify(extractedQuestions)}
EXTRACTED DETAILS FROM LEAD: ${JSON.stringify(extractedDetails)}

KNOWLEDGE BASE (for accuracy check):
${knowledgeBase.substring(0, 2000)}

CLASS SCHEDULE (for accuracy check):
${scheduleContext.substring(0, 1500)}

Evaluate the draft response against these 6 criteria. Be STRICT - if there's any doubt, mark as FAIL.

1. RELEVANCE: Does this response address what they ACTUALLY said? Would this same response work for any random message? If generic = FAIL.

2. QUESTION_ANSWERED: If the lead asked ANY question (even implied), did we answer it? Check the extracted questions list.

3. DETAIL_ECHO: If the lead mentioned specific times, days, constraints (e.g., "I work until 6pm"), does the response acknowledge this?

4. CONTEXT_AWARE: Looking at conversation history, does this response make sense? Are we asking something they already answered? Contradicting ourselves?

5. ACCURACY: Any times, prices, or facts mentioned - do they match the knowledge base and schedule? If we say "classes at 7pm" there better be a 7pm class.

6. CTA_APPROPRIATE: Is the call-to-action right for this stage? 
   - If they just asked a question, CTA should be answering it, not jumping to booking
   - If they confirmed "yes that works", CTA should confirm booking, not ask more questions
   - If they're new, invite trial; if scheduling, suggest specific time

Return JSON ONLY (no markdown):
{
  "relevance": {"pass": boolean, "reason": "brief explanation"},
  "questionAnswered": {"pass": boolean, "reason": "brief explanation", "questions": ["list of detected questions"]},
  "detailEcho": {"pass": boolean, "reason": "brief explanation", "details": ["list of details that should be acknowledged"]},
  "contextAware": {"pass": boolean, "reason": "brief explanation"},
  "accuracy": {"pass": boolean, "reason": "brief explanation"},
  "ctaAppropriate": {"pass": boolean, "reason": "brief explanation"}
}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://fightflowacademy.com',
        'X-Title': 'Fight Flow AI Evaluator'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // Fast model for evaluation
        messages: [
          { role: 'user', content: evaluationPrompt }
        ],
        max_tokens: 500,
        temperature: 0.1 // Low temp for consistent evaluation
      })
    });

    if (!response.ok) {
      console.error('Evaluation API error:', await response.text());
      // On error, pass through (fail-open)
      return createPassingEvaluation(iteration);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    // Parse JSON response
    let scores;
    try {
      // Clean potential markdown formatting
      const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
      scores = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse evaluation response:', content);
      return createPassingEvaluation(iteration);
    }

    // Compile failures
    const failures: string[] = [];
    if (!scores.relevance?.pass) failures.push(`RELEVANCE: ${scores.relevance?.reason || 'Generic response'}`);
    if (!scores.questionAnswered?.pass) failures.push(`QUESTION_ANSWERED: ${scores.questionAnswered?.reason || 'Missed question'}`);
    if (!scores.detailEcho?.pass) failures.push(`DETAIL_ECHO: ${scores.detailEcho?.reason || 'Missed details'}`);
    if (!scores.contextAware?.pass) failures.push(`CONTEXT_AWARE: ${scores.contextAware?.reason || 'Context issue'}`);
    if (!scores.accuracy?.pass) failures.push(`ACCURACY: ${scores.accuracy?.reason || 'Inaccurate info'}`);
    if (!scores.ctaAppropriate?.pass) failures.push(`CTA_APPROPRIATE: ${scores.ctaAppropriate?.reason || 'Wrong CTA'}`);

    return {
      allPass: failures.length === 0,
      failures,
      scores: {
        relevance: scores.relevance || { pass: true, reason: 'No evaluation' },
        questionAnswered: { 
          ...scores.questionAnswered || { pass: true, reason: 'No evaluation' },
          questions: extractedQuestions
        },
        detailEcho: {
          ...scores.detailEcho || { pass: true, reason: 'No evaluation' },
          details: extractedDetails
        },
        contextAware: scores.contextAware || { pass: true, reason: 'No evaluation' },
        accuracy: scores.accuracy || { pass: true, reason: 'No evaluation' },
        ctaAppropriate: scores.ctaAppropriate || { pass: true, reason: 'No evaluation' }
      },
      iteration
    };
  } catch (error) {
    console.error('Evaluation error:', error);
    return createPassingEvaluation(iteration);
  }
}

function createPassingEvaluation(iteration: number): EvaluationResult {
  return {
    allPass: true,
    failures: [],
    scores: {
      relevance: { pass: true, reason: 'Evaluation skipped' },
      questionAnswered: { pass: true, reason: 'Evaluation skipped', questions: [] },
      detailEcho: { pass: true, reason: 'Evaluation skipped', details: [] },
      contextAware: { pass: true, reason: 'Evaluation skipped' },
      accuracy: { pass: true, reason: 'Evaluation skipped' },
      ctaAppropriate: { pass: true, reason: 'Evaluation skipped' }
    },
    iteration
  };
}

/**
 * Rewrite the response based on specific failures
 */
async function rewriteWithDiagnosis(
  draft: string,
  failures: string[],
  leadMessage: string,
  conversationHistory: any[],
  knowledgeBase: string,
  classSchedule: ClassSchedule[],
  systemPrompt: string,
  apiKey: string,
  model: string
): Promise<string> {
  const historyContext = conversationHistory.slice(-6).map(m => 
    `${m.role.toUpperCase()}: ${m.content}`
  ).join('\n');
  
  const scheduleContext = formatClassSchedule(classSchedule);

  const rewritePrompt = `Your previous response FAILED quality checks. Fix these specific issues:

FAILURES:
${failures.map(f => `❌ ${f}`).join('\n')}

ORIGINAL LEAD MESSAGE: "${leadMessage}"

YOUR FAILED RESPONSE: "${draft}"

CONVERSATION HISTORY:
${historyContext}

KNOWLEDGE BASE:
${knowledgeBase.substring(0, 2000)}

CLASS SCHEDULE:
${scheduleContext.substring(0, 1500)}

Write a NEW response that:
1. Fixes each failure listed above
2. Directly addresses what the lead said
3. Acknowledges any specific details they mentioned
4. Answers any questions they asked
5. Uses accurate information from the knowledge base/schedule
6. Has an appropriate next step for this conversation stage

Respond ONLY with the new message. No explanations.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://fightflowacademy.com',
        'X-Title': 'Fight Flow AI Rewriter'
      },
      body: JSON.stringify({
        model: model, // Use main model for quality rewrite
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: rewritePrompt }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      console.error('Rewrite API error:', await response.text());
      return draft; // Return original on error
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || draft;
  } catch (error) {
    console.error('Rewrite error:', error);
    return draft;
  }
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

    // Check for polite rejection
    const isRejection = detectRejection(latestMessage);
    if (isRejection) {
      console.log('Rejection detected - customer declined');
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

    // Use pre-loaded knowledge base
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
    const hasFullPreferences = bookingState.classType && (bookingState.preferredDay !== null || bookingState.preferredTime);
    const recommendationContext = hasFullPreferences && suggestedClasses.length > 0
      ? `\n\nRECOMMENDED CLASSES (based on customer preferences):\n${suggestedClasses.slice(0, 3).map(cls =>
          `- ${cls.class_name} on ${getDayName(cls.day_of_week)} at ${formatTime(cls.start_time)}`
        ).join('\n')}\nONLY suggest from this list.`
      : '';

    const systemPrompt = `You are texting on behalf of Fight Flow Academy, a martial arts gym. You're having a real conversation with a real person — talk like a human, not a bot.

BUSINESS: ${businessContext || 'Fight Flow Academy'}
${contactName ? `CUSTOMER NAME: ${contactName}` : ''}
${knowledgeContext}
${scheduleContext}
${recommendationContext}

=== THE #1 RULE: ACTUALLY LISTEN ===
Read what they said. Respond to THAT. Not to what you wish they said.

If they tell you something about their situation, acknowledge it genuinely BEFORE moving on.
If they ask a question, answer it directly. Don't deflect into a sales pitch.
If they share a concern, address it — don't ignore it.

=== BE A HUMAN, NOT A BOT ===
❌ DON'T: Immediately pivot every response back to booking a class
❌ DON'T: Use phrases like "That's great!" or "Awesome!" robotically
❌ DON'T: Ask rapid-fire questions without acknowledging their answers
❌ DON'T: Sound like a telemarketer reading a script

✅ DO: Respond naturally to what they actually said
✅ DO: Let the conversation breathe — not every message needs a call-to-action
✅ DO: Be helpful first, sales second
✅ DO: Match their energy and tone

=== WHEN YOU CAN'T HELP ===
If they have a question you can't answer, a concern you can't address, or a request that's beyond what you can do:
Say: "I'll let Scott know and he'll be in touch!"
Then STOP. Don't keep pushing. Flag the conversation for human follow-up.

=== WHEN THEY SAY NO ===
${isRejection ? '⚠️ THEY JUST DECLINED. Respect it. One short, graceful response. No follow-up questions. No "what\'s keeping you busy?" Just: "No problem! Feel free to reach out if anything changes. Take care!"' : ''}

If someone says "I'm good", "not interested", "already signed up elsewhere", or any variation of NO:
- Accept it gracefully in ONE sentence
- Do NOT try to change their mind
- Do NOT ask follow-up questions
- Do NOT make small talk

=== IF THEY WANT TO BOOK ===
Only if they express genuine interest in trying a class:
1. Ask what type of training interests them (if not clear)
2. Ask what days/times work (if not clear)
3. Suggest a SPECIFIC class from the schedule below
4. Confirm the booking

SCHEDULE ACCURACY: Only mention times from this schedule:
${scheduleContext || 'No schedule loaded'}

=== RESPONSE FORMAT ===
- Keep it short for SMS (under ${agentConfig?.max_response_length || 280} chars)
- Sound like a friendly human texting, not a corporate bot
- Use their name naturally (not robotically at the start of every message)
- One thought at a time — don't overwhelm them

RESPOND ONLY with the message to send. No prefixes or explanations.`;

    // Determine model to use
    const model = agentConfig?.model || 'openai/gpt-4o-mini';
    const temperature = agentConfig?.temperature || 0.7;

    console.log('Using model:', model, 'temperature:', temperature);

    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY not configured');
      throw new Error('AI service not configured');
    }

    // ============================================
    // SELF-IMPROVEMENT LOOP (NEW)
    // ============================================
    
    const evaluationEnabled = agentConfig?.evaluation_enabled ?? true; // Default ON
    const maxIterations = 3;
    let aiMessage = '';
    let evaluationResults: EvaluationResult[] = [];
    let finalIteration = 0;

    // Generate initial response
    const initialResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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

    if (!initialResponse.ok) {
      const errorText = await initialResponse.text();
      console.error('OpenRouter API error:', errorText);
      throw new Error(`OpenRouter API error: ${initialResponse.status}`);
    }

    const initialData = await initialResponse.json();
    aiMessage = initialData.choices[0]?.message?.content ||
      (agentConfig?.fallback_message || 'Sorry, I had trouble understanding. Can you please rephrase?');

    console.log('Initial AI Response:', aiMessage);

    // Run evaluation loop if enabled
    if (evaluationEnabled && !isRejection && !escalation.shouldEscalate) {
      for (let iteration = 1; iteration <= maxIterations; iteration++) {
        console.log(`Evaluation iteration ${iteration}...`);
        
        const evaluation = await evaluateResponse(
          aiMessage,
          latestMessage,
          messages,
          knowledgeBase || '',
          classSchedule || [],
          apiKey,
          iteration
        );
        
        evaluationResults.push(evaluation);
        finalIteration = iteration;

        if (evaluation.allPass) {
          console.log(`Evaluation PASSED on iteration ${iteration}`);
          break;
        }

        console.log(`Evaluation FAILED on iteration ${iteration}:`, evaluation.failures);

        if (iteration < maxIterations) {
          // Rewrite with diagnosis
          aiMessage = await rewriteWithDiagnosis(
            aiMessage,
            evaluation.failures,
            latestMessage,
            messages,
            knowledgeBase || '',
            classSchedule || [],
            systemPrompt,
            apiKey,
            model
          );
          console.log(`Rewritten response (iteration ${iteration}):`, aiMessage);
        } else {
          console.log('Max iterations reached, using last response');
        }
      }
    }

    console.log('Final AI Response:', aiMessage);

    // Detect if AI is escalating to human
    const aiMessageLower = aiMessage.toLowerCase();
    const needsHumanFollowup = NEEDS_HUMAN_PATTERNS.some(pattern => 
      aiMessageLower.includes(pattern)
    );
    if (needsHumanFollowup) {
      console.log('AI flagged for human follow-up - Scott needs to reach out');
    }

    // Detect booking confirmation
    const bookingIndicators = [
      'booked', 'confirmed', 'scheduled', 'see you', 'you\'re all set',
      'got you down', 'reserved', 'looking forward', 'you\'re set'
    ];
    const aiConfirmedBooking = bookingIndicators.some(indicator =>
      aiMessage.toLowerCase().includes(indicator)
    );

    // Extract class details if booking
    let classDetails = undefined;
    let shouldBook = false;

    if (bookingState.awaitingConfirmation && bookingState.suggestedClass) {
      shouldBook = true;
      classDetails = {
        className: bookingState.suggestedClass.class_name,
        day: getDayName(bookingState.suggestedClass.day_of_week),
        dayOfWeek: bookingState.suggestedClass.day_of_week,
        time: formatTime(bookingState.suggestedClass.start_time),
        instructor: bookingState.suggestedClass.instructor,
        classScheduleId: bookingState.suggestedClass.id
      };
      console.log('Booking confirmed via customer confirmation:', classDetails);
    } else if (aiConfirmedBooking && classSchedule && classSchedule.length > 0) {
      const aiMsgLower = aiMessage.toLowerCase();

      for (const cls of classSchedule) {
        const classNameLower = cls.class_name.toLowerCase();
        const dayName = getDayName(cls.day_of_week).toLowerCase();

        if (aiMsgLower.includes(classNameLower) ||
            (aiMsgLower.includes(classNameLower.split(' ')[0]) && aiMsgLower.includes(dayName))) {
          shouldBook = true;
          classDetails = {
            className: cls.class_name,
            day: getDayName(cls.day_of_week),
            dayOfWeek: cls.day_of_week,
            time: formatTime(cls.start_time),
            instructor: cls.instructor,
            classScheduleId: cls.id
          };
          console.log('Booking detected from AI confirmation:', classDetails);
          break;
        }
      }

      if (!classDetails && suggestedClasses.length > 0) {
        const firstMatch = suggestedClasses[0];
        shouldBook = true;
        classDetails = {
          className: firstMatch.class_name,
          day: getDayName(firstMatch.day_of_week),
          dayOfWeek: firstMatch.day_of_week,
          time: formatTime(firstMatch.start_time),
          instructor: firstMatch.instructor,
          classScheduleId: firstMatch.id
        };
        console.log('Booking using first matching class:', classDetails);
      }
    }

    // Update conversation state
    if (threadId && businessId) {
      const newState = isRejection ? 'closed_not_interested' :
        (shouldBook ? 'class_scheduled' :
        (detectedIntents.includes('BOOK_TRIAL') ? 'collecting_booking_info' : 'answering_questions'));

      try {
        const updateData: any = {
          conversation_state: newState,
          last_bot_message_at: new Date().toISOString()
        };

        if (escalation.shouldEscalate || needsHumanFollowup) {
          updateData.needs_human_review = true;
          updateData.conversation_state = 'needs_human_review';
          updateData.state_data = {
            escalation_reason: needsHumanFollowup ? 'AI_ESCALATED' : escalation.reason,
            escalation_time: new Date().toISOString(),
            escalation_message: needsHumanFollowup 
              ? `AI response: ${aiMessage.substring(0, 200)}`
              : latestMessage.substring(0, 200)
          };
        }

        await supabase
          .from('conversation_threads')
          .update(updateData)
          .eq('id', threadId);

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
      }
    }

    // Log evaluation results to automation_logs (for monitoring)
    if (evaluationEnabled && evaluationResults.length > 0 && businessId) {
      try {
        await supabase
          .from('automation_logs')
          .insert({
            business_id: businessId,
            automation_type: 'response_evaluation',
            status: evaluationResults[evaluationResults.length - 1].allPass ? 'passed' : 'failed',
            processed_data: {
              thread_id: threadId,
              lead_message: latestMessage.substring(0, 200),
              final_response: aiMessage.substring(0, 200),
              iterations: finalIteration,
              evaluation_history: evaluationResults.map(e => ({
                iteration: e.iteration,
                allPass: e.allPass,
                failures: e.failures
              }))
            }
          });
      } catch (logError) {
        console.error('Error logging evaluation results:', logError);
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
      } : null,
      rejection: isRejection ? {
        detected: true,
        shouldStopSequence: true
      } : null,
      needsHumanFollowup: needsHumanFollowup ? {
        flagged: true,
        reason: 'AI escalated to Scott'
      } : null,
      // New: evaluation metadata
      evaluation: evaluationEnabled ? {
        enabled: true,
        iterations: finalIteration,
        finalPass: evaluationResults.length > 0 ? evaluationResults[evaluationResults.length - 1].allPass : true,
        history: evaluationResults.map(e => ({
          iteration: e.iteration,
          pass: e.allPass,
          failures: e.failures
        }))
      } : { enabled: false }
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
