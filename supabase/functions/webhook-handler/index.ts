import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Phone normalization function for E.164 format
function normalizePhoneNumber(phoneNumber: string): string | null {
  if (!phoneNumber) return null;
  
  // Remove all non-numeric characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Handle different digit lengths
  let normalizedDigits = '';
  
  if (digits.length === 10) {
    // 10 digits: assume US number, add country code
    normalizedDigits = '1' + digits;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // 11 digits starting with 1: already has US country code
    normalizedDigits = digits;
  } else {
    // Invalid length for US phone number
    console.warn(`Invalid phone number format: ${phoneNumber}`);
    return null;
  }
  
  // Validate US phone number (must be 11 digits starting with 1)
  if (normalizedDigits.length !== 11 || !normalizedDigits.startsWith('1')) {
    console.warn(`Invalid US phone number: ${phoneNumber}`);
    return null;
  }
  
  // Return E.164 format with + prefix
  return '+' + normalizedDigits;
}

// Direct contact creation function
async function createContactDirectly(formData: any, businessId: string, supabase: any) {
  console.log('Creating contact directly in database...');
  
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .insert({
      business_id: businessId,
      first_name: formData.name?.split(' ')[0] || 'Unknown',
      last_name: formData.name?.split(' ').slice(1).join(' ') || '',
      email: formData.email,
      phone: formData.phone,
      source: 'wix_form',
      status: 'new_lead',
      comments: formData.comments || ''
    })
    .select()
    .single();

  if (contactError) {
    console.error('Contact creation failed:', contactError);
    throw new Error(`Failed to create contact: ${contactError.message}`);
  }

  console.log('Contact created successfully:', contact);
  return contact;
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
      automationType = 'contact_created';

      // Extract contact data from Wix webhook payload
      const contactData = requestBody.data?.contact || {};
      const formData = requestBody.data || requestBody;
      
      // Check for duplicate submission using submissionId
      const submissionId = formData.submissionId;
      if (submissionId) {
        const { data: existingSubmission } = await supabase
          .from('automation_logs')
          .select('id')
          .eq('business_id', endpoint.business_id)
          .eq('automation_type', 'contact_created')
          .contains('source_data', { data: { submissionId } })
          .single();
        
        if (existingSubmission) {
          console.log(`Duplicate submission detected: ${submissionId} - skipping processing`);
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Duplicate submission - already processed',
              submissionId 
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }
      
      // PRIORITY REVERSAL: Check form fields FIRST, then fall back to contact data
      
      // Get name - prioritize form field data over contact data
      let leadName = 'Unknown';
      let nameSource = 'default';
      
      // Check form field data first (field:comp-l3j29uvu = first name, field:comp-l3j29uw8 = last name)
      const formFirstName = formData['field:comp-l3j29uvu'] || '';
      const formLastName = formData['field:comp-l3j29uw8'] || '';
      
      if (formFirstName || formLastName) {
        leadName = `${formFirstName} ${formLastName}`.trim();
        nameSource = 'form_fields';
      } else if (formData.name || formData.fullName) {
        leadName = formData.name || formData.fullName;
        nameSource = 'form_data';
      } else if (contactData.name?.first || contactData.name?.last) {
        leadName = `${contactData.name.first || ''} ${contactData.name.last || ''}`.trim();
        nameSource = 'contact_data';
      }
      
      // Get email - prioritize form field data over contact data  
      let leadEmail = '';
      let emailSource = 'none';
      
      // Check form field data first (field:comp-l3j29uwg = email)
      if (formData['field:comp-l3j29uwg']) {
        leadEmail = formData['field:comp-l3j29uwg'];
        emailSource = 'form_field';
      } else if (formData.email) {
        leadEmail = formData.email;
        emailSource = 'form_data';
      } else if (contactData.email) {
        leadEmail = contactData.email;
        emailSource = 'contact_direct';
      } else if (contactData.emails && contactData.emails.length > 0) {
        const primaryEmail = contactData.emails.find(e => e.primary) || contactData.emails[0];
        leadEmail = primaryEmail.email;
        emailSource = 'contact_array';
      }
      
      // Get phone - prioritize form field data over contact data
      let leadPhone = '';
      let phoneSource = 'none';
      
      // Check form field data first (field:comp-l3j29uwo = phone)
      if (formData['field:comp-l3j29uwo']) {
        leadPhone = formData['field:comp-l3j29uwo'];
        phoneSource = 'form_field';
      } else if (formData.phone) {
        leadPhone = formData.phone;
        phoneSource = 'form_data';
      } else if (contactData.phone) {
        leadPhone = contactData.phone;
        phoneSource = 'contact_direct';
      } else if (contactData.phones && contactData.phones.length > 0) {
        const primaryPhone = contactData.phones.find(p => p.primary) || contactData.phones[0];
        leadPhone = primaryPhone.phone || primaryPhone.formattedPhone;
        phoneSource = 'contact_array';
      }
      
      // Normalize phone number to E.164 format
      const originalPhone = leadPhone;
      if (leadPhone) {
        const normalizedPhone = normalizePhoneNumber(leadPhone);
        if (normalizedPhone) {
          leadPhone = normalizedPhone;
          console.log(`Phone normalized: ${originalPhone} -> ${leadPhone}`);
        } else {
          console.warn(`Failed to normalize phone: ${originalPhone} - keeping original`);
        }
      }

      // Enhanced logging to show data sources
      console.log('Data extraction sources:', {
        name: { value: leadName, source: nameSource },
        email: { value: leadEmail, source: emailSource },
        phone: { value: `${originalPhone} -> ${leadPhone}`, source: phoneSource },
        submissionId: submissionId
      });

      processedData = {
        name: leadName,
        email: leadEmail,
        phone: leadPhone,
        formType: formData.formType || formData.formName || 'contact',
        comments: formData.comments || formData.message || '',
        source: 'wix_form',
        timestamp: new Date().toISOString()
      };

      console.log('Processed form data:', processedData);

      // Create contact directly in database
      try {
        const contact = await createContactDirectly(processedData, endpoint.business_id, supabase);
        console.log('Contact created successfully:', contact);
        processedData.contact_id = contact.id;
      } catch (error) {
        console.error('Contact creation failed:', error);
        throw error;
      }
    }

    // Log automation execution
    const executionStart = Date.now();
    let status = 'success';
    let errorMessage = null;

    try {
      console.log(`Processing ${automationType} for business: ${endpoint.businesses?.name}`);
      
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
        automation_type: 'contact_created',
        status: status,
        source_data: requestBody,
        processed_data: { 
          contact_id: processedData.contact_id, 
          source: 'wix_form',
          phone: processedData.phone,
          consent_sms: true 
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