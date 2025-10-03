import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContentRequest {
  businessId: string;
  platform: string;
  contentType?: string; // Keep for backwards compatibility
  lengthPreset?: 'short' | 'medium' | 'long' | 'thread';
  quantity?: number;
  topic?: string;
  keywords?: string[];
  tone?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const request: ContentRequest = await req.json();
    
    // Validate required fields
    if (!request.businessId || !request.platform) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: businessId, platform' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get business configuration
    const { data: business, error: businessError } = await supabaseClient
      .from('businesses')
      .select('*')
      .eq('slug', request.businessId)
      .single();

    if (businessError || !business) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Business not found: ${request.businessId}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Get agent configuration
    const agentConfig = getAgentConfig(request.businessId);
    
    if (!agentConfig) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `No agent configuration found for business: ${request.businessId}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Build length-specific prompt
    const lengthConstraints = {
      short: { min: 80, max: 120, description: 'concise and punchy' },
      medium: { min: 140, max: 200, description: 'standard length' },
      long: { min: 220, max: 280, description: 'near character limit' },
      thread: { min: 150, max: 280, description: 'thread-appropriate' }
    };

    const lengthPreset = request.lengthPreset || 'medium';
    const quantity = request.quantity || 1;
    const constraint = lengthConstraints[lengthPreset] || lengthConstraints.medium;

    // Build the generation prompt
    let generationPrompt = '';

    if (lengthPreset === 'thread') {
      generationPrompt = `Generate a cohesive Twitter thread with exactly ${quantity} tweets.

Requirements:
- Each tweet must be ${constraint.min}-${constraint.max} characters
- Number each tweet as "1/${quantity}", "2/${quantity}", etc.
- Thread should tell a complete story or make a complete argument
- Each tweet should work standalone but flow together
- Include appropriate hashtags in the final tweet only
- Topic: ${request.topic || 'engaging content for our audience'}

Format: Return ONLY the tweets, one per line, numbered. No preamble, no explanations.

Example format:
1/${quantity} [First tweet content]
2/${quantity} [Second tweet content]
...`;
    } else {
      generationPrompt = `Generate exactly ${quantity} distinct tweets.

Requirements:
- Each tweet: ${constraint.min}-${constraint.max} characters (${constraint.description})
- Each tweet must be complete and standalone
- Include relevant hashtags (max ${agentConfig.contentGuidelines.hashtags.max})
- Topic: ${request.topic || 'engaging content for our audience'}
- Vary the approach (tips, questions, stories, insights)

Format: Return ONLY the tweets, one per line, numbered. No preamble, no explanations.

Example format:
1. [First tweet content]
2. [Second tweet content]
...`;
    }

    // Call OpenAI API
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OPENAI_API_KEY not configured' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: agentConfig.systemPrompt },
          { role: 'user', content: generationPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `OpenAI API error: ${response.status} - ${errorText}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    
    // Parse the numbered tweets
    const tweetLines = rawContent.split('\n').filter(line => line.trim());
    const tweets: string[] = [];

    for (const line of tweetLines) {
      // Remove numbering patterns like "1.", "1/5", "Tweet 1:", etc.
      const cleaned = line
        .replace(/^\d+[\.)]\s*/, '')           // Remove "1. " or "1) "
        .replace(/^\d+\/\d+\s*/, '')           // Remove "1/5 "
        .replace(/^Tweet\s+\d+:\s*/i, '')      // Remove "Tweet 1: "
        .trim();
      
      if (cleaned && cleaned.length > 0) {
        tweets.push(cleaned);
      }
    }

    // Validate we got tweets
    if (tweets.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to parse generated tweets' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Structure the response
    const result = {
      tweets: tweets.slice(0, quantity), // Ensure we only return requested quantity
      success: true,
      businessName: business.name,
      platform: request.platform,
      lengthPreset: lengthPreset,
      quantity: tweets.length
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Content generation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper functions
function getAgentConfig(businessId: string) {
  // Import agent configurations inline for now
  const configs: Record<string, any> = {
    'fight-flow-academy': {
      businessId: 'fight-flow-academy',
      systemPrompt: 'You are the content creation agent for Fight Flow Academy...',
      contentGuidelines: {
        maxLength: { twitter: 280, instagram: 2200, linkedin: 3000 },
        hashtags: { preferred: ['#MartialArts', '#Boxing'], max: 5 },
        callToAction: ['Book your free trial class today!', 'Join our community of fighters.']
      },
      brandVoice: 'Empowering and motivational',
      targetAudience: ['fitness enthusiasts', 'beginners curious about martial arts'],
      personality: { avoid: ['aggressive language'] }
    }
    // Add other configs as needed
  };
  
  return configs[businessId] || null;
}

function buildContentPrompt(request: ContentRequest, agentConfig: any): string {
  const { platform, contentType, topic, keywords, tone } = request;
  
  let prompt = `Generate ${contentType} content for ${platform}.\n\n`;
  
  if (topic) prompt += `Topic: ${topic}\n`;
  if (keywords && keywords.length > 0) prompt += `Keywords: ${keywords.join(', ')}\n`;
  if (tone) prompt += `Tone: ${tone}\n`;
  
  prompt += `\nBrand voice: ${agentConfig.brandVoice}\n`;
  prompt += `Target audience: ${agentConfig.targetAudience.join(', ')}\n`;
  prompt += `\nMax length: ${agentConfig.contentGuidelines.maxLength[platform] || 280} characters\n`;
  prompt += `Include ${agentConfig.contentGuidelines.hashtags.max} hashtags\n`;
  
  return prompt;
}

function getMaxTokensForPlatform(platform: string): number {
  const limits: Record<string, number> = {
    twitter: 150, instagram: 500, linkedin: 600,
    tiktok: 300, discord: 400, telegram: 400
  };
  return limits[platform] || 200;
}

function extractHashtags(content: string, agentConfig: any): string[] {
  const matches = content.match(/#\w+/g) || [];
  return matches.slice(0, agentConfig.contentGuidelines.hashtags.max);
}

function selectCallToAction(agentConfig: any): string {
  const ctas = agentConfig.contentGuidelines.callToAction;
  return ctas[Math.floor(Math.random() * ctas.length)];
}
