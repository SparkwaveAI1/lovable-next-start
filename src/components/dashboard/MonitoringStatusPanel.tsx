/**
 * MonitoringStatusPanel.tsx — System Health Monitor Dashboard Panel
 *
 * Displays agent gateway health and external service health sourced from
 * mc_health_reports (written by check-agent-health.mjs + check-service-health.mjs).
 *
 * SPA-1164
 */

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Activity, RefreshCw, AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { formatDistanceToNow, parseISO } from "date-fns"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

type HealthStatus = "ok" | "warn" | "error" | "unknown"

interface AgentHealthItem {
  name: string
  paperclipStatus: string
  status: HealthStatus
  reason: string
  hoursAgo: number | null
  lastHeartbeatAt: string | null
}

interface ServiceHealthItem {
  name: string
  status: HealthStatus
  reason: string
  httpCode?: number
  lastSuccessAt?: string | null
  hoursAgo?: number
}

interface AgentHealthReport {
  type: "agent_health"
  agents: AgentHealthItem[]
  checkedAt: string
}

interface ServiceHealthReport {
  type: "service_health"
  services: ServiceHealthItem[]
  checkedAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type DotColor = "green" | "yellow" | "red" | "gray"

function statusToColor(status: HealthStatus): DotColor {
  if (status === "ok") return "green"
  if (status === "warn") return "yellow"
  if (status === "error") return "red"
  return "gray"
}

function StatusDot({ status }: { status: DotColor }) {
  const colors: Record<DotColor, string> = {
    green: "bg-emerald-500",
    yellow: "bg-amber-400",
    red: "bg-red-500",
    gray: "bg-slate-400",
  }
  return (
    <span className={cn("inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 mt-0.5", colors[status])} />
  )
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "Never"
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true })
  } catch {
    return "Unknown"
  }
}

function paperclipStatusBadge(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "running") return "default"
  if (status === "idle") return "secondary"
  if (status === "error") return "destructive"
  return "outline"
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-1">
      {title}
    </h3>
  )
}

function AgentRow({ agent }: { agent: AgentHealthItem }) {
  const dotColor = statusToColor(agent.status as HealthStatus)
  return (
    <div className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <StatusDot status={dotColor} />
        <span className="text-sm font-medium text-slate-800 truncate">{agent.name}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <Badge variant={paperclipStatusBadge(agent.paperclipStatus)} className="text-xs py-0">
          {agent.paperclipStatus || "unknown"}
        </Badge>
        <span className="text-xs text-slate-400 whitespace-nowrap">
          {relativeTime(agent.lastHeartbeatAt)}
        </span>
      </div>
    </div>
  )
}

function ServiceRow({ service }: { service: ServiceHealthItem }) {
  const dotColor = statusToColor(service.status as HealthStatus)
  return (
    <div className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <StatusDot status={dotColor} />
        <span className="text-sm font-medium text-slate-800 truncate">{service.name}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {service.httpCode !== undefined && (
          <Badge variant="outline" className="text-xs py-0 font-mono">
            {service.httpCode}
          </Badge>
        )}
        <span className={cn("text-xs whitespace-nowrap", service.status === "error" ? "text-red-500" : service.status === "warn" ? "text-amber-500" : "text-slate-400")}>
          {service.reason}
        </span>
      </div>
    </div>
  )
}

function HealthSummaryBadge({ green, yellow, red }: { green: number; yellow: number; red: number }) {
  if (red > 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
        <AlertTriangle className="h-3.5 w-3.5" />
        {red} issue{red !== 1 ? "s" : ""}
      </span>
    )
  }
  if (yellow > 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
        <AlertTriangle className="h-3.5 w-3.5" />
        {yellow} warning{yellow !== 1 ? "s" : ""}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
      <CheckCircle2 className="h-3.5 w-3.5" />
      All systems ok
    </span>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function MonitoringStatusPanel() {
  const [agentReport, setAgentReport] = useState<AgentHealthReport | null>(null)
  const [serviceReport, setServiceReport] = useState<ServiceHealthReport | null>(null)
  const [agentCheckedAt, setAgentCheckedAt] = useState<string | null>(null)
  const [serviceCheckedAt, setServiceCheckedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [agentRes, serviceRes] = await Promise.all([
        supabase
          .from("mc_health_reports")
          .select("*")
          .filter("report->>type", "eq", "agent_health")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("mc_health_reports")
          .select("*")
          .filter("report->>type", "eq", "service_health")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (agentRes.error) throw agentRes.error
      if (serviceRes.error) throw serviceRes.error

      if (agentRes.data?.report) {
        setAgentReport(agentRes.data.report as unknown as AgentHealthReport)
        setAgentCheckedAt(agentRes.data.created_at as string)
      }
      if (serviceRes.data?.report) {
        setServiceReport(serviceRes.data.report as unknown as ServiceHealthReport)
        setServiceCheckedAt(serviceRes.data.created_at as string)
      }

      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load health data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const hasNoData = !agentReport && !serviceReport && !loading

  // Compute summary counts across both reports
  const agentGreen = agentReport?.agents.filter((a) => a.status === "ok").length ?? 0
  const agentYellow = agentReport?.agents.filter((a) => a.status === "warn").length ?? 0
  const agentRed = agentReport?.agents.filter((a) => a.status === "error").length ?? 0
  const svcGreen = serviceReport?.services.filter((s) => s.status === "ok").length ?? 0
  const svcYellow = serviceReport?.services.filter((s) => s.status === "warn").length ?? 0
  const svcRed = serviceReport?.services.filter((s) => s.status === "error").length ?? 0

  const totalRed = agentRed + svcRed
  const totalYellow = agentYellow + svcYellow
  const totalGreen = agentGreen + svcGreen

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-base">System Health</CardTitle>
            {(agentReport || serviceReport) && !loading && (
              <HealthSummaryBadge green={totalGreen} yellow={totalYellow} red={totalRed} />
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="h-3 w-3" />
                {relativeTime(lastUpdated.toISOString())}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="h-7 w-7 p-0"
              title="Refresh health data"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="text-sm text-red-500 mb-4">
            <AlertTriangle className="inline h-4 w-4 mr-1" />
            {error}
          </div>
        )}

        {hasNoData && !error && (
          <div className="text-sm text-slate-400 text-center py-6">
            No health data yet.{" "}
            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
              node scripts/check-agent-health.mjs
            </code>{" "}
            and{" "}
            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
              node scripts/check-service-health.mjs
            </code>
          </div>
        )}

        {agentReport && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <SectionHeader title="Agents" />
              {agentCheckedAt && (
                <span className="text-xs text-slate-400">checked {relativeTime(agentCheckedAt)}</span>
              )}
            </div>
            {agentReport.agents.map((agent) => (
              <AgentRow key={agent.name} agent={agent} />
            ))}
          </div>
        )}

        {serviceReport && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionHeader title="Services" />
              {serviceCheckedAt && (
                <span className="text-xs text-slate-400">checked {relativeTime(serviceCheckedAt)}</span>
              )}
            </div>
            {serviceReport.services.map((service) => (
              <ServiceRow key={service.name} service={service} />
            ))}
          </div>
        )}

        {loading && !agentReport && !serviceReport && (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading health data...
          </div>
        )}
      </CardContent>
    </Card>
  )
}
