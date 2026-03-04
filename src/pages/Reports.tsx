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

  // Fetch logs from agent_logs table
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use raw REST call to avoid type issues since agent_logs is new
      const params = new URLSearchParams();
      params.set('order', 'created_at.desc');
      params.set('limit', '200');

      const filters: string[] = [];
      if (agentFilter !== 'All') filters.push(`agent_name=eq.${agentFilter}`);
      if (logTypeFilter !== 'All') filters.push(`log_type=eq.${logTypeFilter}`);
      const dateStart = getDateRangeStart(dateRange);
      if (dateStart) filters.push(`created_at=gte.${dateStart}`);

      const { data, error: fetchError } = await (supabase as any)
        .from('agent_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (fetchError) throw fetchError;

      let filtered = (data || []) as AgentLog[];
      if (agentFilter !== 'All') filtered = filtered.filter(l => l.agent_name === agentFilter);
      if (logTypeFilter !== 'All') filtered = filtered.filter(l => l.log_type === logTypeFilter);
      if (dateStart) filtered = filtered.filter(l => new Date(l.created_at) >= new Date(dateStart));

      setLogs(filtered);
    } catch (err) {
      console.error('Error fetching agent_logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  }, [agentFilter, logTypeFilter, dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Real-time subscription
  useEffect(() => {
    const channel = (supabase as any)
      .channel('agent_logs_changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_logs' },
        (payload: any) => {
          const newLog = payload.new as AgentLog;
          // Apply filters before prepending
          const matchesAgent = agentFilter === 'All' || newLog.agent_name === agentFilter;
          const matchesType = logTypeFilter === 'All' || newLog.log_type === logTypeFilter;
          if (matchesAgent && matchesType) {
            setLogs(prev => [newLog, ...prev]);
            toast({
              title: 'New Agent Log',
              description: `${newLog.agent_name} — ${LOG_TYPE_LABELS[newLog.log_type] || newLog.log_type}`,
            });
          }
        }
      )
      .subscribe((status: string, err: Error) => {
        if (err) console.warn('Realtime subscription error (agent_logs):', err.message);
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

  const getLogTypeBadge = (logType: LogType) => {
    const colors: Record<LogType, string> = {
      hourly: 'bg-blue-100 text-blue-700',
      daily: 'bg-emerald-100 text-emerald-700',
      error: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[logType]}`}>
        {LOG_TYPE_ICONS[logType]} {LOG_TYPE_LABELS[logType]}
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
                <ReactMarkdown>{selectedLog.content}</ReactMarkdown>
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
              <p className="font-medium text-slate-600">No logs yet — agents will begin logging here automatically</p>
              <p className="text-sm mt-2 text-slate-400">
                Hourly and daily logs from Rico, Iris, Dev, and Jerry will appear here once agents start writing to <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">agent_logs</code>
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {logs.map((log) => {
                const dateInfo = formatLogDate(log.created_at);
                const isExpanded = expandedIds.has(log.id);
                const isSelected = selectedLog?.id === log.id;
                const preview = log.content.slice(0, 120).replace(/\n/g, ' ');
                const hasMore = log.content.length > 120;

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
                          {isExpanded ? log.content : preview}
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
      </PageContent>
    </DashboardLayout>
  );
}
