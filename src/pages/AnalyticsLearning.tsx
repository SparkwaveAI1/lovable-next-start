import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { useBusinesses } from "@/hooks/useBusinesses";
import { supabase } from "@/integrations/supabase/client";
import {
  RefreshCw,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  BookOpen,
  Lightbulb,
  Target,
  ExternalLink,
  Info,
  TrendingUp,
  Clock,
} from "lucide-react";
import { formatDistanceToNow, subDays, isAfter } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type MetricStatus = "ok" | "warn" | "error" | "unknown";
type EvidenceLevel = "high" | "medium" | "low" | "none";

interface MetricSnapshot {
  id: string;
  snapshot_at: string;
  metric_category: string;
  metric_key: string;
  metric_value: number | null;
  metric_label: string | null;
  status: string | null;
  source_agent: string | null;
  source_business_id: string | null;
}

interface AiResponseLog {
  id: string;
  created_at: string;
  input_message: string;
  response_text: string;
  input_channel: string | null;
  cost_cents: number | null;
  confidence_score: number | null;
  contact_replied: boolean | null;
  contact_booked: boolean | null;
  required_review: boolean | null;
  review_rating: string | null;
  tokens_used: number | null;
}

interface AgentReport {
  id: string;
  type: string;
  title: string;
  content: string;
  created_at: string;
  agent_name: string;
}

interface McReportRow {
  id: string;
  type: string;
  title: string;
  content: string | null;
  created_at: string;
  business_id: string | null;
}

interface KpiDefinition {
  category: string;
  key: string;
  label: string;
  definition: string;
  unit: string;
  evidence_source: string;
}

// ─── Staleness threshold ───────────────────────────────────────────────────────

const STALE_THRESHOLD_DAYS = 7;

// ─── KPI Definitions (derived from existing metric patterns) ──────────────────

