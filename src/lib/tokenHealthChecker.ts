import { supabase } from '@/integrations/supabase/client';

interface TokenHealthResult {
  business_id: string;
  platform: string;
  status: 'healthy' | 'warning' | 'failed' | 'expired';
  token_expires_at: string | null;
  days_until_expiry: number | null;
  error_message: string | null;
  test_post_attempted: boolean;
  test_post_successful: boolean | null;
}

export async function checkTwitterTokenHealth(businessId: string, accountId: string): Promise<TokenHealthResult> {
  try {
    // Use the test-late-connection function to check token health
    const { data, error } = await supabase.functions.invoke('test-late-connection', {
      body: {
        accountId: accountId,
        platform: 'twitter'
      }
    });

    if (error) throw error;

    // Map the test-late-connection response to our health result format
    let status: 'healthy' | 'warning' | 'failed' | 'expired' = 'healthy';
    let errorMessage: string | null = null;

    if (data.status === 'expired' || data.needsReconnection) {
      status = 'expired';
      errorMessage = data.message || 'Token has expired';
    } else if (data.status === 'error') {
      status = 'failed';
      errorMessage = data.message || 'Connection test failed';
    } else if (data.status === 'valid') {
      status = 'healthy';
    }

    return {
      business_id: businessId,
      platform: 'twitter',
      status,
      token_expires_at: null, // Late.so doesn't provide expiry date in API
      days_until_expiry: null,
      error_message: errorMessage,
      test_post_attempted: true,
      test_post_successful: status === 'healthy',
    };

  } catch (error) {
    return {
      business_id: businessId,
      platform: 'twitter',
      status: 'failed',
      token_expires_at: null,
      days_until_expiry: null,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      test_post_attempted: false,
      test_post_successful: null,
    };
  }
}

export async function runTokenHealthChecks(): Promise<TokenHealthResult[]> {
  // Get all businesses with Twitter accounts
  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id, name, late_twitter_account_id')
    .eq('status', 'active')
    .not('late_twitter_account_id', 'is', null);

  if (error || !businesses) {
    throw new Error('Failed to fetch businesses');
  }

  // Check health for each business
  const results: TokenHealthResult[] = [];
  
  for (const business of businesses) {
    const result = await checkTwitterTokenHealth(business.id, business.late_twitter_account_id!);
    results.push(result);

    // Save result to database
    await supabase.from('token_health_checks').insert({
      business_id: result.business_id,
      platform: result.platform,
      status: result.status,
      token_expires_at: result.token_expires_at,
      days_until_expiry: result.days_until_expiry,
      error_message: result.error_message,
      test_post_attempted: result.test_post_attempted,
      test_post_successful: result.test_post_successful,
    });
  }

  return results;
}
