import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Pin, ChevronDown, ChevronUp, CheckCircle, Loader2, Activity } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentOutput {
  id: string;
  created_at: string;
  agent_name: string;
  output_type: string;
  title: string;
  summary: string | null;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_recurring: boolean;
  is_actioned: boolean;
  actioned_at: string | null;
  metadata: Record<string, unknown> | null;
  external_id: string | null;
}

type LoadState = 'loading' | 'loaded' | 'error';

// ─── Output type badge ────────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  'infrastructure-alert': { label: 'INFRA', className: 'bg-red-100 text-red-700 border-red-300' },
  'outreach-batch':       { label: 'OUTREACH', className: 'bg-blue-100 text-blue-700 border-blue-300' },
  'content-draft':        { label: 'CONTENT', className: 'bg-purple-100 text-purple-700 border-purple-300' },
  'linkedin-activity':    { label: 'LINKEDIN', className: 'bg-sky-100 text-sky-700 border-sky-300' },
  'standup-report':       { label: 'STANDUP', className: 'bg-green-100 text-green-700 border-green-300' },
};

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_BADGE[type] ?? { label: type.toUpperCase(), className: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ─── Single output row ────────────────────────────────────────────────────────

interface OutputRowProps {
  output: AgentOutput;
  onActioned: (id: string) => void;
}

function OutputRow({ output, onActioned }: OutputRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [actioning, setActioning] = useState(false);
  const { toast } = useToast();

  const handleAction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setActioning(true);
    const { error } = await supabase
      .from('agent_outputs')
      .update({ is_actioned: true })
      .eq('id', output.id);
    setActioning(false);
    if (error) {
      console.error('[AgentOutputsFeedPanel] mark actioned error:', error);
      toast({ title: 'Failed to mark actioned', description: error.message, variant: 'destructive' });
    } else {
      onActioned(output.id);
    }
  };

  const borderClass = output.is_actioned
    ? 'border-gray-200 opacity-60'
    : output.is_recurring
      ? 'border-amber-300 bg-amber-50/40'
      : 'border-gray-200 hover:border-gray-300';

  return (
    <div
      className={`rounded-lg border p-3 cursor-pointer transition-colors ${borderClass}`}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-start gap-2">
        {/* Recurring pin */}
        {output.is_recurring && (
          <Pin className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <TypeBadge type={output.output_type} />
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
              {output.agent_name}
            </span>
            <span className="text-[10px] text-gray-400 ml-auto">
              {formatDistanceToNow(new Date(output.created_at), { addSuffix: true })}
            </span>
          </div>

          <p className="text-sm font-medium text-gray-900 truncate">{output.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{output.summary}</p>

          {/* Expanded body */}
          {expanded && output.body && (
            <div className="mt-2 p-2 rounded bg-gray-50 border border-gray-200">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words font-sans">
                {output.body}
              </pre>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!output.is_actioned && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-green-700 hover:bg-green-50"
              onClick={handleAction}
              disabled={actioning}
            >
              {actioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
            </Button>
          )}
          {expanded
            ? <ChevronUp className="h-3 w-3 text-gray-400" />
            : <ChevronDown className="h-3 w-3 text-gray-400" />
          }
        </div>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function AgentOutputsFeedPanel() {
  const [outputs, setOutputs] = useState<AgentOutput[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [agentFilter, setAgentFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const fetchOutputs = useCallback(async () => {
    setLoadState('loading');
    const { data, error } = await supabase
      .from('agent_outputs')
      .select('*')
      .gt('created_at', sevenDaysAgo)
      .order('is_recurring', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[AgentOutputsFeedPanel] fetch error:', error);
      setLoadState('error');
      return;
    }
    setOutputs((data as AgentOutput[]) ?? []);
    setLoadState('loaded');
  }, []);

  useEffect(() => {
    fetchOutputs();
  }, [fetchOutputs]);

  const handleActioned = useCallback((id: string) => {
    setOutputs(prev => prev.map(o => o.id === id ? { ...o, is_actioned: true } : o));
  }, []);

  // Derive filter options from loaded data
  const agentOptions = [...new Set(outputs.map(o => o.agent_name))].sort();
  const typeOptions  = [...new Set(outputs.map(o => o.output_type))].sort();

  // Apply filters
  const filtered = outputs.filter(o => {
    if (agentFilter && o.agent_name !== agentFilter) return false;
    if (typeFilter && o.output_type !== typeFilter) return false;
    return true;
  });

  // Pinned recurring at top, rest below
  const pinned  = filtered.filter(o => o.is_recurring && !o.is_actioned);
  const regular = filtered.filter(o => !o.is_recurring || o.is_actioned);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            Agent Outputs
          </CardTitle>
          <span className="text-xs text-gray-400">
            {loadState === 'loaded'
              ? `Last 7 days · ${filtered.length} result${filtered.length !== 1 ? 's' : ''}`
              : loadState === 'loading' ? 'Loading…' : 'Error loading'}
          </span>
        </div>

        {/* Filters */}
        {loadState === 'loaded' && outputs.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            <select
              className="text-xs border rounded px-2 py-1 bg-white text-gray-700"
              value={agentFilter}
              onChange={e => setAgentFilter(e.target.value)}
            >
              <option value="">All agents</option>
              {agentOptions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select
              className="text-xs border rounded px-2 py-1 bg-white text-gray-700"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="">All types</option>
              {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {(agentFilter || typeFilter) && (
              <button
                className="text-xs text-blue-600 hover:underline"
                onClick={() => { setAgentFilter(''); setTypeFilter(''); }}
              >
                Clear
              </button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {loadState === 'loading' && (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Loading outputs…</span>
          </div>
        )}

        {loadState === 'error' && (
          <p className="text-sm text-red-500 py-4 text-center">Failed to load agent outputs.</p>
        )}

        {loadState === 'loaded' && filtered.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">No outputs in the last 7 days.</p>
        )}

        {loadState === 'loaded' && filtered.length > 0 && (
          <div className="space-y-2">
            {pinned.length > 0 && (
              <>
                <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide px-1">
                  Pinned — Recurring
                </p>
                {pinned.map(o => (
                  <OutputRow key={o.id} output={o} onActioned={handleActioned} />
                ))}
                {regular.length > 0 && (
                  <div className="border-t border-gray-100 my-2" />
                )}
              </>
            )}
            {regular.map(o => (
              <OutputRow key={o.id} output={o} onActioned={handleActioned} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
