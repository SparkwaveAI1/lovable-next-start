import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader, PageContent } from '@/components/layout/PageLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Prospect {
  id: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  company: string | null;
  email: string | null;
  status: string | null;
  industry: string | null;
  last_contacted_at: string | null;
  campaign_tag: string | null;
}

const COLUMNS = [
  { id: 'new',       label: 'Leads',      color: 'border-t-gray-400',    badge: 'bg-gray-100 text-gray-700'    },
  { id: 'contacted', label: 'Contacted',  color: 'border-t-blue-400',    badge: 'bg-blue-100 text-blue-700'    },
  { id: 'replied',   label: 'Replied',    color: 'border-t-green-400',   badge: 'bg-green-100 text-green-700'  },
  { id: 'converted', label: 'Converted',  color: 'border-t-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
];

const QUERY_KEY = 'deal_pipeline_prospects';

// ─── Droppable column wrapper ────────────────────────────────────────────────
function DroppableColumn({
  colId,
  children,
  isOver,
}: {
  colId: string;
  children: React.ReactNode;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: colId });
  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 max-h-[600px] overflow-y-auto pr-1 rounded transition-colors ${
        isOver ? 'bg-indigo-50 ring-2 ring-indigo-300 ring-inset' : ''
      }`}
    >
      {children}
    </div>
  );
}

// ─── Draggable prospect card ─────────────────────────────────────────────────
function ProspectCard({
  prospect,
  onStageChange,
  isDragOverlay = false,
}: {
  prospect: Prospect;
  onStageChange: (id: string, newStatus: string) => void;
  isDragOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: prospect.id,
    data: { prospect },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow ${
        isDragging && !isDragOverlay ? 'opacity-40 ring-2 ring-indigo-300' : ''
      } ${isDragOverlay ? 'shadow-xl rotate-1 cursor-grabbing' : 'cursor-grab'}`}
    >
      {/* Drag handle area */}
      <div {...listeners} {...attributes} className="mb-1">
        <div className="font-medium text-gray-900 text-sm truncate">
          {[prospect.first_name, prospect.last_name].filter(Boolean).join(' ') || '—'}
        </div>
        {prospect.company && (
          <div className="text-xs text-gray-500 truncate mt-0.5">{prospect.company}</div>
        )}
        {prospect.title && (
          <div className="text-xs text-gray-400 truncate">{prospect.title}</div>
        )}
      </div>

      {/* Stage selector (click-to-move fallback) */}
      {!isDragOverlay && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <Select
            value={prospect.status ?? 'new'}
            onValueChange={(val) => onStageChange(prospect.id, val)}
          >
            <SelectTrigger className="h-6 text-xs px-2 py-0 border-gray-200 focus:ring-indigo-400">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLUMNS.map((col) => (
                <SelectItem key={col.id} value={col.id} className="text-xs">
                  {col.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {prospect.last_contacted_at && (
            <div className="text-xs text-gray-400 mt-1">
              {formatDistanceToNow(new Date(prospect.last_contacted_at), { addSuffix: true })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
const DealPipeline = () => {
  const [search, setSearch] = useState('');
  const [activeProspect, setActiveProspect] = useState<Prospect | null>(null);
  const [overColId, setOverColId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const { data: prospects = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_prospects')
        .select('id,first_name,last_name,title,company,email,status,industry,last_contacted_at,campaign_tag')
        .order('last_contacted_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Prospect[];
    },
  });

  // ── Stage mutation with optimistic update + rollback ──────────────────────
  const stageMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('sales_prospects')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      // Cancel any in-flight refetches
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY] });
      // Snapshot previous value for rollback
      const previous = queryClient.getQueryData<Prospect[]>([QUERY_KEY]);
      // Optimistically update
      queryClient.setQueryData<Prospect[]>([QUERY_KEY], (old) =>
        (old ?? []).map((p) => (p.id === id ? { ...p, status } : p)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Roll back to previous state
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEY], context.previous);
      }
      toast({
        title: 'Failed to move prospect',
        description: 'Could not update stage. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const moveProspect = (id: string, status: string) => {
    stageMutation.mutate({ id, status });
  };

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleDragStart = ({ active }: DragStartEvent) => {
    const p = (prospects as Prospect[]).find((x) => x.id === active.id);
    setActiveProspect(p ?? null);
  };

  const handleDragOver = ({ over }: { over: { id: string } | null }) => {
    setOverColId(over ? String(over.id) : null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveProspect(null);
    setOverColId(null);
    if (!over) return;
    const targetColId = String(over.id);
    const prospect = (prospects as Prospect[]).find((p) => p.id === active.id);
    if (!prospect) return;
    const currentStatus = prospect.status ?? 'new';
    if (currentStatus === targetColId) return;
    moveProspect(String(active.id), targetColId);
  };

  // ── Filtering + grouping ──────────────────────────────────────────────────
  const filtered = (prospects as Prospect[]).filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.company || '').toLowerCase().includes(q) ||
      (p.industry || '').toLowerCase().includes(q)
    );
  });

  const grouped = COLUMNS.reduce(
    (acc, col) => {
      acc[col.id] = filtered.filter((p) => (p.status || 'new') === col.id);
      return acc;
    },
    {} as Record<string, Prospect[]>,
  );

  const totalConverted = (grouped['converted'] || []).length;
  const totalContacted =
    (grouped['contacted'] || []).length +
    (grouped['replied'] || []).length +
    totalConverted;

  return (
    <DashboardLayout>
      <PageHeader
        title="Deal Pipeline"
        description={`${(prospects as Prospect[]).length.toLocaleString()} prospects — ${totalContacted} contacted, ${totalConverted} converted`}
      />
      <PageContent>
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {COLUMNS.map((col) => (
            <Card key={col.id}>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-gray-800">
                  {isLoading ? '…' : (grouped[col.id]?.length || 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">{col.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search name, company, industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mr-3" />
            <span className="text-gray-500">Loading pipeline...</span>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {COLUMNS.map((col) => (
                <div
                  key={col.id}
                  className={`bg-gray-50 rounded-xl border-t-4 ${col.color} p-3`}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="font-semibold text-gray-700 text-sm">{col.label}</span>
                    <Badge variant="outline" className={`text-xs ${col.badge}`}>
                      {grouped[col.id]?.length || 0}
                    </Badge>
                  </div>

                  <DroppableColumn colId={col.id} isOver={overColId === col.id}>
                    {(grouped[col.id] || []).slice(0, 50).map((p) => (
                      <ProspectCard
                        key={p.id}
                        prospect={p}
                        onStageChange={moveProspect}
                      />
                    ))}
                    {(grouped[col.id]?.length || 0) > 50 && (
                      <div className="text-center text-xs text-gray-400 py-2">
                        +{(grouped[col.id].length - 50).toLocaleString()} more — use search to filter
                      </div>
                    )}
                    {(grouped[col.id]?.length || 0) === 0 && (
                      <div className="text-center text-xs text-gray-400 py-6">
                        No prospects
                      </div>
                    )}
                  </DroppableColumn>
                </div>
              ))}
            </div>

            {/* Drag overlay — renders the card being dragged */}
            <DragOverlay dropAnimation={null}>
              {activeProspect ? (
                <ProspectCard
                  prospect={activeProspect}
                  onStageChange={() => {}}
                  isDragOverlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </PageContent>
    </DashboardLayout>
  );
};

export default DealPipeline;
