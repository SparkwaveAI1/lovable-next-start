import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader, PageContent } from '@/components/layout/PageLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Database,
  Mail,
  MessageSquare,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';

interface ContactRecord {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string | null;
  pipeline_stage: string | null;
  tags: string[] | null;
  last_activity_date: string | null;
  created_at: string;
}

type SourceCount = { source: string; count: number };

const statusLabel = (value: string | null) => {
  if (!value) return 'Unknown';
  return value
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const statusClass = (value: string | null) => {
  const key = value?.toLowerCase() ?? '';
  if (['active', 'member', 'active_member', 'customer'].includes(key)) {
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
  if (['new_lead', 'lead', 'contacted'].includes(key)) {
    return 'bg-blue-100 text-blue-700 border-blue-200';
  }
  if (['qualified', 'trial', 'opportunity'].includes(key)) {
    return 'bg-amber-100 text-amber-700 border-amber-200';
  }
  if (['inactive', 'cancelled', 'suppressed', 'do_not_contact'].includes(key)) {
    return 'bg-red-100 text-red-700 border-red-200';
  }
  return 'bg-slate-100 text-slate-500 border-slate-200';
};

const CRM = () => {
  const navigate = useNavigate();
  const { selectedBusiness } = useBusinessContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['crm-control-plane-contacts', selectedBusiness?.id],
    queryFn: async () => {
      if (!selectedBusiness?.id) {
        return { contacts: [] as ContactRecord[], totalCount: 0 };
      }

      const { data: contacts, error: contactsError, count } = await supabase
        .from('contacts')
        .select(
          'id, first_name, last_name, email, phone, source, status, pipeline_stage, tags, last_activity_date, created_at',
          { count: 'exact' }
        )
        .eq('business_id', selectedBusiness.id)
        .order('last_activity_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(500);

      if (contactsError) throw contactsError;

      return {
        contacts: (contacts || []) as ContactRecord[],
        totalCount: count || 0,
      };
    },
    enabled: !!selectedBusiness?.id,
  });

  const contacts = data?.contacts || [];
  const totalCount = data?.totalCount || 0;

  const metrics = useMemo(() => {
    const active = contacts.filter(c => ['active', 'member', 'active_member', 'customer'].includes(c.status?.toLowerCase() || '')).length;
    const leads = contacts.filter(c => ['new_lead', 'lead', 'contacted', 'qualified', 'trial', 'opportunity'].includes(c.status?.toLowerCase() || '')).length;
    const withActivity = contacts.filter(c => c.last_activity_date).length;
    const reachable = contacts.filter(c => c.email || c.phone).length;

    const sourceMap = contacts.reduce<Record<string, number>>((acc, contact) => {
      const source = contact.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    const sourceCounts: SourceCount[] = Object.entries(sourceMap)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return { active, leads, withActivity, reachable, sourceCounts };
  }, [contacts]);

  const filtered = contacts.filter(contact => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [
      contact.first_name,
      contact.last_name,
      contact.email,
      contact.phone,
      contact.source,
      contact.pipeline_stage,
      ...(contact.tags || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q);

    const matchesStatus = statusFilter === 'all' || (contact.status || 'unknown') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = Array.from(new Set(contacts.map(c => c.status || 'unknown'))).sort();

  return (
    <DashboardLayout>
      <PageHeader
        title="CRM Control Plane"
        description="Canonical CRM surface rebuilt on Contacts as source of truth, with Communications as the activity layer."
      />
      <PageContent>
        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">Source-of-truth decision applied</AlertTitle>
          <AlertDescription className="text-amber-800">
            SPA-4957 verified /contacts as canonical. The old CRM prospect table is no longer used here because it was legacy/outbound-only, while crm_accounts/deals/interactions/documents were empty.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Canonical contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalCount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Scoped to selected business</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Pipeline contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.leads.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Leads, qualified, trial, opportunity</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" /> Recent activity coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.withActivity.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Sampled contacts with activity dates</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Reachable records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.reachable.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Email or phone present in current sample</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-600" /> Operating model
              </CardTitle>
              <CardDescription>CRM now reads canonical contact records and routes work to existing operational surfaces.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" className="justify-between h-auto py-4" onClick={() => navigate('/contacts')}>
                <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Manage canonical contacts</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="justify-between h-auto py-4" onClick={() => navigate('/communications')}>
                <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Review communications</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="justify-between h-auto py-4" onClick={() => navigate('/email-marketing')}>
                <span className="flex items-center gap-2"><Mail className="h-4 w-4" /> Open email marketing</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="justify-between h-auto py-4" onClick={() => navigate('/sales')}>
                <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Review sales surface</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Source attribution</CardTitle>
              <CardDescription>Top sources in the current canonical contact sample.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {metrics.sourceCounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No source attribution available yet.</p>
              ) : metrics.sourceCounts.map(item => (
                <div key={item.source} className="flex items-center justify-between gap-3">
                  <span className="text-sm truncate">{item.source}</span>
                  <Badge variant="secondary">{item.count.toLocaleString()}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Canonical contact pipeline</CardTitle>
                <CardDescription>Read-only CRM list backed by contacts, not legacy sales_prospects.</CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search contacts..."
                    className="pl-9 sm:w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="sm:w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {statusOptions.map(status => (
                      <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedBusiness?.id ? (
              <div className="py-10 text-center text-muted-foreground">Select a business to view CRM contacts.</div>
            ) : isLoading ? (
              <div className="py-10 text-center text-muted-foreground">Loading canonical contacts...</div>
            ) : error ? (
              <div className="py-10 text-center text-red-600">Unable to load CRM contacts: {(error as Error).message}</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Reachability</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pipeline</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Last activity</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 200).map(contact => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <div className="font-medium">
                            {[contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unnamed contact'}
                          </div>
                          <div className="text-xs text-muted-foreground">Created {formatDistanceToNow(new Date(contact.created_at), { addSuffix: true })}</div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div>{contact.email || 'No email'}</div>
                            <div className="text-muted-foreground">{contact.phone || 'No phone'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusClass(contact.status)}>{statusLabel(contact.status)}</Badge>
                        </TableCell>
                        <TableCell>{contact.pipeline_stage || '—'}</TableCell>
                        <TableCell>{contact.source || 'unknown'}</TableCell>
                        <TableCell>
                          {contact.last_activity_date
                            ? formatDistanceToNow(new Date(contact.last_activity_date), { addSuffix: true })
                            : 'No activity yet'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/contacts?contact=${contact.id}`)}>
                            Open in Contacts
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          No canonical contacts match this filter.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {filtered.length > 200 && (
                  <p className="mt-3 text-center text-sm text-muted-foreground">
                    Showing 200 of {filtered.length.toLocaleString()} matching contacts. Refine search to narrow the list.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContent>
    </DashboardLayout>
  );
};

export default CRM;
