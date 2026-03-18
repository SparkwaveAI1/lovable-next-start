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

const AGENT_ICONS: Record<string, string> = {
  rico: "🧠",
  jerry: "🦁",
  iris: "🌸",
  dev: "💻",
  opal: "💎",
  arlo: "🔬",
  edna: "🔧",
  abby: "✅",
  dante: "✍️",
};

function getRelativeTime(isoString: string | null): string {
  if (!isoString) return "never";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function isStale(isoString: string | null): boolean {
  if (!isoString) return true;
  const diffMs = Date.now() - new Date(isoString).getTime();
  return diffMs > 30 * 60 * 1000; // 30 min
}

function getStatusBadge(agent: AgentRecord): {
  label: string;
  className: string;
} {
  const agentStatus = agent.agent_status ?? agent.status;
  const stale = isStale(agent.last_heartbeat_at);

  if (agentStatus === "running" && !stale) {
    return { label: "running", className: "bg-green-100 text-green-700" };
  }
  if (agentStatus === "error" || stale) {
    return { label: agentStatus === "error" ? "error" : "stale", className: "bg-red-100 text-red-700" };
  }
  if (agentStatus === "idle") {
    return { label: "idle", className: "bg-slate-100 text-slate-500" };
  }
  return { label: agentStatus ?? "unknown", className: "bg-slate-100 text-slate-500" };
}

function hasErrorFlag(agent: AgentRecord): boolean {
  return agent.agent_status === "error" || isStale(agent.last_heartbeat_at);
}

export function AgentHealthPanel() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
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
      setAgents((data ?? []) as AgentRecord[]);
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
            setAgents((prev) => [...prev, payload.new as AgentRecord]);
          } else if (payload.eventType === "UPDATE") {
            setAgents((prev) =>
              prev.map((a) =>
                a.id === (payload.new as AgentRecord).id
                  ? (payload.new as AgentRecord)
                  : a
              )
            );
          } else if (payload.eventType === "DELETE") {
            setAgents((prev) =>
              prev.filter((a) => a.id !== (payload.old as AgentRecord).id)
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

  const healthyCount = agents.filter((a) => !hasErrorFlag(a)).length;
  const errorCount = agents.filter((a) => hasErrorFlag(a)).length;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Agent Health</h2>
        </div>
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Loading agents...</span>
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
              {healthyCount} ok
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

      {agents.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No agents found</p>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => {
            const badge = getStatusBadge(agent);
            const errFlag = hasErrorFlag(agent);
            const icon =
              AGENT_ICONS[agent.identifier?.toLowerCase() ?? ""] ?? "🤖";
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
                {/* Icon + error dot */}
                <div className="relative flex-shrink-0 mt-0.5">
                  <span className="text-base leading-none">{icon}</span>
                  {errFlag && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 border border-white" />
                  )}
                </div>

                {/* Name + role */}
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

                {/* Last heartbeat */}
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
      )}

      <p className="text-[10px] text-slate-300 mt-3 text-right">Live · paperclip_sync</p>
    </div>
  );
}
