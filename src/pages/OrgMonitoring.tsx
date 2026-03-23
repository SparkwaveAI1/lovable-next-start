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
  Zap,
  Brain,
  Mail,
  Shield,
  Users,
  TrendingUp,
  Eye,
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusLevel = "green" | "yellow" | "red" | "unknown"

interface SectionStatus {
  label: string
  status: StatusLevel
  lastSuccess: string | null
  failureCount: number
  detail?: string
}

interface ServiceHealthItem {
  name: string
  status: string
  reason?: string
  checkedAt?: string
}

interface KarpathyStatus {
  reviewOk: boolean
  applyOk: boolean
  reviewLastRun: string | null
  applyLastRun: string | null
  pendingProposals: number
  appliedLast7d: number
}

interface AgentFailureRow {
  agent_name: string
  severity: string
  count: number
}

interface CronJobRow {
  id: string
  name: string
  enabled: boolean
  last_status: string | null
  consecutive_errors: number
  last_run_at: string | null
}

interface AgentReportRow {
  agent: string
  title: string
  created_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 0) return "just now"
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

function statusColor(s: StatusLevel) {
  switch (s) {
    case "green": return "bg-emerald-100 text-emerald-700 border-emerald-200"
    case "yellow": return "bg-amber-100 text-amber-700 border-amber-200"
    case "red": return "bg-red-100 text-red-700 border-red-200"
    default: return "bg-slate-100 text-slate-500 border-slate-200"
  }
}

function statusDot(s: StatusLevel) {
  switch (s) {
    case "green": return "bg-emerald-500"
    case "yellow": return "bg-amber-400"
    case "red": return "bg-red-500 animate-pulse"
    default: return "bg-slate-400"
  }
}

function StatusBadge({ status, label }: { status: StatusLevel; label?: string }) {
  const text = label ?? (status === "green" ? "OK" : status === "yellow" ? "WARN" : status === "red" ? "ERROR" : "?")
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border", statusColor(status))}>
      <span className={cn("h-1.5 w-1.5 rounded-full", statusDot(status))} />
      {text}
    </span>
  )
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  status,
  lastSuccess,
  failureCount,
  detail,
  children,
}: {
  title: string
  icon: React.ReactNode
  status: StatusLevel
  lastSuccess: string | null
  failureCount: number
  detail?: string
  children?: React.ReactNode
}) {
  return (
    <div className={cn(
      "bg-white rounded-xl border overflow-hidden transition-all",
      status === "red" ? "border-red-200 shadow-sm shadow-red-100" :
      status === "yellow" ? "border-amber-200" :
      "border-slate-200"
    )}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">{icon}</span>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Meta row */}
      <div className="px-5 py-3 flex items-center gap-4 border-b border-slate-50 bg-slate-50/40 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-slate-400" />
          Last success: <span className="text-slate-700 font-medium ml-1">{relTime(lastSuccess)}</span>
        </span>
        {failureCount > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <AlertCircle className="h-3 w-3" />
            {failureCount} failure{failureCount !== 1 ? "s" : ""}
          </span>
        )}
        {detail && (
          <span className="text-slate-500 truncate">{detail}</span>
        )}
      </div>

      {/* Body */}
      {children && (
        <div className="px-5 py-4 text-sm">{children}</div>
      )}
    </div>
  )
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────

