import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  ArrowLeft,
  ExternalLink,
  Edit,
  Save,
  X,
  Plus,
  Loader2,
  Phone,
  Mail,
  Users,
  FileText,
  Briefcase,
  StickyNote,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatToEasternCompact } from '@/lib/dateUtils';

const BUSINESS_ID = '5a9bbfcf-fae5-4063-9780-bcbe366bae88';

interface CrmAccount {
  id: string;
  business_id: string;
  name: string;
  website: string | null;
  industry: string | null;
  company_size: string | null;
  location: string | null;
  linkedin_url: string | null;
  description: string | null;
  strategy_notes: string | null;
  status: string;
  owner_agent: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface CrmInteraction {
  id: string;
  account_id: string;
  deal_id: string | null;
  type: string;
  direction: string | null;
  summary: string;
  detail: string | null;
  agent: string | null;
  occurred_at: string | null;
  created_at: string | null;
}

interface CrmDeal {
  id: string;
  account_id: string;
  title: string;
  stage: string;
  value: number | null;
  probability: number | null;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string | null;
}

interface CrmDocument {
  id: string;
  account_id: string;
  title: string;
  type: string | null;
  url: string;
  uploaded_by: string | null;
  created_at: string | null;
}

function AccountStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    prospect:  { label: 'Prospect',  className: 'bg-gray-100 text-gray-700 border-gray-200' },
    qualified: { label: 'Qualified', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    active:    { label: 'Active',    className: 'bg-green-100 text-green-700 border-green-200' },
    won:       { label: 'Won',       className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    lost:      { label: 'Lost',      className: 'bg-red-100 text-red-700 border-red-200' },
    dormant:   { label: 'Dormant',   className: 'bg-slate-100 text-slate-500 border-slate-200' },
  };
  const s = config[status?.toLowerCase()] ?? { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

function DealStageBadge({ stage }: { stage: string }) {
  const config: Record<string, { label: string; className: string }> = {
    prospect:    { label: 'Prospect',    className: 'bg-gray-100 text-gray-700 border-gray-200' },
    qualified:   { label: 'Qualified',   className: 'bg-blue-100 text-blue-700 border-blue-200' },
    proposal:    { label: 'Proposal',    className: 'bg-amber-100 text-amber-700 border-amber-200' },
    negotiation: { label: 'Negotiation', className: 'bg-orange-100 text-orange-700 border-orange-200' },
    won:         { label: 'Won',         className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    lost:        { label: 'Lost',        className: 'bg-red-100 text-red-700 border-red-200' },
  };
  const s = config[stage?.toLowerCase()] ?? { label: stage, className: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

function InteractionTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    call: '📞',
    email: '📧',
    meeting: '🤝',
    note: '📝',
    demo: '💼',
  };
  return <span className="text-lg">{icons[type?.toLowerCase()] ?? '📋'}</span>;
}

interface AccountDetailProps {
  accountId: string;
  onBack: () => void;
}

export function AccountDetail({ accountId, onBack }: AccountDetailProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Inline header editing state
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editOwnerAgent, setEditOwnerAgent] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editLinkedIn, setEditLinkedIn] = useState('');
  const [isSavingHeader, setIsSavingHeader] = useState(false);

  // Overview editing state
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [isEditingStrategy, setIsEditingStrategy] = useState(false);
  const [editStrategy, setEditStrategy] = useState('');
  const [isSavingOverview, setIsSavingOverview] = useState(false);

  // Interaction dialog state
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);
  const [intType, setIntType] = useState('call');
  const [intDirection, setIntDirection] = useState('outbound');
  const [intSummary, setIntSummary] = useState('');
  const [intSummaryError, setIntSummaryError] = useState('');
  const [intDetail, setIntDetail] = useState('');
  const [intAgent, setIntAgent] = useState('iris');
  const [intDate, setIntDate] = useState(new Date().toISOString().slice(0, 16));
  const [isLoggingInteraction, setIsLoggingInteraction] = useState(false);

  // Expanded interaction detail
  const [expandedInteractions, setExpandedInteractions] = useState<Set<string>>(new Set());

  // Deal dialog state
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [dealTitle, setDealTitle] = useState('');
  const [dealTitleError, setDealTitleError] = useState('');
  const [dealStage, setDealStage] = useState('prospect');
  const [dealValue, setDealValue] = useState('');
  const [dealProbability, setDealProbability] = useState('');
  const [dealCloseDate, setDealCloseDate] = useState('');
  const [dealNotes, setDealNotes] = useState('');
  const [isAddingDeal, setIsAddingDeal] = useState(false);

  // Document dialog state
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docTitleError, setDocTitleError] = useState('');
  const [docType, setDocType] = useState('proposal');
  const [docUrl, setDocUrl] = useState('');
  const [docUrlError, setDocUrlError] = useState('');
  const [docUploadedBy, setDocUploadedBy] = useState('iris');
  const [isAddingDocument, setIsAddingDocument] = useState(false);

