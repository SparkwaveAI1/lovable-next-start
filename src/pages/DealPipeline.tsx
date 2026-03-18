import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Briefcase,
  Plus,
  Loader2,
  DollarSign,
  Building2,
  X,
  Calendar,
  ChevronRight,
  Kanban,
  Clock,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const BUSINESS_ID = '5a9bbfcf-fae5-4063-9780-bcbe366bae88';

// Stage configuration — order and colors
const STAGE_CONFIG: Record<string, { label: string; color: string; headerBg: string }> = {
  prospect:    { label: 'Prospect',    color: 'bg-gray-100 text-gray-700 border-gray-200',     headerBg: 'bg-gray-50 border-gray-200' },
  qualified:   { label: 'Qualified',   color: 'bg-blue-100 text-blue-700 border-blue-200',     headerBg: 'bg-blue-50 border-blue-200' },
  proposal:    { label: 'Proposal',    color: 'bg-yellow-100 text-yellow-700 border-yellow-200', headerBg: 'bg-yellow-50 border-yellow-200' },
  negotiation: { label: 'Negotiation', color: 'bg-orange-100 text-orange-700 border-orange-200', headerBg: 'bg-orange-50 border-orange-200' },
  won:         { label: 'Won',         color: 'bg-emerald-100 text-emerald-700 border-emerald-200', headerBg: 'bg-emerald-50 border-emerald-200' },
  lost:        { label: 'Lost',        color: 'bg-red-100 text-red-700 border-red-200',         headerBg: 'bg-red-50 border-red-200' },
};

