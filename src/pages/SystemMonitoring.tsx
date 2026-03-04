import { useCallback, useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { PageContent } from "@/components/layout/PageLayout"
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
  Workflow,
  XCircle,
  Timer,
  Zap,
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { formatDistanceToNow, parseISO } from "date-fns"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentStatus {
  name: string
  ip: string
  port: number
  role: string
  online: boolean
  latencyMs?: number
  checkedAt: string
}

interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  updatedAt: string | null
}

interface CronStatus {
  id: string
  name: string
  category: string
  group: string
  schedule: string | null
  status: string
  lastRun: string | null
  nextRun: string | null
  errorMessage: string | null
  consecutiveErrors: number
}

interface FightFlowHealth {
  lastFormSubmission: string | null
  lastSmsSent: string | null
  formCaptureLastPoll: string | null
  immediateResponseLastRun: string | null
}

interface MonitoringData {
  agents: AgentStatus[]
  n8n: {
    workflows: N8nWorkflow[]
    error: string | null
  }
  cronStatus: CronStatus[]
  fightflow: FightFlowHealth
  fetchedAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "Never"
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true })
  } catch {
    return "Unknown"
  }
}

type DotColor = "green" | "yellow" | "red" | "gray"

function StatusDot({ status }: { status: DotColor }) {
  const colors: Record<DotColor, string> = {
    green: "bg-emerald-500",
    yellow: "bg-amber-400",
    red: "bg-red-500",
    gray: "bg-slate-400",
  }
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 rounded-full flex-shrink-0", colors[status])}
    />
  )
}

function cronDotColor(status: string): DotColor {
  if (status === "success") return "green"
  if (status === "failed" || status === "error") return "red"
  if (status === "stale") return "yellow"
  if (status === "unknown") return "gray"
  return "gray"
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  children,
  className,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 overflow-hidden", className)}>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <span className="text-slate-500">{icon}</span>
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function AgentCard({ agent }: { agent: AgentStatus }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex items-center justify-center h-10 w-10 rounded-full",
            agent.online ? "bg-emerald-100" : "bg-red-50"
          )}
        >
          {agent.online ? (
            <Wifi className="h-5 w-5 text-emerald-600" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{agent.name}</p>
          <p className="text-xs text-slate-500">{agent.role}</p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {agent.ip}:{agent.port}
          </p>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-1.5 justify-end mb-1">
          <StatusDot status={agent.online ? "green" : "red"} />
          <span
            className={cn(
              "text-sm font-medium",
              agent.online ? "text-emerald-700" : "text-red-600"
            )}
          >
            {agent.online ? "Online" : "Offline"}
          </span>
        </div>
        {agent.latencyMs !== undefined && (
          <p className="text-xs text-slate-400">{agent.latencyMs}ms</p>
        )}
        <p className="text-xs text-slate-400">{relativeTime(agent.checkedAt)}</p>
      </div>
    </div>
  )
}

