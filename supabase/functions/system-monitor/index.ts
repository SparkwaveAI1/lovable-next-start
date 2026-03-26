// system-monitor edge function — no external imports, uses Deno.serve + fetch
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface PingResult { online: boolean; latencyMs?: number }
const AGENTS = [
  { name: "Rico", ip: "5.161.190.94",   port: 18789, role: "Lead Orchestrator" },
  { name: "Dev",  ip: "5.161.186.106",  port: 18789, role: "Development Agent" },
  { name: "Iris", ip: "178.156.250.119", port: 18789, role: "Communications Specialist" },
  { name: "Jerry", ip: "5.161.184.240", port: 18789, role: "Operations Agent" },
]

async function pingAgent(ip: string, port: number): Promise<PingResult> {
  const start = Date.now()
  for (const url of [`http://${ip}:${port}/health`, `http://${ip}:${port}/`]) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 1500)
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)
      if (res.status < 500) return { online: true, latencyMs: Date.now() - start }
    } catch { /* try next */ }
  }
  return { online: false }
}

// n8n is deprecated org-wide. This function is fully isolated — any failure returns
// empty workflows array and never propagates to the outer handler.
async function fetchN8nWorkflows(
  n8nUrl: string,
  n8nApiKey: string,
): Promise<{ workflows: unknown[]; error: string | null }> {
  try {
    const wfController = new AbortController()
    const wfTimer = setTimeout(() => wfController.abort(), 3000)
    let wfRes: Response
    try {
      wfRes = await fetch(`${n8nUrl}/api/v1/workflows?limit=50`, {
        headers: { "X-N8N-API-KEY": n8nApiKey, "Accept": "application/json" },
        signal: wfController.signal,
      })
    } finally {
      clearTimeout(wfTimer)
    }

    if (!wfRes.ok) {
      return { workflows: [], error: `HTTP ${wfRes.status}` }
    }

    let wfJson: { data?: Array<{ id: string; name: string; active: boolean }> }
    try {
      wfJson = await wfRes.json()
    } catch {
      return { workflows: [], error: "n8n response parse error" }
    }

    // Fetch executions
    const lastExecMap: Record<string, { startedAt: string; status: string }> = {}
    try {
      const execController = new AbortController()
      const execTimer = setTimeout(() => execController.abort(), 3000)
      let execRes: Response | null = null
      try {
        execRes = await fetch(`${n8nUrl}/api/v1/executions?limit=250`, {
          headers: { "X-N8N-API-KEY": n8nApiKey, "Accept": "application/json" },
          signal: execController.signal,
        })
      } finally {
        clearTimeout(execTimer)
      }
      if (execRes?.ok) {
        const execJson = await execRes.json()
        for (const exec of execJson.data ?? []) {
          if (!lastExecMap[exec.workflowId]) {
            lastExecMap[exec.workflowId] = { startedAt: exec.startedAt, status: exec.status }
          }
        }
      }
    } catch { /* executions are best-effort */ }

    const workflows = (wfJson.data ?? []).map((wf) => ({
      id: wf.id, name: wf.name, active: wf.active,
      lastRunAt: lastExecMap[wf.id]?.startedAt ?? null,
      lastStatus: lastExecMap[wf.id]?.status ?? null,
    }))

    return { workflows, error: null }
  } catch (e) {
    // Catch-all: n8n is deprecated, never let it crash the function
    return { workflows: [], error: String(e) }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const n8nApiKey = Deno.env.get("N8N_API_KEY") ?? ""
    const n8nUrl = Deno.env.get("N8N_INSTANCE_URL") ?? "https://sparkwaveai.app.n8n.cloud"
    const now = new Date().toISOString()

    // 1. Ping agents (with global 4s fallback)
    const pingResultsRaw = Promise.allSettled(AGENTS.map(a => pingAgent(a.ip, a.port)))
    const timeoutFallback = new Promise<PromiseSettledResult<PingResult>[]>(resolve =>
      setTimeout(() => resolve(AGENTS.map(() => ({ status: "fulfilled" as const, value: { online: false } }))), 4000)
    )
    const pingResults = await Promise.race([pingResultsRaw, timeoutFallback])
    const agents = AGENTS.map((agent, i) => {
      const r = pingResults[i]
      const ping: PingResult = r.status === "fulfilled" ? r.value : { online: false }
      return { name: agent.name, ip: agent.ip, port: agent.port, role: agent.role, online: ping.online, latencyMs: ping.latencyMs ?? null, checkedAt: now }
    })

    // 2. n8n workflows — fully isolated, never crashes the function (n8n deprecated org-wide)
    const { workflows, error: n8nError } = await fetchN8nWorkflows(n8nUrl, n8nApiKey)

    // 3. Supabase queries via REST (no supabase-js client needed)
    const sbHeaders = { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}`, "Content-Type": "application/json" }

    const [cronRes, ffFormRes, ffSmsRes, ffStateRes] = await Promise.allSettled([
      fetch(`${supabaseUrl}/rest/v1/mc_activities?type=eq.system_ops_status&order=created_at.desc&limit=1`, { headers: sbHeaders }),
      fetch(`${supabaseUrl}/rest/v1/fightflow_form_submissions?select=created_at&order=created_at.desc&limit=1`, { headers: sbHeaders }),
      fetch(`${supabaseUrl}/rest/v1/sms_messages?select=created_at&direction=eq.outbound&order=created_at.desc&limit=1`, { headers: sbHeaders }),
      fetch(`${supabaseUrl}/rest/v1/ff_n8n_state?select=key,value,updated_at`, { headers: sbHeaders }),
    ])

    const cronData = cronRes.status === "fulfilled" && cronRes.value.ok ? await cronRes.value.json() : []
    const ffForm = ffFormRes.status === "fulfilled" && ffFormRes.value.ok ? (await ffFormRes.value.json())?.[0]?.created_at ?? null : null
    const ffSms = ffSmsRes.status === "fulfilled" && ffSmsRes.value.ok ? (await ffSmsRes.value.json())?.[0]?.created_at ?? null : null
    const ffStateRows = ffStateRes.status === "fulfilled" && ffStateRes.value.ok ? await ffStateRes.value.json() : []
    const ffState: Record<string, string> = {}
    for (const row of ffStateRows as Array<{ key: string; value: string; updated_at: string }>) {
      ffState[row.key] = row.value ?? row.updated_at
    }

    return new Response(JSON.stringify({
      agents,
      n8nWorkflows: workflows,
      n8n: { workflows, error: n8nError },
      cronStatus: cronData?.[0]?.metadata ?? null,
      fightflow: {
        lastFormSubmission: ffForm,
        lastSmsSent: ffSms,
        formCaptureLastPoll: ffState["form_capture_last_poll"] ?? null,
        immediateResponseLastRun: ffState["immediate_response_last_run"] ?? null,
      },
      fetchedAt: now,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
