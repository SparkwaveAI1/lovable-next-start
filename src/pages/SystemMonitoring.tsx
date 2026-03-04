import { useCallback, useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { PageContent } from "@/components/layout/PageLayout"
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
  Workflow,
  XCircle,
  AlertTriangle,
  Timer,
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

interface WorkflowStatus {
  id: string
  name: string
  active: boolean
  lastRunAt: string | null
  lastStatus: string | null
}

interface RecentError {
  id: string
  automation_type: string
  status: string
  error_message: string | null
  created_at: string
  business_id: string | null
}

interface CronStatus {
  id: string
  name: string
  schedule: string | null
  status: string
  lastRun: string | null
  errorMessage: string | null
}

interface MonitoringData {
  agents: AgentStatus[]
  n8n: {
    workflows: WorkflowStatus[]
    error: string | null
  }
  recentErrors: RecentError[]
  cronStatus: CronStatus[]
  fetchedAt: string
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: "green" | "yellow" | "red" | "gray" }) {
  const colors = {
    green: "bg-emerald-500",
    yellow: "bg-amber-400",
    red: "bg-red-500",
    gray: "bg-slate-400",
  }
  return (
    <span className={cn("inline-block h-2.5 w-2.5 rounded-full flex-shrink-0", colors[status])} />
  )
}

function workflowStatusColor(status: string | null): "green" | "yellow" | "red" | "gray" {
  if (!status) return "gray"
  if (status === "success") return "green"
  if (status === "error" || status === "crashed") return "red"
  if (status === "running" || status === "waiting") return "yellow"
  return "gray"
}

function cronStatusColor(status: string): "green" | "yellow" | "red" | "gray" {
  if (status === "success") return "green"
  if (status === "failed") return "red"
  if (status === "stale") return "yellow"
  return "gray"
}

function relativeTime(iso: string | null): string {
  if (!iso) return "Never"
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true })
  } catch {
    return "Unknown"
  }
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
        {agent.latencyMs && (
          <p className="text-xs text-slate-400">{agent.latencyMs}ms</p>
        )}
        <p className="text-xs text-slate-400">{relativeTime(agent.checkedAt)}</p>
      </div>
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

  const onlineCount = data?.agents.filter((a) => a.online).length ?? 0
  const totalAgents = data?.agents.length ?? 4

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
              Real-time health status — auto-refreshes every 60 seconds
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-400">
              Last refresh: {formatDistanceToNow(lastRefresh, { addSuffix: true })}
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
                    <p className="text-2xl font-bold text-slate-900">
                      {data.n8n.workflows.filter((w) => w.active).length}
                    </p>
                    <p className="text-xs text-slate-500">Active Workflows</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{data.recentErrors.length}</p>
                    <p className="text-xs text-slate-500">Recent Errors</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Timer className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {data.cronStatus.filter((c) => c.status !== "success").length}
                    </p>
                    <p className="text-xs text-slate-500">Cron Issues</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Two-column layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Agent Status */}
              <SectionCard title="Agent Status" icon={<Server className="h-4 w-4" />}>
                <div className="space-y-3">
                  {data.agents.map((agent) => (
                    <AgentCard key={agent.name} agent={agent} />
                  ))}
                </div>
              </SectionCard>

              {/* n8n Workflow Status */}
              <SectionCard title="n8n Workflow Status" icon={<Workflow className="h-4 w-4" />}>
                {data.n8n.error && (
                  <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">
                    n8n API error: {data.n8n.error}
                  </div>
                )}
                {data.n8n.workflows.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">
                    {data.n8n.error ? "Could not load workflows" : "No active workflows found"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.n8n.workflows.map((wf) => {
                      const color = workflowStatusColor(wf.lastStatus)
                      return (
                        <div
                          key={wf.id}
                          className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-slate-100 bg-slate-50"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <StatusDot status={color} />
                            <span className="text-sm font-medium text-slate-800 truncate">
                              {wf.name}
                            </span>
                          </div>
                          <div className="text-right ml-3 flex-shrink-0">
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
                              {wf.lastStatus || "no runs"}
                            </p>
                            <p className="text-xs text-slate-400">{relativeTime(wf.lastRunAt)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </SectionCard>
            </div>

            {/* ── Two-column bottom row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Errors */}
              <SectionCard title="Recent Errors" icon={<AlertCircle className="h-4 w-4" />}>
                {data.recentErrors.length === 0 ? (
                  <div className="flex items-center gap-2 py-6 justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm text-slate-500">No recent errors</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.recentErrors.map((err) => (
                      <div
                        key={err.id}
                        className="p-3 rounded-lg border border-red-100 bg-red-50"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-red-700 capitalize">
                            {err.automation_type.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-slate-400">
                            {relativeTime(err.created_at)}
                          </span>
                        </div>
                        {err.error_message && (
                          <p className="text-xs text-red-600 truncate font-mono">
                            {err.error_message.length > 120
                              ? err.error_message.slice(0, 120) + "…"
                              : err.error_message}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Cron Status */}
              <SectionCard title="Cron Status" icon={<Clock className="h-4 w-4" />}>
                {data.cronStatus.length === 0 ? (
                  <div className="text-center py-6">
                    <AlertTriangle className="h-6 w-6 text-amber-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Live cron data coming soon.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No cron entries found in system_status_log.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.cronStatus.map((cron) => {
                      const color = cronStatusColor(cron.status)
                      return (
                        <div
                          key={cron.id}
                          className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-slate-100 bg-slate-50"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <StatusDot status={color} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">
                                {cron.name}
                              </p>
                              {cron.schedule && (
                                <p className="text-xs text-slate-400 font-mono">{cron.schedule}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-3 flex-shrink-0">
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
                            <p className="text-xs text-slate-400">{relativeTime(cron.lastRun)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        )}
      </PageContent>
    </DashboardLayout>
  )
}
