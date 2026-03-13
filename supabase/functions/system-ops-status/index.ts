// system-ops-status — no external imports, uses native Deno fetch
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const sbHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    }
    const now = new Date().toISOString()

    // Fetch registry items
    const regRes = await fetch(`${supabaseUrl}/rest/v1/system_registry?select=id,name,type,category`, { headers: sbHeaders })
    const items = regRes.ok ? await regRes.json() : []

    // Fetch recent status logs
    const logRes = await fetch(`${supabaseUrl}/rest/v1/system_status_log?order=last_run.desc&limit=100`, { headers: sbHeaders })
    const logs = logRes.ok ? await logRes.json() : []

    // Build a map of latest status per registry_id
    const latestStatus: Record<string, { status: string; last_run: string }> = {}
    for (const log of logs) {
      if (!latestStatus[log.registry_id]) {
        latestStatus[log.registry_id] = { status: log.status, last_run: log.last_run }
      }
    }

    // Merge registry + status
    const systemStatus = items.map((item: { id: string; name: string; type: string; category: string }) => {
      const latest = latestStatus[item.id]
      const lastRun = latest?.last_run ?? null
      let status = latest?.status ?? 'unknown'

      // Mark as stale if last run > 2 hours ago
      if (lastRun) {
        const ageMs = Date.now() - new Date(lastRun).getTime()
        if (ageMs > 2 * 60 * 60 * 1000 && status === 'success') {
          status = 'stale'
        }
      }

      return {
        id: item.id,
        name: item.name,
        type: item.type,
        category: item.category,
        status,
        last_run: lastRun,
      }
    })

    return new Response(JSON.stringify({
      success: true,
      total: systemStatus.length,
      stale: systemStatus.filter((s: { status: string }) => s.status === 'stale').length,
      failed: systemStatus.filter((s: { status: string }) => s.status === 'failed').length,
      systems: systemStatus,
      timestamp: now,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
