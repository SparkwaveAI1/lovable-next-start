import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Mail, Eye, MessageSquare, Phone, Flame, BarChart2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PeriodStats {
  sent: number;
  opens: number;
  replies: number;
  calls: number;
}

interface CampaignRow {
  template: string;
  sent: number;
  opens: number;
  replies: number;
}

interface OutreachStats {
  today: PeriodStats;
  week: PeriodStats;
  month: PeriodStats;
  hotLeads: number;
  campaigns: CampaignRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(num: number, denom: number): string {
  if (!denom) return '0%';
  return `${Math.round((num / denom) * 100)}%`;
}

function startOf(period: 'today' | 'week' | 'month'): string {
  const d = new Date();
  if (period === 'today') {
    d.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

// ─── Stat Column ──────────────────────────────────────────────────────────────

function StatCol({ label, stats }: { label: string; stats: PeriodStats }) {
  return (
    <div className="flex-1 min-w-0 px-4 first:pl-0 last:pr-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{label}</p>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-600">Sent</span>
          <span className="ml-auto font-semibold text-gray-900">{stats.sent}</span>
        </div>
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-600">Opens</span>
          <span className="ml-auto font-semibold text-gray-900">
            {stats.opens}
            {stats.sent > 0 && (
              <span className="text-xs text-gray-400 ml-1">({pct(stats.opens, stats.sent)})</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-600">Replies</span>
          <span className="ml-auto font-semibold text-gray-900">
            {stats.replies}
            {stats.sent > 0 && (
              <span className="text-xs text-gray-400 ml-1">({pct(stats.replies, stats.sent)})</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-600">Calls</span>
          <span className="ml-auto font-semibold text-gray-900">{stats.calls}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SalesVisibilityPanel() {
  const [stats, setStats] = useState<OutreachStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      // Fetch outreach_log rows for the past month
      const monthStart = startOf('month');
      const { data: rows, error: rowsErr } = await supabase
        .from('outreach_log')
        .select('sent_at, opened_at, replied_at, template_used')
        .gte('sent_at', monthStart);

      if (rowsErr) throw rowsErr;
      const outreach = rows ?? [];

      // Fetch calls from prospect_pipeline
      const { data: pipelineRows } = await supabase
        .from('prospect_pipeline')
        .select('call_booked_at')
        .gte('call_booked_at', monthStart);
      const pipeline = pipelineRows ?? [];

      // Compute periods
      const todayStart = startOf('today');
      const weekStart = startOf('week');
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      function computePeriod(start: string): PeriodStats {
        const rows = outreach.filter(r => r.sent_at && r.sent_at >= start);
        const sent = rows.length;
        const opens = rows.filter(r => r.opened_at).length;
        const replies = rows.filter(r => r.replied_at).length;
        const calls = pipeline.filter(r => r.call_booked_at && r.call_booked_at >= start).length;
        return { sent, opens, replies, calls };
      }

      // Hot leads: replied in last 7 days (simple count — follow-up join is best-effort)
      const hotLeads = outreach.filter(r => r.replied_at && r.replied_at >= sevenDaysAgo).length;

      // Campaign breakdown
      const byCampaign: Record<string, { sent: number; opens: number; replies: number }> = {};
      for (const r of outreach) {
        const key = r.template_used || '(no template)';
        if (!byCampaign[key]) byCampaign[key] = { sent: 0, opens: 0, replies: 0 };
        byCampaign[key].sent++;
        if (r.opened_at) byCampaign[key].opens++;
        if (r.replied_at) byCampaign[key].replies++;
      }
      const campaigns: CampaignRow[] = Object.entries(byCampaign)
        .map(([template, v]) => ({ template, ...v }))
        .sort((a, b) => b.sent - a.sent)
        .slice(0, 5);

      setStats({
        today: computePeriod(todayStart),
        week: computePeriod(weekStart),
        month: computePeriod(monthStart),
        hotLeads,
        campaigns,
      });
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load outreach stats');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Real-time subscription on outreach_log
  useEffect(() => {
    const channel = supabase
      .channel('sales-visibility-outreach')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outreach_log' }, () => {
        loadStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadStats]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            Sales Visibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse bg-gray-100 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            Sales Visibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            Sales Visibility
          </CardTitle>
          {stats && stats.hotLeads > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Flame className="h-3 w-3" />
              {stats.hotLeads} hot {stats.hotLeads === 1 ? 'reply' : 'replies'}
            </Badge>
          )}
        </div>
      </CardHeader>

      {stats && (
        <CardContent>
          {/* Period Stats */}
          <div className="flex divide-x divide-gray-100 mb-6">
            <StatCol label="Today" stats={stats.today} />
            <StatCol label="This Week" stats={stats.week} />
            <StatCol label="This Month" stats={stats.month} />
          </div>

          {/* Campaign Breakdown */}
          {stats.campaigns.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <BarChart2 className="h-3.5 w-3.5 text-gray-400" />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Campaign Breakdown</p>
              </div>
              <div className="rounded-md border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">Campaign</th>
                      <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">Sent</th>
                      <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">Opens</th>
                      <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">Replies</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats.campaigns.map((c) => (
                      <tr key={c.template} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2 text-gray-700 truncate max-w-[160px]">{c.template}</td>
                        <td className="px-3 py-2 text-right text-gray-900 font-medium">{c.sent}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{c.opens} <span className="text-gray-400 text-xs">({pct(c.opens, c.sent)})</span></td>
                        <td className="px-3 py-2 text-right text-gray-600">{c.replies} <span className="text-gray-400 text-xs">({pct(c.replies, c.sent)})</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {stats.campaigns.length === 0 && stats.month.sent === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No outreach data yet. Stats will appear after emails are sent.</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
