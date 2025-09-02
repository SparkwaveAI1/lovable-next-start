import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// TEMPORARILY COMMENTED OUT FOR DEBUGGING
// import { GameAgent } from "https://esm.sh/@virtuals-protocol/game@0.1.14";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business, contentType, topic } = await req.json();
    
    // Access API key securely in Edge Function
    const gameApiKey = Deno.env.get('GAME_API_KEY');
    
    if (!gameApiKey) {
      throw new Error('GAME_API_KEY not configured');
    }

    // DIAGNOSTIC VERSION - Test without GAME SDK first
    console.log('DIAGNOSTIC: Edge Function started successfully');
    console.log('DIAGNOSTIC: GAME API Key available:', !!gameApiKey);
    console.log('DIAGNOSTIC: Request parameters:', { business, contentType, topic });
    
    // PersonaAI agent configuration
    const personaAIConfig = {
      name: "PersonaAI Content Creator",
      goal: "Generate engaging AI and crypto content that builds PersonaAI brand awareness and community engagement",
      description: `Expert in AI technology, crypto markets, and personality-driven content. 
      Focuses on PersonaAI's unique value proposition in the AI agent space. 
      Creates content that educates about AI personas while building community trust.
      Voice: Professional but approachable, technically accurate, community-focused.`,
      focusTopics: ["AI agents", "crypto", "personality AI", "Virtuals Protocol"],
      brandVoice: "expert but accessible"
    };

    console.log('DIAGNOSTIC: PersonaAI config created successfully');
    
    // TEMPORARILY SKIP GAME SDK INITIALIZATION FOR TESTING
    /*
    const agent = new GameAgent(gameApiKey, {
      name: personaAIConfig.name,
      goal: personaAIConfig.goal,
      description: personaAIConfig.description,
      getAgentState: async () => ({
        business: business || "PersonaAI",
        content_type: contentType || "twitter_post",
        topic: topic || "AI agents",
        focus_topics: personaAIConfig.focusTopics,
        brand_voice: personaAIConfig.brandVoice
      })
    });

    console.log('GAME agent created, initializing...');
    
    // Initialize and test the agent
    await agent.init();
    console.log('GAME agent initialized successfully');
    
    const testResult = await agent.step();
    console.log('GAME agent step executed:', testResult);
    */
    
    return new Response(JSON.stringify({
      success: true,
      message: "DIAGNOSTIC: Edge Function running without GAME SDK",
      config: personaAIConfig,
      apiKeyConfigured: true,
      agentInitialized: false, // Not initialized in diagnostic mode
      testResult: { diagnostic: "GAME SDK temporarily disabled for testing" },
      requestId: `diagnostic_${Date.now()}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('GAME integration error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});