const STAGE_ORDER = ['prospect', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

interface CrmDeal {
  id: string;
  business_id: string;
  account_id: string;
  title: string;
  stage: string;
  value: number | null;
  probability: number | null;
  expected_close_date: string | null;
  notes: string | null;
  lost_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
  next_action: string | null;
  next_action_date: string | null;
  // joined
  account_name?: string;
}

interface CrmAccount {
  id: string;
  name: string;
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function StageBadge({ stage }: { stage: string }) {
  const config = STAGE_CONFIG[stage?.toLowerCase()] ?? { label: stage, color: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium whitespace-nowrap ${config.color}`}>
      {config.label}
    </span>
  );
}

// Draggable deal card
function DealCard({ deal, onCardClick, isDragging = false }: { deal: CrmDeal; onCardClick: (d: CrmDeal) => void; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: deal.id });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Only fire click if not a drag gesture
        if (!isDragging) onCardClick(deal);
      }}
      className={`bg-white rounded-lg border shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow select-none ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm leading-tight line-clamp-2 flex-1">{deal.title}</p>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
      </div>
      <div className="mt-2 space-y-1">
        {deal.account_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{deal.account_name}</span>
          </div>
        )}
        {deal.value != null && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <DollarSign className="h-3 w-3 flex-shrink-0" />
            <span>{formatCurrency(deal.value)}</span>
          </div>
        )}
        {deal.expected_close_date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span>{deal.expected_close_date}</span>
          </div>
        )}
        {deal.next_action && (
          <div
            className="flex items-center gap-1.5 text-xs mt-1"
            title={deal.next_action.length > 80 ? deal.next_action.slice(0, 80) + '...' : deal.next_action}
          >
            <Clock className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <span className={`truncate ${
              deal.next_action_date && new Date(deal.next_action_date) < new Date()
                ? 'text-amber-600 font-medium'
                : 'text-muted-foreground'
            }`}>
              {deal.next_action.length > 60 ? deal.next_action.slice(0, 60) + '...' : deal.next_action}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Static card for drag overlay (no drag handles)
function DealCardStatic({ deal }: { deal: CrmDeal }) {
  return (
    <div className="bg-white rounded-lg border shadow-lg p-3 w-64 opacity-95 rotate-1">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm leading-tight line-clamp-2 flex-1">{deal.title}</p>
      </div>
      <div className="mt-2 space-y-1">
        {deal.account_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{deal.account_name}</span>
          </div>
        )}
        {deal.value != null && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <DollarSign className="h-3 w-3 flex-shrink-0" />
            <span>{formatCurrency(deal.value)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Droppable column
function KanbanColumn({
  stage,
  deals,
  onCardClick,
  onAddDeal,
  activeDealId,
}: {
  stage: string;
  deals: CrmDeal[];
  onCardClick: (d: CrmDeal) => void;
  onAddDeal: (stage: string) => void;
  activeDealId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${stage}` });
  const config = STAGE_CONFIG[stage?.toLowerCase()] ?? { label: stage, headerBg: 'bg-gray-50 border-gray-200', color: '' };

  const totalValue = deals.reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div className="flex flex-col min-w-[260px] max-w-[280px] flex-shrink-0">
      {/* Column Header */}
      <div className={`rounded-t-lg px-3 py-2 border ${config.headerBg} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{config.label}</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0">{deals.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {totalValue > 0 && (
            <span className="text-xs text-muted-foreground">{formatCurrency(totalValue)}</span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 rounded-md"
            onClick={() => onAddDeal(stage)}
            title={`Add deal to ${config.label}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Cards drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 border border-t-0 rounded-b-lg p-2 min-h-[120px] space-y-2 transition-colors ${
          isOver ? 'bg-blue-50 border-blue-300' : 'bg-gray-50/50 border-gray-200'
        }`}
      >
        {deals.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground italic">
            No deals
          </div>
        )}
        {deals.map(deal => (
          <DealCard
            key={deal.id}
            deal={deal}
            onCardClick={onCardClick}
            isDragging={deal.id === activeDealId}
          />
        ))}
      </div>
    </div>
  );
}

// Detail side panel
function DealDetailPanel({
  deal,
  onClose,
  onUpdated,
}: {
  deal: CrmDeal | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  if (!deal) return null;
  return (
    <Sheet open={!!deal} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            {deal.title}
          </SheetTitle>
          <SheetDescription>Deal details</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Stage</p>
              <StageBadge stage={deal.stage} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Value</p>
              <p className="text-sm font-semibold text-emerald-700">{formatCurrency(deal.value)}</p>
            </div>
            {deal.account_name && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Account</p>
                <p className="text-sm flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {deal.account_name}
                </p>
              </div>
            )}
            {deal.probability != null && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Probability</p>
                <p className="text-sm">{deal.probability}%</p>
              </div>
            )}
            {deal.expected_close_date && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Expected Close</p>
                <p className="text-sm flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {deal.expected_close_date}
                </p>
              </div>
            )}
            {deal.created_at && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Created</p>
                <p className="text-sm text-muted-foreground">{new Date(deal.created_at).toLocaleDateString()}</p>
              </div>
            )}
            {deal.next_action && (
              <div className="space-y-1 col-span-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Next Action</p>
                <p className={`text-sm ${
                  deal.next_action_date && new Date(deal.next_action_date) < new Date()
                    ? 'text-amber-600'
                    : ''
                }`}>
                  {deal.next_action}
                  {deal.next_action_date && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      by {new Date(deal.next_action_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
          {deal.notes && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Notes</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded p-2">{deal.notes}</p>
            </div>
          )}
          {deal.lost_reason && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Lost Reason</p>
              <p className="text-sm text-red-600 bg-red-50 rounded p-2">{deal.lost_reason}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function DealPipeline() {
  const { toast } = useToast();

  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Detail panel
  const [selectedDeal, setSelectedDeal] = useState<CrmDeal | null>(null);

  // Drag state
  const [activeDealId, setActiveDealId] = useState<string | null>(null);

  // Add deal dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addStage, setAddStage] = useState('prospect');
  const [newTitle, setNewTitle] = useState('');
  const [newTitleError, setNewTitleError] = useState('');
  const [newAccountId, setNewAccountId] = useState('');
  const [newAccountError, setNewAccountError] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newValueError, setNewValueError] = useState('');
  const [newProbability, setNewProbability] = useState('');
  const [newCloseDate, setNewCloseDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newNextAction, setNewNextAction] = useState('');
  const [newNextActionDate, setNewNextActionDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // require 8px movement before drag starts
    })
  );

  const loadDeals = useCallback(async () => {
    try {
      const { data: dealData, error: dealError } = await supabase
        .from('crm_deals')
        .select('*')
        .eq('business_id', BUSINESS_ID)
        .order('created_at', { ascending: false });

      if (dealError) throw dealError;

      const { data: accountData, error: accountError } = await supabase
        .from('crm_accounts')
        .select('id, name')
        .eq('business_id', BUSINESS_ID);

      if (accountError) throw accountError;

      const accountMap: Record<string, string> = {};
      (accountData ?? []).forEach((a: CrmAccount) => { accountMap[a.id] = a.name; });

      const enriched: CrmDeal[] = (dealData ?? []).map((d: CrmDeal) => ({
        ...d,
        account_name: d.account_id ? (accountMap[d.account_id] ?? 'Unknown Account') : 'No Account',
      }));

      setDeals(enriched);
      setAccounts((accountData ?? []) as CrmAccount[]);
    } catch (err: any) {
      const msg = err.message || 'Failed to load deals';
      if (msg.includes('permission') || msg.includes('RLS') || msg.includes('denied')) {
        toast({ title: 'Permission denied', description: 'You do not have access to deals.', variant: 'destructive' });
        console.error('RLS error loading deals:', err);
      } else {
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('crm-deals-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_deals',
          filter: `business_id=eq.${BUSINESS_ID}`,
        },
        () => {
          loadDeals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDeals]);

  // Build stage columns dynamically: start with known order, then add any new stages
  const allStages = (() => {
    const dbStages = Array.from(new Set(deals.map(d => d.stage?.toLowerCase()).filter(Boolean)));
    const known = STAGE_ORDER.filter(s => dbStages.includes(s));
    const unknown = dbStages.filter(s => !STAGE_ORDER.includes(s));
    return [...known, ...unknown];
  })();

  // If no deals at all, still show default columns
  const displayStages = allStages.length > 0 ? allStages : STAGE_ORDER;

  const dealsByStage = (stage: string) =>
    deals.filter(d => d.stage?.toLowerCase() === stage);

  const activeDeal = activeDealId ? deals.find(d => d.id === activeDealId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveDealId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDealId(null);
    const { active, over } = event;
    if (!over) return;

    const dealId = active.id as string;
    const newStage = (over.id as string).replace('col-', '');

    const deal = deals.find(d => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    // Optimistic update
    const prevStage = deal.stage;
    setDeals(prev =>
      prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d)
    );

    try {
      const { error } = await supabase
        .from('crm_deals')
        .update({ stage: newStage, updated_at: new Date().toISOString() })
        .eq('id', dealId);

      if (error) throw error;

      toast({ title: 'Deal moved', description: `"${deal.title}" moved to ${STAGE_CONFIG[newStage]?.label ?? newStage}` });
    } catch (err: any) {
      // Revert on failure
      setDeals(prev =>
        prev.map(d => d.id === dealId ? { ...d, stage: prevStage } : d)
      );
      const msg = err.message || 'Failed to move deal';
      if (msg.includes('permission') || msg.includes('denied')) {
        toast({ title: 'Permission denied', description: 'Cannot update deal stage.', variant: 'destructive' });
      } else {
        toast({ title: 'Error moving deal', description: msg, variant: 'destructive' });
      }
    }
  }

  function openAddDeal(stage: string) {
    setAddStage(stage);
    setAddDialogOpen(true);
  }

  function resetAddForm() {
    setNewTitle(''); setNewTitleError('');
    setNewAccountId(''); setNewAccountError('');
    setNewValue(''); setNewValueError('');
    setNewProbability(''); setNewCloseDate(''); setNewNotes('');
    setNewNextAction(''); setNewNextActionDate('');
  }

  async function handleAddDeal() {
    let valid = true;
    if (!newTitle.trim()) { setNewTitleError('Deal name is required'); valid = false; }
    if (!newAccountId) { setNewAccountError('Account is required'); valid = false; }
    if (newValue.trim() && isNaN(parseFloat(newValue))) { setNewValueError('Enter a valid number'); valid = false; }
    if (!valid) return;

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('crm_deals')
        .insert({
          business_id: BUSINESS_ID,
          account_id: newAccountId,
          title: newTitle.trim(),
          stage: addStage,
          value: newValue.trim() ? parseFloat(newValue) : null,
          probability: newProbability.trim() ? parseInt(newProbability) : null,
          expected_close_date: newCloseDate || null,
          notes: newNotes.trim() || null,
          next_action: newNextAction.trim() || null,
          next_action_date: newNextActionDate || null,
        });

      if (error) throw error;

      toast({ title: 'Deal created', description: `"${newTitle}" added to ${STAGE_CONFIG[addStage]?.label ?? addStage}.` });
      setAddDialogOpen(false);
      resetAddForm();
      loadDeals();
    } catch (err: any) {
      const msg = err.message || 'Failed to add deal';
      if (msg.includes('permission') || msg.includes('denied')) {
        toast({ title: 'Permission denied', description: 'Cannot create deal.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      }
    } finally {
      setIsAdding(false);
    }
  }

  const totalPipelineValue = deals
    .filter(d => !['won', 'lost'].includes(d.stage?.toLowerCase()))
    .reduce((sum, d) => sum + (d.value ?? 0), 0);

  const wonDealsValue = deals
    .filter(d => d.stage?.toLowerCase() === 'won')
    .reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <DashboardLayout>
      <main className="flex flex-col h-full">
        {/* Page Header */}
        <div className="px-6 py-4 border-b bg-white flex-shrink-0">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Kanban className="h-6 w-6" />
              <div>
                <h1 className="text-xl font-bold">Deal Pipeline</h1>
                <p className="text-sm text-muted-foreground">
                  {deals.length} deal{deals.length !== 1 ? 's' : ''} ·{' '}
                  {formatCurrency(totalPipelineValue)} in pipeline
                  {wonDealsValue > 0 && (
                    <span className="text-emerald-600"> · {formatCurrency(wonDealsValue)} won</span>
                  )}
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => openAddDeal('prospect')}>
              <Plus className="h-4 w-4 mr-2" />
              New Deal
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto px-6 py-4">
          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading pipeline...</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 h-full items-start pb-4">
                {displayStages.map(stage => (
                  <KanbanColumn
                    key={stage}
                    stage={stage}
                    deals={dealsByStage(stage)}
                    onCardClick={setSelectedDeal}
                    onAddDeal={openAddDeal}
                    activeDealId={activeDealId}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeDeal && <DealCardStatic deal={activeDeal} />}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </main>

      {/* Deal Detail Side Panel */}
      <DealDetailPanel
        deal={selectedDeal}
        onClose={() => setSelectedDeal(null)}
        onUpdated={loadDeals}
      />

      {/* Add Deal Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetAddForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Deal</DialogTitle>
            <DialogDescription>
              Add a new deal to the <strong>{STAGE_CONFIG[addStage]?.label ?? addStage}</strong> stage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Deal name */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Deal Name *</label>
              <Input
                placeholder="e.g. Acme Corp — Starter Plan"
                value={newTitle}
                onChange={e => { setNewTitle(e.target.value); setNewTitleError(''); }}
                className={newTitleError ? 'border-destructive' : ''}
              />
              {newTitleError && <p className="text-xs text-destructive">{newTitleError}</p>}
            </div>

            {/* Account */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Account *</label>
              <Select value={newAccountId} onValueChange={v => { setNewAccountId(v); setNewAccountError(''); }}>
                <SelectTrigger className={newAccountError ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select an account..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.length === 0 && (
                    <SelectItem value="__no_accounts__" disabled>No accounts available</SelectItem>
                  )}
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newAccountError && <p className="text-xs text-destructive">{newAccountError}</p>}
            </div>

            {/* Stage + Value row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Stage</label>
                <Select value={addStage} onValueChange={setAddStage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGE_ORDER.map(s => (
                      <SelectItem key={s} value={s}>{STAGE_CONFIG[s]?.label ?? s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Value ($)</label>
                <Input
                  placeholder="e.g. 5000"
                  value={newValue}
                  onChange={e => { setNewValue(e.target.value); setNewValueError(''); }}
                  className={newValueError ? 'border-destructive' : ''}
                  type="number"
                  min="0"
                />
                {newValueError && <p className="text-xs text-destructive">{newValueError}</p>}
              </div>
            </div>

            {/* Probability + Close date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Probability (%)</label>
                <Input
                  placeholder="e.g. 50"
                  value={newProbability}
                  onChange={e => setNewProbability(e.target.value)}
                  type="number"
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Expected Close</label>
                <Input
                  value={newCloseDate}
                  onChange={e => setNewCloseDate(e.target.value)}
                  type="date"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Deal notes..."
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Next Action */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Next Action</label>
              <Textarea
                placeholder="What's the next step?"
                value={newNextAction}
                onChange={e => setNewNextAction(e.target.value)}
                rows={2}
              />
            </div>

            {/* Next Action Date */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Next Action Date</label>
              <Input
                value={newNextActionDate}
                onChange={e => setNewNextActionDate(e.target.value)}
                type="date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetAddForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleAddDeal} disabled={isAdding}>
              {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
