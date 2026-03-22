import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader, PageContent } from '@/components/layout/PageLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users, Search, Loader2, TrendingUp } from 'lucide-react';
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

const DealPipeline = () => {
  const [search, setSearch] = useState('');

  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ['deal_pipeline_prospects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_prospects')
        .select('id,first_name,last_name,title,company,email,status,industry,last_contacted_at,campaign_tag')
        .order('last_contacted_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Prospect[];
    },
  });

  const filtered = prospects.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.company || '').toLowerCase().includes(q) ||
      (p.industry || '').toLowerCase().includes(q)
    );
  });

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.id] = filtered.filter(p => (p.status || 'new') === col.id);
    return acc;
  }, {} as Record<string, Prospect[]>);

  const totalConverted = (grouped['converted'] || []).length;
  const totalContacted = (grouped['contacted'] || []).length + (grouped['replied'] || []).length + totalConverted;

  return (
    <DashboardLayout>
      <PageHeader
        title="Deal Pipeline"
        description={`${prospects.length.toLocaleString()} prospects — ${totalContacted} contacted, ${totalConverted} converted`}
      />
      <PageContent>
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {COLUMNS.map(col => (
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
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mr-3" />
            <span className="text-gray-500">Loading pipeline...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {COLUMNS.map(col => (
              <div key={col.id} className={`bg-gray-50 rounded-xl border-t-4 ${col.color} p-3`}>
                {/* Column header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="font-semibold text-gray-700 text-sm">{col.label}</span>
                  <Badge variant="outline" className={`text-xs ${col.badge}`}>
                    {grouped[col.id]?.length || 0}
                  </Badge>
                </div>

                {/* Cards */}
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {(grouped[col.id] || []).slice(0, 50).map(p => (
                    <div key={p.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="font-medium text-gray-900 text-sm truncate">
                        {[p.first_name, p.last_name].filter(Boolean).join(' ') || '—'}
                      </div>
                      {p.company && (
                        <div className="text-xs text-gray-500 truncate mt-0.5">{p.company}</div>
                      )}
                      {p.title && (
                        <div className="text-xs text-gray-400 truncate">{p.title}</div>
                      )}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        {p.industry && (
                          <span className="text-xs text-gray-400 capitalize truncate">{p.industry}</span>
                        )}
                        {p.last_contacted_at && (
                          <span className="text-xs text-gray-400 shrink-0 ml-2">
                            {formatDistanceToNow(new Date(p.last_contacted_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {(grouped[col.id]?.length || 0) > 50 && (
                    <div className="text-center text-xs text-gray-400 py-2">
                      +{(grouped[col.id].length - 50).toLocaleString()} more — use search to filter
                    </div>
                  )}
                  {(grouped[col.id]?.length || 0) === 0 && (
                    <div className="text-center text-xs text-gray-400 py-6">No prospects</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContent>
    </DashboardLayout>
  );
};

export default DealPipeline;
