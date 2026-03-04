import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
}

const AGENTS = [
  { name: "Rico", ip: "5.161.190.94", port: 18789, role: "Lead Orchestrator" },
  { name: "Dev", ip: "5.161.186.106", port: 18789, role: "Development Agent" },
  { name: "Iris", ip: "178.156.250.119", port: 18789, role: "Communications Specialist" },
  { name: "Jerry", ip: "5.161.184.240", port: 18789, role: "Operations Agent" },
]

async function pingAgent(
  ip: string,
  port: number
): Promise<{ online: boolean; latencyMs?: number }> {
  const start = Date.now()
  const urls = [
    `http://${ip}:${port}/health`,
    `http://${ip}:${port}/`,
  ]
  for (const url of urls) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)
      if (res.status < 500) {
        return { online: true, latencyMs: Date.now() - start }
      }
    } catch {
      // Try next URL
    }
  }
  return { online: false }
}

async function fetchN8nWorkflows(
  apiKey: string,
  instanceUrl: string
): Promise<{ workflows: unknown[]; error: string | null }> {
  if (!apiKey) return { workflows: [], error: "No API key configured" }
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${instanceUrl}/api/v1/workflows?limit=50`, {
      headers: { "X-N8N-API-KEY": apiKey, Accept: "application/json" },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return { workflows: [], error: `HTTP ${res.status}` }
    const json = await res.json()
    return { workflows: json.data ?? [], error: null }
  } catch (e) {
    return { workflows: [], error: String(e) }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const n8nApiKey = Deno.env.get("N8N_API_KEY") ?? ""
    const n8nUrl = Deno.env.get("N8N_INSTANCE_URL") ?? "https://sparkwaveai.app.n8n.cloud"

    const supabase = createClient(supabaseUrl, supabaseKey)
    const now = new Date().toISOString()

    // ── 1. Ping all agents in parallel ────────────────────────────────────────
    const pingResults = await Promise.allSettled(
      AGENTS.map((a) => pingAgent(a.ip, a.port))
    )

    const agentStatuses = AGENTS.map((agent, i) => {
      const result = pingResults[i]
      const ping = result.status === "fulfilled" ? result.value : { online: false }
      return {
        name: agent.name,
        ip: agent.ip,
        port: agent.port,
        role: agent.role,
        online: ping.online,
        latencyMs: ping.online ? (ping as { online: true; latencyMs: number }).latencyMs : undefined,
        checkedAt: now,
      }
    })

    // ── 2. n8n Workflows (proxy — key never exposed to browser) ───────────────
    const n8nData = await fetchN8nWorkflows(n8nApiKey, n8nUrl)

    interface WorkflowRecord { id: string; name: string; active: boolean; updatedAt?: string }
    const n8nWorkflows = (n8nData.workflows as WorkflowRecord[]).map((wf) => ({
      id: wf.id,
      name: wf.name,
      active: wf.active,
      updatedAt: wf.updatedAt ?? null,
    }))

    // ── 3. Cron Status (system_registry + system_status_log) ──────────────────
    const [registryResult, cronLogResult] = await Promise.allSettled([
      supabase
        .from("system_registry")
        .select("id, name, type, category, schedule")
        .eq("type", "cron")
        .limit(100),
      supabase
        .from("system_status_log")
        .select("registry_id, status, last_run, next_run, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(300),
    ])

    const registryItems =
      registryResult.status === "fulfilled" ? (registryResult.value.data ?? []) : []
    const cronLogs =
      cronLogResult.status === "fulfilled" ? (cronLogResult.value.data ?? []) : []

    interface RegistryRecord { id: string; name: string; category: string; schedule: string | null }
    interface CronLogRecord {
      registry_id: string
      status: string
      last_run: string | null
      next_run: string | null
      error_message: string | null
      created_at: string
    }

    const registryMap: Record<string, RegistryRecord> = {}
    for (const item of registryItems as RegistryRecord[]) {
      registryMap[item.id] = item
    }

    // Get latest log entry per registry_id
    const latestByRegistry: Record<string, CronLogRecord> = {}
    for (const log of cronLogs as CronLogRecord[]) {
      if (!latestByRegistry[log.registry_id]) {
        latestByRegistry[log.registry_id] = log
      }
    }

    // Map category → group label
    const categoryLabel: Record<string, string> = {
      fightflow: "Fight Flow",
      twitter: "Twitter",
      health: "System",
      mission_control: "System",
    }

    // Build cron status array from registry (all crons) + latest log entry
    const cronStatus = (registryItems as RegistryRecord[]).map((reg) => {
      const log = latestByRegistry[reg.id]
      return {
        id: reg.id,
        name: reg.name,
        category: reg.category,
        group: categoryLabel[reg.category] ?? "System",
        schedule: reg.schedule,
        status: log?.status ?? "unknown",
        lastRun: log?.last_run ?? log?.created_at ?? null,
        nextRun: log?.next_run ?? null,
        errorMessage: log?.error_message ?? null,
        consecutiveErrors: 0, // not tracked in current schema
      }
    })

    // Sort: errors first, then by name
    cronStatus.sort((a, b) => {
      const aErr = a.status === "failed" || a.status === "error" ? 0 : 1
      const bErr = b.status === "failed" || b.status === "error" ? 0 : 1
      if (aErr !== bErr) return aErr - bErr
      return a.name.localeCompare(b.name)
    })

    // ── 4. Fight Flow Pipeline Health ─────────────────────────────────────────
    const [ffFormResult, ffSmsResult, ffN8nResult] = await Promise.allSettled([
      supabase
        .from("fightflow_form_submissions")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("sms_messages")
        .select("created_at")
        .eq("direction", "outbound")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("ff_n8n_state")
        .select("key, value, updated_at")
        .in("key", ["form_capture_last_poll", "immediate_response_last_run"]),
    ])

    const ffFormData = ffFormResult.status === "fulfilled" ? ffFormResult.value.data : null
    const ffSmsData = ffSmsResult.status === "fulfilled" ? ffSmsResult.value.data : null
    const ffN8nData = ffN8nResult.status === "fulfilled" ? ffN8nResult.value.data : null

    interface N8nStateRow { key: string; value: string; updated_at: string }
    const n8nStateMap: Record<string, string> = {}
    for (const row of (ffN8nData ?? []) as N8nStateRow[]) {
      n8nStateMap[row.key] = row.value ?? row.updated_at
    }

    const fightflow = {
      lastFormSubmission: ffFormData?.[0]?.created_at ?? null,
      lastSmsSent: ffSmsData?.[0]?.created_at ?? null,
      formCaptureLastPoll: n8nStateMap["form_capture_last_poll"] ?? null,
      immediateResponseLastRun: n8nStateMap["immediate_response_last_run"] ?? null,
    }

    return new Response(
      JSON.stringify({
        agents: agentStatuses,
        n8n: { workflows: n8nWorkflows, error: n8nData.error },
        cronStatus,
        fightflow,
        fetchedAt: now,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("system-monitor fatal:", err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
