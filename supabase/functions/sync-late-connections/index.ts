import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessId } = await req.json();
    
    if (!businessId) {
      throw new Error('Business ID is required');
    }

    console.log('🔄 Syncing Late connections for business:', businessId);
    
    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Get business to verify it exists
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();
    
    if (businessError || !business) {
      throw new Error('Business not found');
    }

    console.log('✅ Found business:', business.name);
    
    // Call Late.so API to get all connected accounts
    const lateApiKey = Deno.env.get('LATE_API_KEY');
    if (!lateApiKey) {
      throw new Error('LATE_API_KEY not configured');
    }
    
    console.log('📡 Fetching accounts from Late.so API...');
    
    const response = await fetch('https://getlate.dev/api/v1/accounts', {
      headers: {
        'Authorization': `Bearer ${lateApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Late API error:', response.status, errorText);
      throw new Error(`Late API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('📥 Late API response:', JSON.stringify(data, null, 2));
    
    // Late API returns { accounts: [...] }
    const accounts = data.accounts || [];
    console.log(`✅ Found ${accounts.length} accounts in Late.so`);
    
    // Map Late accounts to database columns
    const updates: any = {};
    let syncedCount = 0;
    
    for (const account of accounts) {
      const platform = account.platform?.toLowerCase() || '';
      const accountId = account.id || account.account_id;
      
      console.log(`🔍 Processing account: ${platform} - ${accountId}`);
      
      if (!accountId) {
        console.warn('⚠️ Account missing ID:', account);
        continue;
      }
      
      if (platform === 'twitter' || platform === 'x') {
        updates.late_twitter_account_id = accountId;
        syncedCount++;
        console.log('✅ Mapped Twitter/X account:', accountId);
      } else if (platform === 'instagram') {
        updates.late_instagram_account_id = accountId;
        syncedCount++;
        console.log('✅ Mapped Instagram account:', accountId);
      } else if (platform === 'tiktok') {
        updates.late_tiktok_account_id = accountId;
        syncedCount++;
        console.log('✅ Mapped TikTok account:', accountId);
      } else if (platform === 'facebook') {
        updates.late_facebook_account_id = accountId;
        syncedCount++;
        console.log('✅ Mapped Facebook account:', accountId);
      } else if (platform === 'linkedin') {
        updates.late_linkedin_account_id = accountId;
        syncedCount++;
        console.log('✅ Mapped LinkedIn account:', accountId);
      } else {
        console.warn('⚠️ Unknown platform:', platform);
      }
    }
    
    console.log('📊 Updates to apply:', updates);
    
    // Update database with all account IDs
    if (Object.keys(updates).length > 0) {
      console.log(`💾 Updating database with ${syncedCount} account(s)...`);
      
      const { error: updateError } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', businessId);
        
      if (updateError) {
        console.error('❌ Database update error:', updateError);
        throw updateError;
      }
      
      console.log('✅ Database updated successfully');
    } else {
      console.log('ℹ️ No accounts to sync');
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: syncedCount,
        accounts: updates,
        totalAccounts: accounts.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('❌ Sync error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
