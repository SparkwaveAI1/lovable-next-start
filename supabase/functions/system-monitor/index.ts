import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
}

interface AgentConfig {
  name: string
  ip: string
  port: number
  role: string
}

interface PingResult {
  online: boolean
  latencyMs?: number
}

const AGENTS: AgentConfig[] = [
  { name: "Rico", ip: "5.161.190.94", port: 18789, role: "Lead Orchestrator" },
  { name: "Dev", ip: "5.161.186.106", port: 18789, role: "Development Agent" },
  { name: "Iris", ip: "178.156.250.119", port: 18789, role: "Communications Specialist" },
  { name: "Jerry", ip: "5.161.184.240", port: 18789, role: "Operations Agent" },
]

async function pingAgent(ip: string, port: number): Promise<PingResult> {
  const start = Date.now()
  for (const url of [`http://${ip}:${port}/health`, `http://${ip}:${port}/`]) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)
      if (res.status < 500) return { online: true, latencyMs: Date.now() - start }
    } catch { /* try next */ }
  }
  return { online: false }
}

async function fetchN8nWorkflows(apiKey: string, instanceUrl: string) {
  if (!apiKey) return { workflows: [], error: "No API key" }
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${instanceUrl}/api/v1/workflows?limit=50`, {
      headers: { "X-N8N-API-KEY": apiKey, "Accept": "application/json" },
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

    // 1. Ping agents
    const pingResults = await Promise.allSettled(AGENTS.map(a => pingAgent(a.ip, a.port)))
    const agents = AGENTS.map((agent, i) => {
      const r = pingResults[i]
      const ping: PingResult = r.status === "fulfilled" ? r.value : { online: false }
      return {
        name: agent.name,
        ip: agent.ip,
        port: agent.port,
        role: agent.role,
        online: ping.online,
        latencyMs: ping.latencyMs ?? null,
        checkedAt: now,
      }
    })

    // 2. n8n workflows
    const n8nData = await fetchN8nWorkflows(n8nApiKey, n8nUrl)

    // Fetch last execution per workflow
    const execRes = await fetch(`${n8nUrl}/api/v1/executions?limit=100`, {
      headers: { "X-N8N-API-KEY": n8nApiKey, "Accept": "application/json" }
    }).catch(() => null)

    const lastExecMap: Record<string, { startedAt: string; status: string }> = {}
    if (execRes?.ok) {
      const execJson = await execRes.json()
      for (const exec of execJson.data ?? []) {
        if (!lastExecMap[exec.workflowId]) {
          lastExecMap[exec.workflowId] = { startedAt: exec.startedAt, status: exec.status }
        }
      }
    } else {
      console.error("system-monitor: executions fetch failed", execRes?.status)
    }

    const workflows = (n8nData.workflows as Array<{ id: string; name: string; active: boolean; updatedAt?: string }>).map(wf => ({
      id: wf.id,
      name: wf.name,
      active: wf.active,
      lastRunAt: lastExecMap[wf.id]?.startedAt ?? null,
      lastStatus: lastExecMap[wf.id]?.status ?? null,
    }))

    // 3. Cron status from mc_activities (latest system_ops entry)
    const { data: cronData } = await supabase
      .from("mc_activities")
      .select("metadata, created_at")
      .eq("type", "system_ops_status")
      .order("created_at", { ascending: false })
      .limit(1)

    const cronStatus = cronData?.[0]?.metadata ?? null

    // 4. Fight Flow pipeline health
    const [ffFormRes, ffSmsRes, ffStateRes] = await Promise.allSettled([
      supabase.from("fightflow_form_submissions").select("created_at").order("created_at", { ascending: false }).limit(1),
      supabase.from("sms_messages").select("created_at").eq("direction", "outbound").order("created_at", { ascending: false }).limit(1),
      supabase.from("ff_n8n_state").select("key, value, updated_at"),
    ])

    const ffForm = ffFormRes.status === "fulfilled" ? ffFormRes.value.data?.[0]?.created_at ?? null : null
    const ffSms = ffSmsRes.status === "fulfilled" ? ffSmsRes.value.data?.[0]?.created_at ?? null : null
    const ffStateRows = ffStateRes.status === "fulfilled" ? (ffStateRes.value.data ?? []) : []
    const ffState: Record<string, string> = {}
    for (const row of ffStateRows as Array<{ key: string; value: string; updated_at: string }>) {
      ffState[row.key] = row.value ?? row.updated_at
    }

    return new Response(
      JSON.stringify({
        agents,
        n8n: { workflows, error: n8nData.error },
        cronStatus,
        fightflow: {
          lastFormSubmission: ffForm,
          lastSmsSent: ffSms,
          formCaptureLastPoll: ffState["form_capture_last_poll"] ?? null,
          immediateResponseLastRun: ffState["immediate_response_last_run"] ?? null,
        },
        fetchedAt: now,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("system-monitor error:", err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
