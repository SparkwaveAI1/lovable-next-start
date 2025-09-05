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

Format requirements:
- Return as a JSON array of strings
- Each tweet must be under 280 characters
- Include relevant hashtags for ${business}
- Make each tweet unique and engaging
- ${contentType.includes('thread') ? 'Structure as a cohesive thread with numbered tweets' : 'Each tweet should be standalone'}

Topic: ${topic}

Return format: ["tweet 1", "tweet 2", "tweet 3"]`

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
    console.log('Generated content:', content)

    // Try to parse as JSON array, fallback to splitting if needed
    let tweets
    try {
      tweets = JSON.parse(content)
      if (!Array.isArray(tweets)) {
        throw new Error('Not an array')
      }
    } catch {
      // Fallback: split by lines and clean up
      tweets = content
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^\d+\.\s*/, '').replace(/^["']|["']$/g, '').trim())
        .filter(tweet => tweet.length > 0)
        .slice(0, quantity)
    }

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

  } catch (error) {
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