function SummaryBar({ sections, lastRefresh, loading, onRefresh }: {
  sections: SectionStatus[]
  lastRefresh: Date
  loading: boolean
  onRefresh: () => void
}) {
  const green = sections.filter(s => s.status === "green").length
  const yellow = sections.filter(s => s.status === "yellow").length
  const red = sections.filter(s => s.status === "red").length
  const unknown = sections.filter(s => s.status === "unknown").length

  const overallStatus: StatusLevel = red > 0 ? "red" : yellow > 0 ? "yellow" : unknown === sections.length ? "unknown" : "green"

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Eye className="h-7 w-7 text-violet-600" />
          Org Monitoring Dashboard
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Real-time org-wide health · Auto-refreshes every 60s</p>
      </div>
      <div className="flex items-center gap-4">
        {/* Overall health pill */}
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold",
          statusColor(overallStatus)
        )}>
          <span className={cn("h-2 w-2 rounded-full", statusDot(overallStatus))} />
          {overallStatus === "green" ? "All Systems OK" :
           overallStatus === "red" ? `${red} System${red !== 1 ? "s" : ""} Down` :
           overallStatus === "yellow" ? `${yellow} Warning${yellow !== 1 ? "s" : ""}` : "Loading…"}
        </div>
        {/* Counts */}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />{green} OK
          </span>
          {yellow > 0 && <span className="flex items-center gap-1 text-amber-600 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />{yellow} Warn
          </span>}
          {red > 0 && <span className="flex items-center gap-1 text-red-600 font-medium">
            <XCircle className="h-3.5 w-3.5" />{red} Error
          </span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Updated {relTime(lastRefresh.toISOString())}</span>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OrgMonitoringPage() {
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Section data
  const [serviceHealth, setServiceHealth] = useState<ServiceHealthItem[]>([])
  const [serviceCheckedAt, setServiceCheckedAt] = useState<string | null>(null)
  const [karpathy, setKarpathy] = useState<KarpathyStatus | null>(null)
  const [agentFailures, setAgentFailures] = useState<AgentFailureRow[]>([])
  const [cronJobs, setCronJobs] = useState<CronJobRow[]>([])
  const [agentReports, setAgentReports] = useState<AgentReportRow[]>([])
  const [openIssues, setOpenIssues] = useState<number>(0)
  const [emailDeliveryStatus, setEmailDeliveryStatus] = useState<ServiceHealthItem | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)

    // 1. Service Health — mc_health_reports latest
    try {
      const { data } = await supabase
        .from("mc_health_reports" as never)
        .select("report, green_count, red_count, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
      if (data && Array.isArray(data) && data.length > 0) {
        const row = data[0] as { report: { services: ServiceHealthItem[]; checkedAt: string }; created_at: string }
        const services: ServiceHealthItem[] = row.report?.services ?? []
        setServiceHealth(services)
        setServiceCheckedAt(row.report?.checkedAt ?? row.created_at)
        // Email deliverability
        const emailSvc = services.find(s => s.name?.toLowerCase().includes("email"))
        setEmailDeliveryStatus(emailSvc ?? null)
      }
    } catch { /* no-op */ }

    // 2. Karpathy Audit — process_health_log + instruction_changes
    try {
      const { data: phData } = await supabase
        .from("process_health_log" as never)
        .select("process_name, status, checked_at, artifact_detail")
        .in("process_name" as never, ["karpathy-review", "karpathy-apply"])
        .order("checked_at", { ascending: false })
        .limit(10)

      const { data: icData } = await supabase
        .from("instruction_changes" as never)
        .select("status, applied_at, created_at")
        .order("created_at", { ascending: false })
        .limit(50)

      if (phData && Array.isArray(phData)) {
        type PHRow = { process_name: string; status: string; checked_at: string; artifact_detail: string | null }
        const rows = phData as PHRow[]
        const reviewRow = rows.find(r => r.process_name === "karpathy-review")
        const applyRow = rows.find(r => r.process_name === "karpathy-apply")

        let pendingCount = 0
        let appliedLast7d = 0
        if (icData && Array.isArray(icData)) {
          const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
          type ICRow = { status: string; applied_at: string | null; created_at: string }
          const icRows = icData as ICRow[]
          pendingCount = icRows.filter(r => r.status === "pending").length
          appliedLast7d = icRows.filter(r => r.status === "applied" && (r.applied_at ?? r.created_at) >= since7d).length
        }

        setKarpathy({
          reviewOk: reviewRow?.status === "ok",
          applyOk: applyRow?.status === "ok",
          reviewLastRun: reviewRow?.checked_at ?? null,
          applyLastRun: applyRow?.checked_at ?? null,
          pendingProposals: pendingCount,
          appliedLast7d,
        })
      }
    } catch { /* no-op */ }

    // 3. BCF / Agent Failures — last 7 days
    try {
      const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
      const { data } = await supabase
        .from("agent_failures" as never)
        .select("agent_name, severity")
        .gte("created_at" as never, since7d)
        .eq("is_test" as never, false)
      if (data && Array.isArray(data)) {
        type AFRow = { agent_name: string; severity: string }
        const rows = data as AFRow[]
        const map: Record<string, Record<string, number>> = {}
        rows.forEach(r => {
          if (!map[r.agent_name]) map[r.agent_name] = {}
          map[r.agent_name][r.severity] = (map[r.agent_name][r.severity] ?? 0) + 1
        })
        const out: AgentFailureRow[] = []
        Object.entries(map).forEach(([agent, sev]) => {
          Object.entries(sev).forEach(([severity, count]) => {
            out.push({ agent_name: agent, severity, count })
          })
        })
        setAgentFailures(out.sort((a, b) => {
          const sOrder = { high: 0, medium: 1, low: 2 }
          return (sOrder[a.severity as keyof typeof sOrder] ?? 9) - (sOrder[b.severity as keyof typeof sOrder] ?? 9)
        }))
      }
    } catch { /* no-op */ }

    // 4. Cron Health
    try {
      const { data } = await supabase
        .from("cron_jobs" as never)
        .select("id, name, enabled, last_status, consecutive_errors, last_run_at")
        .eq("enabled" as never, true)
        .order("name" as never)
      if (data && Array.isArray(data)) {
        setCronJobs(data as CronJobRow[])
      }
    } catch { /* no-op */ }

    // 5. Agent Diagnostic — last mc_report per agent
    try {
      const { data } = await supabase
        .from("mc_reports" as never)
        .select("title, metadata, created_at")
        .eq("type" as never, "hourly_summary")
        .order("created_at", { ascending: false })
        .limit(20)
      if (data && Array.isArray(data)) {
        type MCRRow = { title: string; metadata: { agent?: string }; created_at: string }
        const rows = data as MCRRow[]
        const seen = new Set<string>()
        const out: AgentReportRow[] = []
        for (const r of rows) {
          const agent = r.metadata?.agent ?? "Unknown"
          if (!seen.has(agent)) {
            seen.add(agent)
            out.push({ agent, title: r.title, created_at: r.created_at })
          }
        }
        setAgentReports(out)
      }
    } catch { /* no-op */ }

    // 6. Escalation — open paperclip issues from paperclip_sync
    try {
      const { data, count } = await (supabase
        .from("paperclip_sync" as never)
        .select("id", { count: "exact" })
        .eq("record_type" as never, "issue")
        .eq("status" as never, "in_progress") as unknown as Promise<{ data: unknown; count: number | null }>)
      setOpenIssues(count ?? 0)
    } catch { /* no-op */ }

    setLastRefresh(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const iv = setInterval(fetchData, 60000)
    return () => clearInterval(iv)
  }, [fetchData])

  // ─── Derive Section Statuses ───────────────────────────────────────────────

  // 1. Service Health
  const svcErrors = serviceHealth.filter(s => s.status !== "ok").length
  const svcStatus: StatusLevel = serviceHealth.length === 0 ? "unknown" : svcErrors > 0 ? "red" : "green"

  // 2. Karpathy
  const karpathyStatus: StatusLevel = karpathy === null ? "unknown" :
    (!karpathy.reviewOk || !karpathy.applyOk) ? "red" :
    karpathy.pendingProposals > 3 ? "yellow" : "green"
  const karpathyLastSuccess = karpathy?.applyLastRun ?? karpathy?.reviewLastRun ?? null

  // 3. BCF
  const bcfHighCount = agentFailures.filter(f => f.severity === "high").reduce((s, f) => s + f.count, 0)
  const bcfTotalCount = agentFailures.reduce((s, f) => s + f.count, 0)
  const bcfStatus: StatusLevel = bcfHighCount > 5 ? "red" : bcfHighCount > 0 ? "yellow" : bcfTotalCount > 0 ? "yellow" : "green"

  // 4. Agent Escalation (open in_progress issues)
  const escalationStatus: StatusLevel = openIssues > 20 ? "yellow" : "green"

  // 5. Email Deliverability
  const emailStatus: StatusLevel = emailDeliveryStatus === null ? "unknown" :
    emailDeliveryStatus.status === "ok" ? "green" : "red"

  // 6. Cron Health
  const cronErrors = cronJobs.filter(c => c.consecutive_errors > 0).length
  const cronStatus: StatusLevel = cronErrors > 0 ? "red" : cronJobs.length === 0 ? "unknown" : "green"
  const cronOkCount = cronJobs.filter(c => c.consecutive_errors === 0).length

  // 7. Agent Diagnostics
  const agentDiagStatus: StatusLevel = agentReports.length === 0 ? "unknown" : "green"

  const sections: SectionStatus[] = [
    { label: "Service Health", status: svcStatus, lastSuccess: serviceCheckedAt, failureCount: svcErrors },
    { label: "Karpathy Audit", status: karpathyStatus, lastSuccess: karpathyLastSuccess, failureCount: karpathy?.pendingProposals ?? 0 },
    { label: "BCF / Agent Failures", status: bcfStatus, lastSuccess: null, failureCount: bcfHighCount },
    { label: "Agent Escalation", status: escalationStatus, lastSuccess: null, failureCount: 0 },
    { label: "Email Deliverability", status: emailStatus, lastSuccess: serviceCheckedAt, failureCount: emailDeliveryStatus?.status !== "ok" ? 1 : 0 },
    { label: "Cron Health", status: cronStatus, lastSuccess: cronJobs.find(c => c.consecutive_errors === 0)?.last_run_at ?? null, failureCount: cronErrors },
    { label: "Agent Diagnostics", status: agentDiagStatus, lastSuccess: agentReports[0]?.created_at ?? null, failureCount: 0 },
  ]

  return (
    <DashboardLayout>
      <PageContent>
        <SummaryBar
          sections={sections}
          lastRefresh={lastRefresh}
          loading={loading}
          onRefresh={fetchData}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* 1. Service Health */}
          <SectionCard
            title="Service Health"
            icon={<Server className="h-4 w-4" />}
            status={svcStatus}
            lastSuccess={serviceCheckedAt}
            failureCount={svcErrors}
            detail={serviceHealth.length > 0 ? `${serviceHealth.length - svcErrors}/${serviceHealth.length} services OK` : undefined}
          >
            {serviceHealth.length === 0 ? (
              <p className="text-slate-400 text-xs">No data yet</p>
            ) : (
              <div className="space-y-1.5">
                {serviceHealth.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                    <span className="text-slate-700 font-medium text-xs">{s.name}</span>
                    <div className="flex items-center gap-2">
                      {s.reason && <span className="text-slate-400 text-xs">{s.reason}</span>}
                      <StatusBadge status={s.status === "ok" ? "green" : s.status === "warn" ? "yellow" : "red"} label={s.status === "ok" ? "OK" : "ERR"} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* 2. Karpathy Audit Trail */}
          <SectionCard
            title="Karpathy Audit Trail"
            icon={<Brain className="h-4 w-4" />}
            status={karpathyStatus}
            lastSuccess={karpathyLastSuccess}
            failureCount={karpathy?.pendingProposals ?? 0}
            detail={karpathy ? `${karpathy.appliedLast7d} applied last 7d · ${karpathy.pendingProposals} pending` : undefined}
          >
            {karpathy === null ? (
              <p className="text-slate-400 text-xs">Loading…</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-700 text-xs font-medium">Karpathy Review</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs">{relTime(karpathy.reviewLastRun)}</span>
                    <StatusBadge status={karpathy.reviewOk ? "green" : "red"} label={karpathy.reviewOk ? "OK" : "ERR"} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-700 text-xs font-medium">Karpathy Apply</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs">{relTime(karpathy.applyLastRun)}</span>
                    <StatusBadge status={karpathy.applyOk ? "green" : "red"} label={karpathy.applyOk ? "OK" : "ERR"} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-700 text-xs font-medium">Pending proposals</span>
                  <span className={cn("text-xs font-semibold", karpathy.pendingProposals > 3 ? "text-amber-600" : "text-slate-600")}>
                    {karpathy.pendingProposals}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-700 text-xs font-medium">Applied (last 7d)</span>
                  <span className="text-emerald-600 text-xs font-semibold">{karpathy.appliedLast7d}</span>
                </div>
              </div>
            )}
          </SectionCard>

          {/* 3. BCF / Agent Failures */}
          <SectionCard
            title="BCF Canary · Agent Failures (7d)"
            icon={<Shield className="h-4 w-4" />}
            status={bcfStatus}
            lastSuccess={null}
            failureCount={bcfHighCount}
            detail={bcfTotalCount > 0 ? `${bcfTotalCount} total · ${bcfHighCount} high severity` : "No failures"}
          >
            {agentFailures.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-600 py-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">No agent failures in last 7 days</span>
              </div>
            ) : (
              <div className="space-y-1">
                {["high", "medium", "low"].map(sev => {
                  const rows = agentFailures.filter(f => f.severity === sev)
                  if (rows.length === 0) return null
                  return (
                    <div key={sev}>
                      <div className={cn(
                        "text-xs font-semibold uppercase tracking-wide mb-1",
                        sev === "high" ? "text-red-600" : sev === "medium" ? "text-amber-600" : "text-slate-400"
                      )}>
                        {sev}
                      </div>
                      <div className="grid grid-cols-2 gap-1 mb-2">
                        {rows.map(f => (
                          <div key={f.agent_name} className="flex items-center justify-between px-2 py-1 bg-slate-50 rounded border border-slate-100">
                            <span className="text-xs text-slate-700 capitalize">{f.agent_name}</span>
                            <span className={cn("text-xs font-bold", sev === "high" ? "text-red-600" : sev === "medium" ? "text-amber-600" : "text-slate-500")}>{f.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* 4. Agent Escalation */}
          <SectionCard
            title="Agent Escalation · Active Tickets"
            icon={<AlertCircle className="h-4 w-4" />}
            status={escalationStatus}
            lastSuccess={null}
            failureCount={0}
            detail={`${openIssues} issue${openIssues !== 1 ? "s" : ""} in_progress`}
          >
            <div className="flex items-center gap-3 py-2">
              <div className={cn(
                "text-3xl font-bold",
                openIssues > 20 ? "text-amber-600" : "text-slate-800"
              )}>
                {openIssues}
              </div>
              <div>
                <div className="text-sm font-medium text-slate-700">Active Paperclip Issues</div>
                <div className="text-xs text-slate-400">in_progress across all agents</div>
              </div>
            </div>
            {openIssues > 20 && (
              <div className="flex items-center gap-2 text-amber-600 text-xs mt-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                High volume — check for stuck issues
              </div>
            )}
          </SectionCard>

          {/* 5. Email Deliverability */}
          <SectionCard
            title="Email Deliverability"
            icon={<Mail className="h-4 w-4" />}
            status={emailStatus}
            lastSuccess={serviceCheckedAt}
            failureCount={emailDeliveryStatus?.status !== "ok" ? 1 : 0}
            detail={emailDeliveryStatus?.reason}
          >
            {emailDeliveryStatus === null ? (
              <p className="text-slate-400 text-xs">No data yet</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-700 text-xs font-medium">{emailDeliveryStatus.name}</span>
                  <StatusBadge status={emailDeliveryStatus.status === "ok" ? "green" : "red"} label={emailDeliveryStatus.status === "ok" ? "OK" : "ERR"} />
                </div>
                {emailDeliveryStatus.reason && (
                  <p className="text-xs text-slate-500">{emailDeliveryStatus.reason}</p>
                )}
                {emailDeliveryStatus.checkedAt && (
                  <p className="text-xs text-slate-400">Checked {relTime(emailDeliveryStatus.checkedAt)}</p>
                )}
              </div>
            )}
          </SectionCard>

          {/* 6. Cron Health */}
          <SectionCard
            title="Cron Health"
            icon={<Clock className="h-4 w-4" />}
            status={cronStatus}
            lastSuccess={cronJobs.find(c => c.last_run_at)?.last_run_at ?? null}
            failureCount={cronErrors}
            detail={`${cronOkCount}/${cronJobs.length} jobs OK`}
          >
            {cronJobs.length === 0 ? (
              <p className="text-slate-400 text-xs">No cron jobs found</p>
            ) : (
              <div className="space-y-1.5">
                {cronJobs.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                    <span className="text-slate-700 text-xs font-medium truncate max-w-[160px]">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs">{relTime(c.last_run_at)}</span>
                      {c.consecutive_errors > 0 ? (
                        <span className="text-xs text-red-600 font-semibold">{c.consecutive_errors} err</span>
                      ) : (
                        <StatusBadge status="green" label="OK" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* 7. Agent Diagnostics — full width */}
          <div className="lg:col-span-2">
            <SectionCard
              title="Agent Diagnostics · Hourly Summaries"
              icon={<Users className="h-4 w-4" />}
              status={agentDiagStatus}
              lastSuccess={agentReports[0]?.created_at ?? null}
              failureCount={0}
              detail={agentReports.length > 0 ? `${agentReports.length} agents reporting` : undefined}
            >
              {agentReports.length === 0 ? (
                <p className="text-slate-400 text-xs">No hourly summaries found</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {agentReports.map(r => (
                    <div key={r.agent} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-800 capitalize">{r.agent}</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </div>
                      <div className="text-xs text-slate-400">Last report</div>
                      <div className="text-xs text-slate-600 font-medium mt-0.5">{relTime(r.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* HEARTBEAT Quick Reference */}
          <div className="lg:col-span-2">
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-violet-500" />
                <h3 className="text-sm font-semibold text-slate-700">HEARTBEAT Checks Reference</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs text-slate-600">
                {[
                  "Context usage",
                  "Active subagents",
                  "Fight Flow leads",
                  "WORKING.md staleness",
                  "Stage 2 health",
                  "Cron errors",
                  "Agent org health (>24h)",
                  "Knowledge transfer",
                  "Outcome check",
                  "Gateway config watchdog",
                  "Done-claim artifact check",
                  "Karpathy loop health",
                  "BOOTSTRAP injection",
                ].map(check => (
                  <div key={check} className="flex items-center gap-1.5 px-2 py-1 bg-white rounded border border-slate-100">
                    <TrendingUp className="h-3 w-3 text-violet-400 flex-shrink-0" />
                    <span>{check}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </PageContent>
    </DashboardLayout>
  )
}
