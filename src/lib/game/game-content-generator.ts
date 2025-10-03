import { getAgentConfig } from './configs/business-agents';

interface ContentGenerationRequest {
  businessId: string;
  platform: string;
  contentType: string;
  topic?: string;
  keywords?: string[];
  tone?: string;
}

interface ContentGenerationResponse {
  content: string;
  hashtags?: string[];
  callToAction?: string;
  success: boolean;
  error?: string;
}

export async function generateBusinessContent(
  request: ContentGenerationRequest
): Promise<ContentGenerationResponse> {
  try {
    // Get business-specific agent configuration
    const agentConfig = getAgentConfig(request.businessId);
    
    if (!agentConfig) {
      return {
        content: '',
        success: false,
        error: `No agent configuration found for business: ${request.businessId}`
      };
    }

    // Build the content generation prompt based on business config and request
    const prompt = buildContentPrompt(request, agentConfig);

    // Call GAME SDK API
    const gameApiKey = import.meta.env.VITE_GAME_API_KEY;
    
    if (!gameApiKey) {
      return {
        content: '',
        success: false,
        error: 'GAME_API_KEY not configured'
      };
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
      throw new Error(`GAME API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Parse and structure the response
    return {
      content: data.content || data.text || '',
      hashtags: extractHashtags(data.content, agentConfig),
      callToAction: selectCallToAction(agentConfig),
      success: true
    };

  } catch (error) {
    console.error('Content generation error:', error);
    return {
      content: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

function buildContentPrompt(
  request: ContentGenerationRequest,
  agentConfig: any
): string {
  const { platform, contentType, topic, keywords, tone } = request;
  
  let prompt = `Generate ${contentType} content for ${platform}.\n\n`;
  
  if (topic) {
    prompt += `Topic: ${topic}\n`;
  }
  
  if (keywords && keywords.length > 0) {
    prompt += `Keywords to include: ${keywords.join(', ')}\n`;
  }
  
  if (tone) {
    prompt += `Desired tone: ${tone}\n`;
  }
  
  prompt += `\nBrand voice: ${agentConfig.brandVoice}\n`;
  prompt += `Target audience: ${agentConfig.targetAudience.join(', ')}\n`;
  prompt += `\nContent requirements:\n`;
  prompt += `- Max length: ${agentConfig.contentGuidelines.maxLength[platform] || 280} characters\n`;
  prompt += `- Include ${agentConfig.contentGuidelines.hashtags.max} relevant hashtags from: ${agentConfig.contentGuidelines.hashtags.preferred.join(', ')}\n`;
  prompt += `- Avoid: ${agentConfig.personality.avoid.join(', ')}\n`;
  prompt += `\nGenerate engaging, on-brand content that resonates with our audience.`;
  
  return prompt;
}

function getMaxTokensForPlatform(platform: string): number {
  const tokenLimits: Record<string, number> = {
    twitter: 150,
    instagram: 500,
    linkedin: 600,
    tiktok: 300,
    discord: 400,
    telegram: 400
  };
  
  return tokenLimits[platform] || 200;
}

function extractHashtags(content: string, agentConfig: any): string[] {
  // Extract hashtags from generated content
  const hashtagRegex = /#\w+/g;
  const matches = content.match(hashtagRegex) || [];
  
  // Limit to max allowed
  const max = agentConfig.contentGuidelines.hashtags.max;
  return matches.slice(0, max);
}

function selectCallToAction(agentConfig: any): string {
  // Randomly select one CTA from the business config
  const ctas = agentConfig.contentGuidelines.callToAction;
  return ctas[Math.floor(Math.random() * ctas.length)];
}
