// Test script to verify webhook functionality
const testWebhook = async () => {
  const webhookUrl = 'https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/webhook-handler/fight-flow-wix-forms';
  
  const testData = {
    data: {
      submissionId: 'test-' + Date.now(),
      'field:comp-l3j29uvu': 'John',
      'field:comp-l3j29uw8': 'Doe', 
      'field:comp-l3j29uwg': 'john.doe@test.com',
      'field:comp-l3j29uwo': '555-123-4567',
      formType: 'contact',
      comments: 'Test webhook submission'
    }
  };

  try {
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
    
    return result;
  } catch (error) {
    console.error('Error testing webhook:', error);
    return { error: error.message };
  }
};

// If running in Node.js, you can test it directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testWebhook;
}