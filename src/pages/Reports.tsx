import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { useBusinesses } from "@/hooks/useBusinesses";
import { supabase } from "@/integrations/supabase/client";
import type { Report, ReportType } from "@/types/reports";
import { REPORT_TYPE_LABELS, REPORT_TYPE_ICONS } from "@/types/reports";
import { RefreshCw, FileText, X, ChevronDown, Calendar } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ReactMarkdown from "react-markdown";
import { format, formatDistanceToNow } from "date-fns";

const REPORT_TYPES: ReportType[] = ['hourly_summary', 'daily_summary', 'health_check', 'weekly_report', 'activity_log'];

export default function Reports() {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();
  const { toast } = useToast();
  
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterType, setFilterType] = useState<ReportType | 'all'>('all');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  // Fetch reports from Supabase
  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('mc_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (selectedBusiness?.id) {
        query = query.or(`business_id.eq.${selectedBusiness.id},business_id.is.null`);
      }
      
      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      setReports((data as unknown as Report[]) || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBusiness?.id, filterType]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Real-time subscription for new reports
  useEffect(() => {
    const channel = supabase
      .channel('mc_reports_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'mc_reports' },
        (payload) => {
          setReports(prev => [payload.new as Report, ...prev]);
          toast({
            title: "New Report",
            description: `${REPORT_TYPE_ICONS[(payload.new as Report).type]} ${(payload.new as Report).title}`,
          });
        }
      ).subscribe((status, err) => {
        if (err) console.warn('Realtime subscription error (reports):', err.message);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const getStatusBadge = (report: Report) => {
    if (report.type === 'health_check' && report.metadata?.health_status) {
      const status = report.metadata.health_status;
      const colors = {
        GREEN: 'bg-emerald-100 text-emerald-700',
        YELLOW: 'bg-amber-100 text-amber-700',
        RED: 'bg-red-100 text-red-700',
      };
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
          {status}
        </span>
      );
    }
    return null;
  };

  const formatReportDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      relative: formatDistanceToNow(date, { addSuffix: true }),
      full: format(date, 'MMM d, yyyy h:mm a'),
    };
  };

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
            <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Mission Control logs and summaries
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-medium">
                  {filterType === 'all' ? 'All Types' : REPORT_TYPE_LABELS[filterType]}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              
              {filterDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => { setFilterType('all'); setFilterDropdownOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${filterType === 'all' ? 'bg-slate-50 font-medium' : ''}`}
                  >
                    All Types
                  </button>
                  {REPORT_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => { setFilterType(type); setFilterDropdownOpen(false); }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${filterType === type ? 'bg-slate-50 font-medium' : ''}`}
                    >
                      {REPORT_TYPE_ICONS[type]} {REPORT_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={() => fetchReports()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">Refresh</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <p className="font-medium">Failed to load reports</p>
            <p className="text-sm mt-1">{error}</p>
            <button onClick={() => fetchReports()} className="mt-2 text-sm underline hover:no-underline">
              Try again
            </button>
          </div>
        )}

        {/* Main Content: List + Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reports List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-sm text-slate-900">
                  {filterType === 'all' ? 'All Reports' : REPORT_TYPE_LABELS[filterType]}
                </h3>
                <span className="text-xs text-slate-400">{reports.length} reports</span>
              </div>
              
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading reports...</p>
                  </div>
                ) : reports.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No reports yet</p>
                    <p className="text-xs mt-1">Reports will appear here as they're generated</p>
                  </div>
                ) : (
                  <ul>
                    {reports.map((report) => {
                      const dateInfo = formatReportDate(report.created_at);
                      const isSelected = selectedReport?.id === report.id;
                      
                      return (
                        <li key={report.id}>
                          <button
                            onClick={() => setSelectedReport(report)}
                            className={`w-full px-4 py-3 text-left border-b border-slate-50 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-base">{REPORT_TYPE_ICONS[report.type]}</span>
                                  <span className="text-xs text-slate-400 uppercase tracking-wide">
                                    {REPORT_TYPE_LABELS[report.type]}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {report.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Calendar className="h-3 w-3 text-slate-300" />
                                  <span className="text-xs text-slate-400" title={dateInfo.full}>
                                    {dateInfo.relative}
                                  </span>
                                </div>
                              </div>
                              {getStatusBadge(report)}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Report Detail */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {selectedReport ? (
                <>
                  {/* Detail Header */}
                  <div className="p-4 border-b border-slate-100 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{REPORT_TYPE_ICONS[selectedReport.type]}</span>
                        <span className="text-xs text-slate-400 uppercase tracking-wide">
                          {REPORT_TYPE_LABELS[selectedReport.type]}
                        </span>
                        {getStatusBadge(selectedReport)}
                      </div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        {selectedReport.title}
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatReportDate(selectedReport.created_at).full}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="p-1 hover:bg-slate-100 rounded"
                    >
                      <X className="h-5 w-5 text-slate-400" />
                    </button>
                  </div>

                  {/* Metadata Summary */}
                  {Object.keys(selectedReport.metadata || {}).length > 0 && (
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                      <div className="flex flex-wrap gap-4">
                        {selectedReport.metadata.tasks_completed !== undefined && (
                          <div className="text-center">
                            <div className="text-lg font-bold text-emerald-600">
                              {selectedReport.metadata.tasks_completed}
                            </div>
                            <div className="text-xs text-slate-500">Completed</div>
                          </div>
                        )}
                        {selectedReport.metadata.tasks_in_progress !== undefined && (
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {selectedReport.metadata.tasks_in_progress}
                            </div>
                            <div className="text-xs text-slate-500">In Progress</div>
                          </div>
                        )}
                        {selectedReport.metadata.activities_logged !== undefined && (
                          <div className="text-center">
                            <div className="text-lg font-bold text-slate-700">
                              {selectedReport.metadata.activities_logged}
                            </div>
                            <div className="text-xs text-slate-500">Activities</div>
                          </div>
                        )}
                        {selectedReport.metadata.sms_sent !== undefined && selectedReport.metadata.sms_sent > 0 && (
                          <div className="text-center">
                            <div className="text-lg font-bold text-violet-600">
                              {selectedReport.metadata.sms_sent}
                            </div>
                            <div className="text-xs text-slate-500">SMS Sent</div>
                          </div>
                        )}
                        {selectedReport.metadata.emails_sent !== undefined && selectedReport.metadata.emails_sent > 0 && (
                          <div className="text-center">
                            <div className="text-lg font-bold text-indigo-600">
                              {selectedReport.metadata.emails_sent}
                            </div>
                            <div className="text-xs text-slate-500">Emails Sent</div>
                          </div>
                        )}
                        {selectedReport.metadata.decisions_made !== undefined && selectedReport.metadata.decisions_made > 0 && (
                          <div className="text-center">
                            <div className="text-lg font-bold text-amber-600">
                              {selectedReport.metadata.decisions_made}
                            </div>
                            <div className="text-xs text-slate-500">Decisions</div>
                          </div>
                        )}
                        {selectedReport.metadata.checks_passed !== undefined && (
                          <div className="text-center">
                            <div className="text-lg font-bold text-emerald-600">
                              {selectedReport.metadata.checks_passed}
                            </div>
                            <div className="text-xs text-slate-500">Checks Passed</div>
                          </div>
                        )}
                        {selectedReport.metadata.checks_failed !== undefined && selectedReport.metadata.checks_failed > 0 && (
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">
                              {selectedReport.metadata.checks_failed}
                            </div>
                            <div className="text-xs text-slate-500">Failed</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Markdown Content */}
                  <div className="p-6 max-h-[calc(100vh-400px)] overflow-y-auto">
                    <div className="prose prose-sm prose-slate max-w-none">
                      <ReactMarkdown>{selectedReport.content}</ReactMarkdown>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-slate-400">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Select a report to view</p>
                  <p className="text-sm mt-1">Click on any report from the list</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </PageContent>
    </DashboardLayout>
  );
}
