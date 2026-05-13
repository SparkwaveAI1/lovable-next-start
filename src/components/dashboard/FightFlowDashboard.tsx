import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, subDays } from 'date-fns';
import { AlertTriangle, CheckCircle2, Clock, MessageSquare, Route, Zap } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ─── Interfaces ──────────────────────────────────────────────────────────────

type AutomationState = 'sent' | 'pending' | 'failed' | 'quiet';
type RiskState = 'at-risk' | 'needs-follow-up' | 'on-track';

interface SpeedToLeadContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string | null;
  status: string | null;
  status_notes: string | null;
  last_activity_date: string | null;
  sms_last_contacted: string | null;
  email_last_contacted: string | null;
  next_action: string | null;
  next_action_due_at: string | null;
  next_follow_up_date: string | null;
  owner_agent: string | null;
  owner_user: string | null;
  priority: string | null;
  source: string | null;
  source_campaign: string | null;
}

interface ConversationThread {
  id: string;
  contact_id: string;
  conversation_state: string | null;
  needs_human_review: boolean;
  updated_at: string;
}

interface AutomationLog {
  id: string;
  automation_type: string;
  status: string;
  source_data: Record<string, unknown> | null;
  processed_data: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

interface LeadOperatingRow {
  id: string;
  newLead: string;
  submittedAt: string;
  firstResponse: string;
  followUpStatus: string;
  risk: RiskState;
  recommendedAction: string;
  owner: string;
  automationState: AutomationState;
  evidence: string;
  phone: string | null;
  email: string | null;
}

interface SpeedToLeadDashboardProps {
  businessId: string;
  onContactClick: (contactId: string) => void;
  title?: string;
  subtitle?: string;
  proofLabel?: string;
}

interface FightFlowDashboardProps {
  businessId: string;
  onContactClick: (contactId: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function displayName(first: string | null, last: string | null): string {
  return `${first ?? ''} ${last ?? ''}`.trim() || 'Unknown lead';
}

function formatRelative(isoString: string | null): string {
  if (!isoString) return 'No timestamp';
  return formatDistanceToNow(new Date(isoString), { addSuffix: true });
}

function humanize(value: string | null | undefined): string {
  if (!value) return 'Not set';
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function getFirstResponse(contact: SpeedToLeadContact): string {
  const firstContact = contact.sms_last_contacted ?? contact.email_last_contacted;
  if (!firstContact) return 'Awaiting first response';
  const channel = contact.sms_last_contacted ? 'SMS' : 'Email';
  return `${channel} ${formatRelative(firstContact)}`;
}

function getAutomationState(contact: SpeedToLeadContact, logs: AutomationLog[]): AutomationState {
  const contactValues = [contact.phone, contact.email].filter(Boolean);
  const relatedLogs = logs.filter(log => {
    const raw = JSON.stringify({ source: log.source_data, processed: log.processed_data }).toLowerCase();
    return contactValues.some(value => value && raw.includes(value.toLowerCase()));
  });

  if (relatedLogs.some(log => log.status === 'error')) return 'failed';
  if (relatedLogs.some(log => log.status === 'pending')) return 'pending';
  if (relatedLogs.some(log => ['success', 'sent', 'completed'].includes(log.status))) return 'sent';
  if (contact.sms_last_contacted || contact.email_last_contacted) return 'sent';
  return 'quiet';
}

function getRisk(contact: SpeedToLeadContact, threads: ConversationThread[]): RiskState {
  const thread = threads.find(t => t.contact_id === contact.id);
  const status = (contact.status ?? '').toLowerCase();
  const priority = (contact.priority ?? '').toLowerCase();

  if (thread?.needs_human_review || thread?.conversation_state === 'hot_re_engagement' || priority === 'high') {
    return 'at-risk';
  }

  if (!contact.sms_last_contacted && !contact.email_last_contacted) return 'at-risk';
  if (status.includes('new') || status.includes('follow')) return 'needs-follow-up';
  return 'on-track';
}

function getRecommendedAction(contact: SpeedToLeadContact, risk: RiskState): string {
  if (contact.next_action) return contact.next_action;
  if (risk === 'at-risk') return 'Owner review + same-day outreach';
  if (risk === 'needs-follow-up') return 'Send scheduled follow-up';
  return 'Keep automation running';
}

function toOperatingRows(
  contacts: SpeedToLeadContact[],
  threads: ConversationThread[],
  logs: AutomationLog[],
): LeadOperatingRow[] {
  return contacts.map(contact => {
    const risk = getRisk(contact, threads);
    const firstResponse = getFirstResponse(contact);
    const followUpAt = contact.next_follow_up_date ?? contact.next_action_due_at;

    return {
      id: contact.id,
      newLead: displayName(contact.first_name, contact.last_name),
      submittedAt: formatRelative(contact.created_at),
      firstResponse,
      followUpStatus: followUpAt ? `Due ${formatRelative(followUpAt)}` : humanize(contact.status),
      risk,
      recommendedAction: getRecommendedAction(contact, risk),
      owner: contact.owner_user ?? contact.owner_agent ?? 'Unassigned',
      automationState: getAutomationState(contact, logs),
      evidence: contact.status_notes ?? contact.source_campaign ?? contact.source ?? 'CRM + automation activity',
      phone: contact.phone,
      email: contact.email,
    };
  });
}

function RiskBadge({ risk }: { risk: RiskState }) {
  const config = {
    'at-risk': 'bg-red-100 text-red-800 border-red-300',
    'needs-follow-up': 'bg-orange-100 text-orange-800 border-orange-300',
    'on-track': 'bg-green-100 text-green-800 border-green-300',
  }[risk];

  return <Badge className={config}>{humanize(risk)}</Badge>;
}

function AutomationBadge({ state }: { state: AutomationState }) {
  const config = {
    sent: 'bg-green-100 text-green-800 border-green-300',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    failed: 'bg-red-100 text-red-800 border-red-300',
    quiet: 'bg-gray-100 text-gray-700 border-gray-300',
  }[state];

  return <Badge className={config}>{humanize(state)}</Badge>;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function SpeedToLeadDashboard({
  businessId,
  onContactClick,
  title = 'Speed-to-Lead Operating View',
  subtitle = 'Generic client-demo module for response time, risk, ownership, automation state, and evidence.',
  proofLabel,
}: SpeedToLeadDashboardProps) {
  const since = useMemo(() => subDays(new Date(), 30).toISOString(), []);

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['speed-to-lead-contacts', businessId, since],
    queryFn: async (): Promise<SpeedToLeadContact[]> => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, phone, email, created_at, status, status_notes, last_activity_date, sms_last_contacted, email_last_contacted, next_action, next_action_due_at, next_follow_up_date, owner_agent, owner_user, priority, source, source_campaign')
        .eq('business_id', businessId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) {
        console.error('Error fetching speed-to-lead contacts:', error);
        return [];
      }

      return (data ?? []) as SpeedToLeadContact[];
    },
    enabled: !!businessId,
    refetchInterval: 60000,
  });

  const { data: threads = [] } = useQuery({
    queryKey: ['speed-to-lead-thread-risk', businessId],
    queryFn: async (): Promise<ConversationThread[]> => {
      const { data, error } = await supabase
        .from('conversation_threads')
        .select('id, contact_id, conversation_state, needs_human_review, updated_at')
        .eq('business_id', businessId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching speed-to-lead threads:', error);
        return [];
      }

      return (data ?? []) as ConversationThread[];
    },
    enabled: !!businessId,
    refetchInterval: 30000,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['speed-to-lead-automation-logs', businessId],
    queryFn: async (): Promise<AutomationLog[]> => {
      const { data, error } = await supabase
        .from('automation_logs')
        .select('id, automation_type, status, source_data, processed_data, error_message, created_at')
        .eq('business_id', businessId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching speed-to-lead automation logs:', error);
        return [];
      }

      return (data ?? []) as AutomationLog[];
    },
    enabled: !!businessId,
    refetchInterval: 30000,
  });

  const rows = useMemo(() => toOperatingRows(contacts, threads, logs), [contacts, threads, logs]);
  const atRisk = rows.filter(row => row.risk === 'at-risk').length;
  const responded = rows.filter(row => row.automationState === 'sent').length;
  const unowned = rows.filter(row => row.owner === 'Unassigned').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {proofLabel && <Badge variant="secondary">{proofLabel}</Badge>}
          </div>
          <p className="text-sm text-gray-600 mt-1 max-w-3xl">{subtitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge className="bg-red-100 text-red-800 border-red-300">{atRisk} at risk</Badge>
          <Badge className="bg-green-100 text-green-800 border-green-300">{responded} responded</Badge>
          {unowned > 0 && <Badge className="bg-gray-100 text-gray-700 border-gray-300">{unowned} unassigned</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">New leads</p>
              <p className="text-lg font-semibold">{rows.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-xs text-gray-500">First response sent</p>
              <p className="text-lg font-semibold">{responded}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-xs text-gray-500">Lead at risk</p>
              <p className="text-lg font-semibold">{atRisk}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Zap className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-xs text-gray-500">Automations checked</p>
              <p className="text-lg font-semibold">{logs.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Route className="h-5 w-5" />
            Lead response board
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contactsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-gray-500 py-6 text-center">No new leads found for this business in the last 30 days.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 pr-4 font-medium">New lead</th>
                    <th className="pb-2 pr-4 font-medium">First response</th>
                    <th className="pb-2 pr-4 font-medium">Follow-up status</th>
                    <th className="pb-2 pr-4 font-medium">Lead at risk</th>
                    <th className="pb-2 pr-4 font-medium">Recommended action</th>
                    <th className="pb-2 pr-4 font-medium">Owner</th>
                    <th className="pb-2 pr-4 font-medium">Automation state</th>
                    <th className="pb-2 font-medium">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map(row => (
                    <tr
                      key={row.id}
                      onClick={() => onContactClick(row.id)}
                      className="hover:bg-gray-50 cursor-pointer align-top"
                    >
                      <td className="py-3 pr-4 min-w-44">
                        <div className="font-medium text-gray-900">{row.newLead}</div>
                        <div className="text-xs text-gray-500">{row.submittedAt}</div>
                        {(row.phone || row.email) && (
                          <div className="text-xs text-gray-400 truncate max-w-44">{row.phone ?? row.email}</div>
                        )}
                      </td>
                      <td className="py-3 pr-4 min-w-36 text-gray-700">{row.firstResponse}</td>
                      <td className="py-3 pr-4 min-w-40 text-gray-700">{row.followUpStatus}</td>
                      <td className="py-3 pr-4"><RiskBadge risk={row.risk} /></td>
                      <td className="py-3 pr-4 min-w-48 text-gray-700">{row.recommendedAction}</td>
                      <td className="py-3 pr-4 min-w-32 text-gray-700">{row.owner}</td>
                      <td className="py-3 pr-4"><AutomationBadge state={row.automationState} /></td>
                      <td className="py-3 min-w-56 text-gray-600">{row.evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-start gap-3 text-sm text-gray-700">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
          <p>
            Demo-safe scope: this module shows operational fields that apply across clients — lead intake,
            first response, follow-up state, risk, recommended action, owner, automation state, and evidence —
            without hardcoding FightFlow-specific services or appointments.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function FightFlowDashboard({ businessId, onContactClick }: FightFlowDashboardProps) {
  return (
    <SpeedToLeadDashboard
      businessId={businessId}
      onContactClick={onContactClick}
      title="FightFlow Speed-to-Lead Proof"
      subtitle="Original FightFlow proof surface, now powered by the reusable generic Speed-to-Lead module."
      proofLabel="FightFlow proof"
    />
  );
}
