import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { useBusinesses } from "@/hooks/useBusinesses";
import { supabase } from "@/integrations/supabase/client";
import { ALL_BUSINESSES_ID } from "@/components/BusinessSwitcher";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  TrendingUp,
  Zap,
  Loader2,
  RefreshCw,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  metadata: Record<string, unknown> | null;
  synced_at: string | null;
}

interface Goal extends PaperclipSyncRecord {
  record_type: "goal";
}

interface Issue extends PaperclipSyncRecord {
  record_type: "issue";
}

interface Prospect {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  pipeline_stage: string | null;
  updated_at: string | null;
  latestReply?: { subject: string; repliedAt: string };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function getPriorityColor(priority: string | null): string {
  switch (priority) {
    case "critical": return "text-red-600 bg-red-50 border border-red-200";
    case "high":     return "text-orange-600 bg-orange-50 border border-orange-200";
    case "medium":   return "text-yellow-700 bg-yellow-50 border border-yellow-200";
    default:         return "text-slate-500 bg-slate-50 border border-slate-200";
  }
}

function getStatusColor(status: string | null): string {
  switch (status) {
    case "blocked":      return "text-red-700 bg-red-50 border-l-4 border-red-400";
    case "in_progress": return "text-blue-700 bg-blue-50 border-l-4 border-blue-400";
    case "done":         return "text-green-700 bg-green-50 border-l-4 border-green-400";
    case "todo":         return "text-slate-700 bg-slate-50 border-l-4 border-slate-300";
    case "backlog":      return "text-slate-500 bg-slate-50 border-l-4 border-slate-200";
    default:             return "text-slate-600 bg-white border-l-4 border-slate-300";
  }
}

function formatAge(dateStr: string | null): string {
  if (!dateStr) return "—";
  const ms = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "just now";
}

// ─── Decisions Panel ───────────────────────────────────────────────────────────

interface DecisionsPanelProps {
  decisions: Issue[];
}

function DecisionsPanel({ decisions }: DecisionsPanelProps) {
  if (decisions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Decisions Needed</h2>
        </div>
        <p className="text-sm text-slate-400 text-center py-6">No open decisions — all clear</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-700">Decisions Needed</h2>
        </div>
        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
          {decisions.length} open
        </span>
      </div>
      <div className="space-y-2">
        {decisions.map((d) => (
          <div
            key={d.id}
            className={`rounded-lg p-3 text-sm ${getStatusColor(d.status)}`}
          >
            <div className="flex items-start gap-2">
              <span className="font-mono text-[10px] text-slate-400 mt-0.5 flex-shrink-0">
                {d.identifier ?? "—"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800 leading-tight truncate">
                  {d.title ?? "Untitled decision"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {d.assignee_name && (
                    <span className="text-[10px] text-slate-500">{d.assignee_name}</span>
                  )}
                  <span className="text-[10px] text-slate-400">
                    {formatAge(d.synced_at)}
                  </span>
                </div>
                {d.metadata?.recommendation && (
                  <p className="text-[10px] text-blue-600 mt-1 italic">
                    → {d.metadata.recommendation}
                  </p>
                )}
              </div>
              {d.priority && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getPriorityColor(d.priority)}`}>
                  {d.priority}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-300 mt-3 text-right">Live · paperclip_sync</p>
    </div>
  );
}

// ─── Blockers Panel ───────────────────────────────────────────────────────────

interface BlockersPanelProps {
  blockers: Issue[];
}

function BlockersPanel({ blockers }: BlockersPanelProps) {
  if (blockers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Blockers</h2>
        </div>
        <p className="text-sm text-slate-400 text-center py-6">No blocked issues</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <h2 className="text-sm font-semibold text-slate-700">Blockers</h2>
        </div>
        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
          {blockers.length} blocked
        </span>
      </div>
      <div className="space-y-2">
        {blockers.map((b) => (
          <div
            key={b.id}
            className="rounded-lg p-3 text-sm bg-red-50 border border-red-200 border-l-4 border-l-red-500"
          >
            <div className="flex items-start gap-2">
              <span className="font-mono text-[10px] text-red-500 mt-0.5 flex-shrink-0">
                {b.identifier ?? "—"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-red-800 leading-tight truncate">
                  {b.title ?? "Untitled"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {b.assignee_name && (
                    <span className="text-[10px] text-red-600">{b.assignee_name}</span>
                  )}
                  {b.metadata?.blocked_reason && (
                    <span className="text-[10px] text-slate-500 italic">
                      {b.metadata.blocked_reason}
                    </span>
                  )}
                </div>
              </div>
              {b.priority && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getPriorityColor(b.priority)}`}>
                  {b.priority}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-300 mt-3 text-right">Live · paperclip_sync</p>
    </div>
  );
}

// ─── Evidence Due Panel ───────────────────────────────────────────────────────

interface EvidenceDuePanelProps {
  evidenceDue: Issue[];
}

function EvidenceDuePanel({ evidenceDue }: EvidenceDuePanelProps) {
  const now = Date.now();

  const overdue = evidenceDue.filter((e) => {
    if (!e.metadata?.due_date) return false;
    return new Date(e.metadata.due_date).getTime() < now;
  });

  if (overdue.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Evidence Due</h2>
        </div>
        <p className="text-sm text-slate-400 text-center py-6">No overdue deliverables</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-500" />
          <h2 className="text-sm font-semibold text-slate-700">Evidence Due</h2>
        </div>
        <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
          {overdue.length} overdue
        </span>
      </div>
      <div className="space-y-2">
        {overdue.map((e) => (
          <div
            key={e.id}
            className="rounded-lg p-3 text-sm bg-orange-50 border border-orange-200 border-l-4 border-l-orange-500"
          >
            <div className="flex items-start gap-2">
              <span className="font-mono text-[10px] text-orange-500 mt-0.5 flex-shrink-0">
                {e.identifier ?? "—"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-orange-800 leading-tight truncate">
                  {e.title ?? "Untitled"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {e.assignee_name && (
                    <span className="text-[10px] text-orange-600">{e.assignee_name}</span>
                  )}
                  {e.metadata?.due_date && (
                    <span className="text-[10px] text-red-500 font-medium">
                      Due {new Date(e.metadata.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-300 mt-3 text-right">Live · paperclip_sync</p>
    </div>
  );
}

// ─── Growth OS Lane Health ────────────────────────────────────────────────────

interface GoalHealth {
  id: string;
  title: string | null;
  status: string | null;
  issue_count: number;
  blocked_count: number;
  in_progress_count: number;
  area: string | null;
}

interface LaneHealthPanelProps {
  goals: Goal[];
  issues: Issue[];
}

function LaneHealthPanel({ goals, issues }: LaneHealthPanelProps) {
  // Build a map of goal_id → issue counts
  const goalStats = goals.reduce<Record<string, { blocked: number; in_progress: number; total: number }>>((acc, g) => {
    const goalIssues = issues.filter((i) => i.goal_id === g.record_id);
    acc[g.record_id] = {
      blocked: goalIssues.filter((i) => i.status === "blocked").length,
      in_progress: goalIssues.filter((i) => i.status === "in_progress").length,
      total: goalIssues.length,
    };
    return acc;
  }, {});

  if (goals.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Growth OS Lane Health</h2>
        </div>
        <p className="text-sm text-slate-400 text-center py-6">No active goals</p>
      </div>
    );
  }

  const overallHealth = goals.every((g) => goalStats[g.record_id]?.blocked === 0)
    ? "healthy"
    : goals.some((g) => goalStats[g.record_id]?.blocked > 0)
    ? "degraded"
    : "unknown";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-slate-700">Growth OS Lane Health</h2>
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            overallHealth === "healthy"
              ? "text-green-700 bg-green-50"
              : overallHealth === "degraded"
              ? "text-red-700 bg-red-50"
              : "text-slate-600 bg-slate-50"
          }`}
        >
          {overallHealth === "healthy" ? "All clear" : overallHealth === "degraded" ? "Issues detected" : "Unknown"}
        </span>
      </div>

      <div className="space-y-2">
        {goals.map((goal) => {
          const stats = goalStats[goal.record_id] ?? { blocked: 0, in_progress: 0, total: 0 };
          const hasBlocked = stats.blocked > 0;

          return (
            <div
              key={goal.id}
              className={`rounded-lg p-3 text-sm border ${
                hasBlocked
                  ? "bg-amber-50 border-amber-200"
                  : "bg-slate-50 border-slate-100"
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5 h-2 w-2 rounded-full flex-shrink-0 bg-indigo-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 leading-tight truncate">
                    {goal.title ?? "Untitled Goal"}
                  </p>
                  {goal.metadata?.level && (
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                      {goal.metadata.level}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {stats.blocked > 0 && (
                    <span className="text-[10px] font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                      {stats.blocked} blocked
                    </span>
                  )}
                  {stats.in_progress > 0 && (
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                      {stats.in_progress} active
                    </span>
                  )}
                  {stats.total === 0 && (
                    <span className="text-[10px] text-slate-400 italic">no issues</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-300 mt-3 text-right">Live · paperclip_sync</p>
    </div>
  );
}

// ─── Lead Response Exceptions (FightFlow) ────────────────────────────────────

interface LeadResponsePanelProps {
  replies: Prospect[];
}

function LeadResponsePanel({ replies }: LeadResponsePanelProps) {
  if (replies.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">FightFlow Replies</h2>
        </div>
        <p className="text-sm text-slate-400 text-center py-6">
          No replies detected — Iris is running outreach
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-emerald-500" />
          <h2 className="text-sm font-semibold text-slate-700">FightFlow Replies</h2>
        </div>
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          {replies.length} pending review
        </span>
      </div>
      <div className="space-y-2">
        {replies.slice(0, 5).map((r) => (
          <div
            key={r.id}
            className="rounded-lg p-3 text-sm bg-emerald-50 border border-emerald-200 border-l-4 border-l-emerald-500"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-emerald-800 text-sm truncate">
                  {r.company || r.name || r.email || "Unknown"}
                </p>
                <p className="text-xs text-emerald-600 truncate">{r.email}</p>
                {r.latestReply && (
                  <p className="text-[10px] text-emerald-700 mt-1 italic truncate">
                    "{r.latestReply.subject}"
                  </p>
                )}
                {r.updated_at && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {formatAge(r.updated_at)}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-1" />
            </div>
          </div>
        ))}
      </div>
      {replies.length > 5 && (
        <p className="text-[10px] text-slate-400 text-center mt-2">
          +{replies.length - 5} more — view in FightFlow
        </p>
      )}
      <p className="text-[10px] text-slate-300 mt-2 text-right">Live · prospects</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExecutiveControl() {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();
  const isAll = selectedBusiness?.id === ALL_BUSINESSES_ID;

  const [goals, setGoals] = useState<Goal[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [replies, setReplies] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaperclip = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("paperclip_sync")
        .select("*")
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
      setError(err instanceof Error ? err.message : "Failed to load Paperclip data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchReplies = useCallback(async () => {
    try {
      // Fetch prospects with replied stage — these are FightFlow proof cases
      const { data: repliedProspects } = await supabase
        .from("prospects")
        .select("*")
        .eq("pipeline_stage", "replied")
        .order("updated_at", { ascending: false });

      if (!repliedProspects) return;

      const withReplies: Prospect[] = await Promise.all(
        repliedProspects.map(async (p) => {
          const { data: replyLogs } = await supabase
            .from("outreach_log")
            .select("subject, replied_at")
            .eq("prospect_email", p.email)
            .not("replied_at", "is", null)
            .order("replied_at", { ascending: false })
            .limit(1);

          return {
            ...p,
            latestReply: replyLogs?.[0]
              ? { subject: replyLogs[0].subject, repliedAt: replyLogs[0].replied_at }
              : undefined,
          } as Prospect;
        })
      );

      setReplies(withReplies);
    } catch (err) {
      console.warn("Failed to fetch reply data:", err);
    }
  }, []);

  useEffect(() => {
    fetchPaperclip();
    fetchReplies();
  }, [fetchPaperclip, fetchReplies]);

  // Derive decisions: issues that look like decisions (title contains "decision" or label)
  const decisions = issues.filter(
    (i) =>
      (i.status === "todo" || i.status === "in_progress") &&
      (i.title?.toLowerCase().includes("decision") ||
        i.metadata?.label === "decision" ||
        i.metadata?.type === "decision")
  );

  // Blockers: issues with blocked status
  const blockers = issues.filter((i) => i.status === "blocked");

  // Evidence due: issues with past-due metadata.due_date
  const now = Date.now();
  const evidenceDue = issues.filter((i) => {
    if (!i.metadata?.due_date) return false;
    return new Date(i.metadata.due_date).getTime() < now;
  });

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("exec_control_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "paperclip_sync" },
        () => {
          fetchPaperclip();
        }
      )
      .subscribe((status, err) => {
        if (err) console.warn("Exec Control subscription error:", err.message);
      });

    const repliesChannel = supabase
      .channel("exec_control_replies")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prospects", filter: "pipeline_stage=eq.replied" },
        () => {
          fetchReplies();
        }
      )
      .subscribe((status, err) => {
        if (err) console.warn("Exec Control replies subscription error:", err.message);
      });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(repliesChannel);
    };
  }, [fetchPaperclip, fetchReplies]);

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={(id) => {
        if (id === ALL_BUSINESSES_ID) {
          setSelectedBusiness({ id: ALL_BUSINESSES_ID, slug: ALL_BUSINESSES_ID, name: "All Businesses" });
        } else {
          const business = businesses.find((b) => b.id === id);
          if (business) setSelectedBusiness(business);
        }
      }}
      businessName={isAll ? "All Businesses" : selectedBusiness?.name}
      showAllOption={true}
    >
      <PageContent>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Executive Control</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Growth OS health — Paperclip-driven, read-only
            </p>
          </div>
          <button
            onClick={() => { fetchPaperclip(); fetchReplies(); }}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <p className="font-medium">Failed to load data</p>
            <p className="text-sm mt-1">{error}</p>
            <button onClick={fetchPaperclip} className="mt-2 text-sm underline hover:no-underline">
              Try again
            </button>
          </div>
        )}

        {/* 1. Decisions + Blockers (side by side) */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading Executive Control...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <DecisionsPanel decisions={decisions} />
              <BlockersPanel blockers={blockers} />
            </div>

            {/* 2. Evidence Due + Lane Health (side by side) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <EvidenceDuePanel evidenceDue={issues} />
              <LaneHealthPanel goals={goals} issues={issues} />
            </div>

            {/* 3. FightFlow Lead Responses (full width) */}
            <div className="mb-6">
              <LeadResponsePanel replies={replies} />
            </div>

            {/* 4. Footer note — read-only attribution */}
            <div className="text-center py-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                Executive Control reads from Paperclip via paperclip_sync — SW app is a visibility surface only.
                Paperclip is the execution plane.
              </p>
            </div>
          </>
        )}
      </PageContent>
    </DashboardLayout>
  );
}
