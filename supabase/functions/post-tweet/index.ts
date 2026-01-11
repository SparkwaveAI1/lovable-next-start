import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { content, businessId } = await req.json();

    if (!content || !businessId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing content or businessId' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate tweet length
    if (content.length > 280) {
      return new Response(
        JSON.stringify({ success: false, error: 'Tweet exceeds 280 characters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get business and its GAME Twitter token
    const { data: business, error: businessError } = await supabaseClient
      .from('businesses')
      .select('name, slug, game_twitter_token')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      console.error('Business lookup error:', businessError);
      return new Response(
        JSON.stringify({ success: false, error: 'Business not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (!business.game_twitter_token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `No Twitter token configured for ${business.name}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get GAME API key
    const gameApiKey = Deno.env.get('GAME_API_KEY');
    
    if (!gameApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'GAME_API_KEY not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`Posting tweet for ${business.name} via GAME platform...`);

    // Call GAME's virtualized Twitter API
    // This is the correct endpoint that works with GAME tokens
    const gameResponse = await fetch('https://api.virtuals.io/api/virtuals-twitter/tweet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': gameApiKey,
      },
      body: JSON.stringify({
        accessToken: business.game_twitter_token,
        text: content
      })
    });

    if (!gameResponse.ok) {
      const errorText = await gameResponse.text();
      console.error('GAME API error:', errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `GAME API error: ${gameResponse.status} - ${errorText}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const gameData = await gameResponse.json();
    
    console.log(`Successfully posted tweet for ${business.name}:`, gameData);

    return new Response(
      JSON.stringify({
        success: true,
        tweetId: gameData.data?.id || 'posted',
        message: `Posted to ${business.name} Twitter account`,
        data: gameData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error posting tweet:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
