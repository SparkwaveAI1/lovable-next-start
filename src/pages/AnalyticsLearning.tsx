import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { useBusinesses } from "@/hooks/useBusinesses";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, BookOpen, Lightbulb, AlertTriangle, CheckCircle2, XCircle, HelpCircle, ExternalLink, ChevronDown } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

// KPI Definition (target schema — maps to future kpi_definitions table)
interface KpiDefinition {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category: string;
  unit: string | null;
  source_table: string;
  source_field: string | null;
  freshness_threshold_hours: number;
  confidence_notes: string | null;
  linked_decision_issue: string | null;
  linked_task_issue: string | null;
  created_at: string;
}

// KPI Event (target schema — maps to future kpi_events table)
interface KpiEvent {
  id: string;
  kpi_key: string;
  event_type: string;
  event_value: number | null;
  event_at: string;
  evidence: Record<string, unknown> | null;
  business_id: string | null;
}

// Learning Item (target schema — maps to future learning_items table)
interface LearningItem {
  id: string;
  title: string;
  body: string;
  category: string;
  source_metric_key: string | null;
  confidence: "high" | "medium" | "low";
  claim_boundary: string | null;
  linked_decision_issue: string | null;
  created_at: string;
}

// Claim Boundary (target schema — maps to future claim_boundaries table)
interface ClaimBoundary {
  id: string;
  boundary_key: string;
  claim: string;
  boundary_statement: string;
  caveats: string | null;
  exceptions: string | null;
  source_metrics: string[];
  confidence: "high" | "medium" | "low";
  created_at: string;
}

// Legacy metric snapshot (current data source)
interface MetricSnapshot {
  id: string;
  snapshot_at: string;
  metric_category: string;
  metric_key: string;
  metric_value: number | null;
  metric_label: string | null;
  status: "ok" | "warn" | "error" | "unknown" | null;
  source_agent: string | null;
  source_business_id: string | null;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  email: "Email",
  revenue: "Revenue",
  agent_performance: "Agent Performance",
  fight_flow: "Fight Flow",
  outreach: "Outreach",
  twitter: "Twitter",
  content: "Content",
  growth_os: "Growth OS",
};

const FRESHNESS_THRESHOLD_HOURS = 24;

function isStale(snapshotAt: string): boolean {
  const ageMs = Date.now() - new Date(snapshotAt).getTime();
  return ageMs > FRESHNESS_THRESHOLD_HOURS * 60 * 60 * 1000;
}

// ─── Status Helpers ──────────────────────────────────────────────────────────

type MetricStatus = "ok" | "warn" | "error" | "unknown";

function StatusIcon({ status }: { status: MetricStatus | null | undefined }) {
  switch (status) {
    case "ok": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "warn": return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case "error": return <XCircle className="w-4 h-4 text-red-500" />;
    default: return <HelpCircle className="w-4 h-4 text-slate-400" />;
  }
}

function StatusBadge({ status }: { status: MetricStatus | null | undefined }) {
  const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium";
  switch (status) {
    case "ok": return <span className={`${base} bg-green-100 text-green-700`}><CheckCircle2 className="w-3 h-3" /> ok</span>;
    case "warn": return <span className={`${base} bg-yellow-100 text-yellow-700`}><AlertTriangle className="w-3 h-3" /> warn</span>;
    case "error": return <span className={`${base} bg-red-100 text-red-700`}><XCircle className="w-3 h-3" /> error</span>;
    default: return <span className={`${base} bg-slate-100 text-slate-500`}><HelpCircle className="w-3 h-3" /> unknown</span>;
  }
}

