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
import { Search, Loader2, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useBusinessContext } from '@/contexts/BusinessContext';

interface Deal {
  id: string;
  title: string;
  stage: string | null;
  value: number | null;
  probability: number | null;
  expected_close_date: string | null;
  notes: string | null;
  account_id: string;
  created_at: string | null;
  updated_at: string | null;
}

interface NewDealForm {
  title: string;
  stage: string;
  value: string;
  probability: string;
  expected_close_date: string;
  notes: string;
}

const BLANK_DEAL: NewDealForm = {
  title: '',
  stage: 'lead',
  value: '',
  probability: '',
  expected_close_date: '',
  notes: '',
};

const COLUMNS = [
  { id: 'lead',         label: 'Lead',        color: 'border-t-gray-400',    badge: 'bg-gray-100 text-gray-700'       },
  { id: 'qualified',    label: 'Qualified',   color: 'border-t-blue-400',    badge: 'bg-blue-100 text-blue-700'       },
  { id: 'proposal',     label: 'Proposal',    color: 'border-t-yellow-400',  badge: 'bg-yellow-100 text-yellow-700'   },
  { id: 'negotiation',  label: 'Negotiation', color: 'border-t-orange-400',  badge: 'bg-orange-100 text-orange-700'   },
  { id: 'closed_won',   label: 'Closed Won',  color: 'border-t-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  { id: 'closed_lost',  label: 'Closed Lost', color: 'border-t-red-400',     badge: 'bg-red-100 text-red-700'         },
];

const QUERY_KEY = 'deal_pipeline_crm_deals';

function formatCurrency(value: number | null) {
  if (value == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

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

// ─── Draggable deal card ─────────────────────────────────────────────────────
function DealCard({
  deal,
  onStageChange,
  isDragOverlay = false,
}: {
  deal: Deal;
  onStageChange: (id: string, newStage: string) => void;
  isDragOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
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
          {deal.title || '—'}
        </div>
        {deal.value != null && (
          <div className="text-xs text-emerald-600 font-semibold mt-0.5">{formatCurrency(deal.value)}</div>
        )}
        {deal.expected_close_date && (
          <div className="text-xs text-gray-400 truncate mt-0.5">
            Close: {format(parseISO(deal.expected_close_date), 'MMM d, yyyy')}
          </div>
        )}
        {deal.probability != null && (
          <div className="text-xs text-blue-500 mt-0.5">{deal.probability}% probability</div>
        )}
      </div>

      {/* Stage selector (click-to-move fallback) */}
      {!isDragOverlay && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <Select
            value={deal.stage ?? 'lead'}
            onValueChange={(val) => onStageChange(deal.id, val)}
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

          {deal.updated_at && (
            <div className="text-xs text-gray-400 mt-1">
              {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })}
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
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [overColId, setOverColId] = useState<string | null>(null);
  const [newDealOpen, setNewDealOpen] = useState(false);
  const [newDealForm, setNewDealForm] = useState<NewDealForm>(BLANK_DEAL);
  const [saving, setSaving] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedBusiness } = useBusinessContext();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const { data: deals = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('crm_deals')
        .select('id,title,stage,value,probability,expected_close_date,notes,account_id,created_at,updated_at')
        .order('updated_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Deal[];
    },
  });

  // ── Stage mutation with optimistic update + rollback ──────────────────────
  const stageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await (supabase as any)
        .from('crm_deals')
        .update({ stage })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY] });
      const previous = queryClient.getQueryData<Deal[]>([QUERY_KEY]);
      queryClient.setQueryData<Deal[]>([QUERY_KEY], (old) =>
        (old ?? []).map((d) => (d.id === id ? { ...d, stage } : d)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEY], context.previous);
      }
      toast({
        title: 'Failed to move deal',
        description: 'Could not update stage. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const moveDeal = (id: string, stage: string) => {
    stageMutation.mutate({ id, stage });
  };

  // ── Create deal ───────────────────────────────────────────────────────────
  const handleCreateDeal = async () => {
    if (!newDealForm.title.trim()) {
      toast({ title: 'Deal title is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any).from('crm_deals').insert({
        title: newDealForm.title.trim(),
        stage: newDealForm.stage || 'lead',
        value: newDealForm.value ? parseFloat(newDealForm.value) : null,
        probability: newDealForm.probability ? parseInt(newDealForm.probability) : null,
        expected_close_date: newDealForm.expected_close_date || null,
        notes: newDealForm.notes.trim() || null,
        account_id: selectedBusiness?.id ?? '',
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({ title: 'Deal created' });
      setNewDealOpen(false);
      setNewDealForm(BLANK_DEAL);
    } catch (err) {
      toast({ title: 'Failed to create deal', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleDragStart = ({ active }: DragStartEvent) => {
    const d = (deals as Deal[]).find((x) => x.id === active.id);
    setActiveDeal(d ?? null);
  };

  const handleDragOver = ({ over }: { over: { id: string } | null }) => {
    setOverColId(over ? String(over.id) : null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDeal(null);
    setOverColId(null);
    if (!over) return;
    const targetColId = String(over.id);
    const deal = (deals as Deal[]).find((d) => d.id === active.id);
    if (!deal) return;
    const currentStage = deal.stage ?? 'lead';
    if (currentStage === targetColId) return;
    moveDeal(String(active.id), targetColId);
  };

  // ── Filtering + grouping ──────────────────────────────────────────────────
  const filtered = (deals as Deal[]).filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (d.title || '').toLowerCase().includes(q) ||
      (d.notes || '').toLowerCase().includes(q)
    );
  });

  const grouped = COLUMNS.reduce(
    (acc, col) => {
      acc[col.id] = filtered.filter((d) => (d.stage || 'lead') === col.id);
      return acc;
    },
    {} as Record<string, Deal[]>,
  );

  const totalWon = (grouped['closed_won'] || []).length;
  const totalValue = filtered
    .filter(d => d.stage === 'closed_won')
    .reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <DashboardLayout>
      <PageHeader
        title="Deal Pipeline"
        description={`${(deals as Deal[]).length.toLocaleString()} deals — ${totalWon} closed won${totalValue > 0 ? ` · ${formatCurrency(totalValue)} won` : ''}`}
        actions={<Button onClick={() => setNewDealOpen(true)} size="sm" className="gap-1"><Plus className="h-4 w-4" /> New Deal</Button>}
      />
      <PageContent>
        {/* New Deal Dialog */}
        <Dialog open={newDealOpen} onOpenChange={setNewDealOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Deal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="deal-title">Title *</Label>
                <Input id="deal-title" placeholder="Deal name" value={newDealForm.title}
                  onChange={e => setNewDealForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="deal-stage">Stage</Label>
                <Select value={newDealForm.stage} onValueChange={v => setNewDealForm(f => ({ ...f, stage: v }))}>
                  <SelectTrigger id="deal-stage"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map(col => <SelectItem key={col.id} value={col.id}>{col.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="deal-value">Value ($)</Label>
                  <Input id="deal-value" type="number" placeholder="0" value={newDealForm.value}
                    onChange={e => setNewDealForm(f => ({ ...f, value: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="deal-prob">Probability (%)</Label>
                  <Input id="deal-prob" type="number" placeholder="0-100" value={newDealForm.probability}
                    onChange={e => setNewDealForm(f => ({ ...f, probability: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label htmlFor="deal-close">Expected Close Date</Label>
                <Input id="deal-close" type="date" value={newDealForm.expected_close_date}
                  onChange={e => setNewDealForm(f => ({ ...f, expected_close_date: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="deal-notes">Notes</Label>
                <Input id="deal-notes" placeholder="Optional notes" value={newDealForm.notes}
                  onChange={e => setNewDealForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewDealOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleCreateDeal} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Deal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
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
            placeholder="Search deal title, notes..."
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 items-start">
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
                    {(grouped[col.id] || []).slice(0, 50).map((d) => (
                      <DealCard
                        key={d.id}
                        deal={d}
                        onStageChange={moveDeal}
                      />
                    ))}
                    {(grouped[col.id]?.length || 0) > 50 && (
                      <div className="text-center text-xs text-gray-400 py-2">
                        +{(grouped[col.id].length - 50).toLocaleString()} more — use search to filter
                      </div>
                    )}
                    {(grouped[col.id]?.length || 0) === 0 && (
                      <div className="text-center text-xs text-gray-400 py-6">
                        No deals
                      </div>
                    )}
                  </DroppableColumn>
                </div>
              ))}
            </div>

            {/* Drag overlay — renders the card being dragged */}
            <DragOverlay dropAnimation={null}>
              {activeDeal ? (
                <DealCard
                  deal={activeDeal}
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
