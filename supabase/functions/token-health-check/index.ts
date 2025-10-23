import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 token-health-check function started');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active businesses with Twitter accounts
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, late_twitter_account_id')
      .eq('status', 'active')
      .not('late_twitter_account_id', 'is', null);

    if (businessError) {
      console.error('❌ Error fetching businesses:', businessError);
      throw businessError;
    }

    console.log(`📊 Found ${businesses?.length || 0} businesses to check`);

    const results = [];

    for (const business of businesses || []) {
      if (!business.late_twitter_account_id) {
        console.log(`⏭️ Skipping ${business.name} - no Twitter account configured`);
        continue;
      }

      try {
        console.log(`🔍 Checking token health for ${business.name}...`);

        // Call the test-late-connection function
        const { data: testResult, error: testError } = await supabase.functions.invoke(
          'test-late-connection',
          {
            body: {
              accountId: business.late_twitter_account_id,
              platform: 'twitter'
            }
          }
        );

        if (testError) {
          console.error(`❌ Error testing connection for ${business.name}:`, testError);
          throw testError;
        }

        console.log(`📊 Test result for ${business.name}:`, testResult);

        // Map the test result to health status
        let status = 'healthy';
        let errorMessage: string | null = null;

        if (testResult.status === 'expired' || testResult.needsReconnection) {
          status = 'expired';
          errorMessage = testResult.message || 'Token has expired';
        } else if (testResult.status === 'error') {
          status = 'failed';
          errorMessage = testResult.message || 'Connection test failed';
        }

        // Save health check result
        const { error: insertError } = await supabase
          .from('token_health_checks')
          .insert({
            business_id: business.id,
            platform: 'twitter',
            status,
            error_message: errorMessage,
            test_post_attempted: true,
            test_post_successful: status === 'healthy',
          });

        if (insertError) {
          console.error(`❌ Error saving health check for ${business.name}:`, insertError);
          throw insertError;
        }

        console.log(`✅ Health check saved for ${business.name}: ${status}`);

        results.push({
          business: business.name,
          status,
          errorMessage,
        });

      } catch (error) {
        console.error(`❌ Error checking ${business.name}:`, error);
        
        // Log error for this business
        await supabase.from('token_health_checks').insert({
          business_id: business.id,
          platform: 'twitter',
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          test_post_attempted: false,
          test_post_successful: null,
        });

        results.push({
          business: business.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log('✅ Token health check completed');
    console.log(`📊 Results:`, results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: businesses?.length || 0,
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error in token-health-check function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
