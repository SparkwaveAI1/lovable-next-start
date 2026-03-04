import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const AGENTS = [
  { name: "Rico", ip: "5.161.190.94", port: 18789, role: "Lead Orchestrator" },
  { name: "Iris", ip: "178.156.250.119", port: 18789, role: "Communications Specialist" },
  { name: "Dev", ip: "5.161.186.106", port: 18789, role: "Development Agent" },
  { name: "Jerry", ip: "5.161.184.240", port: 18789, role: "Operations Agent" },
]

async function pingAgent(ip: string, port: number): Promise<{ online: boolean; latencyMs?: number }> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(`http://${ip}:${port}/health`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const latencyMs = Date.now() - start
    return { online: res.ok || res.status < 500, latencyMs }
  } catch {
    // Try a TCP-like check by hitting the root
    try {
      const controller2 = new AbortController()
      const timeout2 = setTimeout(() => controller2.abort(), 4000)
      const res2 = await fetch(`http://${ip}:${port}/`, {
        signal: controller2.signal,
      })
      clearTimeout(timeout2)
      const latencyMs = Date.now() - start
      return { online: true, latencyMs }
    } catch {
      return { online: false }
    }
  }
}

async function fetchN8nWorkflows(apiKey: string, instanceUrl: string) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(`${instanceUrl}/api/v1/workflows?active=true&limit=25`, {
      headers: {
        "X-N8N-API-KEY": apiKey,
        "Accept": "application/json",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return { workflows: [], error: `HTTP ${res.status}` }
    const data = await res.json()
    return { workflows: data.data || [], error: null }
  } catch (e) {
    return { workflows: [], error: String(e) }
  }
}

async function fetchN8nExecutions(apiKey: string, instanceUrl: string) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    // Get last 25 executions across all workflows
    const res = await fetch(`${instanceUrl}/api/v1/executions?limit=25&includeData=false`, {
      headers: {
        "X-N8N-API-KEY": apiKey,
        "Accept": "application/json",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return { executions: [], error: `HTTP ${res.status}` }
    const data = await res.json()
    return { executions: data.data || [], error: null }
  } catch (e) {
    return { executions: [], error: String(e) }
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

    // Ping all agents in parallel
    const agentPings = await Promise.all(
      AGENTS.map(async (agent) => {
        const ping = await pingAgent(agent.ip, agent.port)
        return {
          ...agent,
          online: ping.online,
          latencyMs: ping.latencyMs,
          checkedAt: new Date().toISOString(),
        }
      })
    )

    // Fetch n8n data
    let n8nData = { workflows: [], executions: [], error: null as string | null }
    if (n8nApiKey) {
      const [wfResult, execResult] = await Promise.all([
        fetchN8nWorkflows(n8nApiKey, n8nUrl),
        fetchN8nExecutions(n8nApiKey, n8nUrl),
      ])
      n8nData = {
        workflows: wfResult.workflows,
        executions: execResult.executions,
        error: wfResult.error || execResult.error,
      }
    }

    // Build workflow status (merge executions into workflows)
    const execByWorkflow: Record<string, any[]> = {}
    for (const exec of n8nData.executions) {
      const wfId = exec.workflowId
      if (!execByWorkflow[wfId]) execByWorkflow[wfId] = []
      execByWorkflow[wfId].push(exec)
    }

    const workflowStatus = n8nData.workflows.map((wf: any) => {
      const execs = execByWorkflow[wf.id] || []
      const lastExec = execs.length > 0 ? execs[0] : null
      return {
        id: wf.id,
        name: wf.name,
        active: wf.active,
        lastRunAt: lastExec?.startedAt || lastExec?.createdAt || null,
        lastStatus: lastExec?.status || null, // success, error, running, waiting
      }
    })

    // Fetch recent errors from Supabase
    const { data: recentErrors } = await supabase
      .from("automation_logs")
      .select("id, automation_type, status, error_message, created_at, business_id")
      .eq("status", "error")
      .order("created_at", { ascending: false })
      .limit(10)

    // Fetch cron status from system_status_log if available
    const { data: cronData } = await supabase
      .from("system_status_log")
      .select("id, registry_id, status, last_run, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(20)

    // Fetch system registry names  
    const { data: registryItems } = await supabase
      .from("system_registry")
      .select("id, name, type, category, schedule")
      .eq("type", "cron")
      .limit(20)

    const registryMap: Record<string, any> = {}
    for (const item of registryItems || []) {
      registryMap[item.id] = item
    }

    // Build cron status list
    const seenIds = new Set<string>()
    const cronStatus = (cronData || [])
      .filter((entry) => {
        if (seenIds.has(entry.registry_id)) return false
        seenIds.add(entry.registry_id)
        return true
      })
      .map((entry) => ({
        id: entry.registry_id,
        name: registryMap[entry.registry_id]?.name || entry.registry_id,
        schedule: registryMap[entry.registry_id]?.schedule || null,
        status: entry.status,
        lastRun: entry.last_run || entry.created_at,
        errorMessage: entry.error_message,
      }))

    return new Response(
      JSON.stringify({
        agents: agentPings,
        n8n: {
          workflows: workflowStatus,
          error: n8nData.error,
        },
        recentErrors: recentErrors || [],
        cronStatus,
        fetchedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("system-monitor error:", error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
