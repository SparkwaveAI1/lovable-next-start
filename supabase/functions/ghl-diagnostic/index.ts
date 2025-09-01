import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { locationId } = await req.json();
    const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    
    console.log('Starting GHL diagnostic test...');
    console.log('Location ID:', locationId);
    console.log('API Key exists:', !!ghlApiKey);
    console.log('API Key prefix:', ghlApiKey ? ghlApiKey.substring(0, 10) + '...' : 'MISSING');

    if (!ghlApiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'GOHIGHLEVEL_API_KEY not found in environment',
        details: 'API key is not configured in Supabase secrets'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test 1: Basic API access - Get location info
    console.log('Test 1: Testing basic API access with location info...');
    const locationResponse = await fetch(`https://services.leadconnectorhq.com/locations/${locationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    });

    const locationData = await locationResponse.text();
    console.log('Location API Response Status:', locationResponse.status);
    console.log('Location API Response:', locationData);

    if (!locationResponse.ok) {
      return new Response(JSON.stringify({
        success: false,
        test: 'location_access',
        status: locationResponse.status,
        error: `Location API failed: ${locationResponse.status}`,
        response: locationData,
        details: 'API key cannot access the specified location ID'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test 2: Contacts API access
    console.log('Test 2: Testing contacts API access...');
    const contactsResponse = await fetch(`https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=1`, {
      method: 'GET', 
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    });

    const contactsData = await contactsResponse.text();
    console.log('Contacts API Response Status:', contactsResponse.status);
    console.log('Contacts API Response:', contactsData);

    if (!contactsResponse.ok) {
      return new Response(JSON.stringify({
        success: false,
        test: 'contacts_access',
        status: contactsResponse.status,
        error: `Contacts API failed: ${contactsResponse.status}`,
        response: contactsData,
        details: 'API key lacks contacts read permissions'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test 3: Opportunities API access  
    console.log('Test 3: Testing opportunities API access...');
    const opportunitiesResponse = await fetch(`https://services.leadconnectorhq.com/opportunities/search?location_id=${locationId}&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Version': '2021-07-28', 
        'Content-Type': 'application/json'
      }
    });

    const opportunitiesData = await opportunitiesResponse.text();
    console.log('Opportunities API Response Status:', opportunitiesResponse.status);
    console.log('Opportunities API Response:', opportunitiesData);

    if (!opportunitiesResponse.ok) {
      return new Response(JSON.stringify({
        success: false,
        test: 'opportunities_access',
        status: opportunitiesResponse.status,
        error: `Opportunities API failed: ${opportunitiesResponse.status}`,
        response: opportunitiesData,
        details: 'API key lacks opportunities read permissions'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test 4: Conversations API access for SMS
    console.log('Test 4: Testing conversations/SMS API access...');
    const conversationsResponse = await fetch(`https://services.leadconnectorhq.com/conversations/search?locationId=${locationId}&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    });

    const conversationsData = await conversationsResponse.text();
    console.log('Conversations API Response Status:', conversationsResponse.status);
    console.log('Conversations API Response:', conversationsData);

    if (!conversationsResponse.ok) {
      return new Response(JSON.stringify({
        success: false,
        test: 'conversations_access', 
        status: conversationsResponse.status,
        error: `Conversations API failed: ${conversationsResponse.status}`,
        response: conversationsData,
        details: 'API key lacks conversations/SMS permissions'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // All tests passed
    return new Response(JSON.stringify({
      success: true,
      message: 'All API tests passed successfully',
      tests: {
        location: { status: locationResponse.status, passed: true },
        contacts: { status: contactsResponse.status, passed: true },
        opportunities: { status: opportunitiesResponse.status, passed: true },
        conversations: { status: conversationsResponse.status, passed: true }
      },
      locationInfo: JSON.parse(locationData),
      apiKeyPrefix: ghlApiKey.substring(0, 10) + '...'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('GHL Diagnostic Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Diagnostic test failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});