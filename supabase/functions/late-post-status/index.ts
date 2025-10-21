import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📊 late-post-status function started');
    
    const lateApiKey = Deno.env.get('LATE_API_KEY');
    if (!lateApiKey) {
      console.error('❌ LATE_API_KEY not configured');
      throw new Error('Late API key not configured');
    }

    const { postId } = await req.json();
    
    if (!postId) {
      throw new Error('Missing required field: postId');
    }

    console.log(`📡 Checking Late status for post: ${postId}`);

    const response = await fetch(`https://getlate.dev/api/v1/posts/${postId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${lateApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`📊 Late API response status: ${response.status}`);

    const responseText = await response.text();
    console.log(`📄 Late API response:`, responseText);

    if (!response.ok) {
      let errorMessage = `Late API error (${response.status})`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        errorMessage = responseText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const postData = JSON.parse(responseText);
    
    // Extract status information
    const state = postData.state || postData.status || 'unknown';
    const platformStatuses = postData.platforms || [];
    
    // Check for errors in platform statuses
    let errorMessage = null;
    for (const platform of platformStatuses) {
      if (platform.status === 'failed' || platform.error) {
        errorMessage = platform.error || platform.errorMessage || 'Post failed';
        break;
      }
    }

    console.log(`✅ Post status: ${state}`, { platformStatuses, errorMessage });

    return new Response(
      JSON.stringify({
        success: true,
        state,
        platformStatuses,
        errorMessage,
        fullData: postData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Error in late-post-status function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
