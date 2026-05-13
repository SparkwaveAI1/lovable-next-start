import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader, PageContent } from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, ArrowRight, Brain, Clock3, Mail, MessageSquare, Phone, Search, Target, Users, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Contact = {
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
};

type EmailSend = {
  id: string;
  to_email: string | null;
  subject: string | null;
  status: string | null;
  created_at: string | null;
  sent_at: string | null;
  contact_id: string | null;
};

type EmailReply = {
  id: string;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  status: string | null;
  received_at: string | null;
  contact_id: string | null;
};

type SmsMessage = {
  id: string;
  direction: string | null;
  message: string | null;
  created_at: string;
  contact_id: string | null;
  thread_id: string | null;
};

const statusClassName: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  new_lead: 'bg-blue-100 text-blue-700 border-blue-200',
  lead: 'bg-blue-100 text-blue-700 border-blue-200',
  qualified: 'bg-green-100 text-green-700 border-green-200',
  trial: 'bg-amber-100 text-amber-700 border-amber-200',
  member: 'bg-purple-100 text-purple-700 border-purple-200',
  active_member: 'bg-purple-100 text-purple-700 border-purple-200',
  inactive: 'bg-slate-100 text-slate-500 border-slate-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

function formatName(contact: Contact) {
  return [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email || contact.phone || 'Unnamed contact';
}

function formatRelative(value: string | null | undefined) {
  if (!value) return 'No activity yet';
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

function normalizeStatus(value: string | null | undefined) {
  if (!value) return 'unknown';
  return value.replace(/_/g, ' ');
}

export default function CRM() {
  const { selectedBusiness } = useBusinessContext();
  const [search, setSearch] = useState('');

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['crm-control-plane-contacts', selectedBusiness?.id],
    queryFn: async () => {
      if (!selectedBusiness?.id) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, source, status, pipeline_stage, tags, last_activity_date, created_at')
        .eq('business_id', selectedBusiness.id)
        .order('last_activity_date', { ascending: false, nullsFirst: false })
        .limit(500);

      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!selectedBusiness?.id,
  });

  const contactIds = useMemo(() => contacts.map(contact => contact.id), [contacts]);

  const { data: recentSms = [] } = useQuery({
    queryKey: ['crm-control-plane-sms', selectedBusiness?.id],
    queryFn: async () => {
      if (!selectedBusiness?.id) return [];
      const { data: threads, error: threadsError } = await supabase
        .from('conversation_threads')
        .select('id')
        .eq('business_id', selectedBusiness.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (threadsError) throw threadsError;
      const threadIds = (threads || []).map(thread => thread.id);
      if (threadIds.length === 0) return [];

      const { data, error } = await supabase
        .from('sms_messages')
        .select('id, direction, message, created_at, contact_id, thread_id')
        .in('thread_id', threadIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as SmsMessage[];
    },
    enabled: !!selectedBusiness?.id,
    refetchInterval: 30000,
  });

  const { data: recentEmails = [] } = useQuery({
    queryKey: ['crm-control-plane-emails', selectedBusiness?.id, contactIds],
    queryFn: async () => {
      if (!selectedBusiness?.id || contactIds.length === 0) return [];
      const { data, error } = await supabase
        .from('email_sends')
        .select('id, to_email, subject, status, created_at, sent_at, contact_id')
        .in('contact_id', contactIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as EmailSend[];
    },
    enabled: !!selectedBusiness?.id && contactIds.length > 0,
    refetchInterval: 30000,
  });

  const { data: recentReplies = [] } = useQuery({
    queryKey: ['crm-control-plane-email-replies', selectedBusiness?.id],
    queryFn: async () => {
      if (!selectedBusiness?.id) return [];
      const { data, error } = await supabase
        .from('email_replies')
        .select('id, from_email, from_name, subject, status, received_at, contact_id')
        .eq('business_id', selectedBusiness.id)
        .order('received_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as EmailReply[];
    },
    enabled: !!selectedBusiness?.id,
    refetchInterval: 30000,
  });

  const contactById = useMemo(() => new Map(contacts.map(contact => [contact.id, contact])), [contacts]);

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;

    return contacts.filter(contact => {
      const haystack = [
        contact.first_name,
        contact.last_name,
        contact.email,
        contact.phone,
        contact.source,
        contact.status,
        contact.pipeline_stage,
        ...(contact.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [contacts, search]);

  const stats = useMemo(() => {
    const leadStatuses = ['lead', 'new_lead', 'qualified', 'trial'];
    const activeContacts = contacts.filter(contact => ['active', ...leadStatuses, 'member', 'active_member'].includes(contact.status || '')).length;
    const newLeads = contacts.filter(contact => leadStatuses.includes(contact.status || '') || (contact.pipeline_stage || '').toLowerCase().includes('lead')).length;
    const withEmail = contacts.filter(contact => !!contact.email).length;
    const withPhone = contacts.filter(contact => !!contact.phone).length;
    const needsFollowUp = contacts.filter(contact => !contact.last_activity_date).length;
    const booked = contacts.filter(contact => {
      const stage = `${contact.pipeline_stage || ''} ${contact.status || ''}`.toLowerCase();
      return stage.includes('book') || stage.includes('appointment') || stage.includes('consult');
    }).length;

    return { activeContacts, newLeads, withEmail, withPhone, needsFollowUp, booked };
  }, [contacts]);

  const recentActivity = useMemo(() => {
    const sms = recentSms.map(item => ({
      id: `sms-${item.id}`,
      channel: 'SMS',
      contactId: item.contact_id,
      title: item.message || 'SMS message',
      subtitle: item.direction === 'inbound' ? 'Inbound SMS' : 'Outbound SMS',
      at: item.created_at,
    }));

    const emailSends = recentEmails.map(item => ({
      id: `email-${item.id}`,
      channel: 'Email',
      contactId: item.contact_id,
      title: item.subject || 'Email sent',
      subtitle: item.to_email || item.status || 'Outbound email',
      at: item.created_at || item.sent_at || '',
    }));

    const replies = recentReplies.map(item => ({
      id: `reply-${item.id}`,
      channel: 'Reply',
      contactId: item.contact_id,
      title: item.subject || 'Email reply',
      subtitle: item.from_name || item.from_email || item.status || 'Inbound email',
      at: item.received_at || '',
    }));

    return [...sms, ...emailSends, ...replies]
      .filter(item => !!item.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8);
  }, [recentEmails, recentReplies, recentSms]);

  const leadsAtRisk = useMemo(() => {
    const now = Date.now();
    const activityByContact = new Map<string, number>();
    const inboundReplyContactIds = new Set(recentReplies.map(reply => reply.contact_id).filter(Boolean));

    [...recentSms, ...recentEmails, ...recentReplies].forEach(item => {
      const contactId = item.contact_id;
      const activityAt = 'received_at' in item ? item.received_at : 'sent_at' in item ? (item.sent_at || item.created_at) : item.created_at;
      if (!contactId || !activityAt) return;
      activityByContact.set(contactId, Math.max(activityByContact.get(contactId) || 0, new Date(activityAt).getTime()));
    });

    return contacts
      .map(contact => {
        const statusText = `${contact.status || ''} ${contact.pipeline_stage || ''}`.toLowerCase();
        const isLead = ['lead', 'new_lead', 'qualified', 'trial', 'opportunity'].some(term => statusText.includes(term));
        if (!isLead) return null;

        const lastKnownTouch = activityByContact.get(contact.id) || (contact.last_activity_date ? new Date(contact.last_activity_date).getTime() : 0);
        const hoursSinceTouch = lastKnownTouch ? Math.floor((now - lastKnownTouch) / 3600000) : null;
        const reasons: string[] = [];
        const nextActions: string[] = [];

        if (inboundReplyContactIds.has(contact.id)) {
          reasons.push('Inbound reply waiting');
          nextActions.push('Review and route the reply');
        }
        if (!lastKnownTouch) {
          reasons.push('No response evidence');
          nextActions.push('Confirm first response path');
        } else if (hoursSinceTouch !== null && hoursSinceTouch >= 24) {
          reasons.push(`No activity in ${hoursSinceTouch >= 48 ? `${Math.floor(hoursSinceTouch / 24)} days` : '24h'}`);
          nextActions.push('Draft or schedule follow-up');
        }
        if (!statusText.includes('book') && !statusText.includes('consult') && !statusText.includes('appointment')) {
          reasons.push('Booked signal missing');
          nextActions.push('Check booking or handoff status');
        }
        if (!contact.phone && !contact.email) {
          reasons.push('No reachable channel');
          nextActions.push('Fix contact details before outreach');
        }

        if (reasons.length === 0) return null;

        return {
          contact,
          riskReason: reasons.slice(0, 2).join(' · '),
          nextAction: nextActions[0] || 'Review lead status',
          lastTouch: lastKnownTouch ? new Date(lastKnownTouch).toISOString() : null,
        };
      })
      .filter((item): item is { contact: Contact; riskReason: string; nextAction: string; lastTouch: string | null } => Boolean(item))
      .sort((a, b) => (a.lastTouch ? new Date(a.lastTouch).getTime() : 0) - (b.lastTouch ? new Date(b.lastTouch).getTime() : 0))
      .slice(0, 6);
  }, [contacts, recentEmails, recentReplies, recentSms]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Lead Dashboard"
        description="Stop losing leads: track new inquiries, follow-up gaps, communications, and booking signals from the CRM source of truth."
      />
      <PageContent>
        <div className="mb-6 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                <Target className="h-3.5 w-3.5" /> AI Growth Hub lead engine
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Every lead needs a next action.</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                This is the demo-safe front door: show inquiries, response evidence, stale records, and where speed-to-lead automation takes over.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/fight-flow"><Zap className="mr-2 h-4 w-4" /> Speed-to-lead</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/analytics"><Brain className="mr-2 h-4 w-4" /> Business Brain</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5 mb-6">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <Users className="h-5 w-5 text-blue-600" />
                <Badge variant="outline">Contacts</Badge>
              </div>
              <div className="text-2xl font-bold mt-3">{contacts.length.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">total in selected business</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <Target className="h-5 w-5 text-indigo-600" />
                <Badge>Leads</Badge>
              </div>
              <div className="text-2xl font-bold mt-3">{stats.newLeads.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">lead-stage records</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <Clock3 className="h-5 w-5 text-amber-600" />
                <Badge variant="outline">Follow-up</Badge>
              </div>
              <div className="text-2xl font-bold mt-3">{stats.needsFollowUp.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">missing activity date</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <Phone className="h-5 w-5 text-emerald-600" />
                <Badge variant="outline">Phone</Badge>
              </div>
              <div className="text-2xl font-bold mt-3">{stats.withPhone.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">can receive SMS/calls</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <Mail className="h-5 w-5 text-cyan-600" />
                <Badge variant="outline">Booked</Badge>
              </div>
              <div className="text-2xl font-bold mt-3">{stats.booked.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">booking/consult signals</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 border-amber-200 bg-amber-50/40">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Leads at risk right now
                  <Badge variant="outline">{leadsAtRisk.length.toLocaleString()}</Badge>
                </CardTitle>
                <CardDescription>
                  Demo-safe next-action queue: lead records with missing response evidence, stale activity, inbound replies, or missing booking signals.
                </CardDescription>
              </div>
              <Button asChild variant="outline">
                <Link to="/communications">Review communications</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {leadsAtRisk.length === 0 ? (
              <div className="rounded-lg border border-dashed border-amber-200 bg-white/70 p-4 text-sm text-muted-foreground">
                No lead-risk rows found from the current sample. On a live install, this panel shows who needs the next touch before they slip.
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {leadsAtRisk.map(({ contact, riskReason, nextAction, lastTouch }) => (
                  <div key={contact.id} className="rounded-xl border border-amber-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{formatName(contact)}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {contact.source && <span>Source: {contact.source}</span>}
                          <span>Last touch: {formatRelative(lastTouch)}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">At risk</Badge>
                    </div>
                    <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                      <div className="font-medium">{riskReason}</div>
                      <div className="mt-1 text-amber-800">Next action: {nextAction}</div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/contacts?contact=${contact.id}`}>Open contact</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/communications">View activity</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search contacts by name, email, phone, source, status, or tag..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/communications">Open communications</Link>
            </Button>
            <Button asChild>
              <Link to="/contacts">Open contacts</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Contacts source of truth
                <Badge variant="outline">{filteredContacts.length.toLocaleString()}</Badge>
              </CardTitle>
              <CardDescription>
                Manage records in /contacts; use this page to reconcile CRM readiness against current communication activity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contactsLoading ? (
                <div className="py-10 text-center text-muted-foreground">Loading contacts...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Last activity</TableHead>
                        <TableHead>Tags</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts.slice(0, 100).map(contact => (
                        <TableRow key={contact.id}>
                          <TableCell>
                            <div className="font-medium">{formatName(contact)}</div>
                            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-1">
                              {contact.email && <span>{contact.email}</span>}
                              {contact.phone && <span>{contact.phone}</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`capitalize ${statusClassName[contact.status || ''] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              {normalizeStatus(contact.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize text-sm text-muted-foreground">{contact.source || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatRelative(contact.last_activity_date)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(contact.tags || []).slice(0, 3).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                              ))}
                              {(contact.tags || []).length > 3 && (
                                <Badge variant="outline" className="text-xs">+{(contact.tags || []).length - 3}</Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredContacts.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                            No contacts match this search.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {filteredContacts.length > 100 && (
                    <p className="text-center text-sm text-muted-foreground mt-3">
                      Showing 100 of {filteredContacts.length.toLocaleString()} contacts. Refine search to narrow the list.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-teal-600" />
                  Recent communications
                </CardTitle>
                <CardDescription>Latest SMS, sent email, and inbound reply activity tied back to contacts when available.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivity.map(item => {
                  const contact = item.contactId ? contactById.get(item.contactId) : null;
                  return (
                    <div key={item.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{item.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{contact ? formatName(contact) : item.subtitle}</div>
                        </div>
                        <Badge variant="outline">{item.channel}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">{formatRelative(item.at)}</div>
                    </div>
                  );
                })}
                {recentActivity.length === 0 && (
                  <div className="text-sm text-muted-foreground py-6 text-center">No recent communications found.</div>
                )}
                <Button asChild variant="outline" className="w-full">
                  <Link to="/communications" className="flex items-center justify-center gap-2">
                    Review full communications timeline <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reconciliation guardrails</CardTitle>
                <CardDescription>Current CRM operating rules for the Growth OS revision.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>1. Contacts are the canonical person record; do not create new prospect-only CRM rows from this page.</p>
                <p>2. Communications are read from live email/SMS tables and shown as activity evidence, not duplicated into CRM-only interaction tables.</p>
                <p>3. Use /contacts for record edits and /communications for outbound/inbound review until a dedicated contact detail route is approved.</p>
                {stats.needsFollowUp > 0 && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-amber-800">
                    {stats.needsFollowUp.toLocaleString()} contacts have no recorded last activity date. Treat these as candidates for follow-up hygiene, not automatic outreach.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </DashboardLayout>
  );
}
