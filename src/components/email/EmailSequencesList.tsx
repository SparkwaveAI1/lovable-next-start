import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  Pause,
  Copy,
  Mail,
  Users,
  CheckCircle2,
  Clock,
  Archive,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

interface EmailSequencesListProps {
  businessId: string;
  onCreateNew: () => void;
  onEdit: (sequenceId: string) => void;
}

interface EmailSequence {
  id: string;
  name: string;
  description: string | null;
  target_type: string;
  status: string;
  total_enrolled: number;
  total_completed: number;
  created_at: string;
  updated_at: string;
  step_count?: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ElementType }> = {
  draft: { label: 'Draft', variant: 'outline', icon: Clock },
  active: { label: 'Active', variant: 'default', icon: Play },
  paused: { label: 'Paused', variant: 'secondary', icon: Pause },
  completed: { label: 'Completed', variant: 'default', icon: CheckCircle2 },
  archived: { label: 'Archived', variant: 'secondary', icon: Archive },
};

export function EmailSequencesList({
  businessId,
  onCreateNew,
  onEdit,
}: EmailSequencesListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // Fetch sequences with step counts
  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['email-sequences', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaign_sequences')
        .select(`
          *,
          email_campaign_sequence_steps(count)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((seq: any) => ({
        ...seq,
        step_count: seq.email_campaign_sequence_steps?.[0]?.count || 0,
      })) as EmailSequence[];
    },
    enabled: !!businessId,
  });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('email_campaign_sequences')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-sequences'] });
      toast({ title: 'Status Updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete mutation
  const deleteSequence = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_campaign_sequences')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-sequences'] });
      toast({ title: 'Sequence Deleted' });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Duplicate mutation
  const duplicateSequence = useMutation({
    mutationFn: async (id: string) => {
      // Get original sequence
      const { data: original, error: fetchError } = await supabase
        .from('email_campaign_sequences')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Create copy
      const { data: newSeq, error: insertError } = await supabase
        .from('email_campaign_sequences')
        .insert({
          business_id: original.business_id,
          name: `${original.name} (copy)`,
          description: original.description,
          target_type: original.target_type,
          target_tags: original.target_tags,
          target_segment_id: original.target_segment_id,
          status: 'draft',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Copy steps
      const { data: steps, error: stepsError } = await supabase
        .from('email_campaign_sequence_steps')
        .select('*')
        .eq('sequence_id', id)
        .order('step_order');

      if (stepsError) throw stepsError;

      if (steps && steps.length > 0) {
        const newSteps = steps.map((step: any) => ({
          sequence_id: newSeq.id,
          step_order: step.step_order,
          name: step.name,
          subject: step.subject,
          preview_text: step.preview_text,
          content_html: step.content_html,
          content_text: step.content_text,
          delay_value: step.delay_value,
          delay_unit: step.delay_unit,
          delay_from: step.delay_from,
          skip_weekends: step.skip_weekends,
          is_active: step.is_active,
        }));

        await supabase.from('email_campaign_sequence_steps').insert(newSteps);
      }

      return newSeq;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-sequences'] });
      toast({ title: 'Sequence Duplicated' });
      onEdit(data.id);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (sequences.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Mail className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Email Sequences Yet</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            Create automated email sequences to nurture leads and engage customers with multi-step campaigns.
          </p>
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Sequence
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Email Sequences</CardTitle>
            <CardDescription>
              Automated multi-email campaigns with timed delays
            </CardDescription>
          </div>
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Sequence
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sequence</TableHead>
                <TableHead>Emails</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sequences.map((sequence) => (
                <TableRow key={sequence.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{sequence.name}</div>
                      {sequence.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {sequence.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {sequence.step_count || 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {sequence.total_enrolled}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      {sequence.total_completed}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(sequence.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(sequence.updated_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(sequence.id)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateSequence.mutate(sequence.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {sequence.status === 'draft' && (
                          <DropdownMenuItem
                            onClick={() => updateStatus.mutate({ id: sequence.id, status: 'active' })}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Activate
                          </DropdownMenuItem>
                        )}
                        {sequence.status === 'active' && (
                          <DropdownMenuItem
                            onClick={() => updateStatus.mutate({ id: sequence.id, status: 'paused' })}
                          >
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </DropdownMenuItem>
                        )}
                        {sequence.status === 'paused' && (
                          <DropdownMenuItem
                            onClick={() => updateStatus.mutate({ id: sequence.id, status: 'active' })}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Resume
                          </DropdownMenuItem>
                        )}
                        {sequence.status !== 'archived' && (
                          <DropdownMenuItem
                            onClick={() => updateStatus.mutate({ id: sequence.id, status: 'archived' })}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteId(sequence.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sequence?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the sequence and all its emails. Contacts already enrolled
              will no longer receive future emails in this sequence. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteSequence.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Sequence
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
