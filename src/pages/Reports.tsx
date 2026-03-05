import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { useBusinesses } from "@/hooks/useBusinesses";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, FileText, X, ChevronDown, Calendar, ChevronRight } from "lucide-react";
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
  agent: string | null;
  event_type: string | null;
  label: string | null;
  status: string | null;
  details: string | null;
  created_at: string;
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
      const { data, error: fetchError } = await (supabase as any)
        .from('agent_logs')
        .select('id, agent, event_type, label, status, details, created_at')
        .not('agent', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      if (fetchError) throw fetchError;
      setActivityLogs((data || []) as ActivityLogEntry[]);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setActivityError(err instanceof Error ? err.message : 'Failed to load activity logs');
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivityLogs();
  }, [fetchActivityLogs]);

  // Fetch logs from mc_reports table
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = (supabase as any)
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
    const channel = (supabase as any)
      .channel('mc_reports_changes')
      .on('postgres_changes',
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
      (supabase as any).removeChannel(channel);
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
              <p className="text-xs text-slate-400 mt-0.5">Recent agent events from all agents — last 50</p>
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
              <p className="text-sm text-slate-500">No activity logged yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Agent</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Label</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activityLogs.map((entry) => {
                    const statusLower = (entry.status || '').toLowerCase();
                    const statusColor =
                      statusLower === 'pass'
                        ? 'bg-emerald-100 text-emerald-700'
                        : statusLower === 'fail'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700';
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap" title={entry.created_at}>
                          {format(new Date(entry.created_at), 'MMM d, h:mm a')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${AGENT_COLORS[entry.agent || ''] || 'bg-slate-100 text-slate-700'}`}>
                            {entry.agent || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{entry.event_type || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate" title={entry.label || ''}>
                          {entry.label || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {entry.status ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                              {entry.status}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
