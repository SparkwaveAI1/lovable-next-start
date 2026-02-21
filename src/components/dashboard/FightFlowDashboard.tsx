import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format, subHours } from 'date-fns';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface UrgentThread {
  id: string;
  contact_id: string;
  conversation_state: string | null;
  needs_human_review: boolean;
  updated_at: string;
  contacts: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  } | null;
}

interface FightFlowAppointment {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  session_start: string | null;
  service_name: string | null;
}

interface RecentContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  status: string | null;
  last_activity_at: string | null;
}

interface AppointmentWithStatus extends FightFlowAppointment {
  lead_status: string | null;
  auto_responded: boolean;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface FightFlowDashboardProps {
  businessId: string;
  onContactClick: (contactId: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayET(): string {
  const raw = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
  // raw = "M/D/YYYY" → convert to YYYY-MM-DD
  const [month, day, year] = raw.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function displayName(first: string | null, last: string | null): string {
  return `${first ?? ''} ${last ?? ''}`.trim() || 'Unknown';
}

// ─── Status Badge Helper ──────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: string | null;
}

function LeadStatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case 'new_lead':
      return <Badge className="bg-orange-100 text-orange-800 border-orange-300">New Lead</Badge>;
    case 'contacted':
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Contacted</Badge>;
    case 'responded':
      return <Badge className="bg-green-100 text-green-800 border-green-300 font-bold">Responded</Badge>;
    case 'converted':
      return <Badge className="bg-green-700 text-white border-green-800">Converted</Badge>;
    case 'closed':
      return <Badge className="bg-gray-100 text-gray-600 border-gray-300">Closed</Badge>;
    default:
      return <Badge variant="secondary">{status ?? '—'}</Badge>;
  }
}

// ─── Panel 1: Needs Your Attention ───────────────────────────────────────────

function NeedsAttentionPanel({
  businessId,
  onContactClick,
}: {
  businessId: string;
  onContactClick: (id: string) => void;
}) {
  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['ff-urgent-threads', businessId],
    queryFn: async (): Promise<UrgentThread[]> => {
      const { data, error } = await supabase
        .from('conversation_threads')
        .select(`
          id,
          contact_id,
          conversation_state,
          needs_human_review,
          updated_at,
          contacts (
            id,
            first_name,
            last_name,
            phone
          )
        `)
        .eq('business_id', businessId)
        .or('needs_human_review.eq.true,conversation_state.eq.hot_re_engagement')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching urgent threads:', error);
        return [];
      }

      return (data ?? []) as UrgentThread[];
    },
    enabled: !!businessId,
    refetchInterval: 30000,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>🔥 Needs Your Attention</span>
          {threads.length > 0 && (
            <Badge className="bg-red-100 text-red-800 border-red-300">
              {threads.length} urgent
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <p className="text-green-600 font-medium py-4 text-center">
            ✅ No urgent leads right now
          </p>
        ) : (
          <div className="space-y-3">
            {threads.map(thread => {
              const contact = thread.contacts;
              const isHotRe = thread.conversation_state === 'hot_re_engagement';
              const isHumanReview = thread.needs_human_review;
              const name = contact
                ? displayName(contact.first_name, contact.last_name)
                : 'Unknown';

              return (
                <div
                  key={thread.id}
                  onClick={() => onContactClick(thread.contact_id)}
                  className="flex items-start justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900">{name}</span>
                      {contact?.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          onClick={e => e.stopPropagation()}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {contact.phone}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {isHotRe && (
                        <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                          Hot Re-engagement
                        </Badge>
                      )}
                      {isHumanReview && (
                        <Badge className="bg-red-100 text-red-800 border-red-300">
                          Needs Human
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2 mt-1">
                    {formatDistanceToNow(new Date(thread.updated_at), { addSuffix: true })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Panel 2: Today's Trial Classes ──────────────────────────────────────────

function TrialClassesPanel() {
  const todayET = getTodayET();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['ff-trial-classes', todayET],
    queryFn: async (): Promise<AppointmentWithStatus[]> => {
      // Fetch today's appointments
      const { data: appts, error: apptError } = await supabase
        .from('fightflow_appointments')
        .select('id, contact_name, contact_phone, contact_email, session_start, service_name')
        .gte('session_start', `${todayET}T00:00:00`)
        .lte('session_start', `${todayET}T23:59:59`)
        .order('session_start', { ascending: true });

      if (apptError) {
        console.error('Error fetching appointments:', apptError);
        return [];
      }

      if (!appts || appts.length === 0) return [];

      // Build phone / email lookup arrays
      const phones = appts.map(a => a.contact_phone).filter((p): p is string => !!p);
      const emails = appts.map(a => a.contact_email).filter((e): e is string => !!e);

      // Fetch matching contacts
      let contactRows: { phone: string | null; email: string | null; status: string | null; auto_responded: boolean | null }[] = [];

      if (phones.length > 0 || emails.length > 0) {
        let query = supabase
          .from('contacts')
          .select('phone, email, status, auto_responded');

        if (phones.length > 0 && emails.length > 0) {
          query = query.or(`phone.in.(${phones.join(',')}),email.in.(${emails.join(',')})`);
        } else if (phones.length > 0) {
          query = query.in('phone', phones);
        } else {
          query = query.in('email', emails);
        }

        const { data: contacts } = await query;
        contactRows = (contacts ?? []) as typeof contactRows;
      }

      // Build lookup map: phone/email → status + auto_responded
      const statusByPhone = new Map<string, { status: string | null; auto_responded: boolean }>();
      const statusByEmail = new Map<string, { status: string | null; auto_responded: boolean }>();
      for (const c of contactRows) {
        if (c.phone) statusByPhone.set(c.phone, { status: c.status, auto_responded: c.auto_responded ?? false });
        if (c.email) statusByEmail.set(c.email, { status: c.status, auto_responded: c.auto_responded ?? false });
      }

      return appts.map(a => {
        const match =
          (a.contact_phone ? statusByPhone.get(a.contact_phone) : undefined) ??
          (a.contact_email ? statusByEmail.get(a.contact_email) : undefined);
        return {
          ...a,
          lead_status: match?.status ?? null,
          auto_responded: match?.auto_responded ?? false,
        };
      });
    },
    enabled: true,
    refetchInterval: 60000,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">📅 Today's Trial Classes</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse h-24 bg-gray-100 rounded-lg" />
        ) : appointments.length === 0 ? (
          <p className="text-gray-500 py-4 text-center">No classes scheduled for today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Time</th>
                  <th className="pb-2 pr-4 font-medium">Service</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Auto-responded?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map(appt => (
                  <tr key={appt.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-900">
                      {appt.contact_name ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-gray-600">
                      {appt.session_start ? new Date(appt.session_start).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-2 pr-4 text-gray-600">
                      {appt.service_name ?? '—'}
                    </td>
                    <td className="py-2 pr-4">
                      <LeadStatusBadge status={appt.lead_status} />
                    </td>
                    <td className="py-2">
                      {appt.auto_responded ? (
                        <span className="text-green-600 font-medium">✓ Yes</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Panel 3: Last 72 Hours ───────────────────────────────────────────────────

function RecentLeadsPanel({
  businessId,
  onContactClick,
}: {
  businessId: string;
  onContactClick: (id: string) => void;
}) {
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['ff-recent-leads', businessId],
    queryFn: async (): Promise<RecentContact[]> => {
      const since = subHours(new Date(), 72).toISOString();

      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, phone, created_at, status, last_activity_at')
        .eq('business_id', businessId)
        .gte('created_at', since)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recent contacts:', error);
        return [];
      }

      return (data ?? []) as RecentContact[];
    },
    enabled: !!businessId,
    refetchInterval: 60000,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>🆕 Last 72 Hours</span>
          {contacts.length > 0 && (
            <Badge variant="secondary">{contacts.length} leads</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse h-24 bg-gray-100 rounded-lg" />
        ) : contacts.length === 0 ? (
          <p className="text-gray-500 py-4 text-center">No new leads in the last 72 hours.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Submitted</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Last Activity</th>
                  <th className="pb-2 font-medium">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.map(contact => (
                  <tr
                    key={contact.id}
                    onClick={() => onContactClick(contact.id)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="py-2 pr-4 font-medium text-gray-900">
                      {displayName(contact.first_name, contact.last_name)}
                    </td>
                    <td className="py-2 pr-4 text-gray-600">
                      {formatDistanceToNow(new Date(contact.created_at), { addSuffix: true })}
                    </td>
                    <td className="py-2 pr-4">
                      <LeadStatusBadge status={contact.status} />
                    </td>
                    <td className="py-2 pr-4 text-gray-600">
                      {contact.last_activity_at
                        ? formatDistanceToNow(new Date(contact.last_activity_at), { addSuffix: true })
                        : '—'}
                    </td>
                    <td className="py-2">
                      {contact.phone ? (
                        <a
                          href={`tel:${contact.phone}`}
                          onClick={e => e.stopPropagation()}
                          className="text-blue-600 hover:underline"
                        >
                          {contact.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function FightFlowDashboard({ businessId, onContactClick }: FightFlowDashboardProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Fight Flow At-a-Glance</h2>
      <NeedsAttentionPanel businessId={businessId} onContactClick={onContactClick} />
      <TrialClassesPanel />
      <RecentLeadsPanel businessId={businessId} onContactClick={onContactClick} />
    </div>
  );
}
