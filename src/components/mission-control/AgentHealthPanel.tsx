import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertCircle, Loader2, Wifi, WifiOff } from "lucide-react";

interface AgentRecord {
  id: string;
  record_type: string;
  record_id: string;
  identifier: string | null;
  title: string | null;
  status: string | null;
  priority: string | null;
  assignee_name: string | null;
  goal_id: string | null;
  goal_title: string | null;
  last_heartbeat_at: string | null;
  agent_status: string | null;
  current_task: string | null;
  metadata: Record<string, any> | null;
  synced_at: string | null;
}

interface ActiveAgentConfig {
  id: string;
  identifiers: string[];
  name: string;
  icon: string;
  role: string;
}

const ACTIVE_AGENTS: ActiveAgentConfig[] = [
  { id: "rico", identifiers: ["rico", "ricosparkwavebot"], name: "Rico", icon: "🧠", role: "Operations coordination / PMO" },
  { id: "pm", identifiers: ["pm", "pmsparkwavebot", "project manager"], name: "PM", icon: "📋", role: "Project management control plane" },
  { id: "researcher", identifiers: ["researcher", "researcherswbot"], name: "Researcher", icon: "🔎", role: "Decision-ready research briefs" },
  { id: "fightflow-monitor", identifiers: ["fightflow", "fightflow monitor", "fightflow-monitor"], name: "FightFlow Monitor", icon: "🥊", role: "FightFlow lead automation monitor" },
  { id: "strategist", identifiers: ["strategist", "account strategist"], name: "Strategist", icon: "🎯", role: "Account strategy, offers, positioning" },
  { id: "larry", identifiers: ["larry", "postiz"], name: "Larry", icon: "📣", role: "Postiz / social distribution" },
  { id: "email-list-manager", identifiers: ["email list manager", "lifecycle", "newsletter"], name: "Email List Manager", icon: "✉️", role: "Lifecycle, newsletter, suppression rules" },
  { id: "seo-specialist", identifiers: ["seo specialist", "seo"], name: "SEO Specialist", icon: "🌱", role: "Organic content and publish briefs" },
  { id: "analytics-revops", identifiers: ["analytics revops", "revops", "analytics"], name: "Analytics RevOps", icon: "📈", role: "KPI/event dictionaries and claim boundaries" },
  { id: "media-buyer", identifiers: ["media buyer", "paid media"], name: "Media Buyer", icon: "💸", role: "Paid media plans only; approval-gated spend" },
  { id: "client-success", identifiers: ["client success", "success"], name: "Client Success", icon: "🤝", role: "Client-facing summaries and decision asks" },
  { id: "jerry", identifiers: ["jerry", "content", "cmo"], name: "Jerry", icon: "🦁", role: "Content and marketing execution" },
];

function normalize(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[@_\-\s]+/g, " ").trim();
}

function recordMatchesAgent(record: AgentRecord, config: ActiveAgentConfig): boolean {
  const haystack = [
    record.identifier,
    record.title,
    record.assignee_name,
    record.metadata?.name,
    record.metadata?.title,
    record.metadata?.role,
  ]
    .map(normalize)
    .join(" ");

  return config.identifiers.some((identifier) => haystack.includes(normalize(identifier)));
}

