import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader, PageContent } from '@/components/layout/PageLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Search, Users, Mail, Building2, Loader2, Plus, Pencil } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// Brand configuration
// Each brand entry maps to campaign_tag prefixes (case-insensitive substring).
// A prospect is assigned to a brand if its campaign_tag contains the prefix.
// Prospects with no campaign_tag are bucketed under 'sparkwave' as the default.
// ---------------------------------------------------------------------------
const BRANDS = [
  { key: 'all',         label: 'All Brands' },
  { key: 'sparkwave',   label: 'Sparkwave' },
  { key: 'personaai',  label: 'PersonaAI' },
  { key: 'charx',      label: 'CharX' },
  { key: 'fightflow',  label: 'Fight Flow' },
] as const;

type BrandKey = (typeof BRANDS)[number]['key'];

/** Map a campaign_tag string to the canonical brand key. */
function tagToBrand(tag: string | null): BrandKey {
  if (!tag) return 'sparkwave'; // untagged → default brand
  const t = tag.toLowerCase();
  if (t.includes('personaai') || t.includes('persona-ai')) return 'personaai';
  if (t.includes('charx') || t.includes('char-x'))           return 'charx';
  if (t.includes('fightflow') || t.includes('fight-flow') || t.includes('fight_flow') || t.includes('mma'))
    return 'fightflow';
  // iris-seo-outreach, sparkwave, or anything else → sparkwave
  return 'sparkwave';
}

// ---------------------------------------------------------------------------

interface Prospect {
  id: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  company: string | null;
  email: string | null;
  mobile_phone: string | null;
  status: string | null;
  city: string | null;
  state: string | null;
  industry: string | null;
  linkedin_url: string | null;
  last_contacted_at: string | null;
  created_at: string;
  campaign_tag: string | null;
}

interface ProspectFormData {
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  mobile_phone: string;
  title: string;
  status: string;
}

const BLANK_FORM: ProspectFormData = {
  first_name: '',
  last_name: '',
  company: '',
  email: '',
  mobile_phone: '',
  title: '',
  status: 'new',
};

const STATUS_COLORS: Record<string, string> = {
  new:          'bg-gray-100 text-gray-700 border-gray-200',
  contacted:    'bg-blue-100 text-blue-700 border-blue-200',
  replied:      'bg-green-100 text-green-700 border-green-200',
  converted:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  unsubscribed: 'bg-red-100 text-red-600 border-red-200',
};

const QUERY_KEY = 'sales_prospects';