const KPI_DEFINITIONS: KpiDefinition[] = [
  {
    category: "linkedin",
    key: "connections_added",
    label: "LinkedIn Connections Added",
    definition: "Net new LinkedIn connections added in the period. Source: LinkedIn API.",
    unit: "connections",
    evidence_source: "ai_response_logs + LinkedIn API",
  },
  {
    category: "linkedin",
    key: "messages_sent",
    label: "LinkedIn Messages Sent",
    definition: "Outbound LinkedIn messages sent via automation. Source: LinkedIn API.",
    unit: "messages",
    evidence_source: "ai_response_logs + LinkedIn API",
  },
  {
    category: "email",
    key: "emails_sent",
    label: "Emails Sent",
    definition: "Transactional and marketing emails dispatched. Source: email provider API.",
    unit: "emails",
    evidence_source: "ai_response_logs + email provider",
  },
  {
    category: "email",
    key: "open_rate",
    label: "Email Open Rate",
    definition: "Unique opens / emails delivered. Source: email provider webhooks.",
    unit: "%",
    evidence_source: "email provider webhooks",
  },
  {
    category: "revenue",
    key: "bookings",
    label: "Bookings Closed",
    definition: "Contacts that converted to booked appointments. Source: CRM deals.",
    unit: "bookings",
    evidence_source: "ai_response_logs + CRM",
  },
  {
    category: "revenue",
    key: "revenue_cents",
    label: "Revenue",
    definition: "Total revenue in cents. Source: CRM deals.",
    unit: "cents",
    evidence_source: "CRM deals",
  },
  {
    category: "agent_performance",
    key: "response_time_ms",
    label: "Avg Response Time",
    definition: "Average LLM response latency. Source: ai_response_logs.response_time_ms.",
    unit: "ms",
    evidence_source: "ai_response_logs.response_time_ms",
  },
  {
    category: "agent_performance",
    key: "confidence_score",
    label: "Avg Confidence Score",
    definition: "Average confidence score across agent responses. Source: ai_response_logs.confidence_score.",
    unit: "score",
    evidence_source: "ai_response_logs.confidence_score",
  },
  {
    category: "fight_flow",
    key: "intents_detected",
    label: "Fight Flow Intents Detected",
    definition: "Number of high-stakes conversation intents classified. Source: ai_response_logs.intents_detected.",
    unit: "intents",
    evidence_source: "ai_response_logs.intents_detected",
  },
  {
    category: "outreach",
    key: "contacts_added",
    label: "New Contacts Added",
    definition: "Net new contacts created in CRM. Source: CRM contacts.",
    unit: "contacts",
    evidence_source: "CRM contacts",
  },
  {
    category: "outreach",
    key: "reply_rate",
    label: "Reply Rate",
    definition: "Contacts who replied / outreach sent. Source: ai_response_logs.contact_replied.",
    unit: "%",
    evidence_source: "ai_response_logs.contact_replied",
  },
  {
    category: "twitter",
    key: "tweets_sent",
    label: "Tweets Sent",
    definition: "Twitter/X posts published. Source: Twitter API.",
    unit: "tweets",
    evidence_source: "Twitter API",
  },
  {
    category: "content",
    key: "posts_published",
    label: "Posts Published",
    definition: "Content pieces published across channels. Source: content hub.",
    unit: "posts",
    evidence_source: "content hub",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isStale(snapshotAt: string): boolean {
  const cutoff = subDays(new Date(), STALE_THRESHOLD_DAYS);
  return !isAfter(new Date(snapshotAt), cutoff);
}

function getEvidenceLevel(log: AiResponseLog | null): EvidenceLevel {
  if (!log) return "none";
  if (log.confidence_score !== null && log.confidence_score >= 0.85) return "high";
  if (log.confidence_score !== null && log.confidence_score >= 0.6) return "medium";
  if (log.confidence_score !== null) return "low";
  return "none";
}

function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  const cfg: Record<EvidenceLevel, { label: string; cls: string }> = {
    high: { label: "High confidence", cls: "bg-green-100 text-green-700" },
    medium: { label: "Medium confidence", cls: "bg-yellow-100 text-yellow-700" },
    low: { label: "Low confidence", cls: "bg-orange-100 text-orange-700" },
    none: { label: "No evidence", cls: "bg-gray-100 text-gray-500" },
  };
  const { label, cls } = cfg[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <TrendingUp className="w-3 h-3" />
      {label}
    </span>
  );
}

function StatusIcon({ status }: { status: MetricStatus | null }) {
  switch (status) {
    case "ok": return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "warn": return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case "error": return <XCircle className="w-4 h-4 text-red-500" />;
    default: return <HelpCircle className="w-4 h-4 text-gray-400" />;
  }
}

function StatusBadge({ status }: { status: MetricStatus | null }) {
  const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium";
  switch (status) {
    case "ok": return <span className={`${base} bg-green-100 text-green-700`}><CheckCircle className="w-3 h-3" /> ok</span>;
    case "warn": return <span className={`${base} bg-yellow-100 text-yellow-700`}><AlertTriangle className="w-3 h-3" /> warn</span>;
    case "error": return <span className={`${base} bg-red-100 text-red-700`}><XCircle className="w-3 h-3" /> error</span>;
    default: return <span className={`${base} bg-gray-100 text-gray-500`}><HelpCircle className="w-3 h-3" /> unknown</span>;
  }
}

function getKpiDefinition(category: string, key: string): KpiDefinition | null {
  return KPI_DEFINITIONS.find(d => d.category === category && d.key === key) ?? null;
}

function FreshnessBadge({ snapshotAt }: { snapshotAt: string }) {
  const stale = isStale(snapshotAt);
  const label = formatDistanceToNow(new Date(snapshotAt), { addSuffix: true });
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${stale ? "text-red-500" : "text-gray-400"}`}>
      <Clock className="w-3 h-3" />
      {stale ? "STALE " : ""}{label}
    </span>
  );
}

// ─── Section: KPI/Event Dictionary ────────────────────────────────────────────

function KpiDictionarySection({
  metrics,
  loading,
  onRefresh,
  businessId,
}: {
  metrics: MetricSnapshot[];
  loading: boolean;
  onRefresh: () => void;
  businessId?: string;
}) {
  const [activeTab, setActiveTab] = useState<string>("all");

  // Derive unique categories from metrics
  const categories = ["all", ...new Set(metrics.map(m => m.metric_category))];

  const visible = activeTab === "all"
    ? metrics
    : metrics.filter(m => m.metric_category === activeTab);

  // Suppress stale or null-value metrics per acceptance criteria
  const suppressed = visible.filter(m => !isStale(m.snapshot_at) && m.metric_value !== null);

  return (
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <BookOpen className="w-5 h-5 text-indigo-600" />
        <div className="flex-1">
          <h2 className="font-semibold text-slate-900">KPI / Event Dictionary</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Every visible metric is linked to its source and definition. Stale or empty charts are suppressed.
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Category tabs */}
      <div className="px-5 pt-3 pb-0 flex gap-1 overflow-x-auto">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-t-md text-sm font-medium transition ${
              activeTab === cat
                ? "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {cat === "all" ? "All" : cat}
            <span className="ml-1.5 text-xs opacity-60">
              {(cat === "all" ? metrics : metrics.filter(m => m.metric_category === cat)).filter(m => !isStale(m.snapshot_at) && m.metric_value !== null).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading metrics…
        </div>
      ) : suppressed.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
          <BarChart3 className="w-8 h-8 opacity-30" />
          <p className="text-sm">No event-backed metrics with recent data.</p>
          <p className="text-xs">Run a monitoring agent to populate metrics, or wait for data to arrive.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {suppressed.map(metric => {
            const def = getKpiDefinition(metric.metric_category, metric.metric_key);
            const status = metric.status as MetricStatus | null;
            const businessHref = metric.source_business_id ? `/crm/${metric.source_business_id}` : null;

            return (
              <div key={metric.id} className="px-5 py-4 hover:bg-slate-50 transition">
                <div className="flex items-start gap-3">
                  <StatusIcon status={status} />
                  <div className="flex-1 min-w-0">
                    {/* Metric header */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900">
                        {metric.metric_label ?? metric.metric_key}
                      </span>
                      <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {metric.metric_category}
                      </span>
                      <StatusBadge status={status} />
                    </div>

                    {/* Definition */}
                    {def ? (
                      <p className="text-xs text-slate-600 mt-1">{def.definition}</p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1 italic">
                        No definition available for {metric.metric_key}
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <FreshnessBadge snapshotAt={metric.snapshot_at} />
                      {metric.source_agent && (
                        <span className="text-xs text-slate-400">
                          via {metric.source_agent}
                        </span>
                      )}
                      {def && (
                        <span className="text-xs text-slate-400">
                          Evidence: {def.evidence_source}
                        </span>
                      )}
                      {businessHref && (
                        <a
                          href={businessHref}
                          className="text-xs text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5"
                        >
                          View source <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Metric value */}
                  {metric.metric_value !== null && (
                    <div className="text-right shrink-0">
                      <span className="text-xl font-bold text-slate-900 tabular-nums">
                        {metric.metric_value}
                      </span>
                      {def && (
                        <span className="block text-xs text-slate-400">{def.unit}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Section: Learning Items ──────────────────────────────────────────────────

function LearningItemsSection({
  reports,
  loading,
}: {
  reports: AgentReport[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
        <p className="text-sm">Loading agent reports…</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400">
        <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No agent learning items in the last 30 days.</p>
      </div>
    );
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <Lightbulb className="w-5 h-5 text-amber-500" />
        <div>
          <h2 className="font-semibold text-slate-900">Learning Items</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Agent decisions and insights surfaced from mc_reports. Each item links to its source.
          </p>
        </div>
        <span className="ml-auto text-xs text-slate-400">{reports.length} items</span>
      </div>
      <div className="divide-y divide-slate-50">
        {reports.slice(0, 50).map(report => (
          <div key={report.id} className="px-5 py-3 hover:bg-slate-50 transition">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0">
                <StatusIcon status="ok" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-800">{report.title}</span>
                  <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    {report.type}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                  {report.content?.slice(0, 200).replace(/\n/g, " ")}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-slate-400">{report.agent_name}</span>
                  <span className="text-xs text-slate-400">
                    {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                  </span>
                  <a
                    href="/reports"
                    className="text-xs text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5"
                  >
                    View in Reports <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {reports.length > 50 && (
        <div className="px-5 py-3 border-t border-slate-100 text-center">
          <a href="/reports" className="text-sm text-indigo-600 hover:text-indigo-800">
            View all {reports.length} learning items →
          </a>
        </div>
      )}
    </section>
  );
}

// ─── Section: Agent Evidence ──────────────────────────────────────────────────

function AgentEvidenceSection({
  logs,
  loading,
}: {
  logs: AiResponseLog[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
        <p className="text-sm">Loading agent evidence…</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400">
        <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No agent evidence in the last 7 days.</p>
      </div>
    );
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <Target className="w-5 h-5 text-indigo-600" />
        <div>
          <h2 className="font-semibold text-slate-900">Agent Evidence</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Confidence-scored agent responses from ai_response_logs. High-evidence entries drive KPI accuracy.
          </p>
        </div>
        <span className="ml-auto text-xs text-slate-400">{logs.length} entries</span>
      </div>
      <div className="divide-y divide-slate-50">
        {logs.slice(0, 30).map(log => {
          const level = getEvidenceLevel(log);
          return (
            <div key={log.id} className="px-5 py-3 hover:bg-slate-50 transition">
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  <EvidenceBadge level={level} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 line-clamp-2">
                    <span className="text-slate-400 text-xs">Q: </span>
                    {log.input_message?.slice(0, 120)}
                  </p>
                  {log.response_text && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      <span className="text-slate-400 text-xs">A: </span>
                      {log.response_text?.slice(0, 120)}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {log.confidence_score !== null && (
                      <span className="text-xs text-slate-400">
                        confidence: {(log.confidence_score * 100).toFixed(0)}%
                      </span>
                    )}
                    {log.cost_cents !== null && (
                      <span className="text-xs text-slate-400">
                        cost: ${(log.cost_cents / 100).toFixed(4)}
                      </span>
                    )}
                    {log.contact_replied !== null && (
                      <span className={`text-xs ${log.contact_replied ? "text-green-600" : "text-slate-400"}`}>
                        replied: {log.contact_replied ? "yes" : "no"}
                      </span>
                    )}
                    {log.required_review && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                        needs review
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                    <a
                      href="/reports"
                      className="text-xs text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5"
                    >
                      Details <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {logs.length > 30 && (
        <div className="px-5 py-3 border-t border-slate-100 text-center">
          <a href="/reports" className="text-sm text-indigo-600 hover:text-indigo-800">
            View all {logs.length} entries →
          </a>
        </div>
      )}
    </section>
  );
}

// ─── Section: Info Banner ─────────────────────────────────────────────────────

function InfoBanner() {
  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-start gap-3">
      <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
      <div className="text-sm text-indigo-700">
        <strong>Analytics / Learning surface.</strong> This page replaces legacy /reports and /business-metrics with event-backed, source-linked, definition-documented metrics.
        Stale metrics (&gt;7 days old) and charts with null values are automatically suppressed.
        Sources: <span className="font-mono text-xs bg-indigo-100 px-1 rounded">ai_response_logs</span>,{" "}
        <span className="font-mono text-xs bg-indigo-100 px-1 rounded">mc_reports</span>,{" "}
        <span className="font-mono text-xs bg-indigo-100 px-1 rounded">business_metrics_snapshots</span>.
        Navigate to source data via the Reports page.
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsLearning() {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();

  const [metrics, setMetrics] = useState<MetricSnapshot[]>([]);
  const [reports, setReports] = useState<AgentReport[]>([]);
  const [evidenceLogs, setEvidenceLogs] = useState<AiResponseLog[]>([]);

  const [metricsLoading, setMetricsLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [evidenceLoading, setEvidenceLoading] = useState(true);

  // ── Fetch metrics ──────────────────────────────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const since = subDays(new Date(), STALE_THRESHOLD_DAYS).toISOString();
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
        const key = `${row.metric_category}::${row.metric_key}`;
        if (!seen.has(key)) seen.set(key, row);
      }
      setMetrics(Array.from(seen.values()));
    } catch (err) {
      console.error("AnalyticsLearning: metrics fetch error", err);
    } finally {
      setMetricsLoading(false);
    }
  }, [selectedBusiness]);

  // ── Fetch agent reports (learning items) ───────────────────────────────────
  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const since = subDays(new Date(), 30).toISOString();
      let query = supabase
        .from("mc_reports")
        .select("id, type, title, content, created_at, business_id")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(100);

      if (selectedBusiness) {
        query = query.eq("business_id", selectedBusiness.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped: AgentReport[] = ((data ?? []) as McReportRow[]).map(r => ({
        id: r.id,
        type: r.type,
        title: r.title,
        content: r.content ?? "",
        created_at: r.created_at,
        agent_name: parseAgentFromTitle(r.title),
      }));
      setReports(mapped);
    } catch (err) {
      console.error("AnalyticsLearning: reports fetch error", err);
    } finally {
      setReportsLoading(false);
    }
  }, [selectedBusiness]);

  // ── Fetch agent evidence logs ────────────────────────────────────────────────
  const fetchEvidence = useCallback(async () => {
    setEvidenceLoading(true);
    try {
      const since = subDays(new Date(), 7).toISOString();
      let query = supabase
        .from("ai_response_logs")
        .select("id, created_at, input_message, response_text, input_channel, cost_cents, confidence_score, contact_replied, contact_booked, required_review")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(50);

      if (selectedBusiness) {
        query = query.eq("business_id", selectedBusiness.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEvidenceLogs((data ?? []) as AiResponseLog[]);
    } catch (err) {
      console.error("AnalyticsLearning: evidence fetch error", err);
    } finally {
      setEvidenceLoading(false);
    }
  }, [selectedBusiness]);

  useEffect(() => {
    fetchMetrics();
    fetchReports();
    fetchEvidence();
  }, [fetchMetrics, fetchReports, fetchEvidence]);

  const businessName = selectedBusiness?.name;

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={(id) => {
        const business = businesses.find(b => b.id === id);
        if (business) {
          setSelectedBusiness(business);
        }
      }}
      businessName={businessName}
    >
      <PageContent>
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Analytics / Learning</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {businessName
                  ? <>Showing: <span className="font-medium text-indigo-600">{businessName}</span></>
                  : "Showing all businesses"}
                {" · "}event-backed metrics only, stale suppressed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/reports"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <BookOpen className="w-4 h-4" />
              Reports
            </a>
            <a
              href="/business-metrics"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <BarChart3 className="w-4 h-4" />
              Business Metrics
            </a>
          </div>
        </div>

        <InfoBanner />

        {/* KPI/Event Dictionary — primary metric surface */}
        <div className="mt-6">
          <KpiDictionarySection
            metrics={metrics}
            loading={metricsLoading}
            onRefresh={fetchMetrics}
            businessId={selectedBusiness?.id}
          />
        </div>

        {/* Two-column: Learning Items + Agent Evidence */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LearningItemsSection reports={reports} loading={reportsLoading} />
          <AgentEvidenceSection logs={evidenceLogs} loading={evidenceLoading} />
        </div>
      </PageContent>
    </DashboardLayout>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseAgentFromTitle(title: string): string {
  if (!title) return "Rico";
  const trimmed = title.trim();
  if (/^hourly summary/i.test(trimmed)) return "Rico";
  const match = trimmed.match(/^(\w+)\s+(?:daily|hourly|weekly)/i);
  return match ? match[1] : "Rico";
}
