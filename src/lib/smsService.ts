import { supabase } from '@/integrations/supabase/client';

export interface SMSMessage {
  to: string;
  message: string;
  businessId: string;
}

export async function sendSMS(smsData: SMSMessage) {
  try {
    // Get SMS configuration for the business
    const { data: config, error: configError } = await supabase
      .from('sms_config')
      .select('*')
      .eq('business_id', smsData.businessId)
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      throw new Error('SMS configuration not found or inactive');
    }

    // For now, just log the SMS (we'll add Twilio later)
    console.log('SMS would be sent:', {
      from: config.phone_number,
      to: smsData.to,
      message: smsData.message,
      provider: config.provider
    });

    // Log the SMS attempt to automation_logs
    await supabase
      .from('automation_logs')
      .insert({
        business_id: smsData.businessId,
        automation_type: 'sms',
        status: 'success'
      });

    return { success: true, message: 'SMS logged successfully' };
  } catch (error) {
    console.error('SMS sending error:', error);
    
    // Log the error
    await supabase
      .from('automation_logs')
      .insert({
        business_id: smsData.businessId,
        automation_type: 'sms',
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown SMS error'
      });

    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}