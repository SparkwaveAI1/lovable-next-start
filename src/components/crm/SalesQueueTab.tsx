import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, CheckCircle2 } from 'lucide-react';

// ─── Prospect type (B2B sales prospects — `prospects` table) ─────────────────

export interface Prospect {
  id: number;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  pipeline_stage: string | null;
  campaign: string | null;
  seo_pain_summary: string | null;
  tags: string[] | null;
  lead_type: string | null;
  updated_at: string | null;
  created_at: string;
  notes: string | null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SalesQueueTabProps {
  onProspectClick: (prospect: Prospect) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  return `${days}d ago`;
}

const PIPELINE_COLORS: Record<string, string> = {
  contacted: 'bg-blue-100 text-blue-700',
  replied:   'bg-cyan-100 text-cyan-700',
  qualified: 'bg-green-100 text-green-700',
  proposal:  'bg-amber-100 text-amber-700',
};

function PipelineBadge({ stage }: { stage: string | null }) {
  const label = stage ? stage.charAt(0).toUpperCase() + stage.slice(1) : '—';
  const color = PIPELINE_COLORS[stage ?? ''] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SalesQueueTab({ onProspectClick }: SalesQueueTabProps) {
  const queryClient = useQueryClient();
  const [followUpLoading, setFollowUpLoading] = useState<number | null>(null);

  const { data: prospects, isLoading } = useQuery<Prospect[]>({
    queryKey: ['sales-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prospects')
        .select(
          'id, name, company, email, phone, website, pipeline_stage, campaign, seo_pain_summary, tags, lead_type, updated_at, created_at, notes'
        )
        .in('pipeline_stage', ['contacted', 'replied', 'qualified', 'proposal'])
        .order('updated_at', { ascending: true, nullsFirst: true })
        .limit(50);

      if (error) throw error;
      return (data || []) as Prospect[];
    },
  });

  const handleFollowUpDone = async (prospect: Prospect) => {
    setFollowUpLoading(prospect.id);
    try {
      const { error: actError } = await supabase.from('sales_activities').insert({
        activity_type: 'follow_up_sent',
        prospect_name: prospect.name || 'Unknown',
        company_name: prospect.company || '',
        description: 'Action: follow_up_sent from SWapp',
        prospect_id: prospect.id,
        metadata: { prospect_id: prospect.id },
      });
      if (actError) throw actError;

      const { error: prospectError } = await supabase
        .from('prospects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', prospect.id);
      if (prospectError) throw prospectError;

      toast.success(`Follow-up recorded for ${prospect.name || 'prospect'}`);
      queryClient.invalidateQueries({ queryKey: ['sales-queue'] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record follow-up';
      toast.error(msg);
    } finally {
      setFollowUpLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!prospects || prospects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <p className="text-base font-medium">No prospects need follow-up right now. ✓</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table className="min-w-[800px]">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Pipeline Stage</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead>Last Activity</TableHead>
            <TableHead>Days Since</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prospects.map((prospect) => (
            <TableRow key={prospect.id}>
              <TableCell>
                <button
                  className="font-medium text-left hover:underline text-primary"
                  onClick={() => onProspectClick(prospect)}
                >
                  {prospect.name || '—'}
                </button>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {prospect.company || '—'}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {prospect.email || '—'}
              </TableCell>
              <TableCell>
                <PipelineBadge stage={prospect.pipeline_stage} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {prospect.campaign || '—'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {prospect.updated_at
                  ? new Date(prospect.updated_at).toLocaleDateString()
                  : '—'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {daysSince(prospect.updated_at)}
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={followUpLoading === prospect.id}
                  onClick={() => handleFollowUpDone(prospect)}
                >
                  {followUpLoading === prospect.id ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : null}
                  Follow-up Done
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
