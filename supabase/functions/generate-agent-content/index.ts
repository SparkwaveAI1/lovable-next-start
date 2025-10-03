import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContentRequest {
  businessId: string;
  platform: string;
  contentType: string;
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
    if (!request.businessId || !request.platform || !request.contentType) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: businessId, platform, contentType' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get business configuration
    const { data: business, error: businessError } = await supabaseClient
      .from('businesses')
      .select('*')
      .eq('id', request.businessId)
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

    // Build the prompt
    const prompt = buildContentPrompt(request, agentConfig);

    // Call GAME API
    const gameApiKey = Deno.env.get('GAME_API_KEY');
    
    if (!gameApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'GAME_API_KEY not configured' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const response = await fetch('https://api.game.io/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gameApiKey}`
      },
      body: JSON.stringify({
        agentId: agentConfig.businessId,
        systemPrompt: agentConfig.systemPrompt,
        prompt: prompt,
        maxTokens: getMaxTokensForPlatform(request.platform),
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `GAME API error: ${response.status} - ${errorText}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const data = await response.json();
    
    // Structure the response
    const result = {
      content: data.content || data.text || '',
      hashtags: extractHashtags(data.content || '', agentConfig),
      callToAction: selectCallToAction(agentConfig),
      success: true,
      businessName: business.name,
      platform: request.platform
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
