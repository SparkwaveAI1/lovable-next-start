interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  message: string;
  shouldBook?: boolean;
  classDetails?: {
    className: string;
    day: string;
    time: string;
  };
}

export async function generateAIResponse(
  messages: ConversationMessage[],
  businessContext: string,
  classSchedule: any[]
): Promise<AIResponse> {
  try {
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
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

    const data = await response.json();
    const aiMessage = data.choices[0]?.message?.content || 'Sorry, I had trouble understanding. Can you please rephrase?';

    // Simple booking detection (you can make this more sophisticated)
    const shouldBook = aiMessage.toLowerCase().includes('booked') || 
                      aiMessage.toLowerCase().includes('confirmed');

    return {
      message: aiMessage,
      shouldBook,
      classDetails: shouldBook ? extractClassDetails(aiMessage) : undefined
    };

  } catch (error) {
    console.error('AI service error:', error);
    return {
      message: 'Sorry, I had a technical issue. Please try again or call us directly.'
    };
  }
}

function extractClassDetails(message: string) {
  // Simple extraction - you can enhance this
  return {
    className: 'Beginner Jiu Jitsu',
    day: 'Monday',
    time: '6:00 PM'
  };
}