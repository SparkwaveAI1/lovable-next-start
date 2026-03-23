import { useCallback, useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { PageContent } from "@/components/layout/PageLayout"
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Mail,
  RefreshCw,
  Search,
  Shield,
  Siren,
  Target,
  Timer,
  TrendingUp,
  Users,
  XCircle,
  Zap,
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface HealthCheckResult {
  id: string
  name: string
  status: "GREEN" | "YELLOW" | "RED"
  checks: Array<{ name: string; status: string; detail: string }>
  agent?: string
}

interface HealthReport {
  results: HealthCheckResult[]
  summary: { green: number; yellow: number; red: number; total: number }
  timestamp: string
}

interface InstructionChange {
  id: string
  status: string
  created_at: string
  applied_at: string | null
}

interface AgentFailure {
  failure_id: string
  agent_name: string
  session_date: string
  category: string
  short_label: string
  severity: string
  created_at: string
}

interface AgentRow {
  name: string
  status: string
  last_activity: string | null
  current_task: string | null
}

interface AgentSignal {
  id: string
  signal_type: string
  title: string | null
  created_at: string
}

interface AutomationLog {
  id: string
  status: string | null
  created_at: string
}

interface CronJobRow {
  id: string
  name: string
  enabled: boolean
  last_run_at: string | null
  next_run_at: string | null
  last_status: string | null
  consecutive_errors: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "Never"
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
    return "?"
  }
}

function futureTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    const diff = new Date(iso).getTime() - Date.now()
    if (diff <= 0) return "overdue"
    const secs = Math.floor(diff / 1000)
    if (secs < 60) return `in ${secs}s`
    const mins = Math.floor(secs / 60)
    if (mins < 60) return `in ${mins}m`
    const hrs = Math.floor(mins / 60)
    return `in ${hrs}h`
  } catch {
    return "—"
  }
}

function StatusBadge({ status }: { status: "GREEN" | "YELLOW" | "RED" | "OK" | "WARN" | "ERROR" | string }) {
  const s = status?.toUpperCase()
  const cls = s === "GREEN" || s === "OK" || s === "RUNNING"
    ? "bg-emerald-100 text-emerald-700"
    : s === "YELLOW" || s === "WARN" || s === "IDLE"
    ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-700"
  const icon = s === "GREEN" || s === "OK" || s === "RUNNING"
    ? <CheckCircle2 className="h-3 w-3" />
    : s === "YELLOW" || s === "WARN" || s === "IDLE"
    ? <AlertTriangle className="h-3 w-3" />
    : <XCircle className="h-3 w-3" />
  const label = s === "GREEN" ? "OK" : s === "YELLOW" ? "WARN" : s === "RED" ? "Error" : status
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", cls)}>
      {icon} {label}
    </span>
  )
}

