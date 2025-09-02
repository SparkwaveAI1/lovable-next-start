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

    // Call the send-sms Edge Function to actually send via Twilio
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: {
        to: smsData.to,
        message: smsData.message,
        businessId: smsData.businessId
      }
    });

    if (error) {
      throw new Error(`SMS sending failed: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(`Twilio error: ${data.error}`);
    }

    console.log('SMS sent successfully via Twilio:', data.messageSid);

    // Log the SMS attempt to automation_logs
    await supabase
      .from('automation_logs')
      .insert({
        business_id: smsData.businessId,
        automation_type: 'sms',
        status: 'success',
        error_message: `SMS sent to ${smsData.to}: ${smsData.message.substring(0, 50)}...`
      });

    return { success: true, message: 'SMS sent successfully', messageSid: data.messageSid };
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