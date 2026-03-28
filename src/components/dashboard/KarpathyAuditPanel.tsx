/**
 * KarpathyAuditPanel.tsx — Karpathy Self-Improvement Loop Health Dashboard
 *
 * Visualizes the failure → proposal → applied → verified funnel.
 * Reads from Supabase instruction_changes + agent_failures tables.
 *
 * SPA-1067
 */

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, ArrowRight, AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface FunnelData {
  failures: number
  proposals: number
  applied: number
  verified: number
  recurred: number
}

interface RecentProposal {
  id: string
  agent_name: string
  short_label: string
  status: string
  applied_at: string | null
  verification_status: string | null
}

type StatusColor = "green" | "yellow" | "red" | "neutral"

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusColor(val: number, thresholds: { green: number; yellow: number }): StatusColor {
  if (val >= thresholds.green) return "green"
  if (val >= thresholds.yellow) return "yellow"
  return "red"
}

function ratioColor(numerator: number, denominator: number, greenRatio: number, yellowRatio: number): StatusColor {
  if (denominator === 0) return "neutral"
  const ratio = numerator / denominator
  if (ratio >= greenRatio) return "green"
  if (ratio >= yellowRatio) return "yellow"
  return "red"
}

const colorClasses: Record<StatusColor, string> = {
  green: "border-green-500 bg-green-50 dark:bg-green-950/30",
  yellow: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30",
  red: "border-red-500 bg-red-50 dark:bg-red-950/30",
  neutral: "border-border bg-muted/30",
}

const badgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  applied: "default",
  pending: "secondary",
  approved: "outline",
  rejected: "destructive",
  verified: "default",
  holding: "secondary",
  recurred: "destructive",
}

// ── Main component ─────────────────────────────────────────────────────────────

export function KarpathyAuditPanel() {
  const [funnel, setFunnel] = useState<FunnelData | null>(null)
  const [recent, setRecent] = useState<RecentProposal[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d30ago = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const d7ago = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      // Failures (last 30d)
      const { count: failures } = await supabase
        .from("agent_failures")
        .select("failure_id", { count: "exact", head: true })
        .gte("created_at", d30ago)

      // Proposals (last 30d)
      const { data: proposalRows } = await supabase
        .from("instruction_changes")
        .select("id, status, verification_status, agent_name, short_label, applied_at, proposed_at, source_failure_uuids")
        .gte("proposed_at", d30ago)
        .order("proposed_at", { ascending: false })
        .limit(50)

      const pRows: RecentProposal[] = Array.isArray(proposalRows) ? proposalRows : []

      const proposalCount = pRows.length
      const appliedCount = pRows.filter((r) => r.status === "applied").length
      const verifiedCount = pRows.filter((r) => r.verification_status === "verified").length
      const recurred = pRows.filter((r) => r.verification_status === "recurred").length

      setFunnel({
        failures: failures ?? 0,
        proposals: proposalCount,
        applied: appliedCount,
        verified: verifiedCount,
        recurred,
      })

      // Recent 10
      setRecent(pRows.slice(0, 10))
      setLastUpdated(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // ── Funnel box component ────────────────────────────────────────────────────
  function FunnelBox({
    label,
    value,
    color,
    sub,
  }: {
    label: string
    value: number
    color: StatusColor
    sub?: string
  }) {
    return (
      <div
        className={cn(
          "flex-1 rounded-lg border-2 p-4 text-center min-w-[80px]",
          colorClasses[color]
        )}
      >
        <div className="text-3xl font-bold tabular-nums">{value}</div>
        <div className="text-sm font-medium text-muted-foreground mt-1">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    )
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Karpathy Loop Health
          <span className="text-xs font-normal text-muted-foreground">(last 30 days)</span>
        </CardTitle>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-3 w-3 mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm mb-4">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {funnel && (
          <>
            {/* Funnel visualization */}
            <div className="flex items-center gap-2 mb-6">
              <FunnelBox
                label="Failures"
                value={funnel.failures}
                color="neutral"
                sub="logged"
              />
              <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
              <FunnelBox
                label="Proposals"
                value={funnel.proposals}
                color={ratioColor(funnel.proposals, funnel.failures, 0.5, 0.2)}
                sub={funnel.failures > 0 ? `${Math.round((funnel.proposals / funnel.failures) * 100)}% addressed` : "—"}
              />
              <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
              <FunnelBox
                label="Applied"
                value={funnel.applied}
                color={ratioColor(funnel.applied, funnel.proposals, 0.5, 0.2)}
                sub={funnel.proposals > 0 ? `${Math.round((funnel.applied / funnel.proposals) * 100)}% of proposals` : "—"}
              />
              <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
              <FunnelBox
                label="Verified"
                value={funnel.verified}
                color={ratioColor(funnel.verified, funnel.applied, 0.3, 0.1)}
                sub={funnel.applied > 0 ? `${Math.round((funnel.verified / funnel.applied) * 100)}% holding` : "—"}
              />
            </div>

            {/* Recurred alert */}
            {funnel.recurred > 0 && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  <strong>{funnel.recurred} rule{funnel.recurred > 1 ? "s" : ""} recurred</strong> after apply — escalation needed
                </span>
              </div>
            )}

            {/* Recent proposals table */}
            {recent.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Recent Instructions
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-1 pr-3 font-medium text-muted-foreground">Rule</th>
                        <th className="pb-1 pr-3 font-medium text-muted-foreground">Agent</th>
                        <th className="pb-1 pr-3 font-medium text-muted-foreground">Status</th>
                        <th className="pb-1 font-medium text-muted-foreground">Verification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((r) => (
                        <tr
                          key={r.id}
                          className={cn(
                            "border-b last:border-0",
                            r.verification_status === "recurred" && "bg-destructive/5"
                          )}
                        >
                          <td className="py-1.5 pr-3 max-w-[240px] truncate font-medium" title={r.short_label}>
                            {r.short_label || "—"}
                            {r.verification_status === "recurred" && (
                              <Badge variant="destructive" className="ml-1 text-[10px] py-0">ESCALATION</Badge>
                            )}
                          </td>
                          <td className="py-1.5 pr-3 text-muted-foreground">{r.agent_name}</td>
                          <td className="py-1.5 pr-3">
                            <Badge variant={badgeVariant[r.status] ?? "secondary"} className="text-[10px] py-0">
                              {r.status}
                            </Badge>
                          </td>
                          <td className="py-1.5">
                            {r.verification_status ? (
                              <Badge
                                variant={badgeVariant[r.verification_status] ?? "secondary"}
                                className="text-[10px] py-0"
                              >
                                {r.verification_status}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {loading && !funnel && (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading Karpathy data…</div>
        )}
      </CardContent>
    </Card>
  )
}
