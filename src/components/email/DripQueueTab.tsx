import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Plus,
  Mail,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface DripQueueEntry {
  id: string;
  contact_email: string;
  contact_name: string | null;
  drip_stage: number | null;
  next_send_at: string | null;
  last_sent_at: string | null;
  completed: boolean | null;
  created_at: string | null;
}

interface Contact {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface DripQueueTabProps {
  businessId: string;
}

const DRIP_STAGE_LABELS: Record<number, string> = {
  0: 'Day 1',
  1: 'Day 2',
  2: 'Day 5',
  3: 'Day 9',
  4: 'Day 14',
};

export function DripQueueTab({ businessId }: DripQueueTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [contactSource, setContactSource] = useState<'pick' | 'manual'>('pick');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [nextSendAt, setNextSendAt] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // datetime-local format
  });

  // Fetch drip queue entries
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['email-drip-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_drip_queue')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DripQueueEntry[];
    },
  });

  // Fetch contacts for dropdown
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-for-drip', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, email, first_name, last_name')
        .eq('business_id', businessId)
        .not('email', 'is', null)
        .order('first_name', { ascending: true })
        .limit(200);
      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!businessId,
  });

  // Enroll mutation
  const enrollMutation = useMutation({
    mutationFn: async (payload: {
      contact_email: string;
      contact_name: string | null;
      next_send_at: string;
    }) => {
      const { error } = await supabase.from('email_drip_queue').insert({
        contact_email: payload.contact_email,
        contact_name: payload.contact_name,
        drip_stage: 0,
        next_send_at: payload.next_send_at,
        completed: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-drip-queue'] });
      toast({ title: 'Contact Enrolled', description: 'Contact added to drip sequence.' });
      setIsEnrollOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Enrollment Failed', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setContactSource('pick');
    setSelectedContactId('');
    setManualEmail('');
    setManualName('');
    setNextSendAt(new Date().toISOString().slice(0, 16));
  };

  const handleEnroll = () => {
    let email = '';
    let name: string | null = null;

    if (contactSource === 'pick') {
      const contact = contacts.find((c) => c.id === selectedContactId);
      if (!contact?.email) {
        toast({ title: 'Select a contact', variant: 'destructive' });
        return;
      }
      email = contact.email;
      name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || null;
    } else {
      if (!manualEmail || !manualEmail.includes('@')) {
        toast({ title: 'Enter a valid email', variant: 'destructive' });
        return;
      }
      email = manualEmail.trim();
      name = manualName.trim() || null;
    }

    enrollMutation.mutate({
      contact_email: email,
      contact_name: name,
      next_send_at: new Date(nextSendAt).toISOString(),
    });
  };

  const activeCount = entries.filter((e) => !e.completed).length;
  const completedCount = entries.filter((e) => e.completed).length;

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Email Drip Queue</h3>
            <p className="text-sm text-muted-foreground">
              Contacts enrolled in automated multi-day email sequences.
            </p>
          </div>
          <Button onClick={() => setIsEnrollOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Enroll Contact
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{entries.length}</p>
                  <p className="text-xs text-muted-foreground">Total Enrolled</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{completedCount}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Queue</CardTitle>
            <CardDescription>All contacts enrolled in the drip sequence</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Mail className="h-10 w-10 text-muted-foreground mb-3" />
                <h4 className="font-medium mb-1">No contacts enrolled yet</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Enroll a contact to start the automated email drip sequence.
                </p>
                <Button variant="outline" onClick={() => setIsEnrollOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Enroll First Contact
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Next Send</TableHead>
                    <TableHead>Last Sent</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{entry.contact_name || '—'}</div>
                          <div className="text-sm text-muted-foreground">{entry.contact_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {DRIP_STAGE_LABELS[entry.drip_stage ?? 0] ?? `Stage ${entry.drip_stage ?? 0}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.next_send_at
                          ? formatDistanceToNow(new Date(entry.next_send_at), { addSuffix: true })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.last_sent_at
                          ? formatDistanceToNow(new Date(entry.last_sent_at), { addSuffix: true })
                          : 'Not sent yet'}
                      </TableCell>
                      <TableCell>
                        {entry.completed ? (
                          <Badge variant="default" className="flex items-center gap-1 w-fit">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                            <Clock className="h-3 w-3" />
                            Active
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enroll Dialog */}
      <Dialog open={isEnrollOpen} onOpenChange={(open) => { setIsEnrollOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enroll Contact in Drip Sequence</DialogTitle>
            <DialogDescription>
              Add a contact to the automated email drip sequence. Emails will be sent at Day 1, 2, 5, 9, and 14.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Source selector */}
            <div className="flex gap-2">
              <Button
                variant={contactSource === 'pick' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setContactSource('pick')}
              >
                Pick from Contacts
              </Button>
              <Button
                variant={contactSource === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setContactSource('manual')}
              >
                Enter Manually
              </Button>
            </div>

            {contactSource === 'pick' ? (
              <div className="space-y-2">
                <Label>Contact</Label>
                <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contact..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email} — {c.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {contacts.length === 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    No contacts with email addresses found.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="drip-email">Email *</Label>
                  <Input
                    id="drip-email"
                    type="email"
                    placeholder="contact@example.com"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="drip-name">Name (optional)</Label>
                  <Input
                    id="drip-name"
                    placeholder="First Last"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="drip-start">Start Sending At</Label>
              <Input
                id="drip-start"
                type="datetime-local"
                value={nextSendAt}
                onChange={(e) => setNextSendAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                First email will be queued for this time. Leave as-is to start immediately.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEnrollOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleEnroll} disabled={enrollMutation.isPending}>
              {enrollMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enroll Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