function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" | null }) {
  const colors = {
    high: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-red-100 text-red-700",
  };
  if (!confidence) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[confidence]}`}>
      {confidence} confidence
    </span>
  );
}

// ─── KPI Dictionary Panel ─────────────────────────────────────────────────────

interface KpiDictionaryProps {
  definitions: KpiDefinition[];
}

function KpiDictionary({ definitions }: KpiDictionaryProps) {
  const [expanded, setExpanded] = useState(false);

  if (definitions.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
        <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        <p className="text-sm text-slate-500">No KPI definitions found.</p>
        <p className="text-xs text-slate-400 mt-1">
          kpi_definitions table will populate this dictionary.
        </p>
      </div>
    );
  }

  const visible = expanded ? definitions : definitions.slice(0, 5);
  const hidden = definitions.length - 5;

  return (
    <div className="space-y-3">
      {visible.map((def) => (
        <div key={def.id} className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm text-slate-900">{def.label}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium">
                  {CATEGORY_LABELS[def.category] ?? def.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-2">
                Key: <code className="bg-slate-100 px-1 rounded">{def.key}</code>
                {def.source_table && <> · Source: <code className="bg-slate-100 px-1 rounded">{def.source_table}</code></>}
              </p>
              {def.description && (
                <p className="text-sm text-slate-700">{def.description}</p>
              )}
              {def.confidence_notes && (
                <p className="text-xs text-slate-400 mt-1 italic">{def.confidence_notes}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {def.linked_decision_issue && (
                  <span className="text-xs text-indigo-600">
                    Decision: <code className="bg-indigo-50 px-1 rounded">{def.linked_decision_issue}</code>
                  </span>
                )}
                {def.linked_task_issue && (
                  <span className="text-xs text-emerald-600">
                    Task: <code className="bg-emerald-50 px-1 rounded">{def.linked_task_issue}</code>
                  </span>
                )}
              </div>
            </div>
            {def.unit && (
              <span className="text-xs text-slate-400 shrink-0">{def.unit}</span>
            )}
          </div>
        </div>
      ))}
      {!expanded && hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full py-2 text-sm text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1"
        >
          <ChevronDown className="h-4 w-4" />
          Show {hidden} more KPI definitions
        </button>
      )}
    </div>
  );
}

// ─── Learning Items Panel ──────────────────────────────────────────────────────

interface LearningItemsPanelProps {
  items: LearningItem[];
}

function LearningItemsPanel({ items }: LearningItemsPanelProps) {
  if (items.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
        <Lightbulb className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        <p className="text-sm text-slate-500">No learning items yet.</p>
        <p className="text-xs text-slate-400 mt-1">
          learning_items table will surface operational learnings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-semibold text-sm text-slate-900">{item.title}</span>
                <ConfidenceBadge confidence={item.confidence} />
                {item.category && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {item.category}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700">{item.body}</p>
              {item.claim_boundary && (
                <p className="text-xs text-amber-600 mt-2 italic border-l-2 border-amber-300 pl-2">
                  Boundary: {item.claim_boundary}
                </p>
              )}
              {item.linked_decision_issue && (
                <p className="text-xs text-indigo-600 mt-1">
                  Decision: <code className="bg-indigo-50 px-1 rounded">{item.linked_decision_issue}</code>
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Claim Boundaries Panel ───────────────────────────────────────────────────

interface ClaimBoundariesPanelProps {
  boundaries: ClaimBoundary[];
}

function ClaimBoundariesPanel({ boundaries }: ClaimBoundariesPanelProps) {
  if (boundaries.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        <p className="text-sm text-slate-500">No claim boundaries defined.</p>
        <p className="text-xs text-slate-400 mt-1">
          claim_boundaries table will document metric claim limits.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {boundaries.map((boundary) => (
        <div key={boundary.id} className="bg-white border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-semibold text-sm text-slate-900">{boundary.claim}</span>
                <ConfidenceBadge confidence={boundary.confidence} />
              </div>
              <p className="text-sm text-slate-700">{boundary.boundary_statement}</p>
              {boundary.caveats && (
                <p className="text-xs text-slate-500 mt-2">
                  <strong>Caveats:</strong> {boundary.caveats}
                </p>
              )}
              {boundary.exceptions && (
                <p className="text-xs text-red-600 mt-1">
                  <strong>Exceptions:</strong> {boundary.exceptions}
                </p>
              )}
              {boundary.source_metrics.length > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  Sources: {boundary.source_metrics.map((m) => (
                    <code key={m} className="bg-slate-100 px-1 rounded ml-1">{m}</code>
                  ))}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Metrics Table (suppressing stale/empty) ─────────────────────────────────

interface MetricsTableProps {
  metrics: MetricSnapshot[];
  kpiDefinitions: KpiDefinition[];
}

function MetricsTable({ metrics, kpiDefinitions }: MetricsTableProps) {
  const defMap = new Map(kpiDefinitions.map((d) => [d.key, d]));

  // Filter out stale metrics (acceptance criteria: suppress stale charts)
  const freshMetrics = metrics.filter((m) => !isStale(m.snapshot_at));

  // Group by category
  const grouped = new Map<string, MetricSnapshot[]>();
  for (const m of freshMetrics) {
    const list = grouped.get(m.metric_category) ?? [];
    list.push(m);
    grouped.set(m.metric_category, list);
  }

  if (freshMetrics.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        <p className="text-sm text-slate-500">No fresh metrics in the last {FRESHNESS_THRESHOLD_HOURS}h.</p>
        <p className="text-xs text-slate-400 mt-1">
          Stale or empty charts are suppressed per acceptance criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([category, rows]) => {
        const hasError = rows.some((r) => r.status === "error");
        const hasWarn = rows.some((r) => r.status === "warn");
        const borderColor = hasError ? "border-red-200" : hasWarn ? "border-yellow-200" : "border-slate-200";

        return (
          <div key={category} className={`bg-white border ${borderColor} rounded-xl shadow-sm overflow-hidden`}>
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <StatusIcon status={hasError ? "error" : hasWarn ? "warn" : "ok"} />
              <h2 className="font-semibold text-slate-800 text-sm">
                {CATEGORY_LABELS[category] ?? category}
              </h2>
              <span className="ml-auto text-xs text-slate-400">{rows.length} metric{rows.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="divide-y divide-slate-50">
              {rows.map((metric) => {
                const def = defMap.get(metric.metric_key);
                return (
                  <div key={metric.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm text-slate-800 truncate">
                          {metric.metric_label ?? metric.metric_key}
                        </p>
                        {def && (
                          <span className="text-xs text-indigo-500" title={`Definition: ${def.description}`}>
                            <BookOpen className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
                        <span className="font-mono">{metric.metric_key}</span>
                        {metric.source_agent && <span>via {metric.source_agent}</span>}
                        {def?.source_table && (
                          <span>Source: <code className="bg-slate-100 px-0.5 rounded">{def.source_table}</code></span>
                        )}
                        <span>Freshness: {formatDistanceToNow(new Date(metric.snapshot_at), { addSuffix: true })}</span>
                      </div>
                      {def?.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{def.description}</p>
                      )}
                      {def?.linked_decision_issue && (
                        <p className="text-xs text-indigo-600 mt-0.5">
                          Decision: <code className="bg-indigo-50 px-1 rounded">{def.linked_decision_issue}</code>
                        </p>
                      )}
                    </div>
                    {metric.metric_value !== null && (
                      <span className="text-lg font-bold text-slate-900 tabular-nums">
                        {metric.metric_value}
                        {def?.unit && <span className="text-xs font-normal text-slate-400 ml-0.5">{def.unit}</span>}
                      </span>
                    )}
                    <StatusBadge status={metric.status as MetricStatus | null} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsLearning() {
  const { selectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();

  // Legacy metrics from business_metrics_snapshots
  const [metrics, setMetrics] = useState<MetricSnapshot[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Target schema data (will be populated when tables exist)
  const [kpiDefinitions, setKpiDefinitions] = useState<KpiDefinition[]>([]);
  const [learningItems, setLearningItems] = useState<LearningItem[]>([]);
  const [claimBoundaries, setClaimBoundaries] = useState<ClaimBoundary[]>([]);
  const [targetLoading, setTargetLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"metrics" | "dictionary" | "learning" | "boundaries">("metrics");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      let query = supabase
        .from("business_metrics_snapshots")
        .select("id, snapshot_at, metric_category, metric_key, metric_value, metric_label, status, source_agent, source_business_id")
        .gte("snapshot_at", since)
        .order("snapshot_at", { ascending: false });

      if (selectedBusiness) {
        query = query.eq("source_business_id", selectedBusiness.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Deduplicate: keep latest per (category, key)
      const seen = new Map<string, MetricSnapshot>();
      for (const row of (data ?? []) as MetricSnapshot[]) {
        const dedupKey = `${row.metric_category}::${row.metric_key}`;
        if (!seen.has(dedupKey)) seen.set(dedupKey, row);
      }
      setMetrics(Array.from(seen.values()));
      setLastRefresh(new Date());
    } catch (err) {
      console.error("AnalyticsLearning: fetch metrics error", err);
    } finally {
      setMetricsLoading(false);
    }
  }, [selectedBusiness]);

  const fetchTargetSchema = useCallback(async () => {
    setTargetLoading(true);
    try {
      // Fetch from target tables (kpi_definitions, learning_items, claim_boundaries)
      // These will return empty until the tables are created
      const [defsResult, itemsResult, boundariesResult] = await Promise.allSettled([
        supabase.from("kpi_definitions").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("learning_items").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("claim_boundaries").select("*").order("created_at", { ascending: false }).limit(50),
      ]);

      if (defsResult.status === "fulfilled") {
        setKpiDefinitions((defsResult.value.data ?? []) as KpiDefinition[]);
      }
      if (itemsResult.status === "fulfilled") {
        setLearningItems((itemsResult.value.data ?? []) as LearningItem[]);
      }
      if (boundariesResult.status === "fulfilled") {
        setClaimBoundaries((boundariesResult.value.data ?? []) as ClaimBoundary[]);
      }
    } catch (err) {
      console.error("AnalyticsLearning: fetch target schema error", err);
    } finally {
      setTargetLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    fetchTargetSchema();
  }, [fetchMetrics, fetchTargetSchema]);

  // Auto-refresh metrics every 60s
  useEffect(() => {
    const timer = setInterval(fetchMetrics, 60_000);
    return () => clearInterval(timer);
  }, [fetchMetrics]);

  const freshMetrics = metrics.filter((m) => !isStale(m.snapshot_at));
  const staleMetrics = metrics.filter((m) => isStale(m.snapshot_at));

  const tabs: Array<{ key: typeof activeTab; label: string; count?: number }> = [
    { key: "metrics", label: "Metrics", count: freshMetrics.length },
    { key: "dictionary", label: "KPI Dictionary", count: kpiDefinitions.length },
    { key: "learning", label: "Learning Items", count: learningItems.length },
    { key: "boundaries", label: "Claim Boundaries", count: claimBoundaries.length },
  ];

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={(id) => {
        const business = businesses.find((b) => b.id === id);
        if (business) {
          const { setSelectedBusiness } = useBusinessContext();
          // Find how to update business context
        }
      }}
      businessName={selectedBusiness?.name}
    >
      <PageContent>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Analytics & Learning</h1>
              <p className="text-sm text-slate-500">
                {selectedBusiness
                  ? <>Showing: <span className="font-medium text-indigo-600">{selectedBusiness.name}</span></>
                  : "Showing all businesses"}
                {" · "}Last refreshed {formatDistanceToNow(lastRefresh, { addSuffix: true })}
                {staleMetrics.length > 0 && (
                  <span className="text-amber-600"> · {staleMetrics.length} stale metric{staleMetrics.length !== 1 ? "s" : ""} suppressed</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => { fetchMetrics(); fetchTargetSchema(); }}
            disabled={metricsLoading || targetLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${(metricsLoading || targetLoading) ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stale data notice */}
        {staleMetrics.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {staleMetrics.length} metric{staleMetrics.length !== 1 ? "s are" : " is"} older than {FRESHNESS_THRESHOLD_HOURS}h and {staleMetrics.length !== 1 ? "have" : "has"} been suppressed.
              Empty/stale charts are hidden per acceptance criteria.
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key ? "bg-indigo-500 text-white" : "bg-slate-200 text-slate-600"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "metrics" && (
          <MetricsTable metrics={metrics} kpiDefinitions={kpiDefinitions} />
        )}

        {activeTab === "dictionary" && (
          <KpiDictionary definitions={kpiDefinitions} />
        )}

        {activeTab === "learning" && (
          <LearningItemsPanel items={learningItems} />
        )}

        {activeTab === "boundaries" && (
          <ClaimBoundariesPanel boundaries={claimBoundaries} />
        )}
      </PageContent>
    </DashboardLayout>
  );
}