function SectionCard({
  title,
  icon,
  lastUpdated,
  children,
  unavailable,
}: {
  title: string
  icon: React.ReactNode
  lastUpdated?: string | null
  children: React.ReactNode
  unavailable?: boolean
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <span className="text-slate-500">{icon}</span>
            {title}
          </CardTitle>
          {lastUpdated && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {relativeTime(lastUpdated)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {unavailable ? (
          <div className="flex items-center gap-2 text-slate-400 py-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Data unavailable</span>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

// ─── Section 1: Automated Health Checks ──────────────────────────────────────

function OrgHealthSection({
  report,
  reportTime,
  unavailable,
}: {
  report: HealthReport | null
  reportTime: string | null
  unavailable: boolean
}) {
  return (
    <SectionCard title="Automated Health Checks" icon={<Shield className="h-4 w-4" />} lastUpdated={reportTime} unavailable={unavailable && !report}>
      {report ? (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs font-medium text-slate-600">Last run:</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> {report.summary.green} OK
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
              <AlertTriangle className="h-3 w-3" /> {report.summary.yellow} Warn
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
              <XCircle className="h-3 w-3" /> {report.summary.red} Error
            </span>
            <span className="ml-auto text-xs text-slate-400">{report.summary.total} checks total</span>
          </div>
          {/* Individual results */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {report.results.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border text-xs",
                  r.status === "GREEN"
                    ? "bg-emerald-50 border-emerald-100"
                    : r.status === "YELLOW"
                    ? "bg-amber-50 border-amber-100"
                    : "bg-red-50 border-red-100"
                )}
              >
                <span className="font-medium text-slate-700 truncate mr-2 flex-1">{r.name}</span>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-slate-400 text-sm py-2">No health report data found</div>
      )}
    </SectionCard>
  )
}

// ─── Section 2: Karpathy Improvement Loop ────────────────────────────────────

function KarpathySection({
  changes,
  unavailable,
}: {
  changes: InstructionChange[]
  unavailable: boolean
}) {
  const lastApplied = changes.find((c) => c.status === "applied")
  const pending = changes.filter((c) => c.status === "pending").length
  const loopStatus: "GREEN" | "YELLOW" | "RED" = lastApplied
    ? Date.now() - new Date(lastApplied.applied_at || lastApplied.created_at).getTime() < 7 * 86400000
      ? "GREEN"
      : "YELLOW"
    : "RED"

  return (
    <SectionCard
      title="Karpathy Improvement Loop"
      icon={<TrendingUp className="h-4 w-4" />}
      lastUpdated={lastApplied?.applied_at || null}
      unavailable={unavailable}
    >
      {/* Status summary */}
      <div className="flex items-center gap-3 mb-4">
        <StatusBadge status={loopStatus} />
        <span className="text-xs text-slate-500">
          {lastApplied
            ? `Last applied ${relativeTime(lastApplied.applied_at)}`
            : "No applied changes found"}
        </span>
        {pending > 0 && (
          <span className="ml-auto text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">
            {pending} pending
          </span>
        )}
      </div>
      {/* Recent changes */}
      {changes.length > 0 ? (
        <div className="space-y-1.5">
          {changes.slice(0, 5).map((c) => {
            const st = c.status === "applied" ? "GREEN" : c.status === "pending" ? "YELLOW" : "RED"
            return (
              <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2">
                  <StatusBadge status={st} />
                  <span className="text-xs text-slate-600 capitalize">{c.status}</span>
                </div>
                <div className="text-xs text-slate-400">
                  {c.applied_at ? `Applied ${relativeTime(c.applied_at)}` : `Created ${relativeTime(c.created_at)}`}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-slate-400 text-sm py-1">No instruction changes found</div>
      )}
    </SectionCard>
  )
}

// ─── Section 3: BCF Failure Detection ────────────────────────────────────────

function BCFSection({
  failures,
  unavailable,
}: {
  failures: AgentFailure[]
  unavailable: boolean
}) {
  // Group by agent
  const byAgent: Record<string, AgentFailure[]> = {}
  failures.forEach((f) => {
    if (!byAgent[f.agent_name]) byAgent[f.agent_name] = []
    byAgent[f.agent_name].push(f)
  })

  const today = new Date().toISOString().slice(0, 10)
  const hasToday = failures.some((f) => f.session_date === today)
  const overallStatus: "GREEN" | "YELLOW" | "RED" = failures.length === 0 ? "GREEN" : hasToday ? "RED" : "YELLOW"

  return (
    <SectionCard
      title="BCF Failure Detection"
      icon={<AlertTriangle className="h-4 w-4" />}
      unavailable={unavailable}
      lastUpdated={failures[0]?.created_at || null}
    >
      <div className="flex items-center gap-3 mb-3">
        <StatusBadge status={overallStatus} />
        <span className="text-xs text-slate-500">
          {failures.length === 0
            ? "No failures in last 7 days"
            : `${failures.length} failure(s) detected`}
        </span>
      </div>
      {Object.keys(byAgent).length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(byAgent).map(([agent, agentFailures]) => {
            const todayCount = agentFailures.filter((f) => f.session_date === today).length
            const st: "GREEN" | "YELLOW" | "RED" = todayCount > 0 ? "RED" : "YELLOW"
            return (
              <div key={agent} className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-700 capitalize">{agent}</span>
                  <StatusBadge status={st} />
                </div>
                <div className="text-xs text-slate-500">
                  {agentFailures.length} failure(s) · {todayCount} today
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5">{agentFailures[0].category}</div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-emerald-600 py-1">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-xs font-medium">Clean — no failures in last 7 days</span>
        </div>
      )}
    </SectionCard>
  )
}

// ─── Section 4: Agent Status ──────────────────────────────────────────────────

const AGENT_ORG = [
  { key: "rico", role: "CEO / Orchestrator", ip: "5.161.190.94" },
  { key: "dev", role: "PersonaAI + CharX coding", ip: "5.161.186.106" },
  { key: "iris", role: "Sales + Marketing", ip: "178.156.250.119" },
  { key: "jerry", role: "Research + Ventures", ip: "5.161.184.240" },
  { key: "opal", role: "Process + PM", ip: "178.156.214.228" },
]

function AgentStatusSection({
  agents,
  unavailable,
}: {
  agents: AgentRow[]
  unavailable: boolean
}) {
  return (
    <SectionCard title="Agent Status" icon={<Users className="h-4 w-4" />} unavailable={unavailable}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {AGENT_ORG.map((meta) => {
          const row = agents.find((a) => a.name?.toLowerCase() === meta.key)
          const status = row?.status || "unknown"
          const stNorm: "GREEN" | "YELLOW" | "RED" =
            status.toLowerCase().includes("run") || status.toLowerCase().includes("active")
              ? "GREEN"
              : status.toLowerCase().includes("idle")
              ? "YELLOW"
              : row
              ? "YELLOW"
              : "RED"
          return (
            <div key={meta.key} className="p-3 rounded-lg border border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-700 capitalize">{meta.key}</span>
                <StatusBadge status={stNorm} />
              </div>
              <div className="text-xs text-slate-500">{meta.role}</div>
              {row?.last_activity && (
                <div className="text-xs text-slate-400 mt-0.5">{relativeTime(row.last_activity)}</div>
              )}
              {row?.current_task && (
                <div className="text-xs text-slate-400 truncate mt-0.5" title={row.current_task}>
                  {row.current_task}
                </div>
              )}
              {!row && <div className="text-xs text-red-400 mt-0.5">No data in mc_agents</div>}
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

// ─── Section 5: Cron Jobs ────────────────────────────────────────────────────

function CronSection({
  cronJobs,
  unavailable,
}: {
  cronJobs: CronJobRow[]
  unavailable: boolean
}) {
  const errorJobs = cronJobs.filter((c) => (c.consecutive_errors || 0) > 0)
  const overallStatus: "GREEN" | "YELLOW" | "RED" = errorJobs.length > 0 ? "RED" : "GREEN"

  return (
    <SectionCard
      title="Cron Jobs"
      icon={<Timer className="h-4 w-4" />}
      unavailable={unavailable}
    >
      <div className="flex items-center gap-3 mb-3">
        <StatusBadge status={overallStatus} />
        <span className="text-xs text-slate-500">
          {cronJobs.length} enabled · {errorJobs.length} with errors
        </span>
      </div>
      {cronJobs.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 font-medium text-slate-500 pr-4">Name</th>
                <th className="text-left py-2 font-medium text-slate-500 pr-4">Status</th>
                <th className="text-left py-2 font-medium text-slate-500 pr-4">Last Run</th>
                <th className="text-left py-2 font-medium text-slate-500">Next Run</th>
              </tr>
            </thead>
            <tbody>
              {cronJobs.map((c) => {
                const isOk = !c.consecutive_errors || c.consecutive_errors === 0
                return (
                  <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="py-2 pr-4 text-slate-700 max-w-[180px] truncate" title={c.name}>
                      {c.name}
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={isOk ? "GREEN" : "RED"} />
                      {!isOk && (
                        <span className="ml-1 text-red-500 text-xs">{c.consecutive_errors} err</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-slate-500">{relativeTime(c.last_run_at)}</td>
                    <td className="py-2 text-slate-500">{futureTime(c.next_run_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-slate-400 text-sm py-1">No enabled cron jobs found</div>
      )}
    </SectionCard>
  )
}

// ─── Section 6: Email Deliverability ─────────────────────────────────────────

function EmailSection({
  emailSends,
  emailUnavailable,
}: {
  emailSends: { sent: number; failed: number; lastSent: string | null } | null
  emailUnavailable: boolean
}) {
  const rate = emailSends && (emailSends.sent + emailSends.failed) > 0
    ? Math.round((emailSends.sent / (emailSends.sent + emailSends.failed)) * 100)
    : null
  const status: "GREEN" | "YELLOW" | "RED" = rate === null ? "YELLOW" : rate >= 90 ? "GREEN" : rate >= 70 ? "YELLOW" : "RED"

  return (
    <SectionCard
      title="Email Deliverability"
      icon={<Mail className="h-4 w-4" />}
      unavailable={emailUnavailable}
      lastUpdated={emailSends?.lastSent}
    >
      {emailSends ? (
        <div className="flex items-start gap-6">
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            {rate !== null && <span className="text-lg font-bold text-slate-800">{rate}%</span>}
          </div>
          <div className="space-y-1 text-xs text-slate-500">
            <div>
              <span className="text-emerald-600 font-medium">{emailSends.sent}</span> sent in last 24h
            </div>
            {emailSends.failed > 0 && (
              <div>
                <span className="text-red-500 font-medium">{emailSends.failed}</span> failed
              </div>
            )}
            {emailSends.lastSent && (
              <div>Last sent: {relativeTime(emailSends.lastSent)}</div>
            )}
          </div>
        </div>
      ) : !emailUnavailable ? (
        <div className="text-slate-400 text-sm py-1">No email send data in last 24h</div>
      ) : null}
    </SectionCard>
  )
}

// ─── Section 7: Fight Flow Pipeline ──────────────────────────────────────────

function FightFlowSection({
  leads24h,
  lastLead,
  sms24h,
  lastSms,
  unavailable,
}: {
  leads24h: number
  lastLead: string | null
  sms24h: number
  lastSms: string | null
  unavailable: boolean
}) {
  const status: "GREEN" | "YELLOW" | "RED" = unavailable
    ? "YELLOW"
    : leads24h >= 1 || sms24h >= 1
    ? "GREEN"
    : "YELLOW"

  return (
    <SectionCard title="Fight Flow Pipeline" icon={<Target className="h-4 w-4" />} unavailable={unavailable}>
      <div className="flex items-center gap-3 mb-3">
        <StatusBadge status={status} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-2xl font-bold text-slate-800">{leads24h}</div>
          <div className="text-xs text-slate-500 mt-0.5">New leads (24h)</div>
          {lastLead && <div className="text-xs text-slate-400 mt-1">Last: {relativeTime(lastLead)}</div>}
        </div>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-2xl font-bold text-slate-800">{sms24h}</div>
          <div className="text-xs text-slate-500 mt-0.5">SMS sent (24h)</div>
          {lastSms && <div className="text-xs text-slate-400 mt-1">Last: {relativeTime(lastSms)}</div>}
        </div>
      </div>
    </SectionCard>
  )
}

// ─── New Section: SEO Research Automation ─────────────────────────────────────

function SeoResearchSection({
  signals,
  unavailable,
}: {
  signals: AgentSignal[]
  unavailable: boolean
}) {
  const now = Date.now()
  const latest = signals[0]
  const ageMs = latest ? now - new Date(latest.created_at).getTime() : null
  const health: "green" | "yellow" | "red" | "gray" =
    unavailable ? "gray"
    : ageMs === null ? "red"
    : ageMs < 25 * 3600000 ? "green"
    : ageMs < 48 * 3600000 ? "yellow"
    : "red"

  const dotColors: Record<string, string> = {
    green: "bg-emerald-500",
    yellow: "bg-amber-400",
    red: "bg-red-500",
    gray: "bg-slate-400",
  }
  const summaryText =
    unavailable ? "Data unavailable"
    : !latest ? "No signals — cron may not have run yet"
    : health === "green" ? `Last signal ${relativeTime(latest.created_at)}`
    : health === "yellow" ? `Last signal ${relativeTime(latest.created_at)} — running late`
    : `Last signal ${relativeTime(latest.created_at)} — stale`

  return (
    <SectionCard title="SEO Research Automation" icon={<Search className="h-4 w-4" />} unavailable={false}>
      <div className="flex items-center gap-2 mb-3">
        <span className={cn("inline-block h-2.5 w-2.5 rounded-full flex-shrink-0", dotColors[health])} />
        <span className="text-xs text-slate-600">{summaryText}</span>
      </div>
      {signals.length > 0 && !unavailable && (
        <div className="space-y-1.5">
          {signals.slice(0, 5).map((s) => (
            <div key={s.id} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
              <span className="text-xs text-slate-700 truncate max-w-[70%]" title={s.title ?? s.signal_type}>
                {s.title ?? s.signal_type}
              </span>
              <span className="text-xs text-slate-400 flex-shrink-0 ml-2">{relativeTime(s.created_at)}</span>
            </div>
          ))}
        </div>
      )}
      {!signals.length && !unavailable && (
        <p className="text-xs text-slate-400">No research_ready signals found in agent_signals</p>
      )}
    </SectionCard>
  )
}

// ─── New Section: Agent Escalation Monitoring ──────────────────────────────────

function AgentEscalationSection({
  failures,
  unavailable,
}: {
  failures: AgentFailure[]
  unavailable: boolean
}) {
  const now = Date.now()
  const cutoff24h = new Date(now - 24 * 3600000).toISOString().slice(0, 10)
  const critical24h = failures.filter((f) => f.severity === "critical" && f.session_date >= cutoff24h).length
  const high24h = failures.filter((f) => f.severity === "high" && f.session_date >= cutoff24h).length

  const health: "green" | "yellow" | "red" | "gray" =
    unavailable ? "gray"
    : critical24h > 0 ? "red"
    : high24h > 0 ? "yellow"
    : "green"

  const dotColors: Record<string, string> = {
    green: "bg-emerald-500",
    yellow: "bg-amber-400",
    red: "bg-red-500",
    gray: "bg-slate-400",
  }
  const summaryText =
    unavailable ? "Data unavailable"
    : critical24h > 0 ? `${critical24h} critical escalation(s) in last 24h`
    : high24h > 0 ? `${high24h} high-severity escalation(s) in last 24h`
    : failures.length > 0 ? `${failures.length} total in last 7d — none critical/high in 24h`
    : "No critical/high escalations in last 7 days"

  return (
    <SectionCard title="Agent Escalation Monitoring" icon={<Siren className="h-4 w-4" />} unavailable={false}>
      <div className="flex items-center gap-2 mb-3">
        <span className={cn("inline-block h-2.5 w-2.5 rounded-full flex-shrink-0", dotColors[health])} />
        <span className="text-xs text-slate-600">{summaryText}</span>
      </div>
      {failures.length > 0 && !unavailable && (
        <div className="space-y-1.5">
          {failures.slice(0, 5).map((f) => {
            const badgeCls = f.severity === "critical"
              ? "bg-red-100 text-red-700"
              : f.severity === "high"
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-600"
            return (
              <div key={f.failure_id} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("inline-block px-1.5 py-0.5 rounded text-xs font-semibold flex-shrink-0", badgeCls)}>
                    {f.severity}
                  </span>
                  <span className="text-xs text-slate-700 truncate" title={f.short_label}>
                    {f.agent_name}: {f.short_label}
                  </span>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0 ml-2">{relativeTime(f.created_at)}</span>
              </div>
            )
          })}
        </div>
      )}
      {!failures.length && !unavailable && (
        <div className="flex items-center gap-2 text-emerald-600 py-1">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-xs font-medium">Clean — no high/critical escalations in last 7 days</span>
        </div>
      )}
    </SectionCard>
  )
}

// ─── New Section: Agent Diagnostic Triggers ────────────────────────────────────

function AgentDiagnosticSection({
  signals,
  unavailable,
}: {
  signals: AgentSignal[]
  unavailable: boolean
}) {
  const now = Date.now()
  const cutoff24h = now - 24 * 3600000
  const count24h = signals.filter((s) => new Date(s.created_at).getTime() >= cutoff24h).length

  const health: "green" | "yellow" | "red" | "gray" =
    unavailable ? "gray"
    : count24h === 0 ? "green"
    : count24h <= 2 ? "yellow"
    : "red"

  const dotColors: Record<string, string> = {
    green: "bg-emerald-500",
    yellow: "bg-amber-400",
    red: "bg-red-500",
    gray: "bg-slate-400",
  }
  const summaryText =
    unavailable ? "Data unavailable"
    : count24h === 0 ? "No diagnostic triggers in last 24h"
    : `${count24h} diagnostic trigger(s) in last 24h`

  return (
    <SectionCard title="Agent Diagnostic Triggers" icon={<Zap className="h-4 w-4" />} unavailable={false}>
      <div className="flex items-center gap-2 mb-3">
        <span className={cn("inline-block h-2.5 w-2.5 rounded-full flex-shrink-0", dotColors[health])} />
        <span className="text-xs text-slate-600">{summaryText}</span>
      </div>
      {signals.length > 0 && !unavailable && (
        <div className="space-y-1.5">
          {signals.slice(0, 5).map((s) => (
            <div key={s.id} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700 flex-shrink-0">
                  {s.signal_type}
                </span>
                <span className="text-xs text-slate-700 truncate" title={s.title ?? ""}>
                  {s.title ?? "—"}
                </span>
              </div>
              <span className="text-xs text-slate-400 flex-shrink-0 ml-2">{relativeTime(s.created_at)}</span>
            </div>
          ))}
        </div>
      )}
      {!signals.length && !unavailable && (
        <div className="flex items-center gap-2 text-emerald-600 py-1">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-xs font-medium">No diagnostic/alert signals in last 7 days</span>
        </div>
      )}
    </SectionCard>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MonitoringPage() {
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null)
  const [healthReportTime, setHealthReportTime] = useState<string | null>(null)
  const [healthUnavailable, setHealthUnavailable] = useState(false)

  const [karpathyChanges, setKarpathyChanges] = useState<InstructionChange[]>([])
  const [karpathyUnavailable, setKarpathyUnavailable] = useState(false)

  const [bcfFailures, setBcfFailures] = useState<AgentFailure[]>([])
  const [bcfUnavailable, setBcfUnavailable] = useState(false)

  const [agents, setAgents] = useState<AgentRow[]>([])
  const [agentsUnavailable, setAgentsUnavailable] = useState(false)

  const [cronJobs, setCronJobs] = useState<CronJobRow[]>([])
  const [cronUnavailable, setCronUnavailable] = useState(false)

  const [emailData, setEmailData] = useState<{ sent: number; failed: number; lastSent: string | null } | null>(null)
  const [emailUnavailable, setEmailUnavailable] = useState(false)

  const [leads24h, setLeads24h] = useState(0)
  const [lastLead, setLastLead] = useState<string | null>(null)
  const [sms24h, setSms24h] = useState(0)
  const [lastSms, setLastSms] = useState<string | null>(null)
  const [fightFlowUnavailable, setFightFlowUnavailable] = useState(false)

  // New org-monitoring sections
  const [seoSignals, setSeoSignals] = useState<AgentSignal[]>([])
  const [seoUnavailable, setSeoUnavailable] = useState(false)
  const [escalationFailures, setEscalationFailures] = useState<AgentFailure[]>([])
  const [escalationUnavailable, setEscalationUnavailable] = useState(false)
  const [diagnosticSignals, setDiagnosticSignals] = useState<AgentSignal[]>([])
  const [diagnosticUnavailable, setDiagnosticUnavailable] = useState(false)

  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)

    // 1. Org health reports
    try {
      const { data, error } = await supabase
        .from("mc_health_reports" as never)
        .select("report, created_at")
        .order("created_at" as never, { ascending: false })
        .limit(1)
      if (error) throw error
      if (data && Array.isArray(data) && data.length > 0) {
        const row = data[0] as { report: HealthReport; created_at: string }
        setHealthReport(row.report)
        setHealthReportTime(row.created_at)
        setHealthUnavailable(false)
      } else {
        setHealthUnavailable(true)
      }
    } catch {
      setHealthUnavailable(true)
    }

    // 2. Karpathy instruction_changes
    try {
      const { data, error } = await supabase
        .from("instruction_changes" as never)
        .select("id, status, created_at, applied_at")
        .order("created_at" as never, { ascending: false })
        .limit(8)
      if (error) throw error
      setKarpathyChanges((data as InstructionChange[]) || [])
      setKarpathyUnavailable(false)
    } catch {
      setKarpathyUnavailable(true)
    }

    // 3. BCF agent_failures (last 7 days)
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from("agent_failures" as never)
        .select("failure_id, agent_name, session_date, category, short_label, severity, created_at")
        .gte("session_date" as never, sevenDaysAgo)
        .order("created_at" as never, { ascending: false })
        .limit(50)
      if (error) throw error
      setBcfFailures((data as AgentFailure[]) || [])
      setBcfUnavailable(false)
    } catch {
      setBcfUnavailable(true)
    }

    // 4. Agent status (mc_agents)
    try {
      const { data, error } = await supabase
        .from("mc_agents" as never)
        .select("name, status, last_activity, current_task")
        .limit(20)
      if (error) throw error
      setAgents((data as AgentRow[]) || [])
      setAgentsUnavailable(false)
    } catch {
      setAgentsUnavailable(true)
    }

    // 5. Cron jobs
    try {
      const { data, error } = await supabase
        .from("cron_jobs" as never)
        .select("id, name, enabled, last_run_at, next_run_at, last_status, consecutive_errors")
        .eq("enabled" as never, true)
        .order("name" as never)
        .limit(40)
      if (error) throw error
      setCronJobs((data as CronJobRow[]) || [])
      setCronUnavailable(false)
    } catch {
      setCronUnavailable(true)
    }

    // 6. Email sends (last 24h)
    try {
      const oneDayAgo = new Date(Date.now() - 86400000).toISOString()
      const { data, error } = await supabase
        .from("email_sends" as never)
        .select("status, sent_at")
        .gte("sent_at" as never, oneDayAgo)
        .limit(500)
      if (error) {
        setEmailUnavailable(true)
      } else {
        const rows = (data as Array<{ status: string; sent_at: string }>) || []
        const sent = rows.filter((r) => r.status === "sent" || r.status === "delivered").length
        const failed = rows.filter((r) => r.status === "failed" || r.status === "bounced").length
        const lastSentRow = rows.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0]
        setEmailData({ sent, failed, lastSent: lastSentRow?.sent_at || null })
        setEmailUnavailable(false)
      }
    } catch {
      setEmailUnavailable(true)
    }

    // 7. Fight Flow pipeline
    try {
      const oneDayAgo = new Date(Date.now() - 86400000).toISOString()
      const { data: leadData } = await supabase
        .from("fightflow_form_submissions" as never)
        .select("created_at")
        .gte("created_at" as never, oneDayAgo)
        .order("created_at" as never, { ascending: false })
        .limit(100)
      const leads = (leadData as Array<{ created_at: string }>) || []
      setLeads24h(leads.length)
      setLastLead(leads[0]?.created_at || null)

      const { data: smsData } = await supabase
        .from("sms_messages" as never)
        .select("created_at")
        .gte("created_at" as never, oneDayAgo)
        .order("created_at" as never, { ascending: false })
        .limit(500)
      const smsRows = (smsData as Array<{ created_at: string }>) || []
      setSms24h(smsRows.length)
      setLastSms(smsRows[0]?.created_at || null)
      setFightFlowUnavailable(false)
    } catch {
      setFightFlowUnavailable(true)
    }

    // 8. SEO Research Automation — agent_signals with signal_type='research_ready'
    try {
      const { data, error } = await supabase
        .from("agent_signals" as never)
        .select("id, signal_type, title, created_at")
        .eq("signal_type" as never, "research_ready")
        .order("created_at" as never, { ascending: false })
        .limit(5)
      if (error) throw error
      setSeoSignals((data as AgentSignal[]) || [])
      setSeoUnavailable(false)
    } catch (err) {
      console.error("SEO Research Automation fetch error:", err)
      setSeoUnavailable(true)
    }

    // 9. Agent Escalation Monitoring — agent_failures severity high/critical last 7d
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from("agent_failures" as never)
        .select("failure_id, agent_name, session_date, short_label, severity, created_at")
        .in("severity" as never, ["high", "critical"])
        .gte("session_date" as never, sevenDaysAgo)
        .order("created_at" as never, { ascending: false })
        .limit(10)
      if (error) throw error
      setEscalationFailures((data as AgentFailure[]) || [])
      setEscalationUnavailable(false)
    } catch (err) {
      console.error("Agent Escalation Monitoring fetch error:", err)
      setEscalationUnavailable(true)
    }

    // 10. Agent Diagnostic Triggers — agent_signals diagnostic/alert/error last 7d
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
      const { data, error } = await supabase
        .from("agent_signals" as never)
        .select("id, signal_type, title, created_at")
        .in("signal_type" as never, ["diagnostic", "alert", "error"])
        .gte("created_at" as never, sevenDaysAgo)
        .order("created_at" as never, { ascending: false })
        .limit(10)
      if (error) throw error
      setDiagnosticSignals((data as AgentSignal[]) || [])
      setDiagnosticUnavailable(false)
    } catch (err) {
      console.error("Agent Diagnostic Triggers fetch error:", err)
      setDiagnosticUnavailable(true)
    }

    setLastRefresh(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Overall org status
  const orgRed =
    (healthReport?.summary.red || 0) > 0 ||
    cronJobs.some((c) => (c.consecutive_errors || 0) > 0)
  const orgYellow =
    !orgRed &&
    ((healthReport?.summary.yellow || 0) > 0 || bcfFailures.length > 0)

  return (
    <DashboardLayout>
      <PageContent>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-7 w-7 text-violet-600" />
              Org Monitoring Dashboard
            </h1>
            <p className="text-slate-500 mt-1 text-sm flex items-center gap-2">
              One-glance org health · Auto-refreshes every 60s
              {orgRed ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  <XCircle className="h-3 w-3" /> Issues detected
                </span>
              ) : orgYellow ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-3 w-3" /> Warnings
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> All systems OK
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {relativeTime(lastRefresh.toISOString())}
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

        {/* Dashboard sections */}
        <div className="space-y-5">
          <OrgHealthSection
            report={healthReport}
            reportTime={healthReportTime}
            unavailable={healthUnavailable}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <KarpathySection changes={karpathyChanges} unavailable={karpathyUnavailable} />
            <BCFSection failures={bcfFailures} unavailable={bcfUnavailable} />
          </div>
          <AgentStatusSection agents={agents} unavailable={agentsUnavailable} />
          <CronSection cronJobs={cronJobs} unavailable={cronUnavailable} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <EmailSection emailSends={emailData} emailUnavailable={emailUnavailable} />
            <FightFlowSection
              leads24h={leads24h}
              lastLead={lastLead}
              sms24h={sms24h}
              lastSms={lastSms}
              unavailable={fightFlowUnavailable}
            />
          </div>
          {/* New org-monitoring sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SeoResearchSection signals={seoSignals} unavailable={seoUnavailable} />
            <AgentEscalationSection failures={escalationFailures} unavailable={escalationUnavailable} />
          </div>
          <AgentDiagnosticSection signals={diagnosticSignals} unavailable={diagnosticUnavailable} />
        </div>
      </PageContent>
    </DashboardLayout>
  )
}
