import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Target, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const ASSIGNEE_ID = '41a6f9f1-247c-4871-bd01-62a951a458da';

// ─── Types ────────────────────────────────────────────────────────────────────

interface McTask {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  created_at: string;
  status: string | null;
}

type LoadState = 'loading' | 'loaded' | 'error';

// ─── Priority helpers ─────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { high: 1, medium: 2, low: 3 };

function priorityRank(p: string | null): number {
  return PRIORITY_ORDER[p ?? ''] ?? 3;
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

const PRIORITY_BADGE: Record<string, { label: string; className: string }> = {
  high:   { label: 'HIGH', className: 'bg-red-100 text-red-700 border-red-300' },
  medium: { label: 'MED',  className: 'bg-amber-100 text-amber-700 border-amber-300' },
  low:    { label: 'LOW',  className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

function PriorityBadge({ priority }: { priority: string | null }) {
  const key = priority ?? 'low';
  const cfg = PRIORITY_BADGE[key] ?? PRIORITY_BADGE['low'];
  return (
    <Badge variant="outline" className={`text-xs font-semibold shrink-0 ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task }: { task: McTask }) {
  const timeAgo = formatDistanceToNow(new Date(task.created_at), { addSuffix: true });
  const truncated =
    task.description && task.description.length > 100
      ? task.description.slice(0, 100) + '…'
      : task.description;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <PriorityBadge priority={task.priority} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 leading-snug truncate" title={task.title}>
          {task.title}
        </p>
        {truncated && (
          <p className="text-xs text-gray-500 mt-0.5">{truncated}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">{timeAgo}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MissionControlTasksPanel() {
  const [tasks, setTasks] = useState<McTask[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [collapsed, setCollapsed] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('mc_tasks')
        .select('id, title, description, priority, created_at, status')
        .contains('assignee_ids', [ASSIGNEE_ID])
        .neq('status', 'done')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Sort: high → medium → low/other, then created_at DESC (already ordered above)
      const sorted = (data ?? []).slice().sort((a, b) => {
        const pa = priorityRank(a.priority);
        const pb = priorityRank(b.priority);
        if (pa !== pb) return pa - pb;
        // same priority → preserve created_at DESC from DB
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setTasks(sorted);
      setLoadState('loaded');
    } catch (err) {
      console.error('[MissionControlTasksPanel] fetch error:', err);
      setLoadState('error');
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Realtime subscription — refresh on any mc_tasks change
  useEffect(() => {
    const channel = supabase
      .channel('mission-control-tasks-panel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mc_tasks' },
        () => {
          fetchTasks();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[MissionControlTasksPanel] realtime subscription error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks]);

  const count = tasks.length;
  const hasHigh = tasks.some(t => t.priority === 'high');

  // Loading skeleton
  if (loadState === 'loading') {
    return (
      <Card className="w-full border border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-500" />
            Mission Control Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (loadState === 'error') {
    return (
      <Card className="w-full border border-red-200 bg-red-50">
        <CardContent className="pt-4">
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Failed to load Mission Control tasks. Check Supabase connection.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`w-full border ${
        hasHigh
          ? 'border-red-300 shadow-sm shadow-red-100'
          : count > 0
          ? 'border-indigo-200'
          : 'border-gray-200'
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target
              className={`h-4 w-4 ${
                hasHigh ? 'text-red-500' : count > 0 ? 'text-indigo-500' : 'text-gray-400'
              }`}
            />
            <CardTitle className="text-base font-semibold text-gray-800">
              Mission Control Tasks
              {count > 0 && (
                <span
                  className={`ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                    hasHigh ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {count}
                </span>
              )}
            </CardTitle>
          </div>
          {/* Collapse toggle — visible on mobile */}
          {count > 0 && (
            <button
              onClick={() => setCollapsed(c => !c)}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors md:hidden"
              aria-label={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className={collapsed ? 'hidden md:block' : ''}>
        {count === 0 ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-1">
            <CheckCircle className="h-4 w-4 text-green-400" />
            No pending actions.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map(task => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
