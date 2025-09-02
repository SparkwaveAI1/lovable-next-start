import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, businessContext, classSchedule } = await req.json();

    const systemPrompt = `You are an AI assistant for ${businessContext}. 
    You help customers book martial arts classes via SMS. 
    
    Available classes: ${JSON.stringify(classSchedule, null, 2)}
    
    Your job:
    1. Be friendly and helpful
    2. When someone wants to book a class, extract their preferences 
    3. Suggest specific classes that match their needs
    4. Confirm booking details before committing
    5. Keep responses short (under 160 characters for SMS)
    
    If you detect a clear booking intent with specific class details, respond with booking confirmation.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    const data = await openaiResponse.json();
    const aiMessage = data.choices[0]?.message?.content || 'Sorry, I had trouble understanding. Can you please rephrase?';

    const shouldBook = aiMessage.toLowerCase().includes('booked') || 
                      aiMessage.toLowerCase().includes('confirmed');

    return new Response(JSON.stringify({
      message: aiMessage,
      shouldBook,
      classDetails: shouldBook ? {
        className: 'Beginner Jiu Jitsu',
        day: 'Monday', 
        time: '6:00 PM'
      } : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI response error:', error);
    return new Response(JSON.stringify({
      message: 'Sorry, I had a technical issue. Please try again or call us directly.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});