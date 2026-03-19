import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase';

type Prospect = Database['public']['Tables']['prospects']['Row'];

export function OutreachApprovalPanel() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    const fetchProspects = async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('prospects')
          .select('*')
          .eq('pipeline_stage', 'prospect')
          .not('status', 'in', '("skipped","approved")')
          .order('created_at', { ascending: false });

        setProspects(data || []);
      } catch (error) {
        console.error('Failed to fetch prospects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProspects();
  }, []);

  const approveAll = async () => {
    try {
      setApproving('all');
      const now = new Date().toISOString();
      const externalId = `outreach-approval-batch-${now}`;

      // Create mc_tasks entry
      await supabase.from('mc_tasks').insert({
        title: `Iris: Scott approved outreach batch — ${new Date().toLocaleDateString()} (${prospects.length} prospects)`,
        description: `Prospects approved for outreach:\n${prospects.map(p => `${p.name} (${p.email})`).join('\n')}`,
        status: 'todo',
        priority: 'high',
        external_id: externalId,
        external_source: 'rico',
        assignee_ids: [], // Will be assigned to Iris dynamically
      });

      // Update all prospects
      const prospectIds = prospects.map(p => p.id);
      await supabase
        .from('prospects')
        .update({ pipeline_stage: 'approved' })
        .in('id', prospectIds);

      setProspects(p => p.filter(pr => !prospectIds.includes(pr.id)));
    } catch (error) {
      console.error('Failed to approve batch:', error);
    } finally {
      setApproving(null);
    }
  };

  const approveOne = async (prospect: Prospect) => {
    try {
      setApproving(prospect.id);
      const now = new Date().toISOString();
      const externalId = `outreach-approval-${prospect.id}-${now}`;

      // Create mc_tasks entry
      await supabase.from('mc_tasks').insert({
        title: `Iris: Scott approved ${prospect.company || prospect.name} — send outreach`,
        description: `Email: ${prospect.email}\nCompany: ${prospect.company}\nSource: ${prospect.source}`,
        status: 'todo',
        priority: 'high',
        external_id: externalId,
        external_source: 'rico',
        assignee_ids: [],
      });

      // Update prospect
      await supabase
        .from('prospects')
        .update({ pipeline_stage: 'approved' })
        .eq('id', prospect.id);

      setProspects(p => p.filter(pr => pr.id !== prospect.id));
    } catch (error) {
      console.error('Failed to approve prospect:', error);
    } finally {
      setApproving(null);
    }
  };

  const skipOne = async (prospect: Prospect) => {
    try {
      await supabase
        .from('prospects')
        .update({ status: 'skipped' })
        .eq('id', prospect.id);

      setProspects(p => p.filter(pr => pr.id !== prospect.id));
    } catch (error) {
      console.error('Failed to skip prospect:', error);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-sm text-slate-500">Loading prospects...</div>
      </Card>
    );
  }

  if (prospects.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-sm text-slate-500">No prospects awaiting approval</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Outreach Approval Queue ({prospects.length})
          </h3>
          <Button
            onClick={approveAll}
            disabled={approving !== null}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {approving === 'all' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Approve All
          </Button>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {prospects.map(prospect => (
          <div
            key={prospect.id}
            className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-slate-900">
                  {prospect.company || prospect.name}
                </h4>
                <p className="text-xs text-slate-600">{prospect.email}</p>
                {prospect.seo_pain_summary && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {prospect.seo_pain_summary}
                  </p>
                )}
                {prospect.lead_type && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {prospect.lead_type}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  onClick={() => approveOne(prospect)}
                  disabled={approving !== null}
                  size="sm"
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  {approving === prospect.id && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  Approve
                </Button>
                <Button
                  onClick={() => skipOne(prospect)}
                  disabled={approving !== null}
                  size="sm"
                  variant="ghost"
                >
                  Skip
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
