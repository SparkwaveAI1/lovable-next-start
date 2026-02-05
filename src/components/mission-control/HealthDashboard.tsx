import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { HeartPulse, RefreshCw } from "lucide-react";

// Matches the report structure from check.mjs
interface HealthCheck {
  name: string;
  type: string;
  status: "GREEN" | "YELLOW" | "RED";
  value: unknown;
  detail: string;
  severity: string;
}

interface HealthGoalResult {
  id: string;
  name: string;
  agent: string;
  status: "GREEN" | "YELLOW" | "RED";
  checks: HealthCheck[];
  alertChannel: string;
  selfHeal: { action: string; type: string } | null;
}

interface HealthReport {
  timestamp: string;
  version: string;
  summary: { total: number; green: number; yellow: number; red: number };
  results: HealthGoalResult[];
  alerts: unknown[];
}

interface HealthReportRow {
  id: string;
  report: HealthReport;
  summary: string;
  green_count: number;
  yellow_count: number;
  red_count: number;
  created_at: string;
}

const STATUS_ORDER: Record<string, number> = { RED: 0, YELLOW: 1, GREEN: 2 };
const STATUS_DOT_COLOR: Record<string, string> = {
  RED: "bg-red-500",
  YELLOW: "bg-yellow-500",
  GREEN: "bg-emerald-500",
};
const STATUS_BORDER: Record<string, string> = {
  RED: "border-red-500/30",
  YELLOW: "border-yellow-500/30",
  GREEN: "border-emerald-500/20",
};
const STATUS_BG: Record<string, string> = {
  RED: "bg-red-500/10",
  YELLOW: "bg-yellow-500/10",
  GREEN: "bg-emerald-500/5",
};

function formatTimeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Pick the most informative single-line detail from a goal's checks */
function pickDetail(goal: HealthGoalResult): string {
  // Prefer the first non-GREEN check detail
  const worst = goal.checks.find((c) => c.status !== "GREEN");
  if (worst) return worst.detail;
  // Fallback: first check detail
  return goal.checks[0]?.detail ?? "";
}

interface HealthDashboardProps {
  className?: string;
}

export function HealthDashboard({ className }: HealthDashboardProps) {
  const [report, setReport] = useState<HealthReportRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLatest = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("mc_health_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setReport(data[0] as unknown as HealthReportRow);
      }
    } catch (err) {
      console.error("Failed to fetch health report:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLatest();
  }, []);

  // Listen for new reports via realtime
  useEffect(() => {
    const channel = supabase
      .channel("mc_health_reports_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mc_health_reports" },
        (payload) => {
          setReport(payload.new as unknown as HealthReportRow);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Sort results: RED → YELLOW → GREEN
  const sortedResults = report?.report?.results
    ? [...report.report.results].sort(
        (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
      )
    : [];

  return (
    <div
      className={cn(
        "flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-rose-500" />
          <h3 className="font-semibold text-sm text-slate-900">
            🏥 System Health
          </h3>
          {report && (
            <span className="text-xs text-slate-400">
              {formatTimeAgo(report.created_at)}
            </span>
          )}
        </div>
        {report && (
          <div className="flex items-center gap-3">
            {/* Summary pills */}
            <div className="flex items-center gap-1.5 text-xs">
              {report.green_count > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {report.green_count}
                </span>
              )}
              {report.yellow_count > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                  {report.yellow_count}
                </span>
              )}
              {report.red_count > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  {report.red_count}
                </span>
              )}
            </div>
            <button
              onClick={() => fetchLatest(true)}
              disabled={refreshing}
              className="p-1 rounded hover:bg-slate-100 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5 text-slate-400",
                  refreshing && "animate-spin"
                )}
              />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <RefreshCw className="h-5 w-5 animate-spin" />
          </div>
        ) : !report ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <HeartPulse className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No health data</p>
            <p className="text-xs mt-1">Run health check to populate</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sortedResults.map((goal) => (
              <div
                key={goal.id}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  STATUS_BG[goal.status],
                  STATUS_BORDER[goal.status]
                )}
              >
                {/* Top row: status dot + name */}
                <div className="flex items-start gap-2 mb-1">
                  <span
                    className={cn(
                      "mt-1 h-2.5 w-2.5 rounded-full shrink-0",
                      STATUS_DOT_COLOR[goal.status]
                    )}
                  />
                  <span className="font-medium text-sm text-slate-900 leading-tight">
                    {goal.name}
                  </span>
                </div>
                {/* Detail line */}
                <p className="text-xs text-slate-500 ml-[18px] line-clamp-2">
                  {pickDetail(goal)}
                </p>
                {/* Agent badge */}
                <div className="mt-1.5 ml-[18px]">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                    {goal.agent}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HealthDashboard;
