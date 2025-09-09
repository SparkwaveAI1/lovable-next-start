// Test script to verify webhook with SMS functionality
const testWebhookWithSMS = async () => {
  const webhookUrl = 'https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/webhook-handler/fight-flow-wix-forms';
  
  const testData = {
    data: {
      submissionId: 'test-sms-' + Date.now(),
      'field:comp-l3j29uvu': 'Jane',
      'field:comp-l3j29uw8': 'Smith', 
      'field:comp-l3j29uwg': 'jane.smith@test.com',
      'field:comp-l3j29uwo': '555-987-6543', // Phone number for SMS test
      formType: 'contact',
      comments: 'Test webhook submission with SMS'
    }
  };

  try {
    console.log('Testing webhook with SMS functionality...');
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', result);
    
    // Wait a moment then check automation logs
    setTimeout(async () => {
      console.log('Checking automation logs for SMS activity...');
      // You can check the logs in Supabase dashboard
    }, 2000);
    
    return result;
  } catch (error) {
    console.error('Error testing webhook with SMS:', error);
    return { error: error.message };
  }
};

// If running in Node.js, you can test it directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testWebhookWithSMS;
}