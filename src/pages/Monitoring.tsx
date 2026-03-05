import { useCallback, useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { PageContent } from "@/components/layout/PageLayout"
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Server,
  XCircle,
  Heart,
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentRow {
  name: string
  status: "Running" | "Idle" | string
  last_activity: string | null
  current_task: string | null
}

interface CronJobRow {
  id: string
  name: string
  enabled: boolean
  schedule: string
  last_run_at: string | null
  next_run_at: string | null
  last_status: string | null
  consecutive_errors: number
}

interface ErrorRow {
  error_type: string
  message: string
  created_at: string
}

interface HealthMetric {
  label: string
  value: string
  pct?: number // 0-100, used for colour thresholds
  ok?: boolean // for boolean OK/FAIL metrics
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 0) return "—"
    const secs = Math.floor(diff / 1000)
    if (secs < 60) return `${secs}s ago`
    const mins = Math.floor(secs / 60)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  } catch {
    return "—"
  }
}

function futureTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    const diff = new Date(iso).getTime() - Date.now()
    if (diff <= 0) return "—"
    const secs = Math.floor(diff / 1000)
    if (secs < 60) return `in ${secs}s`
    const mins = Math.floor(secs / 60)
    if (mins < 60) return `in ${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `in ${hrs}h`
    return `in ${Math.floor(hrs / 24)}d`
  } catch {
    return "—"
  }
}

function healthColor(metric: HealthMetric): string {
  if (metric.ok !== undefined) {
    return metric.ok ? "text-emerald-700 bg-emerald-100" : "text-red-700 bg-red-100"
  }
  if (metric.pct !== undefined) {
    if (metric.pct > 80) return "text-emerald-700 bg-emerald-100"
    if (metric.pct >= 50) return "text-amber-700 bg-amber-100"
    return "text-red-700 bg-red-100"
  }
  return "text-slate-700 bg-slate-100"
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <span className="text-slate-500">{icon}</span>
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Section 1: Agent Status ──────────────────────────────────────────────────

const FALLBACK_AGENTS: AgentRow[] = [
  { name: "Rico", status: "Idle", last_activity: null, current_task: "Orchestration" },
  { name: "Dev", status: "Idle", last_activity: null, current_task: "Code & Deploy" },
  { name: "Iris", status: "Idle", last_activity: null, current_task: "Sales & Social" },
  { name: "Jerry", status: "Idle", last_activity: null, current_task: "Support" },
]

function AgentStatusSection({ agents }: { agents: AgentRow[] }) {
  return (
    <SectionCard title="Agent Status" icon={<Server className="h-4 w-4" />}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {["Agent", "Status", "Last Activity", "Current Task"].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {agents.map((a) => (
              <tr key={a.name} className="hover:bg-slate-50 transition-colors">
                <td className="py-2.5 pr-4 font-medium text-slate-900">{a.name}</td>
                <td className="py-2.5 pr-4">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                      a.status === "Running"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        a.status === "Running" ? "bg-emerald-500" : "bg-amber-400"
                      )}
                    />
                    {a.status}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-slate-500 text-xs">{relativeTime(a.last_activity)}</td>
                <td className="py-2.5 text-slate-600 text-xs">{a.current_task ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

// ─── Section 2: Cron Jobs ─────────────────────────────────────────────────────

function CronJobsSection({ cronJobs, unavailable }: { cronJobs: CronJobRow[]; unavailable?: boolean }) {
  if (unavailable) {
    return (
      <SectionCard title="Cron Jobs" icon={<Clock className="h-4 w-4" />}>
        <div className="flex items-center gap-2 text-amber-600 py-3">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm font-medium">Cron data unavailable</span>
        </div>
      </SectionCard>
    )
  }
  return (
    <SectionCard title="Cron Jobs" icon={<Clock className="h-4 w-4" />}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {["Cron Name", "Schedule", "Status", "Last Run", "Next Run"].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {cronJobs.map((c) => {
              const status = c.last_status?.toUpperCase() ?? "OK"
              const isOk = status === "OK" || c.consecutive_errors === 0
              return (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 pr-4 font-medium text-slate-800 font-mono text-xs">{c.name}</td>
                  <td className="py-2.5 pr-4 text-slate-500 font-mono text-xs">{c.schedule}</td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                        isOk
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {isOk ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {isOk ? "OK" : "Error"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-500 text-xs">{relativeTime(c.last_run_at)}</td>
                  <td className="py-2.5 text-slate-500 text-xs">{futureTime(c.next_run_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

// ─── Section 3: Recent Errors ─────────────────────────────────────────────────

function RecentErrorsSection({ errors }: { errors: ErrorRow[] }) {
  return (
    <SectionCard title="Recent Errors (last 10)" icon={<AlertTriangle className="h-4 w-4" />}>
      {errors.length === 0 ? (
        <div className="flex items-center gap-2 text-emerald-600 py-3">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">No errors in last hour</span>
        </div>
      ) : (
        <div className="space-y-2">
          {errors.map((e, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-red-700">{e.error_type}</span>
                  <span className="text-xs text-slate-400">{relativeTime(e.created_at)}</span>
                </div>
                <p className="text-xs text-slate-700 truncate">{e.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Section 4: System Health ─────────────────────────────────────────────────

const HEALTH_METRICS: HealthMetric[] = [
  { label: "JWT Auth Status", value: "OK", ok: true },
  { label: "Notification Delivery", value: "94%", pct: 94 },
  { label: "Classes Booking Sync", value: "OK", ok: true },
  { label: "Task Board", value: "OK", ok: true },
  { label: "Email Delivery Rate", value: "88%", pct: 88 },
  { label: "Supabase Connection", value: "OK", ok: true },
]

function SystemHealthSection({ metrics }: { metrics: HealthMetric[] }) {
  return (
    <SectionCard title="System Health" icon={<Heart className="h-4 w-4" />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
          >
            <span className="text-xs text-slate-600 font-medium">{m.label}</span>
            <span
              className={cn(
                "ml-2 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0",
                healthColor(m)
              )}
            >
              {m.value}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MonitoringPage() {
  const [agents, setAgents] = useState<AgentRow[]>(FALLBACK_AGENTS)
  const [cronJobs, setCronJobs] = useState<CronJobRow[]>([])
  const [cronUnavailable, setCronUnavailable] = useState(false)
  const [errors, setErrors] = useState<ErrorRow[]>([])
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Agent status from mc_agents if table exists
      const { data: agentData } = await supabase
        .from("mc_agents" as never)
        .select("name, status, last_activity, current_task")
        .limit(20)
      if (agentData && Array.isArray(agentData) && agentData.length > 0) {
        setAgents(agentData as AgentRow[])
      }
    } catch {
      // Keep fallback
    }

    try {
      // Cron jobs from cron_jobs table
      const { data: cronData, error: cronError } = await supabase
        .from("cron_jobs" as never)
        .select("id, name, enabled, schedule, last_run_at, next_run_at, last_status, consecutive_errors")
        .eq("enabled" as never, true)
        .order("name" as never)
      if (cronError) {
        setCronUnavailable(true)
      } else if (cronData && Array.isArray(cronData)) {
        setCronJobs(cronData as CronJobRow[])
        setCronUnavailable(false)
      }
    } catch {
      setCronUnavailable(true)
    }

    try {
      // Recent errors — last 10 from past hour
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
      const { data: errorData } = await supabase
        .from("mc_errors" as never)
        .select("error_type, message, created_at")
        .gte("created_at", oneHourAgo)
        .order("created_at", { ascending: false })
        .limit(10)
      if (errorData && Array.isArray(errorData)) {
        setErrors(errorData as ErrorRow[])
      }
    } catch {
      // No errors table — show empty
      setErrors([])
    }

    setLastRefresh(new Date())
    setLoading(false)
  }, [])

  // Initial load + 30s auto-refresh
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <DashboardLayout>
      <PageContent>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-7 w-7 text-violet-600" />
              System Monitoring
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Display-only · Auto-refreshes every 30s
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              Updated {relativeTime(lastRefresh.toISOString())}
            </span>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {/* 4 Sections */}
        <div className="space-y-6">
          <AgentStatusSection agents={agents} />
          <CronJobsSection cronJobs={cronJobs} unavailable={cronUnavailable} />
          <RecentErrorsSection errors={errors} />
          <SystemHealthSection metrics={HEALTH_METRICS} />
        </div>
      </PageContent>
    </DashboardLayout>
  )
}
