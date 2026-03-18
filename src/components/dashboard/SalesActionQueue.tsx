import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Zap, ExternalLink, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SalesTask {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  created_at: string;
  document_url: string | null;
  external_id: string | null;
}

type LoadState = 'loading' | 'loaded' | 'error';

// ─── Priority Badge ───────────────────────────────────────────────────────────

const PRIORITY_BADGE: Record<string, { label: string; className: string }> = {
  urgent: { label: 'URGENT', className: 'bg-red-100 text-red-700 border-red-300' },
  high:   { label: 'HIGH',   className: 'bg-amber-100 text-amber-700 border-amber-300' },
  medium: { label: 'MED',    className: 'bg-blue-100 text-blue-700 border-blue-300' },
  low:    { label: 'LOW',    className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

function PriorityBadge({ priority }: { priority: string | null }) {
  const p = priority ?? 'medium';
  const cfg = PRIORITY_BADGE[p] ?? PRIORITY_BADGE['medium'];
  return (
    <Badge variant="outline" className={`text-xs font-semibold shrink-0 ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task }: { task: SalesTask }) {
  const timeAgo = formatDistanceToNow(new Date(task.created_at), { addSuffix: true });

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 group">
      <PriorityBadge priority={task.priority} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 leading-snug truncate" title={task.title}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{task.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">{timeAgo}</p>
      </div>
      {task.document_url && (
        <a
          href={task.document_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          title="Open prospect"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SalesActionQueue() {
  const [tasks, setTasks] = useState<SalesTask[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [collapsed, setCollapsed] = useState(false);

  const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('mc_tasks')
        .select('id, title, description, priority, created_at, document_url, external_id')
        .contains('tags', ['sales_action'])
        .eq('status', 'todo')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Sort by priority in JS (urgent first)
      const sorted = (data ?? []).sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority ?? 'medium'] ?? 2;
        const pb = PRIORITY_ORDER[b.priority ?? 'medium'] ?? 2;
        return pa - pb;
      });

      setTasks(sorted);
      setLoadState('loaded');
    } catch (err) {
      console.error('[SalesActionQueue] fetch error:', err);
      setLoadState('error');
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Real-time subscription on mc_tasks
  useEffect(() => {
    const channel = supabase
      .channel('sales-action-queue-mc-tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mc_tasks' },
        () => {
          fetchTasks();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[SalesActionQueue] realtime subscription error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks]);

  const count = tasks.length;
  const hasUrgent = tasks.some(t => t.priority === 'urgent');
  const isLoading = loadState === 'loading';

  // Don't render anything while loading, to avoid layout flash
  if (isLoading) {
    return (
      <Card className="w-full border border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Sales Actions Required
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

  if (loadState === 'error') {
    return (
      <Card className="w-full border border-red-200 bg-red-50">
        <CardContent className="pt-4">
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Failed to load sales actions. Check Supabase connection.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`w-full border ${
        hasUrgent
          ? 'border-red-300 shadow-sm shadow-red-100'
          : count > 0
          ? 'border-amber-200'
          : 'border-gray-200'
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap
              className={`h-4 w-4 ${
                hasUrgent ? 'text-red-500' : count > 0 ? 'text-yellow-500' : 'text-gray-400'
              }`}
            />
            <CardTitle className="text-base font-semibold text-gray-800">
              Sales Actions Required
              {count > 0 && (
                <span
                  className={`ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                    hasUrgent ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
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
            No actions required — all clear.
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
