import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  mediaId: string;
  fileType: string;
  filePath: string;
  businessId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const request: AnalysisRequest = await req.json();
    
    if (!request.mediaId || !request.filePath) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: mediaId, filePath' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get business info for context
    const { data: business } = await supabaseClient
      .from('businesses')
      .select('name, slug')
      .eq('id', request.businessId)
      .single();

    const businessName = business?.name || 'Unknown Business';
    const businessSlug = business?.slug || '';

    // Build business-specific analysis prompt
    const businessPrompts: Record<string, string> = {
      'fight-flow-academy': `Analyze this martial arts gym image/video. Identify:
- Activity: boxing, muay thai, jiu-jitsu, MMA, conditioning, warmup, cooldown
- Technique: specific moves (jab, cross, hook, uppercut, clinch, takedown, submission, guard work)
- Context: training, sparring, competition, demonstration, class, seminar, event
- People: solo, partner work, group class, instructor-student, kids class, adult class
- Equipment: gloves, pads, heavy bag, speed bag, mats, cage, ring, weights
- Setting: ring, mat area, gym floor, outdoor, competition venue
- Energy level: high intensity, moderate, warmup, cooldown
- Best use: Instagram post, Instagram story, Twitter, Facebook, promotional ad, technique tutorial`,
      
      'sparkwave-ai': `Analyze this business/AI technology image/video. Identify:
- Subject: office, team, technology, AI interface, automation, charts/data
- Setting: office, remote work, conference, presentation, workspace
- People: team meeting, individual working, presentation, collaboration
- Technology shown: computers, screens, AI tools, dashboards
- Business context: consulting, strategy, implementation, results
- Best use: LinkedIn post, blog header, case study, presentation, website`,
      
      'persona-ai': `Analyze this AI/market research image/video. Identify:
- Subject: data visualization, research, AI analysis, insights, personas
- Context: presentation, research, data analysis, customer insights
- Technology: charts, graphs, AI tools, research platforms
- Business application: market research, customer insights, strategy
- Best use: LinkedIn article, case study, presentation, blog post`,
      
      'charx-world': `Analyze this AI character/technology image/video. Identify:
- Subject: AI characters, digital avatars, technology, creative work
- Context: character design, AI interaction, development, showcase
- Technology: AI tools, character interfaces, development environment
- Creative elements: character designs, interactions, storytelling
- Best use: Twitter post, blog showcase, portfolio, community post`
    };

    const analysisPrompt = businessPrompts[businessSlug] || 
      'Analyze this image/video and provide a description and relevant tags.';

    // Call OpenAI Vision API
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OPENAI_API_KEY not configured' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const messages: any[] = [
      {
        role: 'system',
        content: `You are an expert media analyst for ${businessName}. Provide concise, actionable analysis in JSON format with these fields:
- description: 1-2 sentence description of what's in the image/video
- tags: array of 5-10 specific, searchable tags
- suggested_uses: array of 2-3 recommended use cases
- people_count: number (0 if none visible)
- primary_subject: main focus of the image`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: analysisPrompt
          }
        ]
      }
    ];

    // Add image or video URL
    if (request.fileType === 'image') {
      messages[1].content.push({
        type: 'image_url',
        image_url: {
          url: request.filePath,
          detail: 'low' // Use 'low' for faster, cheaper analysis
        }
      });
    } else {
      // For videos, we'd need to extract a frame or use video description
      // For now, just analyze based on filename and context
      messages[1].content[0].text += '\n\nNote: This is a video file. Provide analysis based on likely content for this business.';
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const analysisText = openaiData.choices[0]?.message?.content || '{}';
    const analysis = JSON.parse(analysisText);

    // Update media asset with AI analysis
    const { error: updateError } = await supabaseClient
      .from('media_assets')
      .update({
        description: analysis.description || 'AI analysis pending',
        tags: analysis.tags || [],
      })
      .eq('id', request.mediaId);

    if (updateError) {
      console.error('Error updating media:', updateError);
      throw updateError;
    }

    console.log(`Successfully analyzed media ${request.mediaId}`);

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          description: analysis.description,
          tags: analysis.tags,
          suggested_uses: analysis.suggested_uses,
          people_count: analysis.people_count,
          primary_subject: analysis.primary_subject
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
