import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    console.log('Getting GoHighLevel API key from database...');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get GHL configuration from database
    const { data: ghlConfig, error: configError } = await supabase
      .from('ghl_configurations')
      .select('api_key')
      .eq('is_active', true)
      .single();
    
    if (configError || !ghlConfig?.api_key) {
      console.error('GoHighLevel API key not found in database:', configError);
      return new Response(
        JSON.stringify({ error: 'GoHighLevel API key not configured in database' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const ghlApiKey = ghlConfig.api_key;

    console.log('API key found, making request to GoHighLevel...');
    console.log('Using API endpoint: https://rest.gohighlevel.com/v1/opportunities/pipelines');

    // Fetch pipelines from GoHighLevel using V1 API (same as webhook-handler)
    const pipelinesResponse = await fetch('https://rest.gohighlevel.com/v1/opportunities/pipelines', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json'
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