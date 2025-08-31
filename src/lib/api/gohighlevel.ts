// GoHighLevel API Integration
export interface GoHighLevelContact {
  firstName: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  website?: string;
  timezone?: string;
  dnd?: boolean;
  tags?: string[];
  customFields?: Record<string, any>;
  source?: string;
}

export interface GoHighLevelResponse {
  success: boolean;
  contact?: any;
  error?: string;
  message?: string;
}

// This will be used in the Edge Function, not directly in the frontend
export const createGoHighLevelContact = async (
  contact: GoHighLevelContact,
  apiKey: string,
  locationId: string,
  dryRun: boolean = false
): Promise<GoHighLevelResponse> => {
  // Validate required fields
  if (!contact.firstName || !contact.email) {
    return {
      success: false,
      error: 'Missing required fields: firstName and email are required',
    };
  }

  // Log what would be sent (useful for both dry run and actual calls)
  console.log('GoHighLevel contact data to be sent:', {
    ...contact,
    locationId,
    dryRun
  });

  // If in dry run mode, return success with the data that would be sent
  if (dryRun) {
    return {
      success: true,
      contact: {
        ...contact,
        locationId,
        id: 'dry-run-contact-id',
        status: 'DRY_RUN'
      },
      message: 'DRY RUN: Contact would be created successfully in GoHighLevel',
    };
  }

  try {
    const response = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...contact,
        locationId, // Required for GHL API
      }),
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
};

// Helper function to format lead data for GoHighLevel
export const formatLeadForGoHighLevel = (leadData: any): GoHighLevelContact => {
  const nameParts = (leadData.name || leadData.fullName || '').split(' ');
  const firstName = nameParts[0] || 'Unknown';
  const lastName = nameParts.slice(1).join(' ') || '';

  return {
    firstName,
    lastName,
    name: leadData.name || leadData.fullName || `${firstName} ${lastName}`.trim(),
    email: leadData.email || '',
    phone: leadData.phone || '',
    source: leadData.source || 'wix_form',
    tags: ['wix_lead', leadData.formType || 'contact'],
    customFields: {
      original_form_type: leadData.formType,
      submission_timestamp: new Date().toISOString(),
    },
  };
};