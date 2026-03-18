import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent, PageHeader } from "@/components/layout/PageLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  RefreshCw,
  TrendingUp,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  BarChart,
  Bar,
} from "recharts";

// ---- Types ----

interface ExperimentEntry {
  index: number;
  commit?: string;
  metric: number;
  status: "baseline" | "keep" | "discard" | "running";
  description: string;
}

interface AutoresearchRun {
  id: string;
  session_tag: string;
  agent_name: string;
  server_ip: string;
  goal: string;
  metric_name: string;
  metric_direction: "maximize" | "minimize";
  status: "running" | "complete" | "stopped";
  baseline_metric: number;
  current_best_metric: number;
  total_experiments: number;
  kept_experiments: number;
  experiment_log: ExperimentEntry[];
  raw_tsv?: string;
  started_at: string;
  updated_at: string;
  completed_at?: string;
}

// ---- Helpers ----

function statusColor(status: string): string {
  switch (status) {
    case "running": return "bg-blue-100 text-blue-800";
    case "complete": return "bg-green-100 text-green-800";
    case "stopped": return "bg-gray-100 text-gray-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

function experimentBarColor(status: string): string {
  switch (status) {
    case "baseline": return "#94a3b8"; // slate
    case "keep": return "#4ade80";     // green
    case "discard": return "#f87171";  // red
    case "running": return "#60a5fa";  // blue
    default: return "#94a3b8";
  }
}

function improvementPct(baseline: number, best: number, direction: "maximize" | "minimize"): number {
  if (baseline === 0) return 0;
  if (direction === "maximize") {
    return ((best - baseline) / baseline) * 100;
  }
  return ((baseline - best) / baseline) * 100;
}

// ---- Component ----

const AutoresearchDashboard = () => {
  const [runs, setRuns] = useState<AutoresearchRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? runs[0] ?? null;

  const fetchRuns = useCallback(async () => {
    const { data, error } = await supabase
      .from("autoresearch_results" as any)
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setRuns(data as unknown as AutoresearchRun[]);
      setLastFetched(new Date());
    }
    setIsLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Auto-refresh every 10 seconds when any run is "running"
  useEffect(() => {
    const hasRunning = runs.some((r) => r.status === "running");
    if (!hasRunning) return;
    const timer = setInterval(fetchRuns, 10_000);
    return () => clearInterval(timer);
  }, [runs, fetchRuns]);

  // Build chart data for the selected run
  const chartData = (selectedRun?.experiment_log ?? []).map((e) => ({
    experiment: e.index,
    metric: e.metric,
    status: e.status,
    description: e.description,
  }));

  return (
    <DashboardLayout>
      <PageHeader
        title="Autoresearch Dashboard"
        description="Live view of autonomous skill optimization runs"
      />
      <PageContent>
        <div className="flex flex-col gap-6">

          {/* Header row: refresh + last-fetched */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {lastFetched
                ? `Last updated ${formatDistanceToNow(lastFetched, { addSuffix: true })}`
                : "Loading…"}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRuns}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* No-data state */}
          {!isLoading && runs.length === 0 && (
            <Card>
              <CardContent className="pt-10 pb-10 flex flex-col items-center gap-3 text-center">
                <FlaskConical className="h-10 w-10 text-muted-foreground" />
                <p className="text-lg font-medium">No autoresearch runs yet</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Start an autoresearch loop on any server. Results will appear here
                  automatically via the{" "}
                  <code className="bg-muted px-1 rounded">autoresearch-sync.mjs</code> script.
                </p>
              </CardContent>
            </Card>
          )}

          {runs.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Sidebar: run list */}
              <div className="lg:col-span-1 flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Sessions ({runs.length})
                </p>
                {runs.map((run) => (
                  <button
                    key={run.id}
                    onClick={() => setSelectedRunId(run.id)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors hover:bg-accent ${
                      (selectedRun?.id === run.id) ? "border-primary bg-accent" : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate max-w-[130px]">
                        {run.session_tag}
                      </span>
                      <Badge
                        className={`text-xs shrink-0 ${statusColor(run.status)}`}
                        variant="outline"
                      >
                        {run.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{run.agent_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {run.total_experiments} experiments
                    </div>
                  </button>
                ))}
              </div>

              {/* Main: selected run detail */}
              {selectedRun && (
                <div className="lg:col-span-3 flex flex-col gap-4">

                  {/* Status banner */}
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            {selectedRun.session_tag}
                          </CardTitle>
                          <CardDescription className="mt-1 text-sm">{selectedRun.goal}</CardDescription>
                        </div>
                        <Badge
                          className={`shrink-0 ${statusColor(selectedRun.status)}`}
                          variant="outline"
                        >
                          {selectedRun.status === "running" ? (
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                              Running experiment {selectedRun.total_experiments}…
                            </span>
                          ) : selectedRun.status === "complete" ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                              Complete
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Stopped
                            </span>
                          )}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Agent</p>
                          <p className="font-medium">{selectedRun.agent_name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Server</p>
                          <p className="font-medium">{selectedRun.server_ip}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Baseline</p>
                          <p className="font-medium">{selectedRun.baseline_metric.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Best</p>
                          <p className="font-medium text-green-600">
                            {selectedRun.current_best_metric.toFixed(1)}%
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({improvementPct(selectedRun.baseline_metric, selectedRun.current_best_metric, selectedRun.metric_direction) >= 0 ? "+" : ""}
                              {improvementPct(selectedRun.baseline_metric, selectedRun.current_best_metric, selectedRun.metric_direction).toFixed(1)}%)
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Metric</p>
                          <p className="font-medium">{selectedRun.metric_name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Experiments</p>
                          <p className="font-medium">{selectedRun.total_experiments}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Kept</p>
                          <p className="font-medium">{selectedRun.kept_experiments}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Keep Rate</p>
                          <p className="font-medium">
                            {selectedRun.total_experiments > 0
                              ? ((selectedRun.kept_experiments / selectedRun.total_experiments) * 100).toFixed(0)
                              : "—"}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Score progression chart */}
                  {chartData.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Score Progression
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                              dataKey="experiment"
                              tick={{ fontSize: 11 }}
                              label={{ value: "Experiment #", position: "insideBottom", offset: -2, fontSize: 11 }}
                            />
                            <YAxis
                              tick={{ fontSize: 11 }}
                              domain={["auto", "auto"]}
                              tickFormatter={(v) => `${v}%`}
                            />
                            <Tooltip
                              formatter={(value: number) => [`${value.toFixed(1)}%`, selectedRun.metric_name]}
                              labelFormatter={(label) => `Experiment ${label}`}
                            />
                            <ReferenceLine
                              y={selectedRun.baseline_metric}
                              stroke="#94a3b8"
                              strokeDasharray="4 4"
                              label={{ value: "Baseline", fill: "#64748b", fontSize: 10 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="metric"
                              stroke="#6366f1"
                              strokeWidth={2}
                              dot={(props) => {
                                const { cx, cy, payload } = props;
                                return (
                                  <circle
                                    key={payload.experiment}
                                    cx={cx}
                                    cy={cy}
                                    r={5}
                                    fill={experimentBarColor(payload.status)}
                                    stroke="#fff"
                                    strokeWidth={1.5}
                                  />
                                );
                              }}
                              activeDot={{ r: 7 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground justify-center">
                          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-slate-400 inline-block" /> Baseline</span>
                          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-green-400 inline-block" /> Keep</span>
                          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-red-400 inline-block" /> Discard</span>
                          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-blue-400 inline-block" /> Running</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Experiment log table */}
                  {selectedRun.experiment_log?.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FlaskConical className="h-4 w-4" />
                          Experiment Log
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-left text-xs text-muted-foreground">
                                <th className="pb-2 pr-3 font-medium">#</th>
                                <th className="pb-2 pr-3 font-medium">Score</th>
                                <th className="pb-2 pr-3 font-medium">Status</th>
                                <th className="pb-2 font-medium">Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedRun.experiment_log.map((exp) => (
                                <tr key={exp.index} className="border-b last:border-0 hover:bg-muted/30">
                                  <td className="py-2 pr-3 text-muted-foreground">{exp.index}</td>
                                  <td className="py-2 pr-3 font-mono font-medium">{exp.metric.toFixed(1)}%</td>
                                  <td className="py-2 pr-3">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                        exp.status === "keep"
                                          ? "bg-green-100 text-green-700"
                                          : exp.status === "discard"
                                          ? "bg-red-100 text-red-700"
                                          : exp.status === "running"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-gray-100 text-gray-600"
                                      }`}
                                    >
                                      {exp.status === "keep" && <CheckCircle2 className="h-3 w-3" />}
                                      {exp.status === "discard" && <XCircle className="h-3 w-3" />}
                                      {exp.status === "running" && <Activity className="h-3 w-3 animate-pulse" />}
                                      {exp.status}
                                    </span>
                                  </td>
                                  <td className="py-2 text-muted-foreground text-xs max-w-xs truncate" title={exp.description}>
                                    {exp.description}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Complete summary */}
                  {selectedRun.status === "complete" && (
                    <Card className="border-green-200 bg-green-50">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
                          <div>
                            <p className="font-semibold text-green-800">Optimization complete</p>
                            <p className="text-sm text-green-700">
                              {selectedRun.metric_name} improved from{" "}
                              <strong>{selectedRun.baseline_metric.toFixed(1)}%</strong> →{" "}
                              <strong>{selectedRun.current_best_metric.toFixed(1)}%</strong> over{" "}
                              {selectedRun.total_experiments} experiments (
                              {selectedRun.kept_experiments} kept,{" "}
                              {selectedRun.total_experiments - selectedRun.kept_experiments} discarded).
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Last updated */}
                  <p className="text-xs text-muted-foreground text-right">
                    Session updated {formatDistanceToNow(new Date(selectedRun.updated_at), { addSuffix: true })}
                    {selectedRun.status === "running" && " · auto-refreshing every 10s"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </PageContent>
    </DashboardLayout>
  );
};

export default AutoresearchDashboard;
