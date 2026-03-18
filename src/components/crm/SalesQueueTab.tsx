import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Contact } from './ContactDetailDrawer';
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

interface SalesQueueTabProps {
  onContactClick: (contact: Contact) => void;
}

function daysSince(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  return `${days}d ago`;
}

function PipelineBadge({ stage }: { stage: string | null }) {
  const colors: Record<string, string> = {
    contacted: 'bg-blue-100 text-blue-700',
    replied: 'bg-cyan-100 text-cyan-700',
    proposal: 'bg-amber-100 text-amber-700',
  };
  const label = stage
    ? stage.charAt(0).toUpperCase() + stage.slice(1)
    : '—';
  const color = colors[stage ?? ''] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

export function SalesQueueTab({ onContactClick }: SalesQueueTabProps) {
  const queryClient = useQueryClient();
  const [followUpLoading, setFollowUpLoading] = useState<string | null>(null);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: contacts, isLoading } = useQuery<Contact[]>({
    queryKey: ['sales-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, source, status, pipeline_stage, tags, last_activity_date, created_at, comments')
        .in('pipeline_stage', ['contacted', 'replied', 'proposal'])
        .or(
          'last_activity_date.lt.' + sevenDaysAgo +
          ',and(last_activity_date.is.null,created_at.lt.' + sevenDaysAgo + ')'
        )
        .order('last_activity_date', { ascending: true, nullsFirst: true })
        .limit(50);

      if (error) throw error;
      return (data || []) as Contact[];
    },
  });

  const handleFollowUpDone = async (contact: Contact) => {
    setFollowUpLoading(contact.id);
    try {
      const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unknown';

      const { error: actError } = await supabase.from('sales_activities').insert({
        activity_type: 'follow_up_sent',
        prospect_name: fullName,
        company_name: contact.source || '',
        description: `Action: follow_up_sent from SWapp`,
        metadata: { contact_id: contact.id },
      });
      if (actError) throw actError;

      const { error: contactError } = await supabase
        .from('contacts')
        .update({ last_activity_date: new Date().toISOString() })
        .eq('id', contact.id);
      if (contactError) throw contactError;

      toast.success(`Follow-up recorded for ${fullName}`);
      queryClient.invalidateQueries({ queryKey: ['sales-queue'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to record follow-up');
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

  if (!contacts || contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <p className="text-base font-medium">No contacts need follow-up right now. ✓</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table className="min-w-[800px]">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Pipeline Stage</TableHead>
            <TableHead>Last Activity</TableHead>
            <TableHead>Days Since</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => {
            const fullName =
              [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unknown';
            return (
              <TableRow key={contact.id}>
                <TableCell>
                  <button
                    className="font-medium text-left hover:underline text-primary"
                    onClick={() => onContactClick(contact)}
                  >
                    {fullName}
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {contact.email || '—'}
                </TableCell>
                <TableCell>
                  <PipelineBadge stage={contact.pipeline_stage} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {contact.last_activity_date
                    ? new Date(contact.last_activity_date).toLocaleDateString()
                    : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {daysSince(contact.last_activity_date)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={followUpLoading === contact.id}
                    onClick={() => handleFollowUpDone(contact)}
                  >
                    {followUpLoading === contact.id ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : null}
                    Follow-up Done
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
