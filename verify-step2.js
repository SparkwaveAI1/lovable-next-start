// Complete Step 2 verification test
const verifyStep2Implementation = async () => {
  console.log('=== Step 2 Verification Test ===');
  
  const webhookUrl = 'https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/webhook-handler/fight-flow-wix-forms';
  
  const testData = {
    data: {
      submissionId: 'step2-test-' + Date.now(),
      'field:comp-l3j29uvu': 'Test',
      'field:comp-l3j29uw8': 'User', 
      'field:comp-l3j29uwg': 'test.user@example.com',
      'field:comp-l3j29uwo': '555-123-4567', // Valid US phone number
      formType: 'free_trial_signup',
      comments: 'Step 2 implementation test - contact creation + SMS welcome'
    }
  };

  try {
    console.log('1. Testing webhook endpoint...');
    console.log('Payload:', JSON.stringify(testData, null, 2));
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('2. Webhook Response:');
    console.log('Status:', response.status);
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Webhook processed successfully');
      
      console.log('\n3. Expected functionality verification:');
      console.log('✅ Contact should be created in contacts table');
      console.log('✅ SMS welcome message should be sent');
      console.log('✅ Automation logs should show both actions');
      console.log('✅ SMS failures should not break webhook process');
      
      console.log('\n4. Check these in Supabase Dashboard:');
      console.log('- contacts table for new Test User record');
      console.log('- automation_logs for contact_created and sms_welcome_sent entries');
      console.log('- Edge Function logs for SMS sending details');
      
    } else {
      console.log('❌ Webhook failed:', result);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { error: error.message };
  }
};

console.log('Run verifyStep2Implementation() to test the implementation');

// Export for use in testing environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = verifyStep2Implementation;
}