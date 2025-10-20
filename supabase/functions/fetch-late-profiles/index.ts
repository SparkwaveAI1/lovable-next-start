import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    // Get the Late API key from environment
    const lateApiKey = Deno.env.get('LATE_API_KEY');
    if (!lateApiKey) {
      console.error('❌ LATE_API_KEY not found in environment');
      throw new Error('Late API key not configured');
    }

    console.log('📡 Fetching Late profiles...');

    // Fetch profiles from Late API
    const response = await fetch('https://getlate.dev/api/v1/profiles', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${lateApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Late API error:', response.status, errorText);
      throw new Error(`Late API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Successfully fetched profiles:', data.profiles?.length || 0, 'profiles');

    // Return the profiles
    return new Response(
      JSON.stringify({
        success: true,
        profiles: data.profiles || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error in fetch-late-profiles:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
