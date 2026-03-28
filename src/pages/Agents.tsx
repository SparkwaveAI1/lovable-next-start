import { useCallback, useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { PageContent } from "@/components/layout/PageLayout"
import {
  Bot,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
  Activity,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
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

interface MonitoringData {
  agents: AgentStatus[]
  fetchedAt: string
}

// ─── Agent definitions (static — only these 4 are real server agents) ─────────

const AGENT_DETAILS: Record<
  string,
  { emoji: string; color: string; description: string; responsibilities: string[] }
> = {
  Rico: {
    emoji: "🤖",
    color: "violet",
    description:
      "Lead orchestrator and main point of contact. Coordinates all agents, manages tasks, handles direct communication with Scott, and oversees the entire Sparkwave automation system.",
    responsibilities: [
      "Primary user interface via Telegram",
      "Task delegation to specialized subagents",
      "Cron job management",
      "System oversight and coordination",
    ],
  },
  Iris: {
    emoji: "✨",
    color: "pink",
    description:
      "Communications specialist focused on outbound email, SMS, and multi-channel messaging. Manages Fight Flow Academy lead nurturing and client communications.",
    responsibilities: [
      "Email campaign execution",
      "SMS outreach",
      "Lead follow-up sequences",
      "Fight Flow member communications",
    ],
  },
  Dev: {
    emoji: "⚙️",
    color: "blue",
    description:
      "Development agent responsible for code changes, UI updates, and technical implementation across all Sparkwave apps and integrations.",
    responsibilities: [
      "App feature development",
      "Bug fixes and repairs",
      "Supabase edge functions",
      "Integration maintenance",
    ],
  },
  Jerry: {
    emoji: "📊",
    color: "emerald",
    description:
      "Operations agent handling daily reports, cron monitoring, data analysis, and routine operational tasks across the Sparkwave ecosystem.",
    responsibilities: [
      "Daily and hourly report generation",
      "Cron health monitoring",
      "Data analysis and summaries",
      "Operational task execution",
    ],
  },
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    icon: "bg-violet-100",
  },
  pink: {
    bg: "bg-pink-50",
    border: "border-pink-200",
    text: "text-pink-700",
    icon: "bg-pink-100",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    icon: "bg-blue-100",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    icon: "bg-emerald-100",
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return "Never"
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true })
  } catch {
    return "Unknown"
  }
}

// ─── Agent Card ───────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: AgentStatus }) {
  const details = AGENT_DETAILS[agent.name]
  const colorKey = details?.color ?? "violet"
  const colors = COLOR_MAP[colorKey]

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Top status bar */}
      <div
        className={cn(
          "h-1.5 w-full",
          agent.online ? "bg-emerald-500" : "bg-red-400"
        )}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center text-xl",
                colors?.icon ?? "bg-slate-100"
              )}
            >
              {details?.emoji ?? "🤖"}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{agent.name}</h3>
              <p className={cn("text-xs font-medium", colors?.text ?? "text-slate-500")}>
                {agent.role}
              </p>
            </div>
          </div>
          {/* Online / Offline badge */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
              agent.online
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            )}
          >
            {agent.online ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            {agent.online ? "Online" : "Offline"}
          </div>
        </div>

        {/* Description */}
        {details?.description && (
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">{details.description}</p>
        )}

        {/* Responsibilities */}
        {details?.responsibilities && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Responsibilities
            </p>
            <ul className="space-y-1">
              {details.responsibilities.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="text-slate-300 mt-0.5">•</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Server info */}
        <div className={cn("rounded-lg p-3 border", colors?.bg, colors?.border)}>
          <div className="flex items-center gap-2 mb-1">
            <Globe className={cn("h-3.5 w-3.5", colors?.text)} />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Server
            </span>
          </div>
          <p className="font-mono text-sm text-slate-700">
            {agent.ip}:{agent.port}
          </p>
          {agent.latencyMs && (
            <p className="text-xs text-slate-400 mt-0.5">{agent.latencyMs}ms latency</p>
          )}
          <p className="text-xs text-slate-400 mt-0.5">
            Checked {relativeTime(agent.checkedAt)}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Agents() {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const CANONICAL_AGENT_IDS = [
        'c3e0158d-8b33-4250-b0aa-47e0f09bbbeb', // Rico
        'b19d6380-3966-4c43-aa33-7f773ed7e57c', // Dev
        '15562d82-85f5-4d52-bc72-b038ba21da35', // Iris
        'f8535a76-65dc-43eb-a9d3-33f2d6dde1b5', // Jerry
        'cfbd78d6-217d-49c1-818c-38cc64a26104', // Arlo
        '11be4abf-a931-4ffa-be9e-499a9da28cb3', // Opal
      ]
      const { data, error: dbError } = await supabase
        .from('mc_agents')
        .select('id, name, role, status, updated_at')
        .in('id', CANONICAL_AGENT_IDS)
        .order('name')
      if (dbError) throw new Error(dbError.message)
      const mapped: AgentStatus[] = (data ?? []).map((a: any) => ({
        name: a.name,
        role: a.role,
        online: a.status === 'idle' || a.status === 'active',
        ip: '',
        port: 18789,
        checkedAt: a.updated_at ?? new Date().toISOString(),
      }))
      setAgents(mapped)
      setLastRefresh(new Date())
    } catch (e) {
      const staticAgents: AgentStatus[] = [
        { name: "Rico", ip: "5.161.190.94", port: 18789, role: "Lead Orchestrator", online: false, checkedAt: new Date().toISOString() },
        { name: "Dev", ip: "5.161.186.106", port: 18789, role: "Development Agent", online: false, checkedAt: new Date().toISOString() },
        { name: "Iris", ip: "178.156.250.119", port: 18789, role: "Communications Specialist", online: false, checkedAt: new Date().toISOString() },
        { name: "Jerry", ip: "5.161.184.240", port: 18789, role: "Operations Agent", online: false, checkedAt: new Date().toISOString() },
      ]
      setAgents(staticAgents)
      setError("Live status unavailable - showing offline")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(true)
    const interval = setInterval(() => fetchData(false), 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  const onlineCount = agents.filter((a) => a.online).length

  return (
    <DashboardLayout>
      <PageContent>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Bot className="h-7 w-7 text-violet-600" />
              Agents
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              The 4 active Sparkwave AI agents and their server status
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-400">
              Last checked: {formatDistanceToNow(lastRefresh, { addSuffix: true })}
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

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Activity className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {loading ? "—" : `${onlineCount}/${agents.length}`}
                </p>
                <p className="text-xs text-slate-500">Agents Online</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <Server className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">4</p>
                <p className="text-xs text-slate-500">Total Agents</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Globe className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">:18789</p>
                <p className="text-xs text-slate-500">Gateway Port</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            Failed to load agent status: {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && agents.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Agent Cards */}
        {agents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {agents.map((agent) => (
              <AgentCard key={agent.name} agent={agent} />
            ))}
          </div>
        )}

      </PageContent>
    </DashboardLayout>
  )
}
