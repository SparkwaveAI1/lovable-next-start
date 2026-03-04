import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
}

const AGENTS = [
  { name: "Rico", ip: "5.161.190.94", port: 18789, role: "Lead Orchestrator" },
  { name: "Iris", ip: "178.156.250.119", port: 18789, role: "Communications Specialist" },
  { name: "Dev", ip: "5.161.186.106", port: 18789, role: "Development Agent" },
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
      const latencyMs = Date.now() - start
      // Any HTTP response means server is up
      return { online: true, latencyMs }
    } catch {
      // Try next URL
    }
  }
  return { online: false }
}

async function fetchN8nData(
  apiKey: string,
  instanceUrl: string
): Promise<{ workflows: unknown[]; executions: unknown[]; error: string | null }> {
  if (!apiKey) return { workflows: [], executions: [], error: "No API key" }

  try {
    const wfController = new AbortController()
    const wfTimer = setTimeout(() => wfController.abort(), 10000)

    const wfRes = await fetch(`${instanceUrl}/api/v1/workflows?limit=50`, {
      headers: { "X-N8N-API-KEY": apiKey, Accept: "application/json" },
      signal: wfController.signal,
    })
    clearTimeout(wfTimer)

    const execController = new AbortController()
    const execTimer = setTimeout(() => execController.abort(), 10000)
    const execRes = await fetch(`${instanceUrl}/api/v1/executions?limit=50&includeData=false`, {
      headers: { "X-N8N-API-KEY": apiKey, Accept: "application/json" },
      signal: execController.signal,
    })
    clearTimeout(execTimer)

    const workflows = wfRes.ok ? ((await wfRes.json()).data ?? []) : []
    const executions = execRes.ok ? ((await execRes.json()).data ?? []) : []
    const error = !wfRes.ok ? `Workflows HTTP ${wfRes.status}` : null

    return { workflows, executions, error }
  } catch (e) {
    return { workflows: [], executions: [], error: String(e) }
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

    // 1. Ping all agents in parallel
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
        latencyMs: ping.online ? ping.latencyMs : undefined,
        checkedAt: now,
      }
    })

    // 2. n8n data
    const n8nData = await fetchN8nData(n8nApiKey, n8nUrl)

    // Build exec map
    interface ExecRecord {
      workflowId: string
      startedAt?: string
      createdAt?: string
      status?: string
    }
    const execByWorkflow: Record<string, ExecRecord[]> = {}
    for (const exec of n8nData.executions as ExecRecord[]) {
      if (!execByWorkflow[exec.workflowId]) execByWorkflow[exec.workflowId] = []
      execByWorkflow[exec.workflowId].push(exec)
    }

    interface WorkflowRecord { id: string; name: string; active: boolean }
    const workflowStatus = (n8nData.workflows as WorkflowRecord[]).map((wf) => {
      const execs = execByWorkflow[wf.id] || []
      const last = execs[0] || null
      return {
        id: wf.id,
        name: wf.name,
        active: wf.active,
        lastRunAt: last?.startedAt || last?.createdAt || null,
        lastStatus: last?.status || null,
      }
    })

    // 3. Recent errors
    const { data: recentErrors } = await supabase
      .from("automation_logs")
      .select("id, automation_type, status, error_message, created_at, business_id")
      .eq("status", "error")
      .order("created_at", { ascending: false })
      .limit(10)

    // 4. Cron status
    const [cronLogResult, registryResult] = await Promise.allSettled([
      supabase
        .from("system_status_log")
        .select("id, registry_id, status, last_run, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("system_registry")
        .select("id, name, type, category, schedule")
        .limit(100),
    ])

    const cronData =
      cronLogResult.status === "fulfilled" ? (cronLogResult.value.data ?? []) : []
    const registryItems =
      registryResult.status === "fulfilled" ? (registryResult.value.data ?? []) : []

    interface RegistryRecord { id: string; name: string; type: string; schedule: string | null }
    const registryMap: Record<string, RegistryRecord> = {}
    for (const item of registryItems as RegistryRecord[]) {
      registryMap[item.id] = item
    }

    const seenIds = new Set<string>()
    interface CronLogRecord {
      registry_id: string
      status: string
      last_run: string | null
      error_message: string | null
      created_at: string
    }
    const cronStatus = (cronData as CronLogRecord[])
      .filter((e) => {
        // Only include entries that have a matching registry record named (not UUID-only)
        if (!registryMap[e.registry_id]) return false
        if (seenIds.has(e.registry_id)) return false
        seenIds.add(e.registry_id)
        return true
      })
      .map((e) => ({
        id: e.registry_id,
        name: registryMap[e.registry_id]?.name || e.registry_id,
        type: registryMap[e.registry_id]?.type || "unknown",
        schedule: registryMap[e.registry_id]?.schedule || null,
        status: e.status,
        lastRun: e.last_run || e.created_at,
        errorMessage: e.error_message,
      }))

    return new Response(
      JSON.stringify({
        agents: agentStatuses,
        n8n: { workflows: workflowStatus, error: n8nData.error },
        recentErrors: recentErrors || [],
        cronStatus,
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
