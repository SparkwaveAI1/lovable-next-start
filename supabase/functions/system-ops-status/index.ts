import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SystemRegistry {
  id: string
  name: string
  category: string
  type: string
  script_path?: string
  schedule?: string
  pipeline?: string
  trigger_type?: string
}

interface StatusResult {
  registry_id: string
  status: 'success' | 'failed' | 'stale' | 'unknown'
  last_run?: string
  next_run?: string
  error_message?: string
  runtime_seconds?: number
  metadata?: Record<string, any>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Denv.get('SUPABASE_URL') ?? '',
      Denv.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('System Ops Status Check - Starting...')

    // Get all registered system components
    const { data: registryItems, error: fetchError } = await supabaseClient
      .from('system_registry')
      .select('*')

    if (fetchError) {
      throw new Error(`Failed to fetch registry: ${fetchError.message}`)
    }

    console.log(`Found ${registryItems?.length || 0} registered components`)

    const statusResults: StatusResult[] = []
    const now = new Date()

    // Process each registry item
    for (const item of registryItems || []) {
      console.log(`Checking status for: ${item.name} (${item.type})`)
      
      try {
        const status = await checkComponentStatus(item, supabaseClient)
        statusResults.push({
          registry_id: item.id,
          ...status
        })
      } catch (error) {
        console.error(`Error checking ${item.name}:`, error)
        statusResults.push({
          registry_id: item.id,
          status: 'unknown',
          error_message: error.message,
          metadata: { checked_at: now.toISOString() }
        })
      }
    }

    // Insert status results
    const { error: insertError } = await supabaseClient
      .from('system_status_log')
      .insert(statusResults)

    if (insertError) {
      throw new Error(`Failed to insert status results: ${insertError.message}`)
    }

    console.log(`Successfully recorded status for ${statusResults.length} components`)

    // Summary stats
    const summary = {
      total: statusResults.length,
      success: statusResults.filter(r => r.status === 'success').length,
      failed: statusResults.filter(r => r.status === 'failed').length,
      stale: statusResults.filter(r => r.status === 'stale').length,
      unknown: statusResults.filter(r => r.status === 'unknown').length,
      checked_at: now.toISOString()
    }

