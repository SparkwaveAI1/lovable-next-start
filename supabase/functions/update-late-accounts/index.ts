import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mappings } = await req.json();

    if (!mappings || !Array.isArray(mappings)) {
      throw new Error('Mappings array is required');
    }

    console.log('🔧 Starting automatic Late account setup...');
    console.log('📋 Mappings to process:', mappings.length);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = [];

    for (const mapping of mappings) {
      const { businessSlug, platform, accountId } = mapping;
      
      console.log(`\n🔄 Processing: ${platform} → ${businessSlug}`);
      
      try {
        // Construct the column name
        const columnName = `late_${platform}_account_id`;
        
        // Update the business
        const { data, error } = await supabase
          .from('businesses')
          .update({ [columnName]: accountId })
          .eq('slug', businessSlug)
          .select();

        if (error) {
          console.error(`❌ Failed to update ${platform}:`, error);
          results.push({
            success: false,
            platform,
            businessSlug,
            error: error.message
          });
        } else if (!data || data.length === 0) {
          console.error(`❌ Business not found: ${businessSlug}`);
          results.push({
            success: false,
            platform,
            businessSlug,
            error: 'Business not found'
          });
        } else {
          console.log(`✅ Updated ${platform} for ${businessSlug}`);
          results.push({
            success: true,
            platform,
            businessSlug,
            accountId
          });
        }
      } catch (error) {
        console.error(`❌ Exception updating ${platform}:`, error);
        results.push({
          success: false,
          platform,
          businessSlug,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`\n✅ Setup complete: ${successCount}/${results.length} successful`);

    return new Response(
      JSON.stringify({ results, successCount, totalCount: results.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in update-late-accounts:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
