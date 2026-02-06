import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent, PageHeader } from "@/components/layout/PageLayout";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { useBusinesses } from "@/hooks/useBusinesses";
import { supabase } from "@/integrations/supabase/client";
import { 
  Building2, Users, MessageSquare, Zap, TrendingUp, TrendingDown, 
  CheckCircle2, Clock, AlertCircle, RefreshCw, Calendar, ArrowUpRight
} from "lucide-react";
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";

// Types
interface ClientMetrics {
  id: string;
  name: string;
  contactsCount: number;
  messagesCount: number;
  followUpsActive: number;
  followUpsCompleted: number;
  automationsRun: number;
  leadConversion: number;
  pipelineBreakdown: Record<string, number>;
  lastActivity: string | null;
}

interface OverviewMetrics {
  totalClients: number;
  totalContacts: number;
  totalMessages: number;
  totalAutomations: number;
  activeFollowUps: number;
  avgConversionRate: number;
}

interface TrendDataPoint {
  date: string;
  messages: number;
  automations: number;
  newContacts: number;
}

// Color palette
const STATUS_COLORS = {
  green: "bg-emerald-100 text-emerald-700 border-emerald-200",
  yellow: "bg-amber-100 text-amber-700 border-amber-200",
  red: "bg-red-100 text-red-700 border-red-200",
};

const PIPELINE_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e"];

