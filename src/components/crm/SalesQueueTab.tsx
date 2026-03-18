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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle2, Mail, Phone, Building2, Clock } from 'lucide-react';

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
  onProspectClick?: (prospect: Prospect) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Unknown';
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  return `${days}d ago`;
}

const PIPELINE_COLORS: Record<string, string> = {
  contacted: 'bg-blue-100 text-blue-700',
  replied:   'bg-cyan-100 text-cyan-700',
  qualified: 'bg-green-100 text-green-700',
  proposal:  'bg-amber-100 text-amber-700',
  prospect:  'bg-slate-100 text-slate-600',
};

const STAGE_LABELS: Record<string, string> = {
  prospect:   'Prospects',
  contacted:  'Contacted',
  replied:    'Replied',
  qualified:  'Qualified',
  proposal:   'Proposal',
  closed_won: 'Won',
  closed_lost:'Lost',
};

const STAGE_ORDER = ['prospect', 'contacted', 'replied', 'qualified', 'proposal', 'closed_won'];

function PipelineBadge({ stage }: { stage: string | null }) {
  const label = stage ? stage.charAt(0).toUpperCase() + stage.slice(1) : '—';
  const color = PIPELINE_COLORS[stage ?? ''] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

// ─── Prospect Detail Drawer ───────────────────────────────────────────────────

function ProspectDetailDrawer({
  prospect,
  open,
  onClose,
}: {
  prospect: Prospect | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: outreachHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['outreach-history', prospect?.id],
    enabled: !!prospect?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outreach_log')
        .select('id, type, template_used, subject, status, sent_at, opened_at, replied_at')
        .eq('prospect_id', prospect!.id)
        .order('sent_at', { ascending: false });
      if (error) {
        toast.error('Failed to load outreach history');
        throw error;
      }
      return data || [];
    },
  });

  if (!prospect) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-xl">{prospect.name || 'Unknown'}</SheetTitle>
          {prospect.company && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              {prospect.company}
            </div>
          )}
        </SheetHeader>

        {/* Contact info */}
        <div className="space-y-2 mb-4">
          {prospect.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${prospect.email}`} className="hover:underline text-primary">
                {prospect.email}
              </a>
            </div>
          )}
          {prospect.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {prospect.phone}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <PipelineBadge stage={prospect.pipeline_stage} />
            {prospect.campaign && (
              <Badge variant="outline" className="text-xs">{prospect.campaign}</Badge>
            )}
            {prospect.lead_type && (
              <Badge variant="outline" className="text-xs capitalize">{prospect.lead_type}</Badge>
            )}
          </div>
        </div>

        {prospect.seo_pain_summary && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-xs font-medium text-amber-800 mb-1">SEO Pain Summary</p>
            <p className="text-xs text-amber-700">{prospect.seo_pain_summary}</p>
          </div>
        )}

        {prospect.notes && (
          <div className="mb-4 p-3 bg-slate-50 border rounded-lg">
            <p className="text-xs font-medium text-slate-700 mb-1">Notes</p>
            <p className="text-xs text-slate-600">{prospect.notes}</p>
          </div>
        )}

        <Separator className="my-4" />

        {/* Outreach history */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Outreach History
          </h3>
          {historyLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading...
            </div>
          ) : !outreachHistory || outreachHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No outreach recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {outreachHistory.map((item) => (
                <div key={item.id} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium capitalize">
                      {item.type?.replace(/_/g, ' ') || 'Email'}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      item.status === 'replied'
                        ? 'bg-emerald-100 text-emerald-700'
                        : item.status === 'opened'
                        ? 'bg-blue-100 text-blue-700'
                        : item.status === 'bounced'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.status || 'sent'}
                    </span>
                  </div>
                  {item.subject && (
                    <p className="text-xs text-slate-700 mb-1 line-clamp-2">{item.subject}</p>
                  )}
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {item.sent_at && (
                      <div>Sent: {new Date(item.sent_at).toLocaleDateString()}</div>
                    )}
                    {item.opened_at && (
                      <div>Opened: {new Date(item.opened_at).toLocaleDateString()}</div>
                    )}
                    {item.replied_at && (
                      <div className="text-emerald-600 font-medium">
                        ✓ Replied: {new Date(item.replied_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SalesQueueTab({ onProspectClick }: SalesQueueTabProps) {
  const queryClient = useQueryClient();
  const [followUpLoading, setFollowUpLoading] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  // Pipeline stage counts (all prospects, ~60 rows — fine for client-side group)
  const { data: pipelineStats } = useQuery<Record<string, number>>({
    queryKey: ['prospect-pipeline-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prospects')
        .select('pipeline_stage');
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((r) => {
        const s = r.pipeline_stage || 'unknown';
        counts[s] = (counts[s] || 0) + 1;
      });
      return counts;
    },
  });

  // Outreach email total — head:true means zero rows fetched, count only
  const { data: outreachCount } = useQuery<number>({
    queryKey: ['outreach-email-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('outreach_log')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Active sales queue (prospects needing follow-up action)
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
      queryClient.invalidateQueries({ queryKey: ['prospect-pipeline-stats'] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record follow-up';
      toast.error(msg);
    } finally {
      setFollowUpLoading(null);
    }
  };

  const handleProspectClick = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setDrawerOpen(true);
    onProspectClick?.(prospect);
  };

  // Build stats bar entries in stage order
  const statsEntries = pipelineStats
    ? STAGE_ORDER
        .filter((s) => pipelineStats[s] != null)
        .map((s) => ({ stage: s, count: pipelineStats[s], label: STAGE_LABELS[s] || s }))
    : [];

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Pipeline stats bar */}
      {(statsEntries.length > 0 || outreachCount != null) && (
        <div className="flex gap-3 mb-5 flex-wrap">
          {statsEntries.map(({ stage, count, label }) => (
            <div
              key={stage}
              className="bg-white border rounded-lg px-4 py-2.5 text-center min-w-[90px] shadow-sm"
            >
              <div className="text-2xl font-bold text-primary leading-tight">{count}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
          {outreachCount != null && (
            <div className="bg-white border rounded-lg px-4 py-2.5 text-center min-w-[90px] shadow-sm">
              <div className="text-2xl font-bold text-slate-700 leading-tight">{outreachCount}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Emails Sent</div>
            </div>
          )}
        </div>
      )}

      {/* Queue table or empty state */}
      {!prospects || prospects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <p className="text-base font-medium">No prospects need follow-up right now. ✓</p>
        </div>
      ) : (
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
                      onClick={() => handleProspectClick(prospect)}
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
      )}

      {/* Prospect detail drawer (inline — no separate file needed) */}
      <ProspectDetailDrawer
        prospect={selectedProspect}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
