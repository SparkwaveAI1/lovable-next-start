import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// GoHighLevel API Integration
interface GoHighLevelContact {
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  formType?: string;
  source?: string;
  timestamp?: string;
}

async function createGoHighLevelContact(leadData: GoHighLevelContact) {
  const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
  
  if (!ghlApiKey) {
    throw new Error('GoHighLevel API key not configured');
  }

  // Format lead data for GoHighLevel
  const nameParts = leadData.leadName.split(' ');
  const firstName = nameParts[0] || 'Unknown';
  const lastName = nameParts.slice(1).join(' ') || '';

  const contactData = {
    firstName,
    lastName,
    name: leadData.leadName,
    email: leadData.leadEmail || '',
    phone: leadData.leadPhone || '',
    source: leadData.source || 'wix_form',
    tags: ['wix_lead', leadData.formType || 'contact'],
    customFields: {
      original_form_type: leadData.formType,
      submission_timestamp: leadData.timestamp,
    },
  };

  console.log('Creating GoHighLevel contact:', contactData);

  try {
    const response = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('GoHighLevel API Error:', data);
      return {
        success: false,
        error: `API Error ${response.status}: ${data.message || 'Unknown error'}`,
      };
    }

    console.log('GoHighLevel contact created successfully:', data);
    return {
      success: true,
      contact: data,
      message: 'Contact created successfully in GoHighLevel',
    };
  } catch (error) {
    console.error('GoHighLevel API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse URL to get endpoint slug
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const endpointSlug = pathParts[pathParts.length - 1]; // Get last part of path

    console.log(`Processing webhook for endpoint: ${endpointSlug}`);

    // Validate webhook endpoint exists and is active
    const { data: endpoint, error: endpointError } = await supabase
      .from('webhook_endpoints')
      .select(`
        id,
        business_id,
        webhook_type,
        is_active,
        secret_key,
        businesses (
          id,
          name,
          slug
        )
      `)
      .eq('endpoint_slug', endpointSlug)
      .eq('is_active', true)
      .single();

    if (endpointError || !endpoint) {
      console.error('Webhook endpoint not found or inactive:', endpointError);
      return new Response(
        JSON.stringify({ error: 'Webhook endpoint not found or inactive' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      console.error('Invalid JSON in request body:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Received webhook data:', JSON.stringify(requestBody, null, 2));

    // Process based on webhook type
    let processedData = {};
    let automationType = 'unknown';
    let ghlResult = null;

    if (endpoint.webhook_type === 'wix_form') {
      automationType = 'wix_to_ghl';
      processedData = {
        leadName: requestBody.name || requestBody.fullName || 'Unknown',
        leadEmail: requestBody.email || '',
        leadPhone: requestBody.phone || '',
        formType: requestBody.formType || 'contact',
        source: 'wix_form',
        timestamp: new Date().toISOString()
      };

      console.log('Processed lead data:', processedData);

      // Create contact in GoHighLevel
      try {
        ghlResult = await createGoHighLevelContact(processedData);
        console.log('GoHighLevel integration result:', ghlResult);
      } catch (error) {
        console.error('GoHighLevel integration failed:', error);
        ghlResult = { success: false, error: error.message };
      }
    }

    // Log automation execution
    const executionStart = Date.now();
    let status = 'success';
    let errorMessage = null;

    try {
      console.log(`Processing ${automationType} for business: ${endpoint.businesses?.name}`);
      
      // Check if GoHighLevel integration was successful
      if (ghlResult && !ghlResult.success) {
        status = 'error';
        errorMessage = ghlResult.error || 'GoHighLevel integration failed';
      }
      
    } catch (error) {
      status = 'error';
      errorMessage = error.message;
      console.error('Processing error:', error);
    }

    const executionTime = Date.now() - executionStart;

    // Log to automation_logs table
    const { error: logError } = await supabase
      .from('automation_logs')
      .insert({
        business_id: endpoint.business_id,
        automation_type: automationType,
        status: status,
        source_data: requestBody,
        processed_data: { 
          ...processedData, 
          gohighlevel_result: ghlResult 
        },
        error_message: errorMessage,
        execution_time_ms: executionTime
      });

    if (logError) {
      console.error('Error logging automation:', logError);
    } else {
      console.log(`Successfully logged ${automationType} execution`);
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Webhook processed successfully for ${endpoint.businesses?.name}`,
        executionTime: executionTime
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});