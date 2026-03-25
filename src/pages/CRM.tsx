import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader, PageContent } from '@/components/layout/PageLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Users, Mail, Building2, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

interface Prospect {
  id: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  company: string | null;
  email: string | null;
  status: string | null;
  city: string | null;
  state: string | null;
  industry: string | null;
  linkedin_url: string | null;
  last_contacted_at: string | null;
  created_at: string;
  campaign_tag: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  new:       'bg-gray-100 text-gray-700 border-gray-200',
  contacted:  'bg-blue-100 text-blue-700 border-blue-200',
  replied:    'bg-green-100 text-green-700 border-green-200',
  converted:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  unsubscribed: 'bg-red-100 text-red-600 border-red-200',
};

const CRM = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ['sales_prospects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_prospects')
        .select('id,first_name,last_name,title,company,email,status,city,state,industry,linkedin_url,last_contacted_at,created_at,campaign_tag')
        .order('last_contacted_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Prospect[];
    },
  });

  const filtered = prospects.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.company || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.industry || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // Summary counts
  const counts = prospects.reduce((acc, p) => {
    const s = p.status || 'new';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <DashboardLayout>
      <PageHeader
        title="CRM — Prospect Pipeline"
        description={`${prospects.length.toLocaleString()} prospects across all campaigns`}
      />
      <PageContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', count: prospects.length, color: 'text-gray-700' },
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
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              Prospects
              <Badge variant="outline" className="ml-2">{filtered.length.toLocaleString()}</Badge>
            </CardTitle>
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
                              <Mail className="h-3 w-3" />{p.email}
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
                        <TableCell className="text-sm text-gray-600 capitalize">{p.industry || '—'}</TableCell>
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
                            ? formatDistanceToNow(new Date(p.last_contacted_at), { addSuffix: true })
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-gray-400">
                          No prospects match your filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {filtered.length > 200 && (
                  <p className="text-center text-sm text-gray-400 mt-3">
                    Showing 200 of {filtered.length.toLocaleString()} — refine search to narrow results
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