export default function ClientSuccess() {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();
  
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30); // days
  const [overview, setOverview] = useState<OverviewMetrics>({
    totalClients: 0,
    totalContacts: 0,
    totalMessages: 0,
    totalAutomations: 0,
    activeFollowUps: 0,
    avgConversionRate: 0,
  });
  const [clientMetrics, setClientMetrics] = useState<ClientMetrics[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);

  // Fetch all metrics
  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    const startDate = subDays(new Date(), dateRange);
    
    try {
      // Fetch all businesses (clients)
      const { data: allBusinesses, error: bizError } = await supabase
        .from('businesses')
        .select('id, name, status, created_at')
        .eq('status', 'active');
      
      if (bizError) throw bizError;
      
      // Fetch contacts per business
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id, business_id, pipeline_stage, status, created_at');
      
      if (contactsError) throw contactsError;
      
      // Fetch SMS messages
      const { data: smsMessages, error: smsError } = await supabase
        .from('sms_messages')
        .select('id, contact_id, direction, created_at')
        .gte('created_at', startDate.toISOString());
      
      if (smsError) throw smsError;
      
      // Fetch automation logs
      const { data: automationLogs, error: autoError } = await supabase
        .from('automation_logs')
        .select('id, business_id, status, created_at')
        .gte('created_at', startDate.toISOString());
      
      if (autoError) throw autoError;
      
      // Fetch follow-ups
      const { data: followUps, error: followUpError } = await supabase
        .from('contact_follow_ups')
        .select('id, business_id, status, completed_at');
      
      if (followUpError) throw followUpError;
      
      // Build contact to business mapping
      const contactBusinessMap = new Map<string, string>();
      contacts?.forEach(c => {
        if (c.business_id) contactBusinessMap.set(c.id, c.business_id);
      });
      
      // Aggregate metrics per business
      const metricsMap = new Map<string, ClientMetrics>();
      
      allBusinesses?.forEach(biz => {
        metricsMap.set(biz.id, {
          id: biz.id,
          name: biz.name,
          contactsCount: 0,
          messagesCount: 0,
          followUpsActive: 0,
          followUpsCompleted: 0,
          automationsRun: 0,
          leadConversion: 0,
          pipelineBreakdown: {},
          lastActivity: null,
        });
      });
      
      // Count contacts and pipeline stages
      contacts?.forEach(contact => {
        if (contact.business_id && metricsMap.has(contact.business_id)) {
          const m = metricsMap.get(contact.business_id)!;
          m.contactsCount++;
          if (contact.pipeline_stage) {
            m.pipelineBreakdown[contact.pipeline_stage] = 
              (m.pipelineBreakdown[contact.pipeline_stage] || 0) + 1;
          }
        }
      });
      
      // Count messages per business
      smsMessages?.forEach(msg => {
        const bizId = msg.contact_id ? contactBusinessMap.get(msg.contact_id) : null;
        if (bizId && metricsMap.has(bizId)) {
          metricsMap.get(bizId)!.messagesCount++;
        }
      });
      
      // Count automations per business
      automationLogs?.forEach(log => {
        if (log.business_id && metricsMap.has(log.business_id)) {
          metricsMap.get(log.business_id)!.automationsRun++;
          // Track last activity
          const m = metricsMap.get(log.business_id)!;
          if (!m.lastActivity || log.created_at > m.lastActivity) {
            m.lastActivity = log.created_at;
          }
        }
      });
      
      // Count follow-ups per business
      followUps?.forEach(fu => {
        if (fu.business_id && metricsMap.has(fu.business_id)) {
          const m = metricsMap.get(fu.business_id)!;
          if (fu.status === 'active') m.followUpsActive++;
          if (fu.status === 'completed' || fu.completed_at) m.followUpsCompleted++;
        }
      });
      
      // Calculate lead conversion (simplified: contacts with "won" or "customer" status)
      const conversionStages = ['won', 'customer', 'converted', 'closed_won'];
      contacts?.forEach(contact => {
        if (contact.business_id && metricsMap.has(contact.business_id)) {
          const stage = (contact.pipeline_stage || '').toLowerCase();
          if (conversionStages.some(s => stage.includes(s))) {
            metricsMap.get(contact.business_id)!.leadConversion++;
          }
        }
      });
      
      const metricsArray = Array.from(metricsMap.values())
        .sort((a, b) => b.messagesCount - a.messagesCount);
      
      // Calculate overview
      const totalContacts = contacts?.length || 0;
      const totalMessages = smsMessages?.length || 0;
      const totalAutomations = automationLogs?.length || 0;
      const activeFollowUps = followUps?.filter(f => f.status === 'active').length || 0;
      const totalConversions = metricsArray.reduce((sum, m) => sum + m.leadConversion, 0);
      
      setOverview({
        totalClients: allBusinesses?.length || 0,
        totalContacts,
        totalMessages,
        totalAutomations,
        activeFollowUps,
        avgConversionRate: totalContacts > 0 ? (totalConversions / totalContacts) * 100 : 0,
      });
      
      setClientMetrics(metricsArray);
      
      // Build trend data (last N days)
      const trendMap = new Map<string, TrendDataPoint>();
      for (let i = 0; i < dateRange; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        trendMap.set(date, { date, messages: 0, automations: 0, newContacts: 0 });
      }
      
      smsMessages?.forEach(msg => {
        const date = format(parseISO(msg.created_at), 'yyyy-MM-dd');
        if (trendMap.has(date)) trendMap.get(date)!.messages++;
      });
      
      automationLogs?.forEach(log => {
        const date = format(parseISO(log.created_at), 'yyyy-MM-dd');
        if (trendMap.has(date)) trendMap.get(date)!.automations++;
      });
      
      contacts?.forEach(contact => {
        const date = format(parseISO(contact.created_at), 'yyyy-MM-dd');
        if (trendMap.has(date)) trendMap.get(date)!.newContacts++;
      });
      
      setTrendData(
        Array.from(trendMap.values())
          .sort((a, b) => a.date.localeCompare(b.date))
      );
      
    } catch (err) {
      console.error('Error fetching metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Status indicator based on activity
  const getStatusIndicator = (client: ClientMetrics) => {
    if (!client.lastActivity) return { status: 'red', label: 'No activity' };
    const daysSince = Math.floor((Date.now() - new Date(client.lastActivity).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince <= 1) return { status: 'green', label: 'Active' };
    if (daysSince <= 7) return { status: 'yellow', label: 'Moderate' };
    return { status: 'red', label: 'Inactive' };
  };

  // Aggregate pipeline data for pie chart
  const aggregatePipeline = useMemo(() => {
    const pipeline: Record<string, number> = {};
    clientMetrics.forEach(c => {
      Object.entries(c.pipelineBreakdown).forEach(([stage, count]) => {
        pipeline[stage] = (pipeline[stage] || 0) + count;
      });
    });
    return Object.entries(pipeline)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [clientMetrics]);

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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Client Success</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Track performance metrics across all clients
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Date Range Selector */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value))}
                className="text-sm font-medium bg-transparent border-none focus:outline-none cursor-pointer"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>
            
            <button
              onClick={() => fetchMetrics()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">Refresh</span>
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <OverviewCard
            title="Active Clients"
            value={overview.totalClients}
            icon={Building2}
            color="indigo"
          />
          <OverviewCard
            title="Total Contacts"
            value={overview.totalContacts}
            icon={Users}
            color="blue"
          />
          <OverviewCard
            title="Messages Sent"
            value={overview.totalMessages}
            icon={MessageSquare}
            color="violet"
            subtitle={`Last ${dateRange} days`}
          />
          <OverviewCard
            title="Automations"
            value={overview.totalAutomations}
            icon={Zap}
            color="amber"
            subtitle={`Last ${dateRange} days`}
          />
          <OverviewCard
            title="Active Follow-Ups"
            value={overview.activeFollowUps}
            icon={Clock}
            color="emerald"
          />
          <OverviewCard
            title="Conversion Rate"
            value={`${overview.avgConversionRate.toFixed(1)}%`}
            icon={TrendingUp}
            color="rose"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Activity Trend */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Activity Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAutomations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => format(parseISO(val), 'MMM d')}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    labelFormatter={(val) => format(parseISO(val as string), 'MMM d, yyyy')}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="messages" 
                    stroke="#6366f1" 
                    fill="url(#colorMessages)" 
                    strokeWidth={2}
                    name="Messages"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="automations" 
                    stroke="#f59e0b" 
                    fill="url(#colorAutomations)" 
                    strokeWidth={2}
                    name="Automations"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pipeline Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Pipeline Breakdown</h3>
            <div className="h-64">
              {aggregatePipeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={aggregatePipeline}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {aggregatePipeline.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIPELINE_COLORS[index % PIPELINE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <p className="text-sm">No pipeline data</p>
                </div>
              )}
            </div>
            {aggregatePipeline.length > 0 && (
              <div className="mt-4 space-y-2">
                {aggregatePipeline.slice(0, 4).map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: PIPELINE_COLORS[i] }}
                      />
                      <span className="text-slate-600 capitalize">{item.name.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="font-medium text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Per-Client Metrics Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Client Metrics</h3>
            <p className="text-sm text-slate-500">Performance breakdown by client</p>
          </div>
          
          {isLoading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500">Loading metrics...</p>
            </div>
          ) : clientMetrics.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No client data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Contacts</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Messages</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Automations</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Follow-Ups</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Conversions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientMetrics.map((client) => {
                    const status = getStatusIndicator(client);
                    const followUpRate = client.followUpsActive + client.followUpsCompleted > 0
                      ? Math.round((client.followUpsCompleted / (client.followUpsActive + client.followUpsCompleted)) * 100)
                      : 0;
                    
                    return (
                      <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{client.name}</p>
                              {client.lastActivity && (
                                <p className="text-xs text-slate-400">
                                  Last active {format(parseISO(client.lastActivity), 'MMM d')}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[status.status as keyof typeof STATUS_COLORS]}`}>
                            {status.status === 'green' && <CheckCircle2 className="h-3 w-3" />}
                            {status.status === 'yellow' && <Clock className="h-3 w-3" />}
                            {status.status === 'red' && <AlertCircle className="h-3 w-3" />}
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-semibold text-slate-900">{client.contactsCount.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-semibold text-slate-900">{client.messagesCount.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-semibold text-slate-900">{client.automationsRun.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-sm text-slate-500">
                              {client.followUpsCompleted}/{client.followUpsActive + client.followUpsCompleted}
                            </span>
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${followUpRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="font-semibold text-slate-900">{client.leadConversion}</span>
                            {client.leadConversion > 0 && (
                              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                            )}
                          </div>
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

// Overview Card Component
interface OverviewCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'indigo' | 'blue' | 'violet' | 'amber' | 'emerald' | 'rose';
  subtitle?: string;
}

function OverviewCard({ title, value, icon: Icon, color, subtitle }: OverviewCardProps) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
  };
  
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-slate-500 mt-0.5">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}
