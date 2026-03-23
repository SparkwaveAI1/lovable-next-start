import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, BarChart3, CheckCircle, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type MetricCategory = "linkedin" | "email" | "revenue" | "agent_performance" | "fight_flow" | "outreach" | "twitter" | "content";
type MetricStatus = "ok" | "warn" | "error" | "unknown";

interface MetricSnapshot {
  id: string;
  snapshot_at: string;
  metric_category: MetricCategory;
  metric_key: string;
  metric_value: number | null;
  metric_label: string | null;
  status: MetricStatus | null;
  source_agent: string | null;
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<MetricCategory, string> = {
  linkedin: "LinkedIn",
  email: "Email",
  revenue: "Revenue",
  agent_performance: "Agent Performance",
  fight_flow: "Fight Flow",
  outreach: "Outreach",
  twitter: "Twitter",
  content: "Content",
};

const ALL_CATEGORIES: MetricCategory[] = [
  "agent_performance",
  "linkedin",
  "email",
  "content",
  "outreach",
  "fight_flow",
  "revenue",
  "twitter",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: MetricStatus | null }) {
  switch (status) {
    case "ok":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "warn":
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case "error":
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <HelpCircle className="w-4 h-4 text-gray-400" />;
  }
}

function StatusBadge({ status }: { status: MetricStatus | null }) {
  const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium";
  switch (status) {
    case "ok":
      return <span className={`${base} bg-green-100 text-green-700`}><CheckCircle className="w-3 h-3" /> ok</span>;
    case "warn":
      return <span className={`${base} bg-yellow-100 text-yellow-700`}><AlertTriangle className="w-3 h-3" /> warn</span>;
    case "error":
      return <span className={`${base} bg-red-100 text-red-700`}><XCircle className="w-3 h-3" /> error</span>;
    default:
      return <span className={`${base} bg-gray-100 text-gray-500`}><HelpCircle className="w-3 h-3" /> unknown</span>;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BusinessMetrics() {
  const [metrics, setMetrics] = useState<MetricSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<MetricCategory | "all">("all");

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("business_metrics_snapshots")
        .select("id, snapshot_at, metric_category, metric_key, metric_value, metric_label, status, source_agent")
        .gte("snapshot_at", since)
        .order("snapshot_at", { ascending: false });

      if (error) throw error;

      // Deduplicate: keep only the latest snapshot per (category, key)
      const seen = new Map<string, MetricSnapshot>();
      for (const row of (data ?? []) as MetricSnapshot[]) {
        const dedupKey = `${row.metric_category}::${row.metric_key}`;
        if (!seen.has(dedupKey)) seen.set(dedupKey, row);
      }
      setMetrics(Array.from(seen.values()));
      setLastRefresh(new Date());
    } catch (err) {
      console.error("BusinessMetrics: fetch error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Auto-refresh every 60s
  useEffect(() => {
    const timer = setInterval(fetchMetrics, 60_000);
    return () => clearInterval(timer);
  }, [fetchMetrics]);

  // Filter by tab
  const visibleMetrics =
    activeTab === "all" ? metrics : metrics.filter((m) => m.metric_category === activeTab);

  // Group by category for display
  const grouped = new Map<MetricCategory, MetricSnapshot[]>();
  for (const m of visibleMetrics) {
    const list = grouped.get(m.metric_category) ?? [];
    list.push(m);
    grouped.set(m.metric_category, list);
  }

  // Categories that have data
  const activeCategories = ALL_CATEGORIES.filter((c) => grouped.has(c));

  const tabs: Array<MetricCategory | "all"> = ["all", ...ALL_CATEGORIES];

  return (
    <DashboardLayout>
      <PageContent>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Business Metrics</h1>
              <p className="text-sm text-gray-500">
                Last refreshed {formatDistanceToNow(lastRefresh, { addSuffix: true })} · auto-refreshes every 60s
              </p>
            </div>
          </div>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const label = tab === "all" ? "All" : CATEGORY_LABELS[tab] ?? tab;
            const count = tab === "all" ? metrics.length : (grouped.get(tab as MetricCategory) ?? []).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  activeTab === tab
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
                {count > 0 && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                      activeTab === tab ? "bg-indigo-500 text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading && metrics.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Loading metrics…
          </div>
        ) : activeCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <BarChart3 className="w-8 h-8 opacity-30" />
            <p className="text-sm">No data yet for this category in the last 24h.</p>
            <p className="text-xs">Run a monitoring script to populate metrics.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {(activeTab === "all" ? activeCategories : activeCategories.filter(c => c === activeTab)).map((category) => {
              const rows = grouped.get(category) ?? [];
              const hasError = rows.some(r => r.status === "error");
              const hasWarn = rows.some(r => r.status === "warn");
              const borderColor = hasError ? "border-red-200" : hasWarn ? "border-yellow-200" : "border-gray-200";

              return (
                <div key={category} className={`bg-white border ${borderColor} rounded-xl shadow-sm overflow-hidden`}>
                  {/* Category header */}
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                    <StatusIcon status={hasError ? "error" : hasWarn ? "warn" : "ok"} />
                    <h2 className="font-semibold text-gray-800 text-sm">
                      {CATEGORY_LABELS[category] ?? category}
                    </h2>
                    <span className="ml-auto text-xs text-gray-400">{rows.length} metric{rows.length !== 1 ? "s" : ""}</span>
                  </div>

                  {/* Metric rows */}
                  <div className="divide-y divide-gray-100">
                    {rows.map((metric) => (
                      <div key={metric.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 truncate">
                            {metric.metric_label ?? metric.metric_key}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {metric.metric_key}
                            {metric.source_agent ? ` · via ${metric.source_agent}` : ""}
                            {" · "}
                            {formatDistanceToNow(new Date(metric.snapshot_at), { addSuffix: true })}
                          </p>
                        </div>
                        {metric.metric_value !== null && (
                          <span className="text-lg font-bold text-gray-900 tabular-nums">
                            {metric.metric_value}
                          </span>
                        )}
                        <StatusBadge status={metric.status as MetricStatus | null} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageContent>
    </DashboardLayout>
  );
}
