import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GameAgent } from "npm:@virtuals-protocol/game@0.1.14";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TWITTER_WORKER_ID = Deno.env.get('TWITTER_WORKER_ID') || 'twitter-poster';
const POST_TWEET_FN = Deno.env.get('POST_TWEET_FN') || 'post_tweet';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();
    
    if (!content) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required field: content' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get GAME API key
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

    // Initialize GAME agent
    const agent = new GameAgent(gameApiKey, {
      name: "PersonaAI Twitter Agent",
      goal: "Post tweets through GAME platform",
      description: "Posts tweets via GAME Twitter worker",
      workers: [],
      getAgentState: async () => ({ mode: "twitter-platform" }),
    });

    await agent.init();

    // Post tweet using GAME platform worker
    console.log('Posting tweet via GAME:', content);
    const result = await agent.step({
      workerId: TWITTER_WORKER_ID,
      fn: POST_TWEET_FN,
      args: { text: content },
    });

    console.log('GAME Twitter result:', JSON.stringify(result));

    return new Response(
      JSON.stringify({ 
        success: true,
        result: result,
        message: 'Tweet posted successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Post tweet error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
