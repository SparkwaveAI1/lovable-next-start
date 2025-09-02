import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { GameAgent } from "npm:@virtuals-protocol/game@0.1.14";

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

    console.log('GAME API Key available:', !!gameApiKey);
    console.log('Request parameters:', { business, contentType, topic });
    
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

    console.log('=== GAME AGENT CONSTRUCTOR TESTING ===');
    console.log('API Key available:', !!gameApiKey);
    console.log('API Key prefix:', gameApiKey?.substring(0, 8) + '...');

    let agent = null;
    let constructorPattern = null;

    // Test 1: API key only (minimal constructor)
    try {
      console.log('🔍 Test 1: API key only - new GameAgent(apiKey)');
      agent = new GameAgent(gameApiKey);
      constructorPattern = 'api_key_only';
      console.log('✅ Test 1 SUCCESS');
    } catch (error1) {
      console.log('❌ Test 1 FAILED:', error1.message);
    }

    // Test 2: Config object with API key
    if (!agent) {
      try {
        console.log('🔍 Test 2: Config object - new GameAgent({ apiKey })');
        agent = new GameAgent({ apiKey: gameApiKey });
        constructorPattern = 'config_object';
        console.log('✅ Test 2 SUCCESS');
      } catch (error2) {
        console.log('❌ Test 2 FAILED:', error2.message);
      }
    }

    // Test 3: API key + empty config object
    if (!agent) {
      try {
        console.log('🔍 Test 3: API key + empty config - new GameAgent(apiKey, {})');
        agent = new GameAgent(gameApiKey, {});
        constructorPattern = 'api_key_plus_empty_config';
        console.log('✅ Test 3 SUCCESS');
      } catch (error3) {
        console.log('❌ Test 3 FAILED:', error3.message);
      }
    }

    // Test 4: Full configuration object
    if (!agent) {
      try {
        console.log('🔍 Test 4: Full config structure');
        agent = new GameAgent({
          apiKey: gameApiKey,
          name: personaAIConfig.name,
          goal: personaAIConfig.goal,
          description: personaAIConfig.description
        });
        constructorPattern = 'full_config_structure';
        console.log('✅ Test 4 SUCCESS');
      } catch (error4) {
        console.log('❌ Test 4 FAILED:', error4.message);
      }
    }

    // Test 5: Array format (based on error message about index 0)
    if (!agent) {
      try {
        console.log('🔍 Test 5: Array format - new GameAgent([apiKey, config])');
        agent = new GameAgent([gameApiKey, personaAIConfig]);
        constructorPattern = 'array_format';
        console.log('✅ Test 5 SUCCESS');
      } catch (error5) {
        console.log('❌ Test 5 FAILED:', error5.message);
      }
    }

    if (!agent) {
      throw new Error('ALL CONSTRUCTOR PATTERNS FAILED - SDK may be incompatible with Edge Functions');
    }

    console.log(`🎉 GameAgent created with pattern: ${constructorPattern}`);

    // Proceed with initialization
    console.log('Attempting agent.init()...');
    await agent.init();
    console.log('✅ Agent initialized successfully');

    console.log('Attempting agent.step()...');
    const testResult = await agent.step();
    console.log('✅ Agent step executed successfully');

    return new Response(JSON.stringify({
      success: true,
      message: "GAME agent initialized and tested successfully",
      constructorPattern: constructorPattern,
      config: personaAIConfig,
      apiKeyConfigured: true,
      agentInitialized: true,
      testResult: testResult,
      requestId: `game_${Date.now()}`
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