  // Deal stage update state
  const [updatingDealId, setUpdatingDealId] = useState<string | null>(null);

  // Fetch account
  const { data: account, isLoading: loadingAccount } = useQuery({
    queryKey: ['crm-account', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_accounts')
        .select('*')
        .eq('id', accountId)
        .single();
      if (error) throw error;
      return data as CrmAccount;
    },
  });

  // Fetch interactions
  const { data: interactions = [] } = useQuery({
    queryKey: ['crm-interactions', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_interactions')
        .select('*')
        .eq('account_id', accountId)
        .order('occurred_at', { ascending: false });
      if (error) throw error;
      return data as CrmInteraction[];
    },
  });

  // Fetch deals
  const { data: deals = [] } = useQuery({
    queryKey: ['crm-deals', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_deals')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CrmDeal[];
    },
  });

  // Fetch documents
  const { data: documents = [] } = useQuery({
    queryKey: ['crm-documents', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_documents')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CrmDocument[];
    },
  });

  // Computed stats
  const openDealsCount = deals.filter(d => !['won', 'lost'].includes(d.stage)).length;
  const totalDealValue = deals.reduce((sum, d) => sum + (d.value ?? 0), 0);

  // Header edit handlers
  const handleStartEditingHeader = () => {
    if (!account) return;
    setEditName(account.name);
    setEditStatus(account.status);
    setEditOwnerAgent(account.owner_agent ?? 'iris');
    setEditWebsite(account.website ?? '');
    setEditLinkedIn(account.linkedin_url ?? '');
    setIsEditingHeader(true);
  };

