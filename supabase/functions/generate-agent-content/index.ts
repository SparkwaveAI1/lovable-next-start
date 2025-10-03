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
  contentType: string;
  quantity?: number;
  topic?: string;
  keywords?: string[];
  tone?: string;
}

// Platform-specific prompt builders
function buildTwitterPrompt(contentType: string, quantity: number, topic: string, agentConfig: any): string {
  const lengthConstraints: Record<string, any> = {
    short: { min: 80, max: 120, description: 'concise and punchy' },
    medium: { min: 140, max: 200, description: 'standard length' },
    long: { min: 220, max: 280, description: 'near character limit' },
    thread: { min: 150, max: 280, description: 'thread-appropriate' }
  };

  const constraint = lengthConstraints[contentType] || lengthConstraints.medium;

  if (contentType === 'thread') {
    return `Generate a cohesive Twitter thread with exactly ${quantity} tweets.

Requirements:
- Each tweet must be ${constraint.min}-${constraint.max} characters
- Number each tweet as "1/${quantity}", "2/${quantity}", etc.
- Thread should tell a complete story or make a complete argument
- Each tweet should work standalone but flow together
- Include appropriate hashtags in the final tweet only
- Topic: ${topic}

Format: Return ONLY the tweets, one per line, numbered. No preamble, no explanations.

Example format:
1/${quantity} [First tweet content]
2/${quantity} [Second tweet content]
...`;
  }

  return `Generate exactly ${quantity} distinct tweets.

Requirements:
- Each tweet: ${constraint.min}-${constraint.max} characters (${constraint.description})
- Each tweet must be complete and standalone
- Include relevant hashtags (max ${agentConfig.contentGuidelines.hashtags.max})
- Topic: ${topic}
- Vary the approach (tips, questions, stories, insights)

Format: Return ONLY the tweets, one per line, numbered. No preamble, no explanations.

Example format:
1. [First tweet content]
2. [Second tweet content]
...`;
}

function buildInstagramPrompt(contentType: string, quantity: number, topic: string, agentConfig: any): string {
  const hashtags = agentConfig.contentGuidelines.hashtags.preferred.slice(0, 15).join(' ');
  
  if (contentType === 'caption') {
    return `Generate ${quantity} Instagram post captions.

Requirements:
- Engaging opening hook
- 150-300 characters of value/story
- Call-to-action
- Include 10-15 relevant hashtags: ${hashtags}
- Conversational and authentic tone
- Topic: ${topic}

Format: Number each caption 1-${quantity}`;
  }
  
  if (contentType === 'story') {
    return `Generate ${quantity} Instagram Story text overlays.

Requirements:
- 5-10 words max per story
- Attention-grabbing
- Include emoji where appropriate
- Clear, bold message
- Topic: ${topic}

Format: Number each 1-${quantity}`;
  }
  
  if (contentType === 'reel') {
    return `Generate ${quantity} Instagram Reel captions.

Requirements:
- Hook in first line (stop the scroll)
- Brief description (2-3 lines)
- Strong CTA
- 5-8 hashtags: ${hashtags}
- Topic: ${topic}

Format: Number each 1-${quantity}`;
  }
  
  // carousel
  return `Generate ${quantity} Instagram carousel posts.

Requirements:
- Engaging intro caption
- 5-7 slide titles/points
- Summary/CTA at end
- Hashtags: ${hashtags}
- Topic: ${topic}

Format: Number each 1-${quantity}, show slide structure`;
}

