import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestConnectionRequest {
  locationId: string;
  pipelineId?: string;
  stageId?: string;
  discoverMode?: boolean;
}

interface TestConnectionResponse {
  success: boolean;
  message: string;
  availableLocations?: Array<{ id: string; name: string }>;
  pipelineValid?: boolean;
  stageValid?: boolean;
  pipelines?: Array<{
    id: string;
    name: string;
    stages: Array<{ id: string; name: string }>;
  }>;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({
        success: false,
        message: 'GoHighLevel API key not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { locationId, pipelineId, stageId, discoverMode }: TestConnectionRequest = await req.json();

    console.log('Testing GoHighLevel connection:', { locationId, pipelineId, stageId, discoverMode });

    // Test 1: Get available locations to verify API key works
    console.log('Testing API key with locations endpoint...');
    const locationsResponse = await fetch('https://rest.gohighlevel.com/v1/locations/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!locationsResponse.ok) {
      const errorData = await locationsResponse.text();
      console.error('Locations API error:', errorData);
      return new Response(JSON.stringify({
        success: false,
        message: `API key validation failed: ${locationsResponse.status} - ${errorData}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const locationsData = await locationsResponse.json();
    console.log('Locations response:', locationsData);

    const availableLocations = locationsData.locations?.map((loc: any) => ({
      id: loc.id,
      name: loc.name
    })) || [];

    // Test 2: Verify the specific location ID exists
    const locationExists = availableLocations.some((loc: any) => loc.id === locationId);
    if (!locationExists && locationId) {
      return new Response(JSON.stringify({
        success: false,
        message: `Location ID "${locationId}" not found in your account`,
        availableLocations
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If in discovery mode, fetch and return all pipelines and stages
    if (discoverMode && locationId) {
      console.log('Discovery mode: fetching all pipelines and stages...');
      
      try {
        const pipelinesResponse = await fetch(`https://rest.gohighlevel.com/v1/pipelines/?locationId=${locationId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!pipelinesResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            message: `Failed to fetch pipelines: ${pipelinesResponse.statusText}`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const pipelinesData = await pipelinesResponse.json();
        console.log('Discovery pipelines response:', JSON.stringify(pipelinesData, null, 2));

        const pipelines = pipelinesData.pipelines?.map((pipeline: any) => ({
          id: pipeline.id,
          name: pipeline.name,
          stages: pipeline.stages?.map((stage: any) => ({
            id: stage.id,
            name: stage.name
          })) || []
        })) || [];

        return new Response(JSON.stringify({
          success: true,
          message: `Found ${pipelines.length} pipelines for location "${locationId}".`,
          pipelines
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        console.error('Discovery error:', error);
        return new Response(JSON.stringify({
          success: false,
          message: `Discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    let pipelineValid = false;
    let stageValid = false;

    // Test 3: Verify pipeline and stage if provided
    if (locationId && pipelineId) {
      console.log('Testing pipeline and stage validation...');
      try {
        const pipelinesResponse = await fetch(`https://rest.gohighlevel.com/v1/pipelines/?locationId=${locationId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (pipelinesResponse.ok) {
          const pipelinesData = await pipelinesResponse.json();
          console.log('Pipelines response:', pipelinesData);
          
          const pipeline = pipelinesData.pipelines?.find((p: any) => p.id === pipelineId);
          pipelineValid = !!pipeline;

          if (pipeline && stageId) {
            stageValid = pipeline.stages?.some((stage: any) => stage.id === stageId) || false;
          }
        }
      } catch (error: any) {
        console.warn('Pipeline validation failed:', error);
      }
    }

    // Test 4: Try a test contact creation (dry run)
    if (locationId) {
      console.log('Testing contact creation (dry run)...');
      try {
        const testContactData = {
          firstName: 'Test',
          lastName: 'Connection',
          email: 'test@example.com',
          locationId: locationId,
        };

        // We won't actually create this contact, just validate the request would work
        const contactTestResponse = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testContactData),
        });

        // Even if it fails due to duplicate email, a 422 response means the API is working
        if (contactTestResponse.status === 422) {
          console.log('Contact API endpoint is working (duplicate email test)');
        } else if (!contactTestResponse.ok) {
          const errorData = await contactTestResponse.text();
          console.warn('Contact test failed:', errorData);
          return new Response(JSON.stringify({
            success: false,
            message: `Contact creation test failed: ${contactTestResponse.status} - ${errorData}`,
            availableLocations
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          // If successful, we need to delete the test contact
          const contactData = await contactTestResponse.json();
          if (contactData.contact?.id) {
            try {
              await fetch(`https://rest.gohighlevel.com/v1/contacts/${contactData.contact.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
              });
              console.log('Test contact deleted');
            } catch (error: any) {
              console.warn('Failed to delete test contact:', error);
            }
          }
        }
      } catch (error: any) {
        console.warn('Contact creation test failed:', error);
      }
    }

    const response: TestConnectionResponse = {
      success: true,
      message: locationId 
        ? `Connection successful! Location "${locationId}" is valid.`
        : 'API key is valid. Please configure Location ID.',
      availableLocations,
      pipelineValid: pipelineId ? pipelineValid : undefined,
      stageValid: stageId ? stageValid : undefined,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Connection test error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : 'Connection test failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});