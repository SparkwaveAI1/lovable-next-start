import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== test-ghl-connection function called ===');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Getting GOHIGHLEVEL_API_KEY from environment...');
    const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    
    if (!ghlApiKey) {
      console.error('GOHIGHLEVEL_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ error: 'GoHighLevel API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('API key found, making request to GoHighLevel...');
    console.log('Using API endpoint: https://services.leadconnectorhq.com/opportunities/pipelines');

    // Fetch pipelines from GoHighLevel
    const pipelinesResponse = await fetch('https://services.leadconnectorhq.com/opportunities/pipelines', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    });

    console.log('GoHighLevel response status:', pipelinesResponse.status);
    console.log('GoHighLevel response headers:', Object.fromEntries(pipelinesResponse.headers.entries()));

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
    console.log('Successfully fetched pipelines data:', JSON.stringify(pipelinesData, null, 2));

    // Extract pipeline and stage information
    const pipelines = pipelinesData.pipelines || [];
    console.log('Found pipelines count:', pipelines.length);
    
    const formattedPipelines = pipelines.map((pipeline: any) => ({
      id: pipeline.id,
      name: pipeline.name,
      stages: pipeline.stages?.map((stage: any) => ({
        id: stage.id,
        name: stage.name
      })) || []
    }));

    console.log('Formatted pipelines:', JSON.stringify(formattedPipelines, null, 2));

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
    console.error('Error stack:', error.stack);
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