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

    // Get profileId from query parameters
    const url = new URL(req.url);
    const profileId = url.searchParams.get('profileId');

    console.log('📡 Fetching Late accounts', profileId ? `for profile: ${profileId}` : '(all profiles)');

    // Build the API URL with optional profileId
    let apiUrl = 'https://getlate.dev/api/v1/accounts';
    if (profileId) {
      apiUrl += `?profileId=${profileId}`;
    }

    // Fetch accounts from Late API
    const response = await fetch(apiUrl, {
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
    console.log('✅ Successfully fetched accounts:', data.accounts?.length || 0, 'accounts');

    // Return the accounts
    return new Response(
      JSON.stringify({
        success: true,
        accounts: data.accounts || [],
        profileId: profileId || null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Error in fetch-late-accounts:', error);
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