function CronGroupSection({
  group,
  crons,
  defaultOpen = true,
}: {
  group: string
  crons: CronStatus[]
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const errorCount = crons.filter(
    (c) => c.status === "failed" || c.status === "error"
  ).length

  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
          <span className="text-sm font-semibold text-slate-700">{group}</span>
          <span className="text-xs text-slate-400">({crons.length})</span>
        </div>
        {errorCount > 0 && (
          <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
            <XCircle className="h-3 w-3" />
            {errorCount} error{errorCount !== 1 ? "s" : ""}
          </span>
        )}
      </button>

      {open && (
        <div className="divide-y divide-slate-50">
          {crons.map((cron) => {
            const color = cronDotColor(cron.status)
            return (
              <div
                key={cron.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <StatusDot status={color} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{cron.name}</p>
                    {cron.schedule && (
                      <p className="text-xs text-slate-400 font-mono">{cron.schedule}</p>
                    )}
                    {cron.errorMessage && (
                      <p className="text-xs text-red-500 truncate max-w-xs">
                        {cron.errorMessage.length > 80
                          ? cron.errorMessage.slice(0, 80) + "…"
                          : cron.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
                <div className="ml-4 text-right flex-shrink-0 space-y-0.5">
                  <p
                    className={cn(
                      "text-xs font-medium capitalize",
                      color === "green"
                        ? "text-emerald-600"
                        : color === "red"
                        ? "text-red-600"
                        : color === "yellow"
                        ? "text-amber-600"
                        : "text-slate-400"
                    )}
                  >
                    {cron.status}
                  </p>
                  <p className="text-xs text-slate-400">
                    {cron.lastRun ? relativeTime(cron.lastRun) : "Never"}
                  </p>
                  {cron.nextRun && (
                    <p className="text-xs text-slate-300">
                      Next: {relativeTime(cron.nextRun)}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FightFlowStat({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span
        className={cn(
          "text-sm font-medium",
          value ? "text-slate-900" : "text-slate-400"
        )}
      >
        {value ? relativeTime(value) : "No data"}
      </span>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SystemMonitoring() {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke("system-monitor")
      if (fnError) throw new Error(fnError.message)
      setData(result as MonitoringData)
      setLastRefresh(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load + auto-refresh every 60s
  useEffect(() => {
    fetchData(true)
    const interval = setInterval(() => fetchData(false), 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  // ── Derived stats ──
  const agents = data?.agents ?? []
  const workflows = data?.n8n?.workflows ?? []
  const cronStatus = data?.cronStatus ?? []

  const onlineCount = agents.filter((a) => a.online).length
  const totalAgents = agents.length || 4
  const activeWorkflows = workflows.filter((w) => w.active).length
  const cronErrors = cronStatus.filter(
    (c) => c.status === "failed" || c.status === "error"
  ).length

  // ── Group crons ──
  const cronGroups: Record<string, CronStatus[]> = {}
  for (const cron of cronStatus) {
    const grp = cron.group ?? "System"
    if (!cronGroups[grp]) cronGroups[grp] = []
    cronGroups[grp].push(cron)
  }

  // Order: Fight Flow → Twitter → System
  const GROUP_ORDER = ["Fight Flow", "Twitter", "System"]
  const orderedGroups = [
    ...GROUP_ORDER.filter((g) => cronGroups[g]),
    ...Object.keys(cronGroups).filter((g) => !GROUP_ORDER.includes(g)),
  ]

  return (
    <DashboardLayout>
      <PageContent>
        {/* ── Page Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-7 w-7 text-violet-600" />
              System Monitoring
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Real-time health status — display-only, auto-refreshes every 60s
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-400">
              Last: {formatDistanceToNow(lastRefresh, { addSuffix: true })}
            </p>
            <button
              onClick={() => fetchData(true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">Failed to load monitoring data: {error}</span>
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && !data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Content ── */}
        {data && (
          <div className="space-y-6">

            {/* ── Summary bar ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Server className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{onlineCount}/{totalAgents}</p>
                    <p className="text-xs text-slate-500">Agents Online</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Workflow className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{activeWorkflows}</p>
                    <p className="text-xs text-slate-500">Active Workflows</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{cronStatus.length}</p>
                    <p className="text-xs text-slate-500">Total Crons</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center",
                      cronErrors > 0 ? "bg-red-100" : "bg-emerald-100"
                    )}
                  >
                    {cronErrors > 0 ? (
                      <XCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{cronErrors}</p>
                    <p className="text-xs text-slate-500">Cron Errors</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 1: Agent Servers ── */}
            <SectionCard title="Agent Servers" icon={<Server className="h-4 w-4" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {agents.map((agent) => (
                  <AgentCard key={agent.name} agent={agent} />
                ))}
              </div>
            </SectionCard>

            {/* ── Section 2: Cron Jobs (grouped + collapsible) ── */}
            <SectionCard title="Cron Jobs" icon={<Timer className="h-4 w-4" />}>
              {cronStatus.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  No cron entries found in system registry.
                </p>
              ) : (
                <div className="space-y-3">
                  {orderedGroups.map((group) => (
                    <CronGroupSection
                      key={group}
                      group={group}
                      crons={cronGroups[group]}
                      defaultOpen={true}
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            {/* ── Section 3: n8n Workflows ── */}
            <SectionCard title="n8n Workflows" icon={<Workflow className="h-4 w-4" />}>
              {data.n8n?.error && (
                <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">
                  n8n API error: {data.n8n.error}
                </div>
              )}
              {workflows.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  {data.n8n?.error ? "Could not load workflows" : "No workflows found"}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4">
                          Name
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4">
                          Active
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2">
                          Last Updated
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {workflows.map((wf) => (
                        <tr key={wf.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 pr-4 font-medium text-slate-800">{wf.name}</td>
                          <td className="py-2.5 pr-4">
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                wf.active
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              )}
                            >
                              {wf.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-500 text-xs">
                            {relativeTime(wf.updatedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            {/* ── Section 4: Fight Flow Pipeline ── */}
            <SectionCard title="Fight Flow Pipeline" icon={<Zap className="h-4 w-4" />}>
              <div className="divide-y divide-slate-50">
                <FightFlowStat
                  label="Last form submission received"
                  value={data.fightflow?.lastFormSubmission}
                />
                <FightFlowStat
                  label="Last SMS sent"
                  value={data.fightflow?.lastSmsSent}
                />
                <FightFlowStat
                  label="n8n form capture last poll"
                  value={data.fightflow?.formCaptureLastPoll}
                />
                <FightFlowStat
                  label="n8n immediate response last run"
                  value={data.fightflow?.immediateResponseLastRun}
                />
              </div>
            </SectionCard>

          </div>
        )}
      </PageContent>
    </DashboardLayout>
  )
}