function buildTikTokPrompt(contentType: string, quantity: number, topic: string, agentConfig: any): string {
  if (contentType === 'script') {
    return `Generate ${quantity} TikTok video scripts.

Requirements:
- Hook (first 3 seconds to stop scroll)
- Main content (problem → solution or story)
- Call-to-action
- 30-60 seconds of spoken content
- Conversational, energetic tone
- Topic: ${topic}

Format: Number each script 1-${quantity}`;
  }
  
  if (contentType === 'hooks') {
    return `Generate ${quantity} scroll-stopping TikTok hooks.

Requirements:
- 5-10 words
- Create curiosity or pattern interrupt
- Topic: ${topic}

Examples:
"Nobody talks about this..."
"Here's what they don't tell you about..."
"Stop doing X, do this instead..."

Format: Number each 1-${quantity}`;
  }
  
  // caption
  return `Generate ${quantity} TikTok captions.

Requirements:
- Catchy first line
- 2-3 lines max
- 3-5 hashtags
- Topic: ${topic}

Format: Number each 1-${quantity}`;
}

function buildLinkedInPrompt(contentType: string, quantity: number, topic: string, agentConfig: any): string {
  if (contentType === 'article') {
    return `Generate ${quantity} LinkedIn article(s).

Requirements:
- Professional thought leadership
- 1000-1500 words
- Clear structure: intro, 3-5 main points, conclusion
- Data/insights where relevant
- Professional but conversational
- Topic: ${topic}

Format: Full article with headers`;
  }
  
  if (contentType === 'long') {
    return `Generate ${quantity} long-form LinkedIn post(s).

Requirements:
- 500-800 words
- Personal story or professional insight
- Hook in first 2 lines
- Paragraph breaks for readability
- Thought-provoking question or CTA at end
- Topic: ${topic}

Format: Number each 1-${quantity}`;
  }
  
  // standard post
  return `Generate ${quantity} LinkedIn post(s).

Requirements:
- Professional tone
- 150-300 words
- Value-driven content
- Personal insight or lesson
- Conversational and authentic
- Topic: ${topic}

Format: Number each 1-${quantity}`;
}

function buildFacebookPrompt(contentType: string, quantity: number, topic: string, agentConfig: any): string {
  return `Generate ${quantity} Facebook ${contentType}(s).

Requirements:
- Community-focused and conversational
- 100-200 words
- Encourage engagement (ask questions)
- Friendly, warm tone
- Topic: ${topic}

Format: Number each 1-${quantity}`;
}

function buildRedditPrompt(contentType: string, quantity: number, topic: string, agentConfig: any): string {
  if (contentType === 'post') {
    return `Generate ${quantity} Reddit post(s).

Requirements:
- Authentic, helpful tone (no marketing speak)
- Title: attention-grabbing but honest
- Body: 200-400 words, genuine value
- Topic: ${topic}

Format:
Title: [title]
Body: [content]

Number each 1-${quantity}`;
  }
  
  return `Generate ${quantity} Reddit comment(s).

Requirements:
- Helpful, authentic
- Add value to discussion
- 50-150 words
- Topic: ${topic}

Format: Number each 1-${quantity}`;
}

function buildNextdoorPrompt(contentType: string, quantity: number, topic: string, agentConfig: any): string {
  return `Generate ${quantity} Nextdoor ${contentType}(s).

Requirements:
- Local, community-focused
- Friendly neighbor tone
- Helpful and genuine
- 100-200 words
- Topic: ${topic}

Format: Number each 1-${quantity}`;
}

function buildEmailPrompt(contentType: string, quantity: number, topic: string, agentConfig: any): string {
  const cta = agentConfig.contentGuidelines.callToAction[0];
  
  if (contentType === 'newsletter') {
    return `Generate ${quantity} email newsletter(s).

Requirements:
- Engaging subject line
- Personal greeting
- 300-500 words of value
- 2-3 main sections
- Clear CTA: ${cta}
- Topic: ${topic}

Format:
Subject: [subject]
Body: [content]

Number each 1-${quantity}`;
  }
  
  if (contentType === 'promotional') {
    return `Generate ${quantity} promotional email(s).

Requirements:
- Compelling subject line
- Problem → Solution structure
- Benefits-focused
- Multiple CTAs: ${cta}
- 200-300 words
- Topic: ${topic}

Format:
Subject: [subject]
Body: [content]

Number each 1-${quantity}`;
  }
  
  return `Generate ${quantity} ${contentType} email(s).

Requirements:
- Clear subject line
- Warm, personal tone
- 150-250 words
- Single clear CTA: ${cta}
- Topic: ${topic}

Format:
Subject: [subject]
Body: [content]

Number each 1-${quantity}`;
}