const CRM = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  // Default to Sparkwave — never show all brands mixed by default
  const [brandFilter, setBrandFilter] = useState<BrandKey>('sparkwave');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProspectFormData>(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  const { data: prospects = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_prospects')
        .select(
          'id,first_name,last_name,title,company,email,mobile_phone,status,city,state,industry,linkedin_url,last_contacted_at,created_at,campaign_tag'
        )
        .order('last_contacted_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Prospect[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { id: string | null; data: ProspectFormData }) => {
      const record = {
        first_name: payload.data.first_name || null,
        last_name: payload.data.last_name || null,
        company: payload.data.company || null,
        email: payload.data.email || null,
        mobile_phone: payload.data.mobile_phone || null,
        title: payload.data.title || null,
        status: payload.data.status || 'new',
      };
      if (payload.id) {
        const { error } = await supabase
          .from('sales_prospects')
          .update(record)
          .eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sales_prospects').insert(record);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: variables.id ? 'Prospect updated' : 'Prospect created',
        description: variables.id
          ? 'Changes saved successfully.'
          : 'New prospect added to the pipeline.',
      });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(BLANK_FORM);
    setDialogOpen(true);
  };

  const openEdit = (p: Prospect, e: React.MouseEvent) => {
    e.stopPropagation(); // don't also navigate to detail
    setEditingId(p.id);
    setForm({
      first_name: p.first_name || '',
      last_name: p.last_name || '',
      company: p.company || '',
      email: p.email || '',
      mobile_phone: p.mobile_phone || '',
      title: p.title || '',
      status: p.status || 'new',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(BLANK_FORM);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMutation.mutateAsync({ id: editingId, data: form });
    } finally {
      setSaving(false);
    }
  };

  // Brand-scoped prospects (applied before search/status)
  const brandScoped = brandFilter === 'all'
    ? prospects
    : prospects.filter(p => tagToBrand(p.campaign_tag) === brandFilter);

  const filtered = brandScoped.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.company || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.industry || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // Summary counts scoped to the selected brand
  const counts = brandScoped.reduce(
    (acc, p) => {
      const s = p.status || 'new';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const activeBrandLabel = BRANDS.find(b => b.key === brandFilter)?.label ?? 'All Brands';

  return (
    <DashboardLayout>
      <PageHeader
        title="CRM — Prospect Pipeline"
        description={
          brandFilter === 'all'
            ? `${prospects.length.toLocaleString()} prospects across all brands`
            : `${brandScoped.length.toLocaleString()} prospects · ${activeBrandLabel}`
        }
      />
      <PageContent>
        {/* Brand Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {BRANDS.map(brand => (
            <button
              key={brand.key}
              onClick={() => setBrandFilter(brand.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                brandFilter === brand.key
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
              }`}
            >
              {brand.label}
              {brand.key !== 'all' && (
                <span className={`ml-1.5 text-xs ${brandFilter === brand.key ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {brand.key === brandFilter
                    ? brandScoped.length.toLocaleString()
                    : prospects.filter(p => tagToBrand(p.campaign_tag) === brand.key).length.toLocaleString()}
                </span>
              )}
              {brand.key === 'all' && (
                <span className={`ml-1.5 text-xs ${brandFilter === brand.key ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {prospects.length.toLocaleString()}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', count: brandScoped.length, color: 'text-gray-700' },
            { label: 'New', count: counts.new || 0, color: 'text-gray-600' },
            { label: 'Contacted', count: counts.contacted || 0, color: 'text-blue-600' },
            { label: 'Replied', count: counts.replied || 0, color: 'text-green-600' },
          ].map(({ label, count, color }) => (
            <Card key={label}>
              <CardContent className="pt-4">
                <div className={`text-2xl font-bold ${color}`}>{count.toLocaleString()}</div>
                <div className="text-sm text-gray-500">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search name, company, email, industry..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                {activeBrandLabel} Prospects
                <Badge variant="outline" className="ml-2">
                  {filtered.length.toLocaleString()}
                </Badge>
              </CardTitle>
              <Button size="sm" onClick={openCreate} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                Add prospect
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mr-3" />
                <span className="text-gray-500">Loading prospects...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Contacted</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 200).map(p => (
                      <TableRow
                        key={p.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/crm/${p.id}`)}
                      >
                        <TableCell>
                          <div className="font-medium text-gray-900">
                            {[p.first_name, p.last_name].filter(Boolean).join(' ') || '—'}
                          </div>
                          {p.email && (
                            <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3" />
                              {p.email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span className="text-sm">{p.company || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{p.title || '—'}</TableCell>
                        <TableCell className="text-sm text-gray-600 capitalize">
                          {p.industry || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {[p.city, p.state].filter(Boolean).join(', ') || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs capitalize ${STATUS_COLORS[p.status || 'new'] || STATUS_COLORS.new}`}
                          >
                            {p.status || 'new'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {p.last_contacted_at
                            ? formatDistanceToNow(new Date(p.last_contacted_at), {
                                addSuffix: true,
                              })
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-indigo-600"
                            onClick={e => openEdit(p, e)}
                            title="Edit prospect"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-gray-400">
                          No prospects match your filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {filtered.length > 200 && (
                  <p className="text-center text-sm text-gray-400 mt-3">
                    Showing 200 of {filtered.length.toLocaleString()} — refine search to narrow
                    results
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContent>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Prospect' : 'Add Prospect'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                placeholder="Jane"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                placeholder="Smith"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="VP of Marketing"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="jane@acme.com"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label htmlFor="mobile_phone">Phone</Label>
              <Input
                id="mobile_phone"
                value={form.mobile_phone}
                onChange={e => setForm(f => ({ ...f, mobile_phone: e.target.value }))}
                placeholder="+1 555 000 0000"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={v => setForm(f => ({ ...f, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? 'Save changes' : 'Create prospect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CRM;
