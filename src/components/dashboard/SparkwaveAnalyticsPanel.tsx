import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, BarChart3, CheckCircle2, Clock, Users, Mail } from 'lucide-react';
import { startOfWeek, format, subWeeks } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

type LoadState = 'loading' | 'loaded' | 'error';

interface Stats {
  totalDone: number;
  inProgress: number;
  activeProspects: number;
  emailsSent: number;
}

interface WeekBucket {
  label: string;      // e.g. "Mar 10"
  weekStart: Date;
  count: number;
}

interface TaskRow {
  updated_at: string | null;
}

// ─── Helper: build 6-week buckets ────────────────────────────────────────────

function buildWeekBuckets(tasks: TaskRow[]): WeekBucket[] {
  const now = new Date();
  // Build 6 buckets: current week + 5 prior (oldest first)
  const buckets: WeekBucket[] = Array.from({ length: 6 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(now, 5 - i), { weekStartsOn: 1 });
    return {
      label: format(weekStart, 'MMM d'),
      weekStart,
      count: 0,
    };
  });

  for (const task of tasks) {
    if (!task.updated_at) continue;
    const d = new Date(task.updated_at);
    // Find the correct bucket
    for (let i = 0; i < buckets.length; i++) {
      const bucketEnd = i < buckets.length - 1 ? buckets[i + 1].weekStart : new Date(8640000000000000);
      if (d >= buckets[i].weekStart && d < bucketEnd) {
        buckets[i].count++;
        break;
      }
    }
  }
  return buckets;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | null;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
      <div className={`p-2 rounded-md ${color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-xl font-semibold text-gray-800 leading-tight">
          {value === null ? '—' : value.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
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
      <p className="font-medium text-gray-700">Week of {label}</p>
      <p className="text-gray-500">{payload[0].value} tasks closed</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SparkwaveAnalyticsPanel() {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [stats, setStats] = useState<Stats>({
    totalDone: 0,
    inProgress: 0,
    activeProspects: 0,
    emailsSent: 0,
  });
  const [weeklyBuckets, setWeeklyBuckets] = useState<WeekBucket[]>([]);

  const fetchData = useCallback(async () => {
    try {
      // Compute cutoff date for weekly chart (49 days back to ensure 6 full weeks)
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 49);
      const cutoffISO = cutoff.toISOString();

      const [doneRes, inProgressRes, prospectsRes, emailRes, weeklyRes] = await Promise.all([
        // Total tasks done
        supabase
          .from('mc_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'done'),

        // Tasks in progress
        supabase
          .from('mc_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'in_progress'),

        // Active prospects (not closed_lost)
        supabase
          .from('prospects')
          .select('id', { count: 'exact', head: true })
          .neq('pipeline_stage', 'closed_lost'),

        // Emails sent
        supabase
          .from('outreach_log')
          .select('id', { count: 'exact', head: true })
          .not('sent_at', 'is', null),

        // Tasks closed per week (last ~7 weeks of data)
        supabase
          .from('mc_tasks')
          .select('updated_at')
          .eq('status', 'done')
          .gte('updated_at', cutoffISO),
      ]);

      // Check for errors
      const errors = [doneRes, inProgressRes, prospectsRes, emailRes, weeklyRes]
        .filter(r => r.error)
        .map(r => r.error!.message);
      if (errors.length > 0) throw new Error(errors[0]);

      setStats({
        totalDone: doneRes.count ?? 0,
        inProgress: inProgressRes.count ?? 0,
        activeProspects: prospectsRes.count ?? 0,
        emailsSent: emailRes.count ?? 0,
      });

      const tasks = (weeklyRes.data ?? []) as TaskRow[];
      setWeeklyBuckets(buildWeekBuckets(tasks));
      setLoadState('loaded');
    } catch (err) {
      console.error('[SparkwaveAnalyticsPanel] fetch error:', err);
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Loading state ──
  if (loadState === 'loading') {
    return (
      <Card className="w-full border border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            Business Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
          <div className="h-32 bg-gray-100 animate-pulse rounded" />
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
            Failed to load analytics data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border border-indigo-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-indigo-500" />
          Business Analytics
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <StatCard
            label="Tasks Done"
            value={stats.totalDone}
            icon={CheckCircle2}
            color="bg-emerald-500"
          />
          <StatCard
            label="In Progress"
            value={stats.inProgress}
            icon={Clock}
            color="bg-amber-500"
          />
          <StatCard
            label="Active Prospects"
            value={stats.activeProspects}
            icon={Users}
            color="bg-indigo-500"
          />
          <StatCard
            label="Emails Sent"
            value={stats.emailsSent}
            icon={Mail}
            color="bg-blue-500"
          />
        </div>

        {/* ── Weekly completion bar chart ── */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Tasks Closed / Week
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={weeklyBuckets}
              margin={{ top: 0, right: 8, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-1">
            Based on task last-updated date when marked done.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
