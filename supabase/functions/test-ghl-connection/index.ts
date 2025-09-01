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

    // Get location ID from configuration
    const { data: locationConfig, error: locationError } = await supabase
      .from('ghl_configurations')
      .select('location_id')
      .eq('is_active', true)
      .single();
    
    if (locationError || !locationConfig?.location_id) {
      console.error('Location ID not found in database:', locationError);
      return new Response(
        JSON.stringify({ error: 'Location ID not configured in database' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Testing contact creation with GoHighLevel API...');
    
    // Test contact creation - this is what the automation actually needs
    const contactResponse = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Connection',
        email: 'test-connection@example.com',
        locationId: locationConfig.location_id,
        phone: '+1234567890'
      })
    });

    console.log('Contact creation response status:', contactResponse.status);
    console.log('Contact creation response headers:', Object.fromEntries(contactResponse.headers.entries()));

    if (!contactResponse.ok) {
      const errorText = await contactResponse.text();
      console.error('GoHighLevel contact creation error:', contactResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create test contact in GoHighLevel',
          status: contactResponse.status,
          details: errorText
        }),
        { 
          status: contactResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const contactData = await contactResponse.json();
    console.log('Successfully created test contact:', JSON.stringify(contactData, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Contact creation test successful',
        contactId: contactData.contact?.id,
        apiStatus: 'working'
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