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
    // Check all environment variables related to GoHighLevel
    const apiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    // Force edge function restart by changing timestamp
    const restartTimestamp = '2025-09-01T06:00:00.000Z';
    
    console.log('=== ENVIRONMENT DEBUG (Restart: ' + restartTimestamp + ') ===');
    console.log('GOHIGHLEVEL_API_KEY present:', !!apiKey);
    console.log('GOHIGHLEVEL_API_KEY length:', apiKey ? apiKey.length : 0);
    console.log('GOHIGHLEVEL_API_KEY starts with:', apiKey ? apiKey.substring(0, 10) + '...' : 'null');
    console.log('SUPABASE_URL present:', !!supabaseUrl);
    console.log('SUPABASE_ANON_KEY present:', !!supabaseKey);
    
    // Try to make a direct API call to GoHighLevel
    let ghlTestResult = null;
    if (apiKey) {
      try {
        console.log('Testing direct GoHighLevel API call...');
        const ghlResponse = await fetch('https://services.leadconnectorhq.com/locations/', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json'
          }
        });
        
        console.log('GoHighLevel API response status:', ghlResponse.status);
        const ghlBody = await ghlResponse.text();
        console.log('GoHighLevel API response body preview:', ghlBody.substring(0, 200));
        
        ghlTestResult = {
          status: ghlResponse.status,
          bodyPreview: ghlBody.substring(0, 200),
          success: ghlResponse.status === 200
        };
      } catch (ghlError) {
        console.log('GoHighLevel API error:', ghlError.message);
        ghlTestResult = {
          error: ghlError.message,
          success: false
        };
      }
    }

    const result = {
      timestamp: new Date().toISOString(),
      environment: {
        hasGHLKey: !!apiKey,
        ghlKeyLength: apiKey ? apiKey.length : 0,
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseKey
      },
      ghlDirectTest: ghlTestResult
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Debug function error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});