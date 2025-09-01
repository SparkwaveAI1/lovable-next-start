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

async function createLeadInGoHighLevel(leadData: GoHighLevelContact, testMode: boolean = false, ghlConfig: any) {
  // If in test mode, return mock success without calling API
  if (testMode) {
    console.log('TEST MODE: GoHighLevel integration skipped');
    console.log('Would create contact and opportunity with data:', leadData);
    return {
      contact: {
        success: true,
        contact: {
          id: 'test-mode-contact-id',
          firstName: leadData.leadName.split(' ')[0],
          lastName: leadData.leadName.split(' ').slice(1).join(' '),
          email: leadData.leadEmail,
          phone: leadData.leadPhone,
          status: 'TEST_MODE'
        },
        message: 'TEST MODE: Contact would be created in GoHighLevel (API call skipped)',
      },
      opportunity: {
        success: true,
        opportunity: {
          id: 'test-mode-opportunity-id',
          title: `${leadData.formType || 'Contact'} - ${leadData.leadName}`,
          contactId: 'test-mode-contact-id',
          status: 'TEST_MODE'
        },
        message: 'TEST MODE: Opportunity would be created in GoHighLevel (API call skipped)',
      }
    };
  }

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

  console.log('Creating GoHighLevel contact and opportunity:', contactData);

  try {
    // Step 1: Create Contact
    const contactResponse = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactData),
    });

    const contactData_result = await contactResponse.json();

    if (!contactResponse.ok) {
      console.error('GoHighLevel Contact API Error:', contactData_result);
      return {
        contact: {
          success: false,
          error: `Contact API Error ${contactResponse.status}: ${contactData_result.message || 'Unknown error'}`,
        },
        opportunity: {
          success: false,
          error: 'Contact creation failed, skipping opportunity creation',
        }
      };
    }

    console.log('GoHighLevel contact created successfully:', contactData_result);

    // Step 2: Create Opportunity
    const opportunityData = {
      title: `${leadData.formType || 'Contact'} - ${leadData.leadName}`,
      status: 'open',
      pipelineId: leadData.pipelineId,
      stageId: leadData.stageId,
      contactId: contactData_result.contact.id,
      locationId: ghlConfig?.location_id,
      monetaryValue: leadData.opportunityValue || (leadData.formType === 'free_trial_signup' ? 129 : 0),
      source: leadData.source || 'wix_form',
    };

    const opportunityResponse = await fetch('https://rest.gohighlevel.com/v1/opportunities/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(opportunityData),
    });

    const opportunityResult = await opportunityResponse.json();

    if (!opportunityResponse.ok) {
      console.error('GoHighLevel Opportunity API Error:', opportunityResult);
      return {
        contact: {
          success: true,
          contact: contactData_result,
          message: 'Contact created successfully in GoHighLevel',
        },
        opportunity: {
          success: false,
          error: `Opportunity API Error ${opportunityResponse.status}: ${opportunityResult.message || 'Unknown error'}`,
        }
      };
    }

    console.log('GoHighLevel opportunity created successfully:', opportunityResult);

    return {
      contact: {
        success: true,
        contact: contactData_result,
        message: 'Contact created successfully in GoHighLevel',
      },
      opportunity: {
        success: true,
        opportunity: opportunityResult,
        message: 'Opportunity created successfully in GoHighLevel',
      }
    };
  } catch (error) {
    console.error('GoHighLevel API Error:', error);
    return {
      contact: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      opportunity: {
        success: false,
        error: 'Contact creation failed, skipping opportunity creation',
      }
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
      
      // Load GoHighLevel configuration from database
      const { data: ghlConfig } = await supabase
        .from('ghl_configurations')
        .select('location_id, pipeline_id, stage_id')
        .eq('business_id', endpoint.business_id)
        .eq('is_active', true)
        .maybeSingle();

      // Extract contact data from Wix webhook payload
      const contactData = requestBody.data?.contact || {};
      const formData = requestBody.data || requestBody;
      
      // Get name from contact data or form fields
      let leadName = 'Unknown';
      if (contactData.name?.first || contactData.name?.last) {
        leadName = `${contactData.name.first || ''} ${contactData.name.last || ''}`.trim();
      } else if (formData.name || formData.fullName) {
        leadName = formData.name || formData.fullName;
      }
      
      // Get email - try contact data first, then form fields
      let leadEmail = '';
      if (contactData.email) {
        leadEmail = contactData.email;
      } else if (contactData.emails && contactData.emails.length > 0) {
        // Use primary email or first email
        const primaryEmail = contactData.emails.find(e => e.primary) || contactData.emails[0];
        leadEmail = primaryEmail.email;
      } else if (formData.email) {
        leadEmail = formData.email;
      }
      
      // Get phone - try contact data first, then form fields
      let leadPhone = '';
      if (contactData.phone) {
        leadPhone = contactData.phone;
      } else if (contactData.phones && contactData.phones.length > 0) {
        // Use primary phone or first phone
        const primaryPhone = contactData.phones.find(p => p.primary) || contactData.phones[0];
        leadPhone = primaryPhone.phone || primaryPhone.formattedPhone;
      } else if (formData.phone) {
        leadPhone = formData.phone;
      }

      processedData = {
        leadName,
        leadEmail,
        leadPhone,
        formType: formData.formType || formData.formName || 'contact',
        comments: formData.comments || formData.message || '',
        source: 'wix_form',
        timestamp: new Date().toISOString(),
        // Use database config first, then request body, then defaults
        pipelineId: ghlConfig?.pipeline_id || requestBody.pipelineId || 'default_pipeline',
        stageId: ghlConfig?.stage_id || requestBody.stageId || 'default_stage',
        opportunityValue: requestBody.opportunityValue || 129
      };

      console.log('Processed lead data:', processedData);

      // Extract safety parameters from request - enable GHL by default if config exists
      const testMode = requestBody.testMode === true;
      const ghlEnabled = requestBody.ghlEnabled !== undefined ? requestBody.ghlEnabled === true : !!ghlConfig;

      console.log('Safety settings:', { testMode, ghlEnabled, hasConfig: !!ghlConfig });

      // Create contact and opportunity in GoHighLevel if enabled or in test mode
      if (ghlEnabled || testMode) {
        try {
          ghlResult = await createLeadInGoHighLevel(processedData, testMode, ghlConfig);
          console.log('GoHighLevel integration result:', ghlResult);
        } catch (error) {
          console.error('GoHighLevel integration failed:', error);
          ghlResult = { success: false, error: error.message };
        }
      } else {
        console.log('GoHighLevel integration disabled by user settings');
        ghlResult = {
          success: true,
          message: 'GoHighLevel integration disabled - no contact or opportunity created',
          status: 'DISABLED'
        };
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