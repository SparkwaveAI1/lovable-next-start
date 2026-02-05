import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

// Types based on database schema
interface AnalyticMetric {
  id: string;
  metric_name: string;
  metric_category: string;
  metric_value: number | null;
  metric_unit: string | null;
  agent_id: string | null;
  business_id: string | null;
  period_start: string | null;
  period_end: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface AnalyticThreshold {
  id: string;
  metric_name: string;
  green_min: number | null;
  green_max: number | null;
  yellow_min: number | null;
  yellow_max: number | null;
  red_min: number | null;
  red_max: number | null;
  description: string | null;
}

interface AnalyticAlert {
  id: string;
  metric_name: string;
  current_value: number | null;
  threshold_level: string;
  previous_level: string | null;
  message: string | null;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

type StatusLevel = "GREEN" | "YELLOW" | "RED" | "UNKNOWN";

interface EvaluatedMetric {
  metric: AnalyticMetric;
  threshold: AnalyticThreshold | null;
  status: StatusLevel;
}

const STATUS_ORDER: Record<StatusLevel, number> = { RED: 0, YELLOW: 1, GREEN: 2, UNKNOWN: 3 };
const STATUS_DOT_COLOR: Record<StatusLevel, string> = {
  RED: "bg-red-500",
  YELLOW: "bg-yellow-500",
  GREEN: "bg-emerald-500",
  UNKNOWN: "bg-slate-400",
};
const STATUS_BORDER: Record<StatusLevel, string> = {
  RED: "border-red-500/30",
  YELLOW: "border-yellow-500/30",
  GREEN: "border-emerald-500/20",
  UNKNOWN: "border-slate-300",
};
const STATUS_BG: Record<StatusLevel, string> = {
  RED: "bg-red-500/10",
  YELLOW: "bg-yellow-500/10",
  GREEN: "bg-emerald-500/5",
  UNKNOWN: "bg-slate-50",
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

function formatValue(value: number | null, unit: string | null): string {
  if (value === null) return "N/A";
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(2);
  return unit ? `${formatted}${unit}` : formatted;
}

function evaluateStatus(value: number | null, threshold: AnalyticThreshold | null): StatusLevel {
  if (value === null || !threshold) return "UNKNOWN";
  
  // Check RED range first (most critical)
  if (threshold.red_min !== null && threshold.red_max !== null) {
    if (value >= threshold.red_min && value <= threshold.red_max) return "RED";
  } else if (threshold.red_min !== null && value >= threshold.red_min) {
    return "RED";
  } else if (threshold.red_max !== null && value <= threshold.red_max) {
    return "RED";
  }
  
  // Check YELLOW range
  if (threshold.yellow_min !== null && threshold.yellow_max !== null) {
    if (value >= threshold.yellow_min && value <= threshold.yellow_max) return "YELLOW";
  } else if (threshold.yellow_min !== null && value >= threshold.yellow_min) {
    return "YELLOW";
  } else if (threshold.yellow_max !== null && value <= threshold.yellow_max) {
    return "YELLOW";
  }
  
  // Check GREEN range (default if within bounds)
  if (threshold.green_min !== null && threshold.green_max !== null) {
    if (value >= threshold.green_min && value <= threshold.green_max) return "GREEN";
  } else if (threshold.green_min !== null && value >= threshold.green_min) {
    return "GREEN";
  } else if (threshold.green_max !== null && value <= threshold.green_max) {
    return "GREEN";
  }
  
  // If thresholds exist but value doesn't match any range, it's unknown
  return "GREEN"; // Default to green if no thresholds matched
}

interface AnalyticsMonitorProps {
  className?: string;
}

export function AnalyticsMonitor({ className }: AnalyticsMonitorProps) {
  const [metrics, setMetrics] = useState<EvaluatedMetric[]>([]);
  const [alerts, setAlerts] = useState<AnalyticAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setRefreshing(true);
    
    try {
      // Fetch latest metrics (most recent per metric_name)
      const { data: metricsData, error: metricsError } = await supabase
        .from("mc_analytics")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (metricsError) throw metricsError;
      
      // Fetch all thresholds
      const { data: thresholdsData, error: thresholdsError } = await supabase
        .from("mc_analytics_thresholds")
        .select("*");
      
      if (thresholdsError) throw thresholdsError;
      
      // Fetch unacknowledged alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from("mc_analytics_alerts")
        .select("*")
        .eq("acknowledged", false)
        .order("created_at", { ascending: false });
      
      if (alertsError) throw alertsError;
      
      // Create threshold lookup map
      const thresholdMap = new Map<string, AnalyticThreshold>();
      (thresholdsData || []).forEach((t: AnalyticThreshold) => {
        thresholdMap.set(t.metric_name, t);
      });
      
      // Get latest metric per metric_name
      const latestMetrics = new Map<string, AnalyticMetric>();
      (metricsData || []).forEach((m: AnalyticMetric) => {
        if (!latestMetrics.has(m.metric_name)) {
          latestMetrics.set(m.metric_name, m);
        }
      });
      
      // Evaluate each metric
      const evaluated: EvaluatedMetric[] = [];
      latestMetrics.forEach((metric) => {
        const threshold = thresholdMap.get(metric.metric_name) || null;
        const status = evaluateStatus(metric.metric_value, threshold);
        evaluated.push({ metric, threshold, status });
      });
      
      // Sort by status (RED → YELLOW → GREEN → UNKNOWN)
      evaluated.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
      
      setMetrics(evaluated);
      setAlerts((alertsData || []) as AnalyticAlert[]);
      
      if (evaluated.length > 0) {
        setLastUpdated(evaluated[0].metric.created_at);
      }
    } catch (err) {
      console.error("Failed to fetch analytics data:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Realtime subscription for new metrics and alerts
  useEffect(() => {
    const metricsChannel = supabase
      .channel("mc_analytics_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mc_analytics" },
        () => fetchData(true)
      )
      .subscribe();

    const alertsChannel = supabase
      .channel("mc_analytics_alerts_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mc_analytics_alerts" },
        () => fetchData(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(metricsChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, []);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("mc_analytics_alerts")
        .update({
          acknowledged: true,
          acknowledged_by: "user",
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", alertId);
      
      if (error) throw error;
      
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    }
  };

  // Count by status
  const statusCounts = metrics.reduce(
    (acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    },
    {} as Record<StatusLevel, number>
  );

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
          <BarChart3 className="h-4 w-4 text-indigo-500" />
          <h3 className="font-semibold text-sm text-slate-900">
            📊 Analytics Health
          </h3>
          {lastUpdated && (
            <span className="text-xs text-slate-400">
              {formatTimeAgo(lastUpdated)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Summary pills */}
          <div className="flex items-center gap-1.5 text-xs">
            {(statusCounts.GREEN || 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {statusCounts.GREEN}
              </span>
            )}
            {(statusCounts.YELLOW || 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                {statusCounts.YELLOW}
              </span>
            )}
            {(statusCounts.RED || 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {statusCounts.RED}
              </span>
            )}
          </div>
          <button
            onClick={() => fetchData(true)}
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <RefreshCw className="h-5 w-5 animate-spin" />
          </div>
        ) : metrics.length === 0 && alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <BarChart3 className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No analytics data</p>
            <p className="text-xs mt-1">Metrics will appear when collected</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Unacknowledged Alerts Section */}
            {alerts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  Unacknowledged Alerts ({alerts.length})
                </h4>
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        "p-3 rounded-lg border flex items-start justify-between gap-3",
                        alert.threshold_level === "RED"
                          ? "bg-red-50 border-red-200"
                          : "bg-yellow-50 border-yellow-200"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {alert.threshold_level === "RED" ? (
                            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                          )}
                          <span className="font-medium text-sm text-slate-900 truncate">
                            {alert.metric_name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 ml-6">
                          {alert.message || `Value: ${alert.current_value}`}
                        </p>
                        <p className="text-xs text-slate-400 ml-6 mt-0.5">
                          {formatTimeAgo(alert.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="shrink-0 p-1.5 rounded-md hover:bg-white/50 transition-colors"
                        title="Acknowledge"
                      >
                        <CheckCircle2 className="h-4 w-4 text-slate-500 hover:text-emerald-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metrics Grid */}
            {metrics.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Metric Status ({metrics.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {metrics.map(({ metric, threshold, status }) => (
                    <div
                      key={metric.id}
                      className={cn(
                        "p-3 rounded-lg border transition-all",
                        STATUS_BG[status],
                        STATUS_BORDER[status]
                      )}
                    >
                      {/* Top row: status dot + name */}
                      <div className="flex items-start gap-2 mb-1">
                        <span
                          className={cn(
                            "mt-1 h-2.5 w-2.5 rounded-full shrink-0",
                            STATUS_DOT_COLOR[status]
                          )}
                        />
                        <span className="font-medium text-sm text-slate-900 leading-tight">
                          {metric.metric_name}
                        </span>
                      </div>
                      {/* Value and detail */}
                      <div className="ml-[18px]">
                        <p className="text-lg font-semibold text-slate-800">
                          {formatValue(metric.metric_value, metric.metric_unit)}
                        </p>
                        {threshold?.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {threshold.description}
                          </p>
                        )}
                        {/* Category badge */}
                        <div className="mt-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                            {metric.metric_category}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyticsMonitor;
