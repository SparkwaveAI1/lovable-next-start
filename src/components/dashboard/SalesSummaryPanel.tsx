import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { TrendingUp, Users, Activity, DollarSign, BarChart2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const IRIS_AGENT_ID = '15562d82-85f5-4d52-bc72-b038ba21da35';
const TERMINAL_STAGES: string[] = ['won', 'lost', 'converted'];
const FF_BUSINESS_ID = '456dc53b-d9d9-41b0-bc33-4f4c4a791eff';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SalesMetrics {
  openDeals: number;
  pipelineValue: number;
  newLeads7d: number;
  ffLeads7d: number;
  irisLastActive: string | null;
  dealsMoved7d: number;
}

type LoadState = 'loading' | 'loaded' | 'error' | 'stale';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  loading: boolean;
}

function MetricCard({ icon, label, value, sub, loading }: MetricCardProps) {
  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-100 shadow-sm min-w-0">
      <div className="p-2 bg-indigo-50 rounded-lg shrink-0 text-indigo-600">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        {loading ? (
          <div className="h-6 w-16 bg-gray-100 animate-pulse rounded mt-1" />
        ) : (
          <p className="text-lg font-semibold text-gray-900 truncate">{value}</p>
        )}
        {sub && !loading && (
          <p className="text-xs text-gray-400 truncate">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SalesSummaryPanel() {
  const [metrics, setMetrics] = useState<SalesMetrics>({
    openDeals: 0,
    pipelineValue: 0,
    newLeads7d: 0,
    ffLeads7d: 0,
    irisLastActive: null,
    dealsMoved7d: 0,
  });
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [collapsed, setCollapsed] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [dealsResult, leadsResult, ffLeadsResult, irisResult] = await Promise.all([
        // Open deals + pipeline value + deals moved
        supabase
          .from('crm_deals')
          .select('stage, value, updated_at'),

        // New leads in 7d (all businesses — overall pipeline health)
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo),

        // Fight Flow new leads in 7d (business-scoped, no commingling)
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', FF_BUSINESS_ID)
          .gte('created_at', sevenDaysAgo),

        // Iris last active
        supabase
          .from('mc_activities')
          .select('created_at')
          .eq('agent_id', IRIS_AGENT_ID)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      if (dealsResult.error) throw dealsResult.error;
      if (leadsResult.error) throw leadsResult.error;
      if (ffLeadsResult.error) throw ffLeadsResult.error;
      if (irisResult.error) throw irisResult.error;

      const deals = dealsResult.data ?? [];

      const openDeals = deals.filter(d => !TERMINAL_STAGES.includes(d.stage ?? '')).length;
      const pipelineValue = deals
        .filter(d => !TERMINAL_STAGES.includes(d.stage ?? ''))
        .reduce((sum, d) => sum + (Number(d.value) || 0), 0);
      const dealsMoved7d = deals.filter(
        d => d.updated_at && d.updated_at >= sevenDaysAgo
      ).length;

      const newLeads7d = leadsResult.count ?? 0;
      const ffLeads7d = ffLeadsResult.count ?? 0;
      const irisLastActive =
        irisResult.data && irisResult.data.length > 0
          ? irisResult.data[0].created_at
          : null;

      setMetrics({ openDeals, pipelineValue, newLeads7d, ffLeads7d, irisLastActive, dealsMoved7d });
      setLoadState('loaded');
    } catch (err) {
      console.error('[SalesSummaryPanel] fetch error:', err);
      setLoadState(prev => (prev === 'loading' ? 'error' : 'stale'));
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Real-time subscription on crm_deals
  useEffect(() => {
    const channel = supabase
      .channel('sales-summary-crm-deals')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_deals' },
        () => {
          fetchMetrics();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[SalesSummaryPanel] subscription error — data may be stale');
          setLoadState(prev => (prev === 'loaded' ? 'stale' : prev));
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMetrics]);

  const isLoading = loadState === 'loading';
  const isStale = loadState === 'stale';

  const irisSubtext = metrics.irisLastActive
    ? `Active ${formatDistanceToNow(new Date(metrics.irisLastActive), { addSuffix: true })}`
    : 'No recent activity';

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold text-gray-800">
              Sales Overview
            </CardTitle>
            {isStale && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs gap-1">
                <AlertCircle className="h-3 w-3" /> Stale
              </Badge>
            )}
          </div>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors md:hidden"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>

      {/* Hidden on mobile when collapsed */}
      <CardContent className={collapsed ? 'hidden md:block' : ''}>
        {/* Mobile: compact single row (summary only) */}
        <div className="flex md:hidden gap-3 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5 shrink-0">
            <BarChart2 className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-medium">{isLoading ? '…' : metrics.openDeals} open</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">{isLoading ? '…' : formatCurrency(metrics.pipelineValue)}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">{isLoading ? '…' : metrics.newLeads7d} new</span>
          </div>
        </div>

        {/* Desktop: full grid */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard
            icon={<BarChart2 className="h-4 w-4" />}
            label="Open Deals"
            value={metrics.openDeals}
            loading={isLoading}
          />
          <MetricCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Pipeline Value"
            value={formatCurrency(metrics.pipelineValue)}
            loading={isLoading}
          />
          <MetricCard
            icon={<Users className="h-4 w-4" />}
            label="New Leads (7d)"
            value={metrics.newLeads7d}
            loading={isLoading}
          />
          <MetricCard
            icon={<Users className="h-4 w-4" />}
            label="FF Leads (7d)"
            value={metrics.ffLeads7d}
            sub="Fight Flow only"
            loading={isLoading}
          />
          <MetricCard
            icon={<Activity className="h-4 w-4" />}
            label="Iris Last Active"
            value={metrics.irisLastActive
              ? formatDistanceToNow(new Date(metrics.irisLastActive), { addSuffix: true })
              : '—'}
            sub={irisSubtext}
            loading={isLoading}
          />
          <MetricCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Deals Moved (7d)"
            value={metrics.dealsMoved7d}
            loading={isLoading}
          />
        </div>

        {loadState === 'error' && (
          <p className="text-sm text-red-500 mt-3 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Failed to load sales data. Check console for details.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
