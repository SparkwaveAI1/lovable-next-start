import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ChevronDown, ChevronUp, Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ─── Campaign label mapping ───────────────────────────────────────────────────

const CAMPAIGN_LABELS: Record<string, string> = {
  'value':        'Value Pitch',
  'intro':        'Cold Intro',
  'CI-wave4':     'CI Wave 4',
  'social_proof': 'Social Proof',
};

function getCampaignLabel(key: string | null): string {
  if (!key) return 'Unknown';
  return CAMPAIGN_LABELS[key] ??
    key.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ─── Iris health ──────────────────────────────────────────────────────────────

function getIrisStatus(lastSentAt: string | null): 'green' | 'yellow' | 'red' {
  if (!lastSentAt) return 'red';
  const hoursSince = (Date.now() - new Date(lastSentAt).getTime()) / 3_600_000;
  if (hoursSince < 12) return 'green';
  if (hoursSince < 24) return 'yellow';
  return 'red';
}

const STATUS_COLORS: Record<string, string> = {
  green:  'text-emerald-500',
  yellow: 'text-amber-500',
  red:    'text-red-500',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface OutreachRow {
  sent_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
  template_used: string | null;
}

interface PeriodStats {
  sent: number;
  opened: number;
  replied: number;
  calls: number;
}

interface CampaignRow {
  key: string;
  label: string;
  sent: number;
  openPct: number;
  replyPct: number;
}

interface MetricsState {
  today: PeriodStats;
  week: PeriodStats;
  month: PeriodStats;
  campaigns: CampaignRow[];
  lastSentAt: string | null;
  hotReplies: number;
}

const EMPTY_PERIOD: PeriodStats = { sent: 0, opened: 0, replied: 0, calls: 0 };
const EMPTY_METRICS: MetricsState = {
  today: { ...EMPTY_PERIOD },
  week: { ...EMPTY_PERIOD },
  month: { ...EMPTY_PERIOD },
  campaigns: [],
  lastSentAt: null,
  hotReplies: 0,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(num: number, denom: number): string {
  if (denom === 0) return '0%';
  return `${Math.round((num / denom) * 100)}%`;
}

function statCell(value: number, total: number, showPct: boolean, loading: boolean): React.ReactNode {
  if (loading) return <span className="h-4 w-10 bg-gray-100 animate-pulse rounded inline-block" />;
  if (!showPct) return <span>{value}</span>;
  return <span>{value} <span className="text-gray-400 text-xs">({pct(value, total)})</span></span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SalesVisibilityPanel() {
  const [metrics, setMetrics] = useState<MetricsState>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      // UTC-aligned boundaries
      const now = new Date();
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const weekStart  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7));
      const monthStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // rolling 30d

      // ── Query A: single outreach_log fetch (stats + campaigns) ──
      const { data: outreachData, error: outreachErr } = await supabase
        .from('outreach_log')
        .select('sent_at, opened_at, replied_at, template_used')
        .gte('sent_at', monthStart.toISOString());
      if (outreachErr) throw outreachErr;

      const rows = (outreachData ?? []) as OutreachRow[];

      // Compute period stats in JS
      const computePeriod = (cutoff: Date): Omit<PeriodStats, 'calls'> => {
        const cutoffStr = cutoff.toISOString();
        const slice = rows.filter(r => r.sent_at && r.sent_at >= cutoffStr);
        return {
          sent:    slice.length,
          opened:  slice.filter(r => r.opened_at).length,
          replied: slice.filter(r => r.replied_at).length,
        };
      };

      const todayStats = computePeriod(todayStart);
      const weekStats  = computePeriod(weekStart);
      const monthStats = computePeriod(monthStart);

      // Campaign breakdown
      const campaignMap = new Map<string, { sent: number; opened: number; replied: number }>();
      for (const r of rows) {
        const key = r.template_used ?? 'unknown';
        const existing = campaignMap.get(key) ?? { sent: 0, opened: 0, replied: 0 };
        existing.sent++;
        if (r.opened_at)  existing.opened++;
        if (r.replied_at) existing.replied++;
        campaignMap.set(key, existing);
      }
      const campaigns: CampaignRow[] = Array.from(campaignMap.entries())
        .sort((a, b) => b[1].sent - a[1].sent)
        .map(([key, stats]) => ({
          key,
          label:    getCampaignLabel(key),
          sent:     stats.sent,
          openPct:  stats.sent > 0 ? Math.round((stats.opened  / stats.sent) * 100) : 0,
          replyPct: stats.sent > 0 ? Math.round((stats.replied / stats.sent) * 100) : 0,
        }));

      // ── Query B: Iris last sent ──
      const { data: lastSentData } = await supabase
        .from('outreach_log')
        .select('sent_at')
        .order('sent_at', { ascending: false })
        .limit(1);
      const lastSentAt = lastSentData?.[0]?.sent_at ?? null;

      // ── Query C: Hot replies (last 48h) ──
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { count: hotReplies } = await supabase
        .from('outreach_log')
        .select('*', { count: 'exact', head: true })
        .not('replied_at', 'is', null)
        .gte('replied_at', fortyEightHoursAgo);

      // ── Query D: Calls from prospect_pipeline ──
      let callData: { call_booked_at: string | null }[] = [];
      try {
        const { data, error } = await supabase
          .from('prospect_pipeline')
          .select('call_booked_at')
          .not('call_booked_at', 'is', null)
          .gte('call_booked_at', monthStart.toISOString());
        if (error) throw error;
        callData = data ?? [];
      } catch {
        callData = []; // graceful: calls default to 0
      }

      const callsInPeriod = (cutoff: Date) =>
        callData.filter(c => c.call_booked_at && c.call_booked_at >= cutoff.toISOString()).length;

      setMetrics({
        today:  { ...todayStats, calls: callsInPeriod(todayStart) },
        week:   { ...weekStats,  calls: callsInPeriod(weekStart) },
        month:  { ...monthStats, calls: callsInPeriod(monthStart) },
        campaigns,
        lastSentAt,
        hotReplies: hotReplies ?? 0,
      });
      setIsStale(false);
    } catch (err) {
      console.error('[SalesVisibilityPanel] fetch error:', err);
      setIsStale(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Real-time subscription on outreach_log
  useEffect(() => {
    const channel = supabase
      .channel('sales-visibility-panel-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outreach_log' },
        () => { fetchMetrics(); }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') setIsStale(true);
      });
    return () => { supabase.removeChannel(channel); };
  }, [fetchMetrics]);

  // ── Derived display values ──
  const irisStatus = getIrisStatus(metrics.lastSentAt);
  const irisLabel = metrics.lastSentAt
    ? `Active ${formatDistanceToNow(new Date(metrics.lastSentAt), { addSuffix: true })}`
    : 'No recent emails';

  // ── Render ──
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-base font-semibold text-gray-800">
              Sales Activity
            </CardTitle>

            {/* Iris health indicator */}
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Circle className={`h-3 w-3 fill-current ${STATUS_COLORS[irisStatus]}`} />
              <span>Iris: {irisLabel}</span>
            </div>

            {isStale && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs gap-1">
                <AlertCircle className="h-3 w-3" /> Stale
              </Badge>
            )}
          </div>

          {/* Mobile collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors md:hidden"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>

      <CardContent className={collapsed ? 'hidden md:block' : ''}>
        {/* ── Stats grid ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left py-2 font-medium pr-4">Metric</th>
                <th className="text-right py-2 font-medium px-4">Today</th>
                <th className="text-right py-2 font-medium px-4">This Week</th>
                <th className="text-right py-2 font-medium px-4">30 Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td className="py-2 text-gray-500 pr-4">Sent</td>
                <td className="py-2 text-right px-4 font-medium">{statCell(metrics.today.sent, 0, false, loading)}</td>
                <td className="py-2 text-right px-4 font-medium">{statCell(metrics.week.sent, 0, false, loading)}</td>
                <td className="py-2 text-right px-4 font-medium">{statCell(metrics.month.sent, 0, false, loading)}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500 pr-4">Opens</td>
                <td className="py-2 text-right px-4">{statCell(metrics.today.opened, metrics.today.sent, true, loading)}</td>
                <td className="py-2 text-right px-4">{statCell(metrics.week.opened, metrics.week.sent, true, loading)}</td>
                <td className="py-2 text-right px-4">{statCell(metrics.month.opened, metrics.month.sent, true, loading)}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500 pr-4">Replies</td>
                <td className="py-2 text-right px-4">{statCell(metrics.today.replied, metrics.today.sent, true, loading)}</td>
                <td className="py-2 text-right px-4">{statCell(metrics.week.replied, metrics.week.sent, true, loading)}</td>
                <td className="py-2 text-right px-4">{statCell(metrics.month.replied, metrics.month.sent, true, loading)}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500 pr-4">Calls</td>
                <td className="py-2 text-right px-4">{statCell(metrics.today.calls, 0, false, loading)}</td>
                <td className="py-2 text-right px-4">{statCell(metrics.week.calls, 0, false, loading)}</td>
                <td className="py-2 text-right px-4">{statCell(metrics.month.calls, 0, false, loading)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Campaign breakdown ── */}
        {!loading && metrics.campaigns.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              By Campaign (last 30d)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[360px]">
                <thead>
                  <tr className="text-xs text-gray-400">
                    <th className="text-left py-1 font-medium pr-4">Campaign</th>
                    <th className="text-right py-1 font-medium px-3">Sent</th>
                    <th className="text-right py-1 font-medium px-3">Open %</th>
                    <th className="text-right py-1 font-medium px-3">Reply %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {metrics.campaigns.map(c => (
                    <tr key={c.key}>
                      <td className="py-1.5 text-gray-700 pr-4 truncate max-w-[160px]">{c.label}</td>
                      <td className="py-1.5 text-right px-3 text-gray-600">{c.sent}</td>
                      <td className="py-1.5 text-right px-3 text-gray-600">{c.openPct}%</td>
                      <td className="py-1.5 text-right px-3 text-gray-600">{c.replyPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Hot replies badge ── */}
        {!loading && metrics.hotReplies > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">
                {metrics.hotReplies} {metrics.hotReplies === 1 ? 'reply' : 'replies'} in last 48h
              </Badge>
              <span className="text-xs text-gray-400">— check Sales Queue in Contacts</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
