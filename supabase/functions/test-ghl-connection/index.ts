import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    
    if (!ghlApiKey) {
      console.error('GOHIGHLEVEL_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'GoHighLevel API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Testing GoHighLevel connection...');

    // Fetch pipelines from GoHighLevel
    const pipelinesResponse = await fetch('https://services.leadconnectorhq.com/opportunities/pipelines', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    });

    if (!pipelinesResponse.ok) {
      const errorText = await pipelinesResponse.text();
      console.error('GoHighLevel API error:', pipelinesResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch pipelines from GoHighLevel',
          status: pipelinesResponse.status,
          details: errorText
        }),
        { 
          status: pipelinesResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const pipelinesData = await pipelinesResponse.json();
    console.log('Successfully fetched pipelines:', pipelinesData);

    // Extract pipeline and stage information
    const pipelines = pipelinesData.pipelines || [];
    const formattedPipelines = pipelines.map((pipeline: any) => ({
      id: pipeline.id,
      name: pipeline.name,
      stages: pipeline.stages?.map((stage: any) => ({
        id: stage.id,
        name: stage.name
      })) || []
    }));

    return new Response(
      JSON.stringify({
        success: true,
        pipelines: formattedPipelines,
        totalPipelines: pipelines.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in test-ghl-connection function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});