import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📡 post-via-late function started');
    
    // Get the Late API key
    const lateApiKey = Deno.env.get('LATE_API_KEY');
    if (!lateApiKey) {
      console.error('❌ LATE_API_KEY not configured');
      throw new Error('Late API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { businessId, platform, content, mediaUrls, accountId } = await req.json();
    
    // Fetch business name for better logging and error messages
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('name, slug')
      .eq('id', businessId)
      .single();
    
    const businessName = business?.name || 'Unknown Business';
    const businessSlug = business?.slug || 'unknown';
    
    console.log(`📝 [${businessName} - ${platform}] Request details:`, {
      businessId,
      businessName,
      platform,
      contentLength: content?.length,
      mediaCount: mediaUrls?.length || 0,
      accountId
    });

    if (!businessId || !platform || !content) {
      throw new Error('Missing required fields: businessId, platform, or content');
    }

    if (!accountId) {
      throw new Error(`No Late account ID provided for ${platform}`);
    }

    // Build Late API request payload
    const latePayload: any = {
      content: content,
      platforms: [{
        platform: platform,
        accountId: accountId
      }],
      publishNow: true
    };

    // Add media if provided
    if (mediaUrls && mediaUrls.length > 0) {
      console.log(`📎 Adding ${mediaUrls.length} media items`);
      latePayload.mediaItems = mediaUrls.map((url: string) => ({
        type: url.match(/\.(mp4|mov|avi)$/i) ? 'video' : 'image',
        url: url
      }));
    }

    console.log(`📡 Calling Late API for ${platform}...`);
    console.log(`   Account ID: ${accountId}`);
    console.log(`   Payload:`, JSON.stringify(latePayload, null, 2));

    // Call Late API (let it take as long as needed)
    console.log('📡 Calling Late API...');

    let response;
    try {
      response = await fetch('https://getlate.dev/api/v1/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lateApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(latePayload)
        // No timeout - Late API will handle it
      });
    } catch (fetchError: any) {
      console.error('❌ Late API fetch error:', fetchError);
      throw new Error(`Network error calling Late API: ${fetchError.message}`);
    }

    console.log('✅ Late API responded');

    console.log(`📊 Late API response status: ${response.status} ${response.statusText}`);

    // Get response text first (works for both JSON and non-JSON responses)
    const responseText = await response.text();
    console.log(`📄 Late API raw response:`, responseText);

    // Check if request was successful
    if (!response.ok) {
      console.error(`❌ [${businessName} - ${platform}] Late API returned error status: ${response.status}`);
      
      // Try to parse as JSON for structured error
      let errorMessage = `Late API error (${response.status})`;
      let errorType = 'API_ERROR';
      
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error || errorData.message || errorMessage;
        console.error(`❌ [${businessName} - ${platform}] Late API error details:`, errorData);
        
        // Detect token expiry errors
        const tokenErrorKeywords = ['token', 'refresh', 'authorization', 'expired', 'invalid', 'bad request'];
        const isTokenError = tokenErrorKeywords.some(keyword => 
          errorMessage.toLowerCase().includes(keyword)
        );
        
        if (response.status === 401 || response.status === 403 || isTokenError) {
          errorType = 'TOKEN_EXPIRED';
          errorMessage = `${businessName}'s ${platform} connection has expired`;
          console.error(`❌ [${businessName} - ${platform}] Token expired - needs reconnection`);
        }
      } catch {
        // Not JSON, use raw text
        errorMessage = responseText || errorMessage;
        
        // Check raw text for token errors too
        if (response.status === 401 || response.status === 403) {
          errorType = 'TOKEN_EXPIRED';
          errorMessage = `${businessName}'s ${platform} connection has expired`;
        }
      }
      
      // Return structured error response
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          errorType: errorType,
          platform: platform,
          businessName: businessName,
          needsReconnection: errorType === 'TOKEN_EXPIRED',
          reconnectUrl: 'https://app.getlate.dev/accounts'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Return 200 so frontend can parse the error details
        }
      );
    }

    // Parse successful response
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse Late API response as JSON:', parseError);
      throw new Error('Invalid JSON response from Late API');
    }

    console.log(`✅ Successfully posted to ${platform} via Late API`);
    console.log(`   Post data:`, responseData);

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        postId: responseData.post?._id || responseData._id,
        platform: platform,
        response: responseData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Error in post-via-late function:', error);
    console.error('❌ Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
