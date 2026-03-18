import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertCircle, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prospect {
  id: number;
  name: string | null;
  company: string | null;
  status: string | null;
  pipeline_stage: string | null;
  updated_at: string | null;
}

type LoadState = 'loading' | 'loaded' | 'error';

// ─── Pipeline stage config ────────────────────────────────────────────────────

const STAGE_CONFIG: Record<string, { label: string; color: string; badgeClass: string }> = {
  contacted:   { label: 'Contacted',   color: '#3b82f6', badgeClass: 'bg-blue-100 text-blue-700 border-blue-200' },
  replied:     { label: 'Replied',     color: '#f59e0b', badgeClass: 'bg-amber-100 text-amber-700 border-amber-200' },
  interested:  { label: 'Interested',  color: '#22c55e', badgeClass: 'bg-green-100 text-green-700 border-green-200' },
  call_booked: { label: 'Call Booked', color: '#a855f7', badgeClass: 'bg-purple-100 text-purple-700 border-purple-200' },
  closed_won:  { label: 'Won',         color: '#10b981', badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  closed_lost: { label: 'Lost',        color: '#ef4444', badgeClass: 'bg-red-100 text-red-700 border-red-200' },
};

const STAGE_ORDER = ['contacted', 'replied', 'interested', 'call_booked', 'closed_won', 'closed_lost'];

function StageBadge({ stage }: { stage: string | null }) {
  const key = stage ?? '';
  const cfg = STAGE_CONFIG[key];
  if (!cfg) {
    return (
      <Badge variant="outline" className="text-xs bg-gray-100 text-gray-500 border-gray-200">
        {stage ?? 'Unknown'}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={`text-xs ${cfg.badgeClass}`}>
      {cfg.label}
    </Badge>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded shadow-sm px-3 py-2 text-sm">
      <p className="font-medium text-gray-700">{label}</p>
      <p className="text-gray-500">{payload[0].value} prospects</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function IrisPipelinePanel() {
  const navigate = useNavigate();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  const fetchProspects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('id, name, company, status, pipeline_stage, updated_at')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProspects(data ?? []);
      setLoadState('loaded');
    } catch (err) {
      console.error('[IrisPipelinePanel] fetch error:', err);
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('iris-pipeline-panel-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prospects' },
        () => { fetchProspects(); }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[IrisPipelinePanel] realtime subscription error');
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [fetchProspects]);

  // ── Compute chart data ──
  const stageCounts = new Map<string, number>();
  for (const p of prospects) {
    const stage = p.pipeline_stage ?? 'unknown';
    stageCounts.set(stage, (stageCounts.get(stage) ?? 0) + 1);
  }

  const chartData = STAGE_ORDER.map((stage) => ({
    stage,
    label: STAGE_CONFIG[stage]?.label ?? stage,
    count: stageCounts.get(stage) ?? 0,
    color: STAGE_CONFIG[stage]?.color ?? '#94a3b8',
  })).filter(d => d.count > 0);

  const recentProspects = prospects.slice(0, 5);
  const total = prospects.length;

  // ── Loading state ──
  if (loadState === 'loading') {
    return (
      <Card className="w-full border border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            Iris Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Error state ──
  if (loadState === 'error') {
    return (
      <Card className="w-full border border-red-200 bg-red-50">
        <CardContent className="pt-4">
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Failed to load pipeline data.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Empty state ──
  if (total === 0) {
    return (
      <Card className="w-full border border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            Iris Pipeline
            <span className="ml-1 text-xs text-gray-400 font-normal">0 prospects</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">No prospects in pipeline yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border border-indigo-100">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            Iris Pipeline
            <span className="ml-1 text-xs text-gray-400 font-normal">{total} prospects</span>
          </CardTitle>
          <button
            onClick={() => navigate('/contacts?tab=sales-queue')}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            View all <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {/* ── Bar chart ── */}
        {chartData.length > 0 && (
          <div className="mb-5">
            <ResponsiveContainer width="100%" height={chartData.length * 36 + 8}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={90}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: '#6b7280' }}>
                  {chartData.map((entry) => (
                    <Cell key={entry.stage} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Recent prospects list ── */}
        {recentProspects.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              Recently Updated
            </p>
            <div className="space-y-2">
              {recentProspects.map((p) => {
                const name = p.name ?? 'Unknown';
                const company = p.company ?? '';
                const timeAgo = p.updated_at
                  ? formatDistanceToNow(new Date(p.updated_at), { addSuffix: true })
                  : 'unknown';

                return (
                  <div key={p.id} className="flex items-center gap-3 py-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {name}
                        {company && (
                          <span className="text-gray-400 font-normal ml-1 text-xs">· {company}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">{timeAgo}</p>
                    </div>
                    <StageBadge stage={p.pipeline_stage} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