function getRelativeTime(isoString: string | null): string {
  if (!isoString) return "not connected";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function isStale(isoString: string | null): boolean {
  if (!isoString) return false;
  const diffMs = Date.now() - new Date(isoString).getTime();
  return diffMs > 30 * 60 * 1000; // 30 min
}

function getStatusBadge(agent: AgentRecord): {
  label: string;
  className: string;
} {
  const agentStatus = agent.agent_status ?? agent.status;
  const stale = isStale(agent.last_heartbeat_at);

  if (!agent.last_heartbeat_at && !agentStatus) {
    return { label: "configured", className: "bg-slate-100 text-slate-500" };
  }
  if (agentStatus === "running" && !stale) {
    return { label: "running", className: "bg-green-100 text-green-700" };
  }
  if (agentStatus === "error" || stale) {
    return { label: agentStatus === "error" ? "error" : "stale", className: "bg-red-100 text-red-700" };
  }
  if (agentStatus === "idle") {
    return { label: "idle", className: "bg-slate-100 text-slate-500" };
  }
  return { label: agentStatus ?? "configured", className: "bg-slate-100 text-slate-500" };
}

function hasErrorFlag(agent: AgentRecord): boolean {
  return agent.agent_status === "error" || isStale(agent.last_heartbeat_at);
}

function buildActiveAgentRows(records: AgentRecord[]): AgentRecord[] {
  return ACTIVE_AGENTS.map((config) => {
    const source = records.find((record) => recordMatchesAgent(record, config));
    return {
      id: source?.id ?? config.id,
      record_type: source?.record_type ?? "agent",
      record_id: source?.record_id ?? config.id,
      identifier: config.id,
      title: config.name,
      status: source?.status ?? null,
      priority: source?.priority ?? null,
      assignee_name: source?.assignee_name ?? null,
      goal_id: source?.goal_id ?? null,
      goal_title: source?.goal_title ?? null,
      last_heartbeat_at: source?.last_heartbeat_at ?? null,
      agent_status: source?.agent_status ?? null,
      current_task: source?.current_task ?? null,
      metadata: {
        ...(source?.metadata ?? {}),
        title: config.role,
        icon: config.icon,
      },
      synced_at: source?.synced_at ?? null,
    };
  });
}

export function AgentHealthPanel() {
  const [agentRecords, setAgentRecords] = useState<AgentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = async () => {
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("paperclip_sync")
        .select("*")
        .eq("record_type", "agent")
        .order("title", { ascending: true });

      if (fetchError) throw fetchError;
      setAgentRecords((data ?? []) as AgentRecord[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent health");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();

    const channel = supabase
      .channel("paperclip_sync_agents")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "paperclip_sync",
          filter: "record_type=eq.agent",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setAgentRecords((prev) => [...prev, payload.new as AgentRecord]);
          } else if (payload.eventType === "UPDATE") {
            setAgentRecords((prev) =>
              prev.map((agent) =>
                agent.id === (payload.new as AgentRecord).id
                  ? (payload.new as AgentRecord)
                  : agent
              )
            );
          } else if (payload.eventType === "DELETE") {
            setAgentRecords((prev) =>
              prev.filter((agent) => agent.id !== (payload.old as AgentRecord).id)
            );
          }
        }
      )
      .subscribe((status, err) => {
        if (err)
          console.warn("AgentHealthPanel subscription error:", err.message);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const agents = buildActiveAgentRows(agentRecords);
  const healthyCount = agents.filter((agent) => !hasErrorFlag(agent)).length;
  const errorCount = agents.filter((agent) => hasErrorFlag(agent)).length;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Agent Health</h2>
        </div>
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Loading active agents...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Agent Health</h2>
        </div>
        <div className="flex items-center gap-2 text-red-600 text-sm py-4">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-500" />
          <h2 className="text-sm font-semibold text-slate-700">Agent Health</h2>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {healthyCount > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <Wifi className="h-3 w-3" />
              {healthyCount} ok/configured
            </span>
          )}
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-red-500">
              <WifiOff className="h-3 w-3" />
              {errorCount} down
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {agents.map((agent) => {
          const badge = getStatusBadge(agent);
          const errFlag = hasErrorFlag(agent);
          const icon = agent.metadata?.icon ?? "🤖";
          const agentName = agent.title ?? agent.identifier ?? "Unknown";
          const role = agent.metadata?.title ?? agent.metadata?.role ?? null;

          return (
            <div
              key={agent.id}
              className={`flex items-start gap-3 px-3 py-2 rounded-lg border text-xs ${
                errFlag
                  ? "border-red-100 bg-red-50"
                  : "border-slate-100 bg-slate-50"
              }`}
            >
              <div className="relative flex-shrink-0 mt-0.5">
                <span className="text-base leading-none">{icon}</span>
                {errFlag && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 border border-white" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800">{agentName}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
                {role && (
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    {role}
                  </p>
                )}
                {agent.current_task && (
                  <p className="text-[10px] text-slate-500 mt-1 truncate">
                    <span className="text-slate-400">Task: </span>
                    {agent.current_task}
                  </p>
                )}
              </div>

              <div className="flex-shrink-0 text-right">
                <p
                  className={`text-[10px] ${
                    errFlag ? "text-red-400" : "text-slate-400"
                  }`}
                >
                  {getRelativeTime(agent.last_heartbeat_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-300 mt-3 text-right">Active roster · paperclip_sync when available</p>
    </div>
  );
}
