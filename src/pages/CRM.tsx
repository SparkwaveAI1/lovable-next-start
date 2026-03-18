import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { useBusinesses } from '@/hooks/useBusinesses';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccountDetail } from '@/components/crm/AccountDetail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Building2,
  Plus,
  X,
  Loader2,
} from 'lucide-react';
import { formatToEasternCompact } from '@/lib/dateUtils';

const SPARKWAVE_BUSINESS_ID = '5a9bbfcf-fae5-4063-9780-bcbe366bae88';

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
  // joined data
  last_interaction_at?: string | null;
  open_deals_count?: number;
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
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium whitespace-nowrap ${s.className}`}>
      {s.label}
    </span>
  );
}

function OwnerBadge({ owner }: { owner: string | null }) {
  if (!owner) return <span className="text-muted-foreground text-xs">—</span>;
  const colors: Record<string, string> = {
    iris:  'bg-purple-100 text-purple-700',
    rico:  'bg-indigo-100 text-indigo-700',
    scott: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[owner.toLowerCase()] ?? 'bg-gray-100 text-gray-600'}`}>
      {owner}
    </span>
  );
}

export default function CRM() {
  const { toast } = useToast();
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();

  // View state
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // List state
  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Add account dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNameError, setNewNameError] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newLinkedIn, setNewLinkedIn] = useState('');
  const [newStatus, setNewStatus] = useState('prospect');
  const [newOwnerAgent, setNewOwnerAgent] = useState('iris');
  const [newDescription, setNewDescription] = useState('');
  const [newStrategyNotes, setNewStrategyNotes] = useState('');
  const [newBusinessId, setNewBusinessId] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Interaction/deal counts per account (loaded separately)
  const [interactionMap, setInteractionMap] = useState<Record<string, string | null>>({});
  const [dealCountMap, setDealCountMap] = useState<Record<string, number>>({});

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const bizId = selectedBusiness?.id || null;

      let accountsQuery = supabase
        .from('crm_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (bizId) {
        accountsQuery = accountsQuery.eq('business_id', bizId);
      }

      const { data, error } = await accountsQuery;
      if (error) throw error;
      setAccounts((data ?? []) as CrmAccount[]);

      // Load interaction max dates
      let intQuery = supabase
        .from('crm_interactions')
        .select('account_id, occurred_at')
        .order('occurred_at', { ascending: false });

      if (bizId) {
        intQuery = intQuery.eq('business_id', bizId);
      }

      const { data: interactionData } = await intQuery;

      const iMap: Record<string, string | null> = {};
      (interactionData ?? []).forEach(row => {
        if (!iMap[row.account_id]) {
          iMap[row.account_id] = row.occurred_at;
        }
      });
      setInteractionMap(iMap);

      // Load open deal counts
      let dealQuery = supabase
        .from('crm_deals')
        .select('account_id, stage');

      if (bizId) {
        dealQuery = dealQuery.eq('business_id', bizId);
      }

      const { data: dealData } = await dealQuery;

      const dMap: Record<string, number> = {};
      (dealData ?? []).forEach(row => {
        if (!['won', 'lost'].includes(row.stage)) {
          dMap[row.account_id] = (dMap[row.account_id] ?? 0) + 1;
        }
      });
      setDealCountMap(dMap);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to load accounts', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Reload when selected business changes
  useEffect(() => {
    loadAccounts();
  }, [selectedBusiness?.id]);

  // Real-time subscription on crm_accounts — only when a specific business is selected
  useEffect(() => {
    const bizId = selectedBusiness?.id || null;
    if (!bizId) {
      // No real-time for "All Businesses" — too much volume; data loaded on mount/business switch
      return;
    }

    const channel = supabase
      .channel(`crm-accounts-realtime-${bizId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_accounts',
          filter: `business_id=eq.${bizId}`,
        },
        () => {
          loadAccounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedBusiness?.id]);

  // Filtered accounts
  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = !searchTerm ||
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.industry ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.location ?? '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || acc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleAddAccount = async () => {
    let valid = true;
    if (!newName.trim()) { setNewNameError('Company name is required'); valid = false; }
    if (!valid) return;

    const businessIdToUse = newBusinessId || SPARKWAVE_BUSINESS_ID;

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('crm_accounts')
        .insert({
          business_id: businessIdToUse,
          name: newName.trim(),
          website: newWebsite.trim() || null,
          industry: newIndustry.trim() || null,
          location: newLocation.trim() || null,
          linkedin_url: newLinkedIn.trim() || null,
          status: newStatus,
          owner_agent: newOwnerAgent,
          description: newDescription.trim() || null,
          strategy_notes: newStrategyNotes.trim() || null,
        });
      if (error) throw error;

      toast({ title: 'Account added', description: `"${newName}" has been added to CRM.` });

      setAddDialogOpen(false);
      resetAddForm();
      loadAccounts();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to add account', variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };

  const resetAddForm = () => {
    setNewName(''); setNewNameError(''); setNewWebsite(''); setNewIndustry('');
    setNewLocation(''); setNewLinkedIn(''); setNewStatus('prospect');
    setNewOwnerAgent('iris'); setNewDescription(''); setNewStrategyNotes('');
    setNewBusinessId('');
  };

  // Show AccountDetail if an account is selected
  if (selectedAccountId) {
    return (
      <DashboardLayout>
        <main className="container mx-auto px-4 py-6">
          <AccountDetail
            accountId={selectedAccountId}
            onBack={() => {
              setSelectedAccountId(null);
              loadAccounts();
            }}
          />
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6" />
              <div>
                <h1 className="text-2xl font-bold">CRM</h1>
                <p className="text-sm text-muted-foreground">{selectedBusiness ? selectedBusiness.name : 'All Businesses'}</p>
              </div>
              <Badge variant="secondary" className="text-xs">{accounts.length}</Badge>
            </div>
            <Button onClick={() => setAddDialogOpen(true)} size="sm" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
            {/* Business Selector */}
            <Select
              value={selectedBusiness?.id ?? 'all'}
              onValueChange={(value) => {
                if (value === 'all') {
                  // Clear selection — show all businesses
                  // We need to call setSelectedBusiness with undefined; use a hack: store null in context
                  // Since BusinessContext only supports Business objects, we reload without filter
                  setSelectedBusiness({ id: '', slug: '', name: '' } as any);
                } else {
                  const biz = businesses.find(b => b.id === value);
                  if (biz) setSelectedBusiness(biz);
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Businesses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Businesses</SelectItem>
                {businesses.map(biz => (
                  <SelectItem key={biz.id} value={biz.id}>{biz.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="dormant">Dormant</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm || statusFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading accounts...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              {accounts.length === 0 ? 'No accounts yet' : 'No accounts match your filters'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {accounts.length === 0
                ? 'Click "Add Account" to create your first CRM account.'
                : 'Try adjusting your search or status filter.'}
            </p>
            {accounts.length === 0 && (
              <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Account
              </Button>
            )}
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Last Interaction</TableHead>
                  <TableHead className="text-center">Open Deals</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map(account => (
                  <TableRow
                    key={account.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedAccountId(account.id)}
                  >
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{account.name}</div>
                        {account.location && (
                          <div className="text-xs text-muted-foreground">{account.location}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <AccountStatusBadge status={account.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {account.industry ?? '—'}
                    </TableCell>
                    <TableCell>
                      <OwnerBadge owner={account.owner_agent} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {interactionMap[account.id]
                        ? formatToEasternCompact(interactionMap[account.id]!)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      {dealCountMap[account.id] ? (
                        <Badge variant="secondary">{dealCountMap[account.id]}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {account.created_at ? formatToEasternCompact(account.created_at) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Add Account Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetAddForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
            <DialogDescription>Add a new prospect or client to your CRM.</DialogDescription>

          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Business picker — always shown to allow correct assignment */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Business</label>
              <Select
                value={newBusinessId || SPARKWAVE_BUSINESS_ID}
                onValueChange={setNewBusinessId}
              >
                <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
                <SelectContent>
                  {businesses.map(biz => (
                    <SelectItem key={biz.id} value={biz.id}>{biz.name}</SelectItem>
                  ))}
                  {businesses.length === 0 && (
                    <SelectItem value={SPARKWAVE_BUSINESS_ID}>Sparkwave AI</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Company Name *</label>
              <Input
                placeholder="Acme Corp"
                value={newName}
                onChange={e => { setNewName(e.target.value); setNewNameError(''); }}
                className={newNameError ? 'border-destructive' : ''}
              />
              {newNameError && <p className="text-xs text-destructive">{newNameError}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
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
                <label className="text-sm font-medium">Owner Agent</label>
                <Select value={newOwnerAgent} onValueChange={setNewOwnerAgent}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iris">Iris</SelectItem>
                    <SelectItem value="rico">Rico</SelectItem>
                    <SelectItem value="scott">Scott</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Website</label>
              <Input
                placeholder="https://example.com"
                value={newWebsite}
                onChange={e => setNewWebsite(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Industry</label>
                <Input
                  placeholder="e.g. SaaS, E-commerce"
                  value={newIndustry}
                  onChange={e => setNewIndustry(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Location</label>
                <Input
                  placeholder="e.g. Austin, TX"
                  value={newLocation}
                  onChange={e => setNewLocation(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">LinkedIn URL</label>
              <Input
                placeholder="https://linkedin.com/company/..."
                value={newLinkedIn}
                onChange={e => setNewLinkedIn(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Who they are, what they do..."
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Strategy Notes</label>
              <Textarea
                placeholder="Our approach, key angles..."
                value={newStrategyNotes}
                onChange={e => setNewStrategyNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetAddForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleAddAccount} disabled={isAdding}>
              {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