  const handleSaveHeader = async () => {
    if (!account) return;
    setIsSavingHeader(true);
    try {
      const { error } = await supabase
        .from('crm_accounts')
        .update({
          name: editName.trim(),
          status: editStatus,
          owner_agent: editOwnerAgent || null,
          website: editWebsite.trim() || null,
          linkedin_url: editLinkedIn.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);
      if (error) throw error;
      toast({ title: 'Account updated', description: 'Header fields saved.' });
      setIsEditingHeader(false);
      queryClient.invalidateQueries({ queryKey: ['crm-account', accountId] });
      queryClient.invalidateQueries({ queryKey: ['crm-accounts'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update account', variant: 'destructive' });
    } finally {
      setIsSavingHeader(false);
    }
  };

  // Overview save handlers
  const handleSaveDescription = async () => {
    setIsSavingOverview(true);
    try {
      const { error } = await supabase
        .from('crm_accounts')
        .update({ description: editDescription.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', accountId);
      if (error) throw error;
      toast({ title: 'Saved', description: 'Description updated.' });
      setIsEditingDescription(false);
      queryClient.invalidateQueries({ queryKey: ['crm-account', accountId] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setIsSavingOverview(false);
    }
  };

  const handleSaveStrategy = async () => {
    setIsSavingOverview(true);
    try {
      const { error } = await supabase
        .from('crm_accounts')
        .update({ strategy_notes: editStrategy.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', accountId);
      if (error) throw error;
      toast({ title: 'Saved', description: 'Strategy notes updated.' });
      setIsEditingStrategy(false);
      queryClient.invalidateQueries({ queryKey: ['crm-account', accountId] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setIsSavingOverview(false);
    }
  };

  // Log interaction
  const handleLogInteraction = async () => {
    let valid = true;
    if (!intSummary.trim()) { setIntSummaryError('Summary is required'); valid = false; }
    if (!valid) return;

    setIsLoggingInteraction(true);
    try {
      const { error } = await supabase
        .from('crm_interactions')
        .insert({
          business_id: BUSINESS_ID,
          account_id: accountId,
          type: intType,
          direction: intType === 'note' ? null : intDirection,
          summary: intSummary.trim(),
          detail: intDetail.trim() || null,
          agent: intAgent || null,
          occurred_at: intDate ? new Date(intDate).toISOString() : new Date().toISOString(),
        });
      if (error) throw error;
      toast({ title: 'Interaction logged', description: `${intType} recorded.` });
      setInteractionDialogOpen(false);
      setIntSummary(''); setIntDetail(''); setIntSummaryError('');
      setIntType('call'); setIntDirection('outbound'); setIntAgent('iris');
      setIntDate(new Date().toISOString().slice(0, 16));
      queryClient.invalidateQueries({ queryKey: ['crm-interactions', accountId] });
      queryClient.invalidateQueries({ queryKey: ['crm-accounts'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to log interaction', variant: 'destructive' });
    } finally {
      setIsLoggingInteraction(false);
    }
  };

  // Add deal
  const handleAddDeal = async () => {
    let valid = true;
    if (!dealTitle.trim()) { setDealTitleError('Title is required'); valid = false; }
    if (!valid) return;

    setIsAddingDeal(true);
    try {
      const { error } = await supabase
        .from('crm_deals')
        .insert({
          business_id: BUSINESS_ID,
          account_id: accountId,
          title: dealTitle.trim(),
          stage: dealStage,
          value: dealValue ? parseFloat(dealValue) : null,
          probability: dealProbability ? parseInt(dealProbability) : null,
          expected_close_date: dealCloseDate || null,
          notes: dealNotes.trim() || null,
        });
      if (error) throw error;
      toast({ title: 'Deal added', description: `"${dealTitle}" created.` });
      setDealDialogOpen(false);
      setDealTitle(''); setDealTitleError(''); setDealStage('prospect');
      setDealValue(''); setDealProbability(''); setDealCloseDate(''); setDealNotes('');
      queryClient.invalidateQueries({ queryKey: ['crm-deals', accountId] });
      queryClient.invalidateQueries({ queryKey: ['crm-accounts'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to add deal', variant: 'destructive' });
    } finally {
      setIsAddingDeal(false);
    }
  };

  // Update deal stage
  const handleUpdateDealStage = async (dealId: string, newStage: string) => {
    setUpdatingDealId(dealId);
    try {
      const { error } = await supabase
        .from('crm_deals')
        .update({ stage: newStage, updated_at: new Date().toISOString() })
        .eq('id', dealId);
      if (error) throw error;
      toast({ title: 'Stage updated', description: `Deal moved to ${newStage}.` });
      queryClient.invalidateQueries({ queryKey: ['crm-deals', accountId] });
      queryClient.invalidateQueries({ queryKey: ['crm-accounts'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update stage', variant: 'destructive' });
    } finally {
      setUpdatingDealId(null);
    }
  };

  // Add document
  const handleAddDocument = async () => {
    let valid = true;
    if (!docTitle.trim()) { setDocTitleError('Title is required'); valid = false; }
    if (!docUrl.trim()) { setDocUrlError('URL is required'); valid = false; }
    if (!valid) return;

    setIsAddingDocument(true);
    try {
      const { error } = await supabase
        .from('crm_documents')
        .insert({
          business_id: BUSINESS_ID,
          account_id: accountId,
          title: docTitle.trim(),
          type: docType || null,
          url: docUrl.trim(),
          uploaded_by: docUploadedBy || null,
        });
      if (error) throw error;
      toast({ title: 'Document added', description: `"${docTitle}" added.` });
      setDocumentDialogOpen(false);
      setDocTitle(''); setDocTitleError(''); setDocUrl(''); setDocUrlError('');
      setDocType('proposal'); setDocUploadedBy('iris');
      queryClient.invalidateQueries({ queryKey: ['crm-documents', accountId] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to add document', variant: 'destructive' });
    } finally {
      setIsAddingDocument(false);
    }
  };

  const toggleInteractionExpand = (id: string) => {
    setExpandedInteractions(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  if (loadingAccount) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Account not found.</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to CRM
      </Button>

      {/* Header Card */}
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        {!isEditingHeader ? (
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{account.name}</h1>
                <AccountStatusBadge status={account.status} />
                {account.owner_agent && (
                  <Badge variant="outline" className="capitalize">{account.owner_agent}</Badge>
                )}
              </div>
              <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                {account.website && (
                  <a href={account.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary">
                    <ExternalLink className="h-3.5 w-3.5" /> Website
                  </a>
                )}
                {account.linkedin_url && (
                  <a href={account.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary">
                    <ExternalLink className="h-3.5 w-3.5" /> LinkedIn
                  </a>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleStartEditingHeader}>
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Company Name *</label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Company name" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="dormant">Dormant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Owner Agent</label>
                <Select value={editOwnerAgent} onValueChange={setEditOwnerAgent}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iris">Iris</SelectItem>
                    <SelectItem value="rico">Rico</SelectItem>
                    <SelectItem value="scott">Scott</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Website</label>
                <Input value={editWebsite} onChange={e => setEditWebsite(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">LinkedIn URL</label>
                <Input value={editLinkedIn} onChange={e => setEditLinkedIn(e.target.value)} placeholder="https://linkedin.com/..." />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveHeader} disabled={isSavingHeader || !editName.trim()}>
                {isSavingHeader && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditingHeader(false)}>
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="interactions">
            Interactions {interactions.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{interactions.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="deals">
            Deals {deals.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{deals.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="documents">
            Docs {documents.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{documents.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{interactions.length}</div>
              <div className="text-xs text-muted-foreground">Total Interactions</div>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{openDealsCount}</div>
              <div className="text-xs text-muted-foreground">Open Deals</div>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">${totalDealValue.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Deal Value</div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-card border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Description</h3>
              {!isEditingDescription && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setEditDescription(account.description ?? '');
                  setIsEditingDescription(true);
                }}>
                  <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              )}
            </div>
            {isEditingDescription ? (
              <div className="space-y-2">
                <Textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="Who they are, what they do..."
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveDescription} disabled={isSavingOverview}>
                    {isSavingOverview && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditingDescription(false)}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {account.description || <span className="italic">No description yet. Click Edit to add one.</span>}
              </p>
            )}
          </div>

          {/* Strategy Notes */}
          <div className="bg-card border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Strategy Notes</h3>
              {!isEditingStrategy && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setEditStrategy(account.strategy_notes ?? '');
                  setIsEditingStrategy(true);
                }}>
                  <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              )}
            </div>
            {isEditingStrategy ? (
              <div className="space-y-2">
                <Textarea
                  value={editStrategy}
                  onChange={e => setEditStrategy(e.target.value)}
                  placeholder="Our approach, key angles, talking points..."
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveStrategy} disabled={isSavingOverview}>
                    {isSavingOverview && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditingStrategy(false)}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {account.strategy_notes || <span className="italic">No strategy notes yet. Click Edit to add some.</span>}
              </p>
            )}
          </div>

          {/* Company Details */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-3">Company Details</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {account.industry && (
                <>
                  <dt className="text-muted-foreground">Industry</dt>
                  <dd className="font-medium">{account.industry}</dd>
                </>
              )}
              {account.location && (
                <>
                  <dt className="text-muted-foreground">Location</dt>
                  <dd className="font-medium">{account.location}</dd>
                </>
              )}
              {account.company_size && (
                <>
                  <dt className="text-muted-foreground">Company Size</dt>
                  <dd className="font-medium">{account.company_size}</dd>
                </>
              )}
              {account.created_at && (
                <>
                  <dt className="text-muted-foreground">Created</dt>
                  <dd className="font-medium">{formatToEasternCompact(account.created_at)}</dd>
                </>
              )}
            </dl>
          </div>
        </TabsContent>

        {/* Interactions Tab */}
        <TabsContent value="interactions" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Interaction Timeline</h3>
            <Button size="sm" onClick={() => setInteractionDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Log Interaction
            </Button>
          </div>
          {interactions.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No interactions yet. Log your first one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {interactions.map(interaction => (
                <div key={interaction.id} className="bg-card border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <InteractionTypeIcon type={interaction.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{interaction.summary}</span>
                        {interaction.direction && interaction.type !== 'note' && (
                          <Badge variant="outline" className="text-xs capitalize">{interaction.direction}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {interaction.agent && <span>by {interaction.agent}</span>}
                        {interaction.occurred_at && (
                          <span>{formatToEasternCompact(interaction.occurred_at)}</span>
                        )}
                      </div>
                      {interaction.detail && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleInteractionExpand(interaction.id)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            {expandedInteractions.has(interaction.id) ? (
                              <><ChevronUp className="h-3 w-3" /> Hide detail</>
                            ) : (
                              <><ChevronDown className="h-3 w-3" /> Show detail</>
                            )}
                          </button>
                          {expandedInteractions.has(interaction.id) && (
                            <p className="mt-1 text-sm text-muted-foreground border-l-2 border-border pl-3">
                              {interaction.detail}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Deals Tab */}
        <TabsContent value="deals" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Deals</h3>
            <Button size="sm" onClick={() => setDealDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Deal
            </Button>
          </div>
          {deals.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No deals yet. Add your first deal!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deals.map(deal => (
                <div key={deal.id} className="bg-card border rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{deal.title}</span>
                        <DealStageBadge stage={deal.stage} />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        {deal.value != null && <span>${deal.value.toLocaleString()}</span>}
                        {deal.probability != null && <span>{deal.probability}% prob.</span>}
                        {deal.expected_close_date && <span>Close: {deal.expected_close_date}</span>}
                      </div>
                      {deal.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{deal.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={deal.stage}
                        onValueChange={(newStage) => handleUpdateDealStage(deal.id, newStage)}
                        disabled={updatingDealId === deal.id}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          {updatingDealId === deal.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prospect">Prospect</SelectItem>
                          <SelectItem value="qualified">Qualified</SelectItem>
                          <SelectItem value="proposal">Proposal</SelectItem>
                          <SelectItem value="negotiation">Negotiation</SelectItem>
                          <SelectItem value="won">Won</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Documents</h3>
            <Button size="sm" onClick={() => setDocumentDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Document
            </Button>
          </div>
          {documents.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No documents yet. Add your first one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map(doc => (
                <div key={doc.id} className="bg-card border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{doc.title}</span>
                        {doc.type && (
                          <Badge variant="outline" className="text-xs capitalize">{doc.type}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {doc.uploaded_by && <span>by {doc.uploaded_by}</span>}
                        {doc.created_at && <span>{formatToEasternCompact(doc.created_at)}</span>}
                      </div>
                    </div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Log Interaction Dialog */}
      <Dialog open={interactionDialogOpen} onOpenChange={setInteractionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Interaction</DialogTitle>
            <DialogDescription>Record an interaction with {account.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Type</label>
                <Select value={intType} onValueChange={setIntType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">📞 Call</SelectItem>
                    <SelectItem value="email">📧 Email</SelectItem>
                    <SelectItem value="meeting">🤝 Meeting</SelectItem>
                    <SelectItem value="note">📝 Note</SelectItem>
                    <SelectItem value="demo">💼 Demo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {intType !== 'note' && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Direction</label>
                  <Select value={intDirection} onValueChange={setIntDirection}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Summary *</label>
              <Input
                placeholder="Brief summary of the interaction"
                value={intSummary}
                onChange={e => { setIntSummary(e.target.value); setIntSummaryError(''); }}
                className={intSummaryError ? 'border-destructive' : ''}
              />
              {intSummaryError && <p className="text-xs text-destructive">{intSummaryError}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Detail <span className="text-muted-foreground">(optional)</span></label>
              <Textarea
                placeholder="Full notes from the interaction..."
                value={intDetail}
                onChange={e => setIntDetail(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Agent</label>
                <Select value={intAgent} onValueChange={setIntAgent}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iris">Iris</SelectItem>
                    <SelectItem value="rico">Rico</SelectItem>
                    <SelectItem value="scott">Scott</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Date/Time</label>
                <Input
                  type="datetime-local"
                  value={intDate}
                  onChange={e => setIntDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInteractionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleLogInteraction} disabled={isLoggingInteraction}>
              {isLoggingInteraction && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Log Interaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Deal Dialog */}
      <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Deal</DialogTitle>
            <DialogDescription>Create a new deal for {account.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Deal Title *</label>
              <Input
                placeholder="e.g. Sparkwave AI Automation Package"
                value={dealTitle}
                onChange={e => { setDealTitle(e.target.value); setDealTitleError(''); }}
                className={dealTitleError ? 'border-destructive' : ''}
              />
              {dealTitleError && <p className="text-xs text-destructive">{dealTitleError}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Stage</label>
                <Select value={dealStage} onValueChange={setDealStage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Value ($)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={dealValue}
                  onChange={e => setDealValue(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Probability (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="50"
                  value={dealProbability}
                  onChange={e => setDealProbability(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Expected Close Date</label>
                <Input
                  type="date"
                  value={dealCloseDate}
                  onChange={e => setDealCloseDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Any notes about this deal..."
                value={dealNotes}
                onChange={e => setDealNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDealDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddDeal} disabled={isAddingDeal}>
              {isAddingDeal && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Document Dialog */}
      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
            <DialogDescription>Add a document link for {account.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Document Title *</label>
              <Input
                placeholder="e.g. Q1 Proposal Draft"
                value={docTitle}
                onChange={e => { setDocTitle(e.target.value); setDocTitleError(''); }}
                className={docTitleError ? 'border-destructive' : ''}
              />
              {docTitleError && <p className="text-xs text-destructive">{docTitleError}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">URL * <span className="text-muted-foreground text-xs">(Google Drive, Notion, etc.)</span></label>
              <Input
                placeholder="https://drive.google.com/..."
                value={docUrl}
                onChange={e => { setDocUrl(e.target.value); setDocUrlError(''); }}
                className={docUrlError ? 'border-destructive' : ''}
              />
              {docUrlError && <p className="text-xs text-destructive">{docUrlError}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Type</label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="deck">Deck</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Uploaded By</label>
                <Select value={docUploadedBy} onValueChange={setDocUploadedBy}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iris">Iris</SelectItem>
                    <SelectItem value="rico">Rico</SelectItem>
                    <SelectItem value="scott">Scott</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddDocument} disabled={isAddingDocument}>
              {isAddingDocument && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
