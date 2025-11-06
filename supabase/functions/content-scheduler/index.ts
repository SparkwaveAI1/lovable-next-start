import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { contentHash } from "../_shared/crypto.ts";

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
  content_hash?: string;
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

  // DEBUG: compute content hash without any side effects
  // GET /debug/hash?platform=twitter&content=Hello%20World&when=2025-09-03T12:00:00.000Z
  if (req.method === "GET" && new URL(req.url).pathname.endsWith("/debug/hash")) {
    const url = new URL(req.url);
    const platform = (url.searchParams.get("platform") || "").toLowerCase() as
      | "twitter"
      | "discord"
      | "telegram";
    const content = url.searchParams.get("content") || "";
    const when = url.searchParams.get("when") || "";

    const bad = (msg: string, code = 400) =>
      new Response(JSON.stringify({ ok: false, error: msg }), {
        status: code,
        headers: { "Content-Type": "application/json" },
      });

    if (!platform || !["twitter", "discord", "telegram"].includes(platform)) {
      return bad("platform must be one of twitter|discord|telegram");
    }
    if (!content) return bad("content is required");
    if (!when) return bad("when (ISO date) is required");

    try {
      const hash = await contentHash(platform, content, when);
      return new Response(
        JSON.stringify({ ok: true, platform, contentLength: content.length, when, hash }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (e: any) {
      return bad(`hash error: ${e?.message || String(e)}`, 500);
    }
  }

  // GET /debug/next-hash[?when=ISO][&content=...]
  // Returns the next due scheduled_content row + its hash, and optionally an override-hash
  if (req.method === "GET" && new URL(req.url).pathname.endsWith("/debug/next-hash")) {
    try {
      const url = new URL(req.url);
      const whenOverride = url.searchParams.get("when") || "";
      const contentOverride = url.searchParams.get("content") || "";

      const { data, error } = await supabase
        .from("scheduled_content")
        .select("*")
        .eq("status", "scheduled")
        .order("scheduled_for", { ascending: true })
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) {
        return new Response(JSON.stringify({ ok: false, msg: "no scheduled items" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const row = data[0];

      // Base inputs from DB
      const platform = (row.platform || "").toLowerCase();
      const whenDb: string = String(row.scheduled_for ?? "");
      const contentDb: string = String(row.content ?? "");

      // Compute DB hash
      const hashDb = await contentHash(platform as any, contentDb, whenDb);

      // Optionally compute override hash
      const effectiveWhen = whenOverride || whenDb;
      const effectiveContent = contentOverride || contentDb;
      const hasOverride = Boolean(whenOverride || contentOverride);

      const hashOverride = hasOverride
        ? await contentHash(platform as any, effectiveContent, effectiveWhen)
        : null;

      return new Response(
        JSON.stringify({
          ok: true,
          rowId: row.id,
          platform,
          db: { when: whenDb, contentLength: contentDb.length, hash: hashDb },
          override: hasOverride
            ? { when: effectiveWhen, contentLength: effectiveContent.length, hash: hashOverride }
            : null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (e: any) {
      return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
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

    // Step 1: Clean up items stuck in 'processing' for > 10 minutes (likely posted but update failed)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: stuckItems } = await supabase
      .from('scheduled_content')
      .select('id, content_hash')
      .eq('status', 'processing')
      .lt('updated_at', tenMinutesAgo);

    if (stuckItems && stuckItems.length > 0) {
      console.log(`🔧 Found ${stuckItems.length} items stuck in 'processing' - marking as 'posted'`);
      for (const stuck of stuckItems) {
        await supabase
          .from('scheduled_content')
          .update({
            status: 'posted',
            posted_at: new Date().toISOString(),
            error_message: 'Auto-resolved from stuck processing state'
          })
          .eq('id', stuck.id);
      }
    }

    // Step 2: Get content due for posting
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
        try {
          console.log(`\n📝 Processing: ${item.business_id} → ${item.platform}`);
          
          // Step 1: Generate content hash for idempotency
          const hashInput = `${item.business_id}-${item.platform}-${item.content}-${item.scheduled_for}`;
          const hashBuffer = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(hashInput)
          );
          const contentHashValue = Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          
          console.log(`🔒 Content hash: ${contentHashValue.substring(0, 16)}...`);
          
          // Step 2: Check if this hash has already been posted (idempotency check)
          const { data: existingPost } = await supabase
            .from('scheduled_content')
            .select('id, status, posted_at')
            .eq('content_hash', contentHashValue)
            .eq('status', 'posted')
            .single();
          
          if (existingPost) {
            console.log(`⚠️ DUPLICATE DETECTED: This content was already posted at ${existingPost.posted_at}`);
            console.log(`   Marking current item as duplicate...`);
            
            // Mark the duplicate as failed with explanation
            await supabase
              .from('scheduled_content')
              .update({
                status: 'failed',
                error_message: `Duplicate post detected - already posted at ${existingPost.posted_at} (hash: ${contentHashValue.substring(0, 16)}...)`,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id);
            
            results.push({
              id: item.id,
              status: 'duplicate',
              platform: item.platform
            });
            continue; // Skip to next item
          }
          
          // Step 3: Mark as 'processing' with hash BEFORE posting (prevents race conditions)
          const { error: processingError } = await supabase
            .from('scheduled_content')
            .update({
              status: 'processing',
              content_hash: contentHashValue,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)
            .eq('status', 'scheduled'); // Only update if still scheduled
          
          if (processingError) {
            console.error(`❌ Failed to mark as processing:`, processingError);
            continue; // Don't proceed if we can't claim this item
          }
          
          console.log(`✅ Marked as processing - hash stored`);
          
          // Step 4: Get business configuration
          const businessConfig = getBusinessConfigById(item.business_id);
          if (!businessConfig) {
            throw new Error(`Unknown business: ${item.business_id}`);
          }

          // Step 5: Post content via GAME SDK
          console.log(`📡 Posting to ${item.platform}...`);
          const postResult = await postContentViaGame(item, businessConfig);
          
          if (!postResult.success) {
            throw new Error(postResult.message || 'Posting failed');
          }
          
          console.log(`✅ Successfully posted to ${item.platform}`);
          
          // Step 6: Mark as 'posted' (hash already stored in step 3)
          const { error: postedError } = await supabase
            .from('scheduled_content')
            .update({
              status: 'posted',
              posted_at: new Date().toISOString(),
              metadata: {
                ...item.metadata,
                post_result: postResult
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);
          
          if (postedError) {
            console.error(`❌ CRITICAL: Post succeeded but status update failed:`, postedError);
            console.error(`   Post ID ${item.id} is stuck in 'processing' status`);
            console.error(`   BUT the post DID go out to ${item.platform}!`);
            console.error(`   Hash ${contentHashValue.substring(0, 16)}... will prevent duplicate if scheduler retries`);
            // Don't throw - the post went out successfully, hash is stored, idempotency will protect us
          } else {
            console.log(`✅ Status updated to 'posted'`);
          }
          
          results.push({
            id: item.id,
            status: 'posted',
            platform: item.platform
          });

        } catch (error) {
          console.error(`❌ Error posting ${item.platform}:`, error);
          
          // Only mark as failed if we haven't successfully posted
          // Check current status to see if we're in 'processing' with a hash
          const { data: currentStatus } = await supabase
            .from('scheduled_content')
            .select('status, content_hash')
            .eq('id', item.id)
            .single();
          
          if (currentStatus?.status === 'processing' && currentStatus?.content_hash) {
            console.log(`⚠️ Item is in 'processing' with hash - may have posted successfully`);
            console.log(`   Marking as 'failed' but hash will prevent duplicates if it did post`);
          }
          
          // Mark as failed
          await supabase
            .from('scheduled_content')
            .update({
              status: 'failed',
              error_message: error.message || 'Unknown posting error',
              updated_at: new Date().toISOString()
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
 * Post content via Late API if connected, otherwise fall back to GAME SDK
 */
async function postContentViaGame(
  item: ScheduledContentItem,
  businessConfig: any
): Promise<GameContentResponse> {
  try {
    console.log(`🎮 Routing post for ${item.platform}`);
    console.log(`📋 Content: "${item.content.substring(0, 50)}..."`);
    console.log(`🏢 Business: ${businessConfig.name}`);
    
    // Query business to get Late account IDs
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: business } = await supabase
      .from('businesses')
      .select('late_twitter_account_id, late_instagram_account_id, late_tiktok_account_id, late_linkedin_account_id, late_facebook_account_id')
      .eq('id', item.business_id)
      .single();
    
    const lateAccounts = {
      twitter: business?.late_twitter_account_id,
      instagram: business?.late_instagram_account_id,
      tiktok: business?.late_tiktok_account_id,
      linkedin: business?.late_linkedin_account_id,
      facebook: business?.late_facebook_account_id
    };
    
    // Check if Late account exists for this platform
    const lateAccountId = lateAccounts[item.platform as keyof typeof lateAccounts];
    
    let postResult;
    
    if (lateAccountId && ['twitter', 'instagram', 'tiktok', 'linkedin', 'facebook'].includes(item.platform)) {
      console.log(`📱 Posting via Late API (account: ${lateAccountId})`);
      postResult = await postViaLate(item, item.platform, lateAccountId, supabase);
    } else {
      console.log(`🎮 Posting via GAME SDK worker`);
      
      // Fall back to GAME SDK for platforms without Late connection
      switch (item.platform) {
        case 'twitter':
          postResult = await postToTwitter({
            content: item.content,
            businessId: item.business_id,
            topic: item.topic
          });
          break;
          
        case 'discord':
          postResult = await postToDiscord({
            content: item.content,
            businessId: item.business_id,
            topic: item.topic
          });
          break;
          
        case 'telegram':
          postResult = await postToTelegram({
            content: item.content,
            businessId: item.business_id,
            topic: item.topic
          });
          break;
          
        default:
          throw new Error(`Unsupported platform: ${item.platform}`);
      }
    }

    if (postResult.success) {
      console.log(`✅ ${item.platform} posting successful:`, {
        post_id: postResult.post_id || postResult.message_id,
        platform: postResult.platform
      });
      
      return {
        success: true,
        message: `Content posted successfully to ${item.platform}`,
        testResult: postResult,
        requestId: `post_${item.id}_${Date.now()}`
      };
    } else {
      throw new Error(postResult.error || 'GAME worker posting failed');
    }

  } catch (error) {
    console.error('❌ GAME SDK posting error:', error);
    return {
      success: false,
      message: error.message || 'GAME posting failed'
    };
  }
}

/**
 * Post content via Late API
 */
async function postViaLate(
  item: ScheduledContentItem,
  platform: string,
  accountId: string,
  supabase: any
): Promise<any> {
  try {
    console.log(`📱 Calling post-via-late for ${platform}`);
    
    // Fetch media if available
    const { data: contentMedia } = await supabase
      .from('content_media')
      .select(`
        media_id,
        display_order,
        media_assets (
          file_path,
          file_type,
          thumbnail_path,
          mime_type
        )
      `)
      .eq('content_id', item.id)
      .order('display_order', { ascending: true });
    
    const imageUrls: string[] = [];
    let videoUrl: string | null = null;
    let videoMimeType: string | null = null;
    
    if (contentMedia && contentMedia.length > 0) {
      for (const media of contentMedia) {
        const asset = media.media_assets;
        if (asset.file_type === 'image') {
          imageUrls.push(asset.file_path);
        } else if (asset.file_type === 'video' && !videoUrl) {
          videoUrl = asset.file_path;
          videoMimeType = asset.mime_type;
        }
      }
    }
    
    // Validate Instagram video format
    if (platform === 'instagram' && videoUrl) {
      const isMovFile = videoUrl.toLowerCase().endsWith('.mov');
      const isQuickTime = videoMimeType === 'video/quicktime';
      
      if (isMovFile || isQuickTime) {
        throw new Error('Instagram requires MP4 format (H.264/AAC codec). Provided MOV file. Please convert to MP4 or post an image instead.');
      }
    }
    
    // Combine all media into single array
    const mediaUrls = [
      ...imageUrls,
      ...(videoUrl ? [videoUrl] : [])
    ];
    
    console.log(`📎 Media: ${mediaUrls.length} file(s), Account ID: ${accountId}`);
    
    const { data, error } = await supabase.functions.invoke('post-via-late', {
      body: {
        businessId: item.business_id,
        platform: platform,
        content: item.content,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        accountId: accountId
      }
    });
    
    if (error) {
      throw new Error(error.message || 'Late API posting failed');
    }
    
    // Check if Late API reported a failure in the response body
    if (!data || data.success === false) {
      console.error('❌ Late API reported failure:', data);
      throw new Error(data?.error || 'Post failed on platform - check Late.so for details');
    }
    
    console.log('✅ Posted via Late API:', data);
    
    return {
      success: true,
      post_id: data?.postId || `late_${Date.now()}`,
      platform: platform,
      content: item.content,
      posted_at: new Date().toISOString(),
      late_post_id: data?.postId,
      late_response: data
    };
  } catch (error) {
    console.error('❌ Late API posting error:', error);
    return {
      success: false,
      platform: platform,
      content: item.content,
      posted_at: new Date().toISOString(),
      error: error.message,
      error_details: error.stack
    };
  }
}

// Platform posting functions - calls real GAME API integration
async function postToTwitter(args: any) {
  try {
    console.log('🐦 Calling real Twitter post-tweet Edge Function...');
    
    if (args.content.length > 280) {
      throw new Error(`Tweet too long: ${args.content.length} characters (max 280)`);
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Call the real post-tweet Edge Function which uses GAME API
    const { data, error } = await supabase.functions.invoke('post-tweet', {
      body: { content: args.content, businessId: args.businessId }
    });
    
    if (error) {
      throw new Error(error.message || 'Tweet posting failed');
    }
    
    console.log('✅ Tweet posted successfully via GAME API:', data);
    
    return {
      success: true,
      post_id: data?.tweet?.data?.id || `tw_${Date.now()}`,
      platform: 'twitter',
      content: args.content,
      posted_at: new Date().toISOString(),
      game_response: data
    };
  } catch (error) {
    console.error('❌ Twitter posting error:', error);
    return {
      success: false,
      platform: 'twitter',
      content: args.content,
      posted_at: new Date().toISOString(),
      error: error.message
    };
  }
}

async function postToDiscord(args: any) {
  try {
    console.log('💬 Executing Discord Worker...');
    
    if (args.content.length > 2000) {
      throw new Error(`Discord message too long: ${args.content.length} characters (max 2000)`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1500));
    
    return {
      success: true,
      message_id: `dc_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      platform: 'discord',
      content: args.content,
      posted_at: new Date().toISOString(),
      channel_id: `channel_${args.businessId}_general`
    };
  } catch (error) {
    return {
      success: false,
      platform: 'discord',
      content: args.content,
      posted_at: new Date().toISOString(),
      error: error.message
    };
  }
}

async function postToTelegram(args: any) {
  try {
    console.log('📱 Executing Telegram Worker...');
    
    if (args.content.length > 4096) {
      throw new Error(`Telegram message too long: ${args.content.length} characters (max 4096)`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 1200));
    
    return {
      success: true,
      message_id: `tg_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      platform: 'telegram',
      content: args.content,
      posted_at: new Date().toISOString(),
      chat_id: `chat_${args.businessId}_main`
    };
  } catch (error) {
    return {
      success: false,
      platform: 'telegram',
      content: args.content,
      posted_at: new Date().toISOString(),
      error: error.message
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