import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { business, contentType, topic, quantity, systemPrompt } = await req.json()

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found')
    }

    console.log(`Generating ${quantity} tweets for ${business} about: ${topic}`)

    // Create the prompt for generating multiple tweets
    const userPrompt = `Generate exactly ${quantity} tweets about "${topic}".

IMPORTANT: Return ONLY a clean JSON array of strings with no markdown formatting, no line numbers, no code blocks.

Format requirements:
- Return as: ["tweet 1", "tweet 2", "tweet 3"]
- Each tweet must be under 280 characters
- Include relevant hashtags for ${business}
- Make each tweet unique and engaging
- ${contentType.includes('thread') ? 'Structure as a cohesive thread with numbered tweets' : 'Each tweet should be standalone'}
- NO markdown formatting (no \`\`\`json)
- NO line numbers
- Just the pure JSON array

Topic: ${topic}`

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('OpenAI API error:', data)
      throw new Error(data.error?.message || 'OpenAI API error')
    }

    const content = data.choices[0]?.message?.content || '[]'
    console.log('Raw OpenAI content:', content)

    // Clean up the content first
    let cleanedContent = content
      // Remove markdown code blocks
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      // Remove line numbers (like "1 ", "2 ", etc.)
      .replace(/^\d+\s+/gm, '')
      // Remove leading/trailing whitespace
      .trim()

    console.log('Cleaned content:', cleanedContent)

    // Try to parse as JSON array, fallback to splitting if needed
    let tweets
    try {
      tweets = JSON.parse(cleanedContent)
      if (!Array.isArray(tweets)) {
        throw new Error('Not an array')
      }
    } catch (parseError) {
      console.log('JSON parse failed, trying fallback parsing:', parseError)
      
      // Fallback: extract content between [ and ] first
      const arrayMatch = cleanedContent.match(/\[(.*)\]/s)
      if (arrayMatch) {
        cleanedContent = '[' + arrayMatch[1] + ']'
        try {
          tweets = JSON.parse(cleanedContent)
        } catch {
          // Final fallback: split by lines and clean up
          tweets = cleanedContent
            .split('\n')
            .filter((line: string) => line.trim().length > 0)
            .map((line: string) => {
              // Remove quotes, commas, brackets, and line numbers
              return line
                .replace(/^\d+\s*/, '') // Remove line numbers
                .replace(/^["'\[\],-\s]+|["'\[\],-\s]+$/g, '') // Remove quotes, brackets, commas
                .trim()
            })
            .filter((tweet: string) => tweet.length > 20) // Only keep substantial tweets
            .slice(0, quantity)
        }
      } else {
        // Last resort: split by lines
        tweets = cleanedContent
          .split('\n')
          .filter((line: string) => line.trim().length > 20)
          .slice(0, quantity)
      }
    }

    // Clean up individual tweets to remove any remaining quotes
    tweets = tweets.map((tweet: any) => {
      if (typeof tweet === 'string') {
        return tweet
          .replace(/^["']+|["']+$/g, '') // Remove surrounding quotes
          .replace(/^,\s*|,\s*$/g, '') // Remove leading/trailing commas
          .trim()
      }
      return tweet
    })

    console.log('Final parsed tweets:', tweets)

    // Ensure we have the requested number of tweets
    if (tweets.length < quantity) {
      const needed = quantity - tweets.length
      for (let i = 0; i < needed; i++) {
        tweets.push(`Additional tweet about ${topic} for ${business}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        tweets: tweets.slice(0, quantity),
        business: business,
        contentType: contentType,
        topic: topic
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in generate-business-content:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})