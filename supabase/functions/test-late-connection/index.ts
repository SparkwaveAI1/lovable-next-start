import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log('🔍 test-late-connection function started');
    
    // Get the Late API key
    const lateApiKey = Deno.env.get('LATE_API_KEY');
    if (!lateApiKey) {
      console.error('❌ LATE_API_KEY not configured');
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Late API key not configured',
          needsReconnection: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Parse request body
    const { accountId, platform } = await req.json();
    
    console.log(`🔍 Testing connection for ${platform} (account: ${accountId})`);

    if (!accountId || !platform) {
      throw new Error('Missing required fields: accountId or platform');
    }

    // Test the token by making a minimal API call to Late
    // We'll try to fetch recent posts with a limit of 1
    console.log(`📡 Testing Late API token for ${platform}...`);
    
    const testUrl = `https://getlate.dev/api/v1/posts?accountId=${accountId}&limit=1`;
    
    let response;
    try {
      response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${lateApiKey}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (fetchError: any) {
      console.error('❌ Network error testing Late API:', fetchError);
      return new Response(
        JSON.stringify({
          status: 'error',
          message: `Network error: ${fetchError.message}`,
          needsReconnection: false,
          platform
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📊 Late API test response status: ${response.status} ${response.statusText}`);

    // Parse response
    const responseText = await response.text();
    
    // Check for token expiry errors
    if (response.status === 401 || response.status === 403) {
      console.error(`❌ Token expired for ${platform} (Status: ${response.status})`);
      console.error(`   Response:`, responseText);
      
      return new Response(
        JSON.stringify({
          status: 'expired',
          message: 'Token has expired or is invalid',
          needsReconnection: true,
          platform,
          details: responseText
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check for other errors
    if (!response.ok) {
      console.error(`❌ Late API test failed for ${platform} (Status: ${response.status})`);
      
      // Try to parse error details
      let errorMessage = `API error (${response.status})`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error || errorData.message || errorMessage;
        
        // Check if error message indicates token issues
        const tokenErrorKeywords = ['token', 'refresh', 'authorization', 'expired', 'invalid'];
        const hasTokenError = tokenErrorKeywords.some(keyword => 
          errorMessage.toLowerCase().includes(keyword)
        );
        
        if (hasTokenError) {
          return new Response(
            JSON.stringify({
              status: 'expired',
              message: errorMessage,
              needsReconnection: true,
              platform
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
      } catch {
        // Not JSON, use status as indicator
      }
      
      return new Response(
        JSON.stringify({
          status: 'error',
          message: errorMessage,
          needsReconnection: false,
          platform
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Token is valid!
    console.log(`✅ Token valid for ${platform}`);
    
    return new Response(
      JSON.stringify({
        status: 'valid',
        message: 'Connection is active and healthy',
        needsReconnection: false,
        platform
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('❌ Error in test-late-connection function:', error);
    
    return new Response(
      JSON.stringify({
        status: 'error',
        message: error.message || 'Unknown error occurred',
        needsReconnection: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