function buildBlogPrompt(contentType: string, quantity: number, topic: string, agentConfig: any): string {
  const wordCounts: Record<string, string> = {
    short: '500-800',
    medium: '1000-1500',
    long: '2000+',
    listicle: '800-1200',
    howto: '1000-1500'
  };
  
  const words = wordCounts[contentType] || '1000';
  
  if (contentType === 'listicle') {
    return `Generate ${quantity} listicle blog post(s).

Requirements:
- Catchy title with number
- Brief intro (100 words)
- 5-10 list items, each 100-150 words
- Conclusion with CTA
- SEO-friendly
- Total: ${words} words
- Topic: ${topic}

Format: Full article with title, intro, numbered list, conclusion`;
  }
  
  if (contentType === 'howto') {
    return `Generate ${quantity} how-to guide(s).

Requirements:
- Clear, actionable title
- Introduction: what and why
- Step-by-step instructions
- Tips and common mistakes
- Conclusion
- Total: ${words} words
- Topic: ${topic}

Format: Full guide with title, intro, steps, conclusion`;
  }
  
  return `Generate ${quantity} blog article(s).

Requirements:
- SEO-optimized title
- Engaging introduction
- 3-5 main sections with headers
- Conclusion with CTA
- ${words} words
- Professional but conversational
- Topic: ${topic}

Format: Full article with title and headers`;
}

