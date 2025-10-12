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

    const { 
      businessId, 
      content, 
      platforms,  // ['twitter', 'instagram', 'tiktok']
      scheduledFor,
      imageUrls,
      videoUrl
    } = await req.json();

    console.log('📝 Post request:', { businessId, platforms, contentLength: content?.length });

    const lateApiKey = Deno.env.get('LATE_API_KEY');
    
    if (!lateApiKey) {
      throw new Error('Late API key not configured');
    }

    // Get business with account IDs
    const { data: business, error: businessError } = await supabaseClient
      .from('businesses')
      .select(`
        name,
        late_twitter_account_id,
        late_instagram_account_id,
        late_tiktok_account_id,
        late_linkedin_account_id,
        late_facebook_account_id
      `)
      .eq('id', businessId)
      .maybeSingle();

    if (businessError) {
      console.error('Database error:', businessError);
      throw new Error(`Database error: ${businessError.message}`);
    }

    if (!business) {
      throw new Error('Business not found');
    }

    console.log('🏢 Business:', business.name);

    // Build platforms array for Late API
    const latePlatforms = platforms.map((platform: string) => {
      const accountIdMap: Record<string, string | null> = {
        twitter: business.late_twitter_account_id,
        instagram: business.late_instagram_account_id,
        tiktok: business.late_tiktok_account_id,
        linkedin: business.late_linkedin_account_id,
        facebook: business.late_facebook_account_id
      };

      const accountId = accountIdMap[platform.toLowerCase()];
      
      if (!accountId) {
        throw new Error(`${platform} not connected for ${business.name}`);
      }

      return {
        platform: platform.toLowerCase(),
        accountId: accountId
      };
    });

    // Build Late API request
    const lateData: any = {
      platforms: latePlatforms,
      content: content
    };

    // Add media
    if (imageUrls && imageUrls.length > 0) {
      lateData.mediaItems = imageUrls.map((url: string) => ({
        type: 'image',
        url: url
      }));
      console.log('📸 Adding images:', imageUrls.length);
    }

    if (videoUrl) {
      lateData.mediaItems = [{
        type: 'video',
        url: videoUrl
      }];
      console.log('🎥 Adding video:', videoUrl);
    }

    // Add scheduling
    if (scheduledFor) {
      lateData.scheduledFor = scheduledFor;
      console.log('⏰ Scheduling for:', scheduledFor);
    }

    console.log('📤 Posting to Late API...');

    // Call Late API
    const response = await fetch('https://getlate.dev/api/v1/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lateData)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Late API error:', result);
      throw new Error(result.message || `Late API error: ${response.status}`);
    }

    console.log('✅ Posted via Late:', result.id);

    return new Response(
      JSON.stringify({
        success: true,
        postId: result.id,
        platforms: platforms,
        message: scheduledFor 
          ? `Scheduled for ${new Date(scheduledFor).toLocaleString()}`
          : 'Posted successfully!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
