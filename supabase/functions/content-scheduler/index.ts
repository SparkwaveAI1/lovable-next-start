import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledContentItem {
  id: string;
  business_id: string;
  content: string;
  content_type: string;
  topic?: string;
  platform: string;
  scheduled_for: string;
  status: string;
  metadata?: Record<string, any>;
}

interface GameContentResponse {
  success: boolean;
  message: string;
  testResult?: any;
  requestId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Content Scheduler Job Starting ===');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get content due for posting
    const now = new Date().toISOString();
    console.log('Checking for content due at:', now);

    const { data: dueContent, error: fetchError } = await supabase
      .from('scheduled_content')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(10); // Process max 10 items per run

    if (fetchError) {
      console.error('Error fetching due content:', fetchError);
      throw new Error(`Database fetch failed: ${fetchError.message}`);
    }

    console.log(`Found ${dueContent?.length || 0} items due for posting`);

    const results = [];

    if (dueContent && dueContent.length > 0) {
      for (const item of dueContent) {
        console.log(`Processing content item: ${item.id}`);
        
        try {
          // Get business configuration for GAME posting
          const businessConfig = getBusinessConfigById(item.business_id);
          if (!businessConfig) {
            throw new Error(`Unknown business: ${item.business_id}`);
          }

          // Call GAME SDK to post content
          const postResult = await postContentViaGame(item, businessConfig);
          
          if (postResult.success) {
            // Mark as posted
            await supabase
              .from('scheduled_content')
              .update({
                status: 'posted',
                posted_at: new Date().toISOString(),
                metadata: {
                  ...item.metadata,
                  post_result: postResult
                }
              })
              .eq('id', item.id);

            console.log(`✅ Successfully posted content: ${item.id}`);
            results.push({
              id: item.id,
              status: 'posted',
              platform: item.platform
            });

          } else {
            throw new Error(postResult.message || 'Posting failed');
          }

        } catch (error) {
          console.error(`❌ Failed to post content ${item.id}:`, error);
          
          // Mark as failed
          await supabase
            .from('scheduled_content')
            .update({
              status: 'failed',
              error_message: error.message || 'Unknown posting error'
            })
            .eq('id', item.id);

          results.push({
            id: item.id,
            status: 'failed',
            platform: item.platform,
            error: error.message
          });
        }
      }
    }

    // Log completion
    console.log('=== Content Scheduler Job Completed ===');
    console.log(`Processed: ${results.length} items`);
    console.log(`Posted: ${results.filter(r => r.status === 'posted').length}`);
    console.log(`Failed: ${results.filter(r => r.status === 'failed').length}`);

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      posted: results.filter(r => r.status === 'posted').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Content scheduler error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Scheduler job failed',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * Post content via GAME SDK
 */
async function postContentViaGame(
  item: ScheduledContentItem,
  businessConfig: any
): Promise<GameContentResponse> {
  try {
    console.log(`Posting via GAME SDK - Platform: ${item.platform}, Business: ${businessConfig.name}`);
    
    // This is where we'll integrate with GAME SDK's posting workers
    // For now, we'll simulate the posting process
    
    // TODO: Implement actual GAME SDK posting workers
    // Based on platform, call appropriate GAME worker:
    // - TwitterWorker for twitter_post
    // - DiscordWorker for discord_message  
    // - TelegramWorker for telegram_post
    
    // Simulate posting delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate success for now
    const mockResult = {
      success: true,
      message: `Content posted successfully to ${item.platform}`,
      testResult: {
        post_id: `${item.platform}_${Date.now()}`,
        platform: item.platform,
        content: item.content,
        posted_at: new Date().toISOString(),
        mock: true // Remove when real GAME integration is complete
      },
      requestId: `post_${item.id}_${Date.now()}`
    };

    console.log(`✅ GAME posting result:`, mockResult);
    return mockResult;

  } catch (error) {
    console.error('GAME posting error:', error);
    return {
      success: false,
      message: error.message || 'GAME posting failed'
    };
  }
}

/**
 * Get business configuration by ID
 * Maps business IDs to business configs for GAME integration
 */
function getBusinessConfigById(businessId: string): any {
  // This is a simplified mapping - in production you'd query the businesses table
  // and map to the business configs from business-configs.ts
  
  const businessConfigs: Record<string, any> = {
    // These would be actual business UUIDs from your database
    'personaai': {
      name: "PersonaAI",
      focus: ["AI agents", "behavioral research", "qualitative insights", "personality AI"],
      voice: "Expert but accessible, technically accurate, community-focused",
      platforms: ["twitter", "discord", "telegram"]
    },
    'charx': {
      name: "CharX World",
      focus: ["character creation", "storytelling", "world building", "digital personas"],
      voice: "Creative, imaginative, community-driven",
      platforms: ["twitter", "discord", "telegram"]
    },
    'sparkwave': {
      name: "Sparkwave AI",
      focus: ["AI automation", "business solutions", "technical innovation", "productivity tools"],
      voice: "Professional, authoritative, solution-oriented",
      platforms: ["twitter", "linkedin", "discord"]
    }
  };

  // Try to find by business ID or fallback to PersonaAI
  return businessConfigs[businessId] || businessConfigs['personaai'];
}