function buildPlatformPrompt(
  platform: string,
  contentType: string,
  quantity: number,
  topic: string,
  agentConfig: any
): string {
  switch (platform) {
    case 'twitter':
      return buildTwitterPrompt(contentType, quantity, topic, agentConfig);
    
    case 'instagram':
      return buildInstagramPrompt(contentType, quantity, topic, agentConfig);
    
    case 'tiktok':
      return buildTikTokPrompt(contentType, quantity, topic, agentConfig);
    
    case 'linkedin':
      return buildLinkedInPrompt(contentType, quantity, topic, agentConfig);
    
    case 'facebook':
      return buildFacebookPrompt(contentType, quantity, topic, agentConfig);
    
    case 'reddit':
      return buildRedditPrompt(contentType, quantity, topic, agentConfig);
    
    case 'nextdoor':
      return buildNextdoorPrompt(contentType, quantity, topic, agentConfig);
    
    case 'email':
      return buildEmailPrompt(contentType, quantity, topic, agentConfig);
    
    case 'blog':
      return buildBlogPrompt(contentType, quantity, topic, agentConfig);
    
    default:
      return buildTwitterPrompt(contentType, quantity, topic, agentConfig);
  }
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
    
    console.log('Content generation request:', request);
    
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

    const quantity = request.quantity || 1;
    const topic = request.topic || 'engaging content for our audience';

    // Build the generation prompt using platform-specific builder
    const generationPrompt = buildPlatformPrompt(
      request.platform,
      request.contentType,
      quantity,
      topic,
      agentConfig
    );

    console.log('Generated prompt:', generationPrompt);

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
        max_tokens: 2000,
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
    
    console.log('Raw AI response:', rawContent);
    
    // Parse the numbered content
    const contentLines = rawContent.split('\n').filter(line => line.trim());
    const content: string[] = [];

    for (const line of contentLines) {
      // Remove numbering patterns like "1.", "1/5", "Tweet 1:", etc.
      const cleaned = line
        .replace(/^\d+[\.)]\s*/, '')           // Remove "1. " or "1) "
        .replace(/^\d+\/\d+\s*/, '')           // Remove "1/5 "
        .replace(/^Tweet\s+\d+:\s*/i, '')      // Remove "Tweet 1: "
        .replace(/^Post\s+\d+:\s*/i, '')       // Remove "Post 1: "
        .trim();
      
      if (cleaned && cleaned.length > 0) {
        content.push(cleaned);
      }
    }

    // Validate we got content
    if (content.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to parse generated content',
          rawContent: rawContent
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Structure the response
    const result = {
      tweets: content.slice(0, quantity), // Keep 'tweets' key for backwards compatibility
      success: true,
      businessName: business.name,
      platform: request.platform,
      contentType: request.contentType,
      quantity: content.length
    };

    console.log('Returning result:', result);

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
      systemPrompt: 'You are the content creation agent for Fight Flow Academy, a martial arts and fitness center. Create engaging, motivational content that inspires people to train and push their limits.',
      contentGuidelines: {
        maxLength: { twitter: 280, instagram: 2200, linkedin: 3000 },
        hashtags: { preferred: ['#MartialArts', '#Boxing', '#Fitness', '#Training', '#MMA'], max: 5 },
        callToAction: ['Book your free trial class today!', 'Join our community of fighters.', 'Start your martial arts journey now!']
      },
      brandVoice: 'Empowering and motivational',
      targetAudience: ['fitness enthusiasts', 'beginners curious about martial arts', 'experienced fighters'],
      personality: { avoid: ['aggressive language'] }
    },
    'sparkwave-ai': {
      businessId: 'sparkwave-ai',
      systemPrompt: 'You are the content creation agent for Sparkwave AI, an AI services and automation company. Create professional, insightful content about AI, automation, and business productivity.',
      contentGuidelines: {
        maxLength: { twitter: 280, instagram: 2200, linkedin: 3000 },
        hashtags: { preferred: ['#AI', '#Automation', '#Business', '#Productivity', '#Tech'], max: 5 },
        callToAction: ['Schedule a consultation', 'Learn how AI can transform your business', 'Get started with automation today']
      },
      brandVoice: 'Professional and innovative',
      targetAudience: ['business owners', 'tech leaders', 'entrepreneurs'],
      personality: { avoid: ['overly technical jargon'] }
    },
    'persona-ai': {
      businessId: 'persona-ai',
      systemPrompt: 'You are the content creation agent for PersonaAI, an AI-powered qualitative research platform. Create thoughtful content about research, psychology, and business insights.',
      contentGuidelines: {
        maxLength: { twitter: 280, instagram: 2200, linkedin: 3000 },
        hashtags: { preferred: ['#AIResearch', '#MarketResearch', '#Psychology', '#BusinessIntelligence', '#DataScience'], max: 5 },
        callToAction: ['Discover deeper insights', 'Try PersonaAI today', 'Transform your research process']
      },
      brandVoice: 'Insightful and analytical',
      targetAudience: ['researchers', 'marketers', 'business analysts'],
      personality: { avoid: ['oversimplification'] }
    },
    'charx-world': {
      businessId: 'charx-world',
      systemPrompt: 'You are the content creation agent for CharX World, an AI character and world building platform. Create imaginative, creative content about storytelling, characters, and world creation.',
      contentGuidelines: {
        maxLength: { twitter: 280, instagram: 2200, linkedin: 3000 },
        hashtags: { preferred: ['#CharXWorld', '#AICharacters', '#Storytelling', '#WorldBuilding', '#AICreativity'], max: 5 },
        callToAction: ['Create your world today', 'Bring your characters to life', 'Start building now']
      },
      brandVoice: 'Creative and imaginative',
      targetAudience: ['writers', 'game developers', 'content creators'],
      personality: { avoid: ['boring corporate speak'] }
    }
  };
  
  return configs[businessId] || configs['fight-flow-academy'];
}