    return new Response(JSON.stringify({ 
      success: true, 
      summary,
      message: `Status check completed for ${summary.total} components`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('System ops status check failed:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function checkComponentStatus(
  item: SystemRegistry, 
  supabase: any
): Promise<Omit<StatusResult, 'registry_id'>> {
  const now = new Date()
  
  if (item.type === 'edge_function') {
    return await checkEdgeFunctionStatus(item, supabase)
  } else if (item.type === 'cron') {
    return await checkCronStatus(item, supabase, now)
  } else if (item.type === 'script') {
    return await checkScriptStatus(item, supabase, now)
  }
  
  return {
    status: 'unknown',
    error_message: `Unknown component type: ${item.type}`,
    metadata: { checked_at: now.toISOString() }
  }
}

async function checkEdgeFunctionStatus(
  item: SystemRegistry,
  supabase: any
): Promise<Omit<StatusResult, 'registry_id'>> {
  try {
    // For edge functions, we can't easily check their health without invoking them
    // So we check if they exist in the function registry and assume they're healthy
    // unless we have specific logs indicating otherwise
    
    // For SMS webhook, AI response, etc., we could check recent activity
    if (item.name.includes('SMS') || item.name.includes('AI Response')) {
      // Check recent SMS activity as a proxy for health
      const { data: recentSms, error } = await supabase
        .from('sms_messages')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (!error && recentSms?.length > 0) {
        const lastActivity = new Date(recentSms[0].created_at)
        const hoursAgo = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60)
        
        return {
          status: hoursAgo > 24 ? 'stale' : 'success',
          last_run: lastActivity.toISOString(),
          metadata: { 
            hours_since_activity: Math.round(hoursAgo * 10) / 10,
            proxy_check: 'sms_messages'
          }
        }
      }
    }
    
    // For other edge functions, assume healthy (we could ping them with a health check endpoint)
    return {
      status: 'success',
      metadata: { 
        type: 'edge_function_assumed_healthy',
        note: 'Edge functions are assumed healthy unless specific issues detected'
      }
    }
  } catch (error) {
    return {
      status: 'failed',
      error_message: error.message,
      metadata: { check_type: 'edge_function' }
    }
  }
}

async function checkCronStatus(
  item: SystemRegistry,
  supabase: any,
  now: Date
): Promise<Omit<StatusResult, 'registry_id'>> {
  try {
    // For crons, we need to check when they last ran successfully
    // We can look at mc_activities for OpenClaw crons or try to infer from related data
    
    if (item.trigger_type === 'openclaw_cron') {
      // Check mc_activities for this cron
      const { data: activities, error } = await supabase
        .from('mc_activities')
        .select('created_at, type, details')
        .eq('type', 'cron_run')
        .ilike('details', `%${item.name}%`)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (!error && activities?.length > 0) {
        const lastRun = new Date(activities[0].created_at)
        const hoursAgo = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60)
        
        return {
          status: hoursAgo > 12 ? 'stale' : 'success',
          last_run: lastRun.toISOString(),
          metadata: { 
            hours_since_run: Math.round(hoursAgo * 10) / 10,
            source: 'mc_activities'
          }
        }
      }
    }
    
    // For system crons, we could check system logs or related data
    if (item.trigger_type === 'system_cron') {
      // For specific crons, check their output/effects
      if (item.name.includes('Fight Flow')) {
        // Check recent Fight Flow activity
        const { data: leads, error } = await supabase
          .from('fightflow_leads')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (!error && leads?.length > 0) {
          const lastActivity = new Date(leads[0].created_at)
          const hoursAgo = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
          
          return {
            status: hoursAgo > 12 ? 'stale' : 'success',
            last_run: lastActivity.toISOString(),
            metadata: { 
              hours_since_activity: Math.round(hoursAgo * 10) / 10,
              proxy_check: 'fightflow_leads'
            }
          }
        }
      }
      
      if (item.name.includes('Twitter')) {
        // Check recent Twitter posts
        const { data: posts, error } = await supabase
          .from('content_posts')
          .select('created_at')
          .eq('platform', 'twitter')
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (!error && posts?.length > 0) {
          const lastPost = new Date(posts[0].created_at)
          const hoursAgo = (now.getTime() - lastPost.getTime()) / (1000 * 60 * 60)
          
          return {
            status: hoursAgo > 6 ? 'stale' : 'success',
            last_run: lastPost.toISOString(),
            metadata: { 
              hours_since_post: Math.round(hoursAgo * 10) / 10,
              proxy_check: 'content_posts'
            }
          }
        }
      }
    }
    
    // Default: assume it's working if no specific issues found
    return {
      status: 'unknown',
      metadata: { 
        note: 'Unable to determine cron status without specific logs',
        trigger_type: item.trigger_type
      }
    }
  } catch (error) {
    return {
      status: 'failed',
      error_message: error.message,
      metadata: { check_type: 'cron' }
    }
  }
}

async function checkScriptStatus(
  item: SystemRegistry,
  supabase: any,
  now: Date
): Promise<Omit<StatusResult, 'registry_id'>> {
  try {
    // For manual scripts, check if they've been run recently via mc_activities
    const { data: activities, error } = await supabase
      .from('mc_activities')
      .select('created_at, type, details')
      .ilike('details', `%${item.name}%`)
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (!error && activities?.length > 0) {
      const lastRun = new Date(activities[0].created_at)
      const daysAgo = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24)
      
      return {
        status: daysAgo > 7 ? 'stale' : 'success',
        last_run: lastRun.toISOString(),
        metadata: { 
          days_since_run: Math.round(daysAgo * 10) / 10,
          source: 'mc_activities'
        }
      }
    }
    
    return {
      status: 'unknown',
      metadata: { 
        note: 'Manual script - no recent activity found in mc_activities'
      }
    }
  } catch (error) {
    return {
      status: 'failed',
      error_message: error.message,
      metadata: { check_type: 'script' }
    }
  }
}