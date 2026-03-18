import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Target, AlertCircle, Loader2 } from "lucide-react";

interface PaperclipSyncRecord {
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

interface Goal extends PaperclipSyncRecord {
  record_type: "goal";
}

interface Issue extends PaperclipSyncRecord {
  record_type: "issue";
}

export function PrioritiesPanel() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("paperclip_sync")
        .select("*")
        .in("record_type", ["goal", "issue"])
        .order("synced_at", { ascending: false });

      if (fetchError) throw fetchError;

      const allGoals = (data ?? []).filter(
        (r: PaperclipSyncRecord) => r.record_type === "goal" && r.status === "active"
      ) as Goal[];
      const allIssues = (data ?? []).filter(
        (r: PaperclipSyncRecord) => r.record_type === "issue"
      ) as Issue[];

      setGoals(allGoals);
      setIssues(allIssues);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load priorities");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Real-time subscription for goals
    const goalsChannel = supabase
      .channel("paperclip_sync_goals")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "paperclip_sync",
          filter: "record_type=eq.goal",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const record = payload.new as PaperclipSyncRecord;
            if (record.status === "active") {
              setGoals((prev) => [...prev, record as Goal]);
            }
          } else if (payload.eventType === "UPDATE") {
            const record = payload.new as PaperclipSyncRecord;
            setGoals((prev) => {
              const filtered = prev.filter((g) => g.id !== record.id);
              return record.status === "active"
                ? [...filtered, record as Goal]
                : filtered;
            });
          } else if (payload.eventType === "DELETE") {
            setGoals((prev) =>
              prev.filter((g) => g.id !== (payload.old as PaperclipSyncRecord).id)
            );
          }
        }
      )
      .subscribe((status, err) => {
        if (err) console.warn("PrioritiesPanel goals subscription error:", err.message);
      });

    // Real-time subscription for issues
    const issuesChannel = supabase
      .channel("paperclip_sync_issues")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "paperclip_sync",
          filter: "record_type=eq.issue",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setIssues((prev) => [...prev, payload.new as Issue]);
          } else if (payload.eventType === "UPDATE") {
            setIssues((prev) =>
              prev.map((i) =>
                i.id === (payload.new as Issue).id ? (payload.new as Issue) : i
              )
            );
          } else if (payload.eventType === "DELETE") {
            setIssues((prev) =>
              prev.filter((i) => i.id !== (payload.old as PaperclipSyncRecord).id)
            );
          }
        }
      )
      .subscribe((status, err) => {
        if (err) console.warn("PrioritiesPanel issues subscription error:", err.message);
      });

    return () => {
      supabase.removeChannel(goalsChannel);
      supabase.removeChannel(issuesChannel);
    };
  }, []);

  // Group issues under their goal — match via goal_id (record_id of goal)
  const getIssuesForGoal = (goal: Goal): Issue[] => {
    return issues
      .filter(
        (i) =>
          i.goal_id === goal.record_id &&
          (i.status === "in_progress" || i.status === "blocked")
      )
      .sort((a, b) => {
        // Blocked first, then by synced_at desc
        if (a.status === "blocked" && b.status !== "blocked") return -1;
        if (b.status === "blocked" && a.status !== "blocked") return 1;
        return (b.synced_at ?? "").localeCompare(a.synced_at ?? "");
      })
      .slice(0, 3);
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "critical":
        return "text-red-600";
      case "high":
        return "text-orange-600";
      case "medium":
        return "text-yellow-600";
      default:
        return "text-slate-400";
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Active Priorities</h2>
        </div>
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Loading priorities...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Active Priorities</h2>
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
          <Target className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-slate-700">Active Priorities</h2>
        </div>
        <span className="text-xs text-slate-400">{goals.length} active goals</span>
      </div>

      {goals.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No active goals</p>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const goalIssues = getIssuesForGoal(goal);
            return (
              <div key={goal.id} className="space-y-1.5">
                {/* Goal row */}
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 leading-tight truncate">
                      {goal.title ?? "Untitled Goal"}
                    </p>
                    {goal.metadata?.level && (
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                        {goal.metadata.level}
                      </span>
                    )}
                  </div>
                </div>

                {/* Issues under goal */}
                {goalIssues.length > 0 && (
                  <div className="ml-4 space-y-1">
                    {goalIssues.map((issue) => {
                      const isBlocked = issue.status === "blocked";
                      return (
                        <div
                          key={issue.id}
                          className={`flex items-start gap-2 px-2 py-1 rounded-md text-xs ${
                            isBlocked
                              ? "bg-amber-50 border border-amber-200"
                              : "bg-slate-50 border border-slate-100"
                          }`}
                        >
                          <span
                            className={`flex-shrink-0 mt-0.5 font-mono text-[10px] ${
                              isBlocked ? "text-amber-600" : "text-slate-400"
                            }`}
                          >
                            {issue.identifier ?? "—"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate leading-tight ${
                                isBlocked ? "text-amber-800 font-medium" : "text-slate-600"
                              }`}
                            >
                              {issue.title ?? "Untitled"}
                            </p>
                            {issue.assignee_name && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {issue.assignee_name}
                                {isBlocked && (
                                  <span className="ml-1 text-amber-500 font-medium">• BLOCKED</span>
                                )}
                              </p>
                            )}
                          </div>
                          {issue.priority && (
                            <span
                              className={`flex-shrink-0 text-[10px] font-medium uppercase ${getPriorityColor(
                                issue.priority
                              )}`}
                            >
                              {issue.priority}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {goalIssues.length === 0 && (
                  <div className="ml-4">
                    <p className="text-[10px] text-slate-400 italic">No active issues</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-slate-300 mt-3 text-right">Live · paperclip_sync</p>
    </div>
  );
}
