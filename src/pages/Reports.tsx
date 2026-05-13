import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { useBusinesses } from "@/hooks/useBusinesses";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, FileText, X, ChevronDown, Calendar, ChevronRight, BarChart3, ShieldCheck, Target, TrendingUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ReactMarkdown from "react-markdown";
import { format, formatDistanceToNow, startOfDay, subDays } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

type AgentName = 'Rico' | 'Iris' | 'Dev' | 'Jerry';
type LogType = 'hourly' | 'daily' | 'error';

interface AgentLog {
  id: string;
  agent_name: string;
  log_type: LogType;
  content: string;
  created_at: string;
}

// mc_reports row shape (raw from Supabase)
interface McReport {
  id: string;
  type: string;        // 'hourly_summary' | 'daily_summary'
  title: string;
  content: string;
  metadata: Record<string, unknown> | null;
  business_id: string | null;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse an agent name out of an mc_reports title.
 *  "Jerry Daily Summary — 2026-03-03"  → "Jerry"
 *  "Hourly Summary — Feb 4 11:05 PM ET" → "Rico"  (Rico always writes hourlies)
 *  Falls back to "Rico" when the pattern is unrecognised.
 */
function parseAgentFromTitle(title: string): string {
  if (!title) return 'Rico';
  const trimmed = title.trim();
  // "Hourly Summary — …" has no leading agent name → Rico
  if (/^hourly summary/i.test(trimmed)) return 'Rico';
  // "{Agent} Daily Summary — …" → first word
  const match = trimmed.match(/^(\w+)\s+(?:daily|hourly|weekly)/i);
  if (match) return match[1];
  return 'Rico';
}

/** Map mc_reports.type → LogType */
function mapReportType(type: string): LogType {
  if (type === 'hourly_summary') return 'hourly';
  if (type === 'daily_summary') return 'daily';
  return 'hourly'; // safe default
}

/** Convert an McReport row into the AgentLog shape the UI expects */
function mcReportToAgentLog(r: McReport): AgentLog {
  return {
    id: r.id,
    agent_name: parseAgentFromTitle(r.title),
    log_type: mapReportType(r.type),
    content: r.content ?? '',
    created_at: r.created_at,
  };
}


interface ActivityLogEntry {
  id: string;
  business_id: string | null;
  created_at: string;
  input_message: string;
  response_text: string;
  input_channel: string | null;
  contact_id: string | null;
  cost_cents: number | null;
  confidence_score: number | null;
  contact_replied: boolean | null;
  contact_booked: boolean | null;
}

const AGENT_OPTIONS: Array<AgentName | 'All'> = ['All', 'Rico', 'Iris', 'Dev', 'Jerry'];
const LOG_TYPE_OPTIONS: Array<LogType | 'All'> = ['All', 'hourly', 'daily', 'error'];

const LOG_TYPE_ICONS: Record<LogType, string> = {
  hourly: '🕐',
  daily: '📋',
  error: '🚨',
};

const LOG_TYPE_LABELS: Record<LogType, string> = {
  hourly: 'Hourly Summary',
  daily: 'Daily Summary',
  error: 'Error',
};

const AGENT_COLORS: Record<string, string> = {
  Rico: 'bg-blue-100 text-blue-700',
  Iris: 'bg-purple-100 text-purple-700',
  Dev: 'bg-emerald-100 text-emerald-700',
  Jerry: 'bg-amber-100 text-amber-700',
};

type ConnectorState = 'live' | 'placeholder' | 'blocked';

interface GrowthOsKpiRow {
  view: string;
  kpi: string;
  formula: string;
  source: string;
  state: ConnectorState;
  cadence: string;
}

interface FunnelStageRow {
  stage: string;
  event: string;
  source: string;
  requiredFields: string;
  state: ConnectorState;
}

const CONNECTOR_BADGE_CLASSES: Record<ConnectorState, string> = {
  live: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  placeholder: 'bg-amber-100 text-amber-700 border-amber-200',
  blocked: 'bg-slate-100 text-slate-600 border-slate-200',
};

const growthOsKpis: GrowthOsKpiRow[] = [
  { view: 'Daily outbound', kpi: 'Emails sent', formula: 'count(outbound_email_sent)', source: 'Sending platform export/API', state: 'blocked', cadence: 'Daily' },
  { view: 'Daily outbound', kpi: 'Positive replies', formula: 'count(outbound_reply_classified where category is positive)', source: 'Reply queue + CRM taxonomy', state: 'blocked', cadence: 'Daily' },
  { view: 'Daily outbound', kpi: 'Bounce rate', formula: 'outbound_email_bounced / outbound_email_sent', source: 'Sending platform', state: 'blocked', cadence: 'Daily' },
  { view: 'Weekly ICP test', kpi: 'Qualified conversation rate', formula: 'qualified_conversation_created / outbound_email_sent', source: 'CRM qualification fields + sending platform', state: 'blocked', cadence: 'Weekly' },
  { view: 'Weekly ICP test', kpi: 'Cost per qualified conversation', formula: 'outbound_campaign_cost / qualified_conversations', source: 'Cost log + CRM qualification', state: 'blocked', cadence: 'Weekly' },
  { view: 'Account pipeline', kpi: 'Booked-call rate', formula: 'sales_call_booked / positive_replies', source: 'Calendar + CRM + reply taxonomy', state: 'blocked', cadence: 'Weekly' },
  { view: 'Content performance', kpi: 'Content engagement', formula: 'views, saves, replies, DMs, clicks by source package', source: 'Postiz/social exports + feedback log', state: 'placeholder', cadence: 'Weekly' },
  { view: 'ICP scorecard', kpi: 'Segment recommendation', formula: 'scale / revise / pause / kill based on reply quality, cost, booked calls', source: 'Weekly ICP scorecard', state: 'placeholder', cadence: 'Weekly' },
];

const funnelStages: FunnelStageRow[] = [
  { stage: 'Reply', event: 'outbound_reply_received', source: 'Sending platform / mailbox', requiredFields: 'lead_id, reply_id, campaign_name, inbox_id, reply_received_at', state: 'blocked' },
  { stage: 'Positive reply', event: 'outbound_reply_classified', source: 'CRM or reply-management workflow', requiredFields: 'reply_category, classified_by, confidence, next_action', state: 'blocked' },
  { stage: 'Qualified conversation', event: 'qualified_conversation_created', source: 'CRM', requiredFields: 'qualification_status, pain_signal, authority_signal, budget_signal, owner', state: 'blocked' },
  { stage: 'Booked', event: 'sales_call_booked', source: 'Calendar + CRM', requiredFields: 'meeting_id, booked_at, meeting_time, booking_source', state: 'blocked' },
  { stage: 'Attended', event: 'sales_call_attended', source: 'CRM/calendar', requiredFields: 'meeting_id, attended_at, show_status, owner', state: 'blocked' },
  { stage: 'Proposal', event: 'proposal_sent', source: 'CRM/proposal system', requiredFields: 'opportunity_id, proposal_sent_at, proposed_value, owner', state: 'blocked' },
  { stage: 'Close', event: 'closed_won / closed_lost', source: 'CRM/accounting', requiredFields: 'opportunity_id, closed_at, won_amount or loss_reason, source', state: 'blocked' },
];

const renderConnectorBadge = (state: ConnectorState) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${CONNECTOR_BADGE_CLASSES[state]}`}>
    {state}
  </span>
);

// ─── Date range helpers ───────────────────────────────────────────────────────

type DateRange = 'today' | '7d' | '30d' | 'all';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  all: 'All time',
};

function getDateRangeStart(range: DateRange): string | null {
  if (range === 'all') return null;
  if (range === 'today') return startOfDay(new Date()).toISOString();
  if (range === '7d') return subDays(new Date(), 7).toISOString();
  if (range === '30d') return subDays(new Date(), 30).toISOString();
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Reports() {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();
  const { toast } = useToast();

  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AgentLog | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Filters
  const [agentFilter, setAgentFilter] = useState<AgentName | 'All'>('All');
  const [logTypeFilter, setLogTypeFilter] = useState<LogType | 'All'>('All');
  const [dateRange, setDateRange] = useState<DateRange>('7d');

  // Dropdown open states
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);


  // Agent Activity Log state
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);

  const fetchActivityLogs = useCallback(async () => {
    setActivityLoading(true);
    setActivityError(null);
    try {
      let query = supabase
        .from('ai_response_logs')
        .select('id, business_id, created_at, input_message, response_text, input_channel, contact_id, cost_cents, confidence_score, contact_replied, contact_booked')
        .order('created_at', { ascending: false })
        .limit(50);
      if (selectedBusiness?.id) {
        query = query.eq('business_id', selectedBusiness.id);
      }
      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setActivityLogs((data || []) as ActivityLogEntry[]);
    } catch (err) {
      console.error('Error fetching ai_response_logs:', err);
      setActivityError(err instanceof Error ? err.message : 'Failed to load activity logs');
    } finally {
      setActivityLoading(false);
    }
  }, [selectedBusiness?.id]);

  useEffect(() => {
    fetchActivityLogs();
  }, [fetchActivityLogs]);

  // Fetch logs from mc_reports table
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('mc_reports')
        .select('id, type, title, content, metadata, business_id, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      // Server-side date filter
      const dateStart = getDateRangeStart(dateRange);
      if (dateStart) query = query.gte('created_at', dateStart);

      // Server-side type filter — map UI value back to mc_reports.type
      if (logTypeFilter !== 'All') {
        const dbType = logTypeFilter === 'hourly' ? 'hourly_summary' : 'daily_summary';
        query = query.eq('type', dbType);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      let mapped = ((data || []) as McReport[]).map(mcReportToAgentLog);

      // Client-side agent filter (derived from title parsing)
      if (agentFilter !== 'All') {
        mapped = mapped.filter(l => l.agent_name === agentFilter);
      }

      setLogs(mapped);
    } catch (err) {
      console.error('Error fetching mc_reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  }, [agentFilter, logTypeFilter, dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Real-time subscription to mc_reports
  useEffect(() => {
    const channel = supabase
      .channel('mc_reports_changes')
      .on('postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'mc_reports' },
        (payload: any) => {
          const raw = payload.new as McReport;
          const newLog = mcReportToAgentLog(raw);
          // Apply current filters before prepending
          const matchesAgent = agentFilter === 'All' || newLog.agent_name === agentFilter;
          const matchesType = logTypeFilter === 'All' || newLog.log_type === logTypeFilter;
          if (matchesAgent && matchesType) {
            setLogs(prev => [newLog, ...prev]);
            toast({
              title: 'New Agent Report',
              description: `${newLog.agent_name} — ${LOG_TYPE_LABELS[newLog.log_type] || newLog.log_type}`,
            });
          }
        }
      )
      .subscribe((status: string, err: Error) => {
        if (err) console.warn('Realtime subscription error (mc_reports):', err.message);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentFilter, logTypeFilter, toast]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatLogDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      relative: formatDistanceToNow(date, { addSuffix: true }),
      full: format(date, 'MMM d, yyyy h:mm a'),
    };
  };

  const getLogTypeBadge = (logType: LogType | null | undefined) => {
    if (!logType) return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
        event
      </span>
    );
    const colors: Record<LogType, string> = {
      hourly: 'bg-blue-100 text-blue-700',
      daily: 'bg-emerald-100 text-emerald-700',
      error: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[logType] ?? 'bg-slate-100 text-slate-500'}`}>
        {LOG_TYPE_ICONS[logType] ?? '📌'} {LOG_TYPE_LABELS[logType] ?? logType}
      </span>
    );
  };

  // Filter Dropdown Component
  const FilterDropdown = ({
    label,
    isOpen,
    onToggle,
    options,
    value,
    onSelect,
    formatter,
  }: {
    label: string;
    isOpen: boolean;
    onToggle: () => void;
    options: string[];
    value: string;
    onSelect: (v: any) => void;
    formatter?: (v: string) => string;
  }) => (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm"
      >
        <span className="font-medium">{label}: {formatter ? formatter(value) : value}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onSelect(opt); onToggle(); }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${value === opt ? 'bg-slate-50 font-medium' : ''}`}
            >
              {formatter ? formatter(opt) : opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={(id) => {
        const business = businesses.find(b => b.id === id);
        if (business) setSelectedBusiness(business);
      }}
      businessName={selectedBusiness?.name}
    >
      <PageContent>
        {/* Growth OS Analytics Implementation */}
        <div className="mb-8 space-y-6">
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Growth OS Area 9 reporting shell
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Analytics dashboard views and KPI tracking</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Daily outbound, weekly ICP testing, account pipeline, content performance, cost per qualified conversation, and funnel-stage tracking are mapped below. This is an analytics setup view only: no outbound launch, publish, CRM migration, tracking changes, CPA/CAC claim, or external contact is performed here.
                </p>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[420px]">
                <div className="rounded-xl border border-white bg-white/80 p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500"><Target className="h-4 w-4" /> North star</div>
                  <div className="mt-1 font-semibold text-slate-900">Qualified conversations</div>
                </div>
                <div className="rounded-xl border border-white bg-white/80 p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500"><TrendingUp className="h-4 w-4" /> Primary KPI</div>
                  <div className="mt-1 font-semibold text-slate-900">Cost per qualified conversation</div>
                </div>
                <div className="rounded-xl border border-white bg-white/80 p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500"><ShieldCheck className="h-4 w-4" /> Data mode</div>
                  <div className="mt-1 font-semibold text-slate-900">Placeholder / blocked until QA</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-slate-900">Daily outbound view</h2>
              <p className="mt-1 text-xs text-slate-500">Send pacing, bounces, replies, positive replies, complaints, unsubscribes, booked calls, and objections. Live values remain blocked until the sending platform export/API and reply classification are verified.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-slate-900">Weekly ICP test view</h2>
              <p className="mt-1 text-xs text-slate-500">Cuts by vertical, segment, geography, lead source, campaign, variant, inbox/domain, and owner. Used to recommend scale, revise, pause, or kill decisions after launch data exists.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-slate-900">Account pipeline view</h2>
              <p className="mt-1 text-xs text-slate-500">Tracks reply to positive reply to booked to attended to proposal to close. Booked-call and CAC claims stay blocked until calendar, CRM, cost, and revenue mappings are verified.</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-100 p-4">
              <h2 className="font-semibold text-slate-900">KPI and event mapping</h2>
              <p className="mt-1 text-xs text-slate-500">Mapped from SPA-4651 and the Full Stack Agency analytics schema. Placeholder rows demonstrate layout and formulas only.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">View</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">KPI</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Formula</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">State</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cadence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {growthOsKpis.map((row) => (
                    <tr key={`${row.view}-${row.kpi}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{row.view}</td>
                      <td className="px-4 py-3 text-slate-700">{row.kpi}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.formula}</td>
                      <td className="px-4 py-3 text-slate-600">{row.source}</td>
                      <td className="px-4 py-3">{renderConnectorBadge(row.state)}</td>
                      <td className="px-4 py-3 text-slate-600">{row.cadence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-100 p-4">
              <h2 className="font-semibold text-slate-900">Funnel conversion tracking</h2>
              <p className="mt-1 text-xs text-slate-500">Tracking starts once outbound launches and the required connector QA gates pass. Until then these stages are reporting definitions, not live performance proof.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stage</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Required fields</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {funnelStages.map((row) => (
                    <tr key={row.event} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{row.stage}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.event}</td>
                      <td className="px-4 py-3 text-slate-600">{row.source}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{row.requiredFields}</td>
                      <td className="px-4 py-3">{renderConnectorBadge(row.state)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Claim boundary and reporting cadence</p>
            <p className="mt-1">Daily outbound report: daily after approved launch. Weekly ICP, account pipeline, content performance, and cost-per-qualified-conversation reports: weekly. CPA/CAC/revenue claims remain blocked until cost inputs, CRM qualification, calendar matching, and closed-won/source attribution are verified with live connector data.</p>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Agent Logs</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Hourly, daily, and error logs from all agents
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Agent Filter */}
            <FilterDropdown
              label="Agent"
              isOpen={agentDropdownOpen}
              onToggle={() => { setAgentDropdownOpen(!agentDropdownOpen); setTypeDropdownOpen(false); setDateDropdownOpen(false); }}
              options={AGENT_OPTIONS}
              value={agentFilter}
              onSelect={setAgentFilter}
            />

            {/* Log Type Filter */}
            <FilterDropdown
              label="Type"
              isOpen={typeDropdownOpen}
              onToggle={() => { setTypeDropdownOpen(!typeDropdownOpen); setAgentDropdownOpen(false); setDateDropdownOpen(false); }}
              options={LOG_TYPE_OPTIONS}
              value={logTypeFilter}
              onSelect={setLogTypeFilter}
              formatter={(v) => v === 'All' ? 'All' : (LOG_TYPE_LABELS[v as LogType] || v)}
            />

            {/* Date Range Filter */}
            <FilterDropdown
              label="Date"
              isOpen={dateDropdownOpen}
              onToggle={() => { setDateDropdownOpen(!dateDropdownOpen); setAgentDropdownOpen(false); setTypeDropdownOpen(false); }}
              options={['today', '7d', '30d', 'all'] as DateRange[]}
              value={dateRange}
              onSelect={setDateRange}
              formatter={(v) => DATE_RANGE_LABELS[v as DateRange] || v}
            />

            <button
              onClick={() => fetchLogs()}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <p className="font-medium">Failed to load logs</p>
            <p className="text-sm mt-1">{error}</p>
            <button onClick={() => fetchLogs()} className="mt-2 text-sm underline hover:no-underline">
              Try again
            </button>
          </div>
        )}

        {/* Selected Log Detail Panel */}
        {selectedLog && (
          <div className="mb-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-md text-sm font-semibold ${AGENT_COLORS[selectedLog.agent_name] || 'bg-slate-100 text-slate-700'}`}>
                  {selectedLog.agent_name}
                </span>
                {getLogTypeBadge(selectedLog.log_type)}
                <span className="text-xs text-slate-400">{formatLogDate(selectedLog.created_at).full}</span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="prose prose-sm prose-slate max-w-none">
                <ReactMarkdown>{selectedLog.content ?? ''}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* Logs Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-900">
              {isLoading ? 'Loading...' : `${logs.length} log${logs.length !== 1 ? 's' : ''}`}
            </h3>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-slate-600">No reports match the current filters</p>
              <p className="text-sm mt-2 text-slate-400">
                Hourly and daily summaries from agents are stored in <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">mc_reports</code>. Try adjusting the date range or filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {logs.map((log) => {
                const dateInfo = formatLogDate(log.created_at);
                const isExpanded = expandedIds.has(log.id);
                const isSelected = selectedLog?.id === log.id;
                const preview = (log.content ?? '').slice(0, 120).replace(/\n/g, ' ');
                const hasMore = (log.content ?? '').length > 120;

                return (
                  <div
                    key={log.id}
                    className={`p-4 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Agent badge */}
                      <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-semibold ${AGENT_COLORS[log.agent_name] || 'bg-slate-100 text-slate-700'}`}>
                        {log.agent_name}
                      </span>

                      <div className="flex-1 min-w-0">
                        {/* Log type + timestamp */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {getLogTypeBadge(log.log_type)}
                          <span className="flex items-center gap-1 text-xs text-slate-400" title={dateInfo.full}>
                            <Calendar className="h-3 w-3" />
                            {dateInfo.relative}
                          </span>
                        </div>

                        {/* Content preview */}
                        <p className="text-sm text-slate-700">
                          {isExpanded ? (log.content ?? '') : preview}
                          {!isExpanded && hasMore && '…'}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-3 mt-2">
                          {hasMore && (
                            <button
                              onClick={() => toggleExpand(log.id)}
                              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                              <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              {isExpanded ? 'Collapse' : 'Expand'}
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedLog(isSelected ? null : log)}
                            className="text-xs text-slate-500 hover:text-slate-700"
                          >
                            {isSelected ? 'Close detail' : 'View full log'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Agent Activity Log Section */}
        <div className="mt-8 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Agent Activity Log</h2>
              <p className="text-xs text-slate-400 mt-0.5">Recent AI responses from ai_response_logs — last 50</p>
            </div>
            <button
              onClick={() => fetchActivityLogs()}
              disabled={activityLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 text-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${activityLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {activityError && (
            <div className="p-4 bg-red-50 text-red-700 text-sm">
              Failed to load activity logs: {activityError}
            </div>
          )}

          {activityLoading ? (
            <div className="p-10 text-center text-slate-400">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading activity...</p>
            </div>
          ) : activityLogs.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm text-slate-500">No AI responses logged yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Channel</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Input</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Response</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Confidence</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Replied</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Booked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activityLogs.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap" title={entry.created_at ?? ''}>
                        {entry.created_at ? format(new Date(entry.created_at), 'MMM d, h:mm a') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {entry.input_channel ? (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                            {entry.input_channel}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate" title={entry.input_message}>
                        {entry.input_message || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate" title={entry.response_text}>
                        {entry.response_text || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {entry.confidence_score != null
                          ? `${Math.round(entry.confidence_score * 100)}%`
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {entry.cost_cents != null
                          ? `$${(entry.cost_cents / 100).toFixed(4)}`
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {entry.contact_replied != null ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entry.contact_replied ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {entry.contact_replied ? 'Yes' : 'No'}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {entry.contact_booked != null ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entry.contact_booked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {entry.contact_booked ? 'Yes' : 'No'}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </PageContent>
    </DashboardLayout>
  );
}

// data-source: mc_reports | cache-bust: 2026-03-05
