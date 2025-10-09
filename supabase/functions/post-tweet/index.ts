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
          error: `No Twitter token configured for ${business.name}. Please authenticate this business's Twitter account.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Posting tweet for ${business.name} (${business.slug})`);

    // Post to Twitter using GAME's virtualized Twitter API
    const twitterResponse = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${business.game_twitter_token}`,
      },
      body: JSON.stringify({
        text: content
      })
    });

    const responseText = await twitterResponse.text();
    console.log('Twitter API response:', responseText);

    if (!twitterResponse.ok) {
      console.error('Twitter API error:', twitterResponse.status, responseText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Twitter API error: ${twitterResponse.status} - ${responseText}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const twitterData = JSON.parse(responseText);
    const tweetId = twitterData.data?.id;

    console.log(`Successfully posted tweet for ${business.name}:`, tweetId);

    return new Response(
      JSON.stringify({
        success: true,
        tweetId: tweetId,
        message: `Posted to ${business.name} Twitter account`,
        business: business.name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
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
