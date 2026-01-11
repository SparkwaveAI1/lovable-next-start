import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function uploadMediaToLate(mediaUrl: string, lateApiKey: string): Promise<string> {
  try {
    console.log('Uploading media to Late CDN from:', mediaUrl);
    
    // Download from Supabase
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch media from Supabase: ${response.status}`);
    }
    
    const blob = await response.blob();
    const formData = new FormData();
    formData.append('file', blob);
    
    // Upload to Late's CDN
    const uploadRes = await fetch('https://getlate.dev/api/v1/media/upload', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${lateApiKey}` 
      },
      body: formData
    });
    
    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      throw new Error(`Late CDN upload failed: ${errorText}`);
    }
    
    const result = await uploadRes.json();
    console.log('Media uploaded to Late CDN:', result.url);
    return result.url;
  } catch (error: any) {
    console.error('Media upload to Late failed:', error);
    throw error;
  }
}

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
      console.log(`Processing ${mediaUrls.length} media items for ${platform}`);
      
      // Skip CDN upload - send Supabase URLs directly to Late
      const processedUrls = mediaUrls;
      
      latePayload.mediaItems = processedUrls.map((url: string) => ({
        type: url.match(/\.(mp4|mov|avi)$/i) ? 'video' : 'image',
        url: url
      }));
      
      console.log('Media items prepared for Late API:', latePayload.mediaItems);
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

    console.log(`📊 Late API response data:`, responseData);

    // Check if the post was actually created successfully
    const postId = responseData.post?._id || responseData._id || responseData.data?._id;
    
    if (!postId) {
      console.error(`❌ [${businessName} - ${platform}] No post ID in response`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create post - no post ID returned',
          platform: platform,
          businessName: businessName
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Check the post status after a brief delay to see if it actually published
    // Instagram needs more time to process media
    const waitTime = (platform === 'instagram' && mediaUrls && mediaUrls.length > 0) ? 15000 : 3000;
    console.log(`⏳ Waiting ${waitTime/1000} seconds for ${platform} to process post${mediaUrls?.length ? ' with media' : ''}...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));

    try {
      const statusResponse = await fetch(`https://getlate.dev/api/v1/posts/${postId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${lateApiKey}`,
          'Content-Type': 'application/json',
        }
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log(`📊 Post status check:`, statusData);

        const postStatus = statusData.post?.status || statusData.status || statusData.data?.status;
        const postError = statusData.post?.error || statusData.error || statusData.data?.error;

        console.log(`📊 Post ${postId} status: ${postStatus}`);

        // Check if post failed to publish
        if (postStatus === 'failed' || postError) {
          console.error(`❌ [${businessName} - ${platform}] Post created but failed to publish`);
          console.error(`   Error:`, postError);

          // Check for token-related errors
          const errorMessage = postError?.message || postError || 'Post failed to publish';
          const isTokenError = errorMessage.toLowerCase().includes('token') || 
                               errorMessage.toLowerCase().includes('refresh') ||
                               errorMessage.toLowerCase().includes('authorization') ||
                               errorMessage.toLowerCase().includes('expired');

          return new Response(
            JSON.stringify({
              success: false,
              error: isTokenError 
                ? `${businessName}'s ${platform} token has expired - please reconnect in Late.so`
                : `Post created but failed to publish: ${errorMessage}`,
              errorType: isTokenError ? 'TOKEN_EXPIRED' : 'PUBLISH_FAILED',
              platform: platform,
              businessName: businessName,
              postId: postId,
              needsReconnection: isTokenError,
              reconnectUrl: 'https://app.getlate.dev/accounts',
              details: statusData
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        }

        // Post is published or scheduled successfully
        console.log(`✅ [${businessName} - ${platform}] Post published successfully`);
        console.log(`   Status: ${postStatus}`);
      }
    } catch (statusError) {
      // If status check fails, we'll still return success for the initial creation
      console.warn(`⚠️ Could not verify post status:`, statusError);
    }

    console.log(`✅ Successfully posted to ${platform} via Late API`);

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        postId: postId,
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
