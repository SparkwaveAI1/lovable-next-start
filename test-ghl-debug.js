// Direct test of the GoHighLevel connection
async function testGHLConnection() {
  const supabaseUrl = 'https://wrsoacujxcskydlzgopa.supabase.co';
  
  console.log('Testing GoHighLevel connection...');
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/test-ghl-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationId: 'test',
        discoverMode: true
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.status === 500) {
      console.log('❌ HTTP 500 Error confirmed');
    } else {
      console.log('✅ Function responded');
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

testGHLConnection();