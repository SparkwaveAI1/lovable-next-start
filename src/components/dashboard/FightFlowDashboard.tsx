import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { differenceInSeconds, format, formatDistanceToNow, parseISO, subDays } from 'date-fns';
import { AlertTriangle, CalendarCheck, Clock, Mail, MessageSquare, ShieldCheck, UserRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface FightFlowDashboardProps {
  businessId: string;
  onContactClick: (contactId: string) => void;
}

interface FightFlowSubmission {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  subject: string | null;
  source: string | null;
  status: string | null;
  submitted_at: string;
  auto_responded: boolean | null;
  auto_response_sent_at: string | null;
  alerted: boolean | null;
}

interface FightFlowAppointment {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  session_start: string | null;
  service_name: string | null;
}

interface QueueMessage {
  id: string;
  message_type: 'sms' | 'email';
  recipient_name: string | null;
  recipient_contact: string;
  status: string;
  created_at: string;
  sent_at: string | null;
}

function leadName(lead: FightFlowSubmission): string {
  return `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() || lead.email || lead.phone || 'Unknown lead';
}

function formatResponseTime(lead: FightFlowSubmission): string {
  if (!lead.auto_response_sent_at) return 'No first response logged';

  const seconds = differenceInSeconds(parseISO(lead.auto_response_sent_at), parseISO(lead.submitted_at));
  if (seconds < 60) return `${Math.max(seconds, 0)} sec`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.round(minutes / 60)} hr`;
}

function slaState(lead: FightFlowSubmission): { label: string; className: string } {
  if (!lead.auto_response_sent_at) {
    return { label: 'Needs response evidence', className: 'bg-red-100 text-red-800 border-red-300' };
  }

  const seconds = differenceInSeconds(parseISO(lead.auto_response_sent_at), parseISO(lead.submitted_at));
  if (seconds <= 300) {
    return { label: 'Inside 5-min SLA', className: 'bg-green-100 text-green-800 border-green-300' };
  }
  if (seconds <= 900) {
    return { label: 'Late but recovered', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
  }
  return { label: 'SLA miss', className: 'bg-red-100 text-red-800 border-red-300' };
}

function LeadStatusBadge({ lead }: { lead: FightFlowSubmission }) {
  const state = slaState(lead);
  return <Badge className={state.className}>{state.label}</Badge>;
}

export function FightFlowDashboard({ businessId }: FightFlowDashboardProps) {
  const since = useMemo(() => subDays(new Date(), 30).toISOString(), []);
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['lead-response-fightflow-submissions', since],
    queryFn: async (): Promise<FightFlowSubmission[]> => {
      const { data, error } = await supabase
        .from('fightflow_form_submissions')
        .select('id, first_name, last_name, phone, email, message, subject, source, status, submitted_at, auto_responded, auto_response_sent_at, alerted')
        .gte('submitted_at', since)
        .order('submitted_at', { ascending: false })
        .limit(25);

      if (error) throw error;
      return (data ?? []) as FightFlowSubmission[];
    },
    refetchInterval: 60000,
  });

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['lead-response-fightflow-appointments', today],
    queryFn: async (): Promise<FightFlowAppointment[]> => {
      const { data, error } = await supabase
        .from('fightflow_appointments')
        .select('id, contact_name, contact_phone, contact_email, session_start, service_name')
        .gte('session_start', `${today}T00:00:00`)
        .lte('session_start', `${today}T23:59:59`)
        .order('session_start', { ascending: true });

      if (error) throw error;
      return (data ?? []) as FightFlowAppointment[];
    },
    refetchInterval: 60000,
  });

  const { data: queue = [], isLoading: queueLoading } = useQuery({
    queryKey: ['lead-response-message-queue', businessId],
    queryFn: async (): Promise<QueueMessage[]> => {
      const { data, error } = await supabase
        .from('outbound_message_queue')
        .select('id, message_type, recipient_name, recipient_contact, status, created_at, sent_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data ?? []) as QueueMessage[];
    },
    enabled: !!businessId,
    refetchInterval: 60000,
  });

  const proofLead = leads.find(lead => lead.auto_responded || lead.auto_response_sent_at) ?? leads[0];
  const responded = leads.filter(lead => !!lead.auto_response_sent_at).length;
  const alerted = leads.filter(lead => !!lead.alerted && !lead.auto_response_sent_at).length;
  const slaHits = leads.filter(lead => {
    if (!lead.auto_response_sent_at) return false;
    return differenceInSeconds(parseISO(lead.auto_response_sent_at), parseISO(lead.submitted_at)) <= 300;
  }).length;
  const pendingQueue = queue.filter(message => message.status === 'pending').length;
  const sentQueue = queue.filter(message => message.status === 'sent').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lead Response / Speed-to-Lead</h2>
          <p className="text-sm text-gray-500">
            FightFlow capture, first response, follow-up booking, quality review, and queue evidence in one surface.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-indigo-200 bg-indigo-50 text-indigo-700">
          Message Queue absorbed here
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-sm text-gray-500"><UserRound className="h-4 w-4" /> New leads</div>
            <div className="mt-2 text-3xl font-bold">{leads.length}</div>
            <div className="text-xs text-gray-400">last 30 days</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-sm text-gray-500"><Clock className="h-4 w-4" /> First responses</div>
            <div className="mt-2 text-3xl font-bold text-green-600">{responded}</div>
            <div className="text-xs text-gray-400">{slaHits} inside 5-min SLA</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-sm text-gray-500"><AlertTriangle className="h-4 w-4" /> Staff alerts</div>
            <div className="mt-2 text-3xl font-bold text-orange-600">{alerted}</div>
            <div className="text-xs text-gray-400">alerted without response evidence</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-sm text-gray-500"><CalendarCheck className="h-4 w-4" /> Today bookings</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">{appointments.length}</div>
            <div className="text-xs text-gray-400">trial/class appointments</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-green-600" /> Forward-looking proof case</CardTitle>
        </CardHeader>
        <CardContent>
          {leadsLoading ? (
            <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
          ) : !proofLead ? (
            <p className="text-sm text-gray-500">No FightFlow form submissions found for the current 30-day proof window.</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900">{leadName(proofLead)}</span>
                  <LeadStatusBadge lead={proofLead} />
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>Captured: {format(parseISO(proofLead.submitted_at), 'MMM d, h:mm a')}</div>
                  <div>First response: {proofLead.auto_response_sent_at ? format(parseISO(proofLead.auto_response_sent_at), 'MMM d, h:mm a') : 'not logged'}</div>
                  <div>Speed-to-lead: {formatResponseTime(proofLead)}</div>
                  <div>Source: {proofLead.source ?? 'FightFlow form'}</div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                {[
                  ['1 Capture', 'Wix/FightFlow form submission recorded'],
                  ['2 First response', proofLead.auto_response_sent_at ? `Auto response sent in ${formatResponseTime(proofLead)}` : 'Response evidence missing'],
                  ['3 Follow-up / booking', appointments.length > 0 ? `${appointments.length} appointment(s) visible today` : 'No same-day booking visible yet'],
                  ['4 Quality review', proofLead.alerted ? 'Staff alert raised for review' : 'No open staff alert on proof case'],
                ].map(([step, detail]) => (
                  <div key={step} className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="text-sm font-semibold text-gray-900">{step}</div>
                    <div className="mt-1 text-xs text-gray-500">{detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Clock className="h-5 w-5 text-indigo-600" /> Speed-to-lead events</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
            ) : leads.length === 0 ? (
              <p className="text-sm text-gray-500">No lead events in the current window.</p>
            ) : (
              <div className="space-y-3">
                {leads.slice(0, 8).map(lead => (
                  <div key={lead.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-gray-900">{leadName(lead)}</div>
                      <LeadStatusBadge lead={lead} />
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      Captured {formatDistanceToNow(parseISO(lead.submitted_at), { addSuffix: true })} · Response: {formatResponseTime(lead)}
                    </div>
                    {(lead.phone || lead.email) && (
                      <div className="mt-1 text-xs text-gray-400">{lead.phone ?? lead.email}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><CalendarCheck className="h-5 w-5 text-blue-600" /> Follow-up / booking evidence</CardTitle>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
            ) : appointments.length === 0 ? (
              <p className="text-sm text-gray-500">No FightFlow appointments scheduled for today.</p>
            ) : (
              <div className="space-y-3">
                {appointments.map(appointment => (
                  <div key={appointment.id} className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-3">
                    <div>
                      <div className="font-medium text-gray-900">{appointment.contact_name ?? appointment.contact_email ?? appointment.contact_phone ?? 'Unknown appointment'}</div>
                      <div className="text-sm text-gray-500">{appointment.service_name ?? 'Class / trial booking'}</div>
                      <div className="text-xs text-gray-400">{appointment.contact_phone ?? appointment.contact_email ?? 'No contact detail'}</div>
                    </div>
                    <Badge variant="outline">
                      {appointment.session_start ? new Date(appointment.session_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) : 'time TBD'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><MessageSquare className="h-5 w-5 text-purple-600" /> Outbound message queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge variant="outline">{queue.length} recent</Badge>
            <Badge className="bg-orange-100 text-orange-800 border-orange-300">{pendingQueue} pending</Badge>
            <Badge className="bg-green-100 text-green-800 border-green-300">{sentQueue} sent</Badge>
          </div>
          {queueLoading ? (
            <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
          ) : queue.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              Standalone Message Queue has no rows for this business. It is hidden from primary navigation and represented here as part of lead response readiness.
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map(message => {
                const Icon = message.message_type === 'email' ? Mail : MessageSquare;
                return (
                  <div key={message.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">{message.recipient_name ?? message.recipient_contact}</div>
                        <div className="text-xs text-gray-500">{message.message_type.toUpperCase()} · queued {formatDistanceToNow(parseISO(message.created_at), { addSuffix: true })}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">{message.status}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm"><a href="/contacts">Open contacts</a></Button>
        <Button asChild variant="outline" size="sm"><a href="/communications">Open communications</a></Button>
      </div>
    </div>
  );
}
