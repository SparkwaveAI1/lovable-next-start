import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Accept optional replyToTweetId for thread replies
    const { content, businessId, replyToTweetId } = await req.json();

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

    const isReply = Boolean(replyToTweetId);
    console.log(`${isReply ? 'Replying to tweet' : 'Posting tweet'} for ${business.name} via GAME platform...`);

    // Build GAME API payload — include in_reply_to_tweet_id for replies
    const gamePayload: Record<string, string> = {
      accessToken: business.game_twitter_token,
      text: content,
    };
    if (isReply) {
      gamePayload.in_reply_to_tweet_id = String(replyToTweetId);
    }

    // Call GAME's virtualized Twitter API
    const gameResponse = await fetch('https://api.virtuals.io/api/virtuals-twitter/tweet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': gameApiKey,
      },
      body: JSON.stringify(gamePayload),
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

    // Post-submit verification: require a tweet ID from the API response.
    // If absent, the post did not actually land — fail loudly rather than silently claiming success.
    const tweetId: string | undefined = gameData?.data?.id;
    if (!tweetId) {
      console.error('GAME API returned no tweet id — post may not have landed:', JSON.stringify(gameData));
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Tweet post could not be verified: no tweet_id returned from GAME API',
          rawResponse: gameData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }
    
    console.log(`Successfully ${isReply ? 'replied' : 'posted'} for ${business.name}: tweet_id=${tweetId}`);

    return new Response(
      JSON.stringify({
        success: true,
        tweetId,
        isReply,
        message: `${isReply ? 'Reply posted' : 'Posted'} to ${business.name} Twitter account`,
        data: gameData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
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
