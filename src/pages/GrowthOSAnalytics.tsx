import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays } from 'date-fns';
import { AlertTriangle, BarChart3, CheckCircle2, Clock, Database, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ConnectorState = 'live' | 'placeholder' | 'blocked' | 'planned';

type DashboardView = {
  key: string;
  title: string;
  owner: string;
  refresh: string;
  state: ConnectorState;
  source: string;
  note: string;
};

type ConnectorStatus = {
  name: string;
  state: ConnectorState;
  source: string;
  qaGate: string;
};

type FightFlowLead = {
  id: string;
  submitted_at: string | null;
  auto_responded: boolean | null;
  auto_response_sent_at: string | null;
  alerted: boolean | null;
  status: string | null;
};

type FightFlowAppointment = {
  id: string;
  session_start: string | null;
  service_name: string | null;
};

type QueueMessage = {
  id: string;
  status: string | null;
  created_at: string | null;
  sent_at: string | null;
};

type ContactRow = {
  id: string;
  status: string | null;
  created_at: string | null;
};

type ProspectRow = {
  id: string;
  status: string | null;
  pipeline_stage: string | null;
  created_at: string | null;
};

type FormSubmission = {
  id: string;
  created_at: string | null;
  request_type: string | null;
  business_id: string | null;
  source_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

type ReviewItem = {
  id: string;
  status: string | null;
  review_type: string | null;
  platform: string | null;
  created_at: string | null;
};

type DashboardData = {
  fightFlowLeads: FightFlowLead[];
  fightFlowAppointments: FightFlowAppointment[];
  queueMessages: QueueMessage[];
  contacts: ContactRow[];
  prospects: ProspectRow[];
  formSubmissions: FormSubmission[];
  reviewItems: ReviewItem[];
  errors: string[];
};

const owner = 'Analytics / RevOps';
const rangeStart = subDays(new Date(), 7).toISOString();
const range30Start = subDays(new Date(), 30).toISOString();
const fiveMinuteSlaSeconds = 300;

const views: DashboardView[] = [
  {
    key: 'outbound',
    title: 'Daily outbound KPIs',
    owner,
    refresh: 'Daily during approved outbound tests; manual review before claims',
    state: 'blocked',
    source: 'Sending platform + CRM reply classification + cost log',
    note: 'No sends, CPA, CAC, or qualified-conversation claims until sending platform, reply routing, suppression, and cost inputs are QA-verified.',
  },
  {
    key: 'crm',
    title: 'CRM pipeline health',
    owner,
    refresh: 'Every app load; weekly RevOps rollup after CRM bridge QA',
    state: 'placeholder',
    source: 'contacts and sales_prospects operational tables',
    note: 'Operational record counts are useful for internal health, but raw-submission-to-CRM promotion and qualification events remain blocked until verified.',
  },
  {
    key: 'content',
    title: 'Content performance',
    owner: 'Analytics / RevOps with Content OS owner input',
    refresh: 'Weekly after Postiz/platform exports are verified',
    state: 'placeholder',
    source: 'sw_review_items shell + future Postiz/platform analytics exports',
    note: 'Review queue status is not live performance. Views, impressions, saves, replies, DMs, and UTM clicks require platform export QA.',
  },
  {
    key: 'fightflow',
    title: 'FightFlow reliability monitoring',
    owner,
    refresh: 'Every 5 minutes once connector freshness is verified; currently app-load refresh',
    state: 'placeholder',
    source: 'fightflow_form_submissions, fightflow_appointments, outbound_message_queue',
    note: 'Internal reliability watch only. Do not claim reduced missed leads or SMS/automation performance until connector freshness, source filters, and suppression handling are QA-verified.',
  },
  {
    key: 'landing',
    title: 'Landing/forms conversion',
    owner,
    refresh: 'Daily after controlled form-event QA; weekly trend rollup',
    state: 'placeholder',
    source: 'sparkwave_contact_submissions with UTM/source fields',
    note: 'Raw form submissions are not qualified leads. Conversion rates require route/form analytics events plus CRM promotion and owner assignment QA.',
  },
];

const connectorStatuses: ConnectorStatus[] = [
  { name: 'Outbound sending platform', state: 'blocked', source: 'Instantly/Smartlead or selected sender', qaGate: 'Platform, DNS/warmup, reply routing, suppression, and launch approval required.' },
  { name: 'Outbound cost log', state: 'placeholder', source: 'Cost allocation sheet/table', qaGate: 'Cost categories and allocation policy must be approved before cost-per-conversation reporting.' },
  { name: 'CRM', state: 'placeholder', source: 'contacts and sales_prospects', qaGate: 'Map raw submission IDs, source fields, owner, lifecycle status, and qualification criteria.' },
  { name: 'Content/Postiz analytics', state: 'placeholder', source: 'sw_review_items + Postiz/platform exports', qaGate: 'Verify platform export path and UTM click capture before reporting performance.' },
  { name: 'FightFlow Supabase', state: 'placeholder', source: 'fightflow_form_submissions, appointments, outbound queue', qaGate: 'Verify current-row freshness, dedupe, source filters, timestamp accuracy, and suppression/STOP handling.' },
  { name: 'Landing/forms', state: 'placeholder', source: 'sparkwave_contact_submissions', qaGate: 'Controlled test must trace form event -> raw row -> notification/CRM owner path.' },
  { name: 'GA4/GSC/Ads/Clarity', state: 'placeholder', source: 'OAuth/API connectors', qaGate: 'Secure access and conversion-event QA required; no tracking changes without approval.' },
  { name: 'Closed-won/revenue', state: 'blocked', source: 'CRM/accounting', qaGate: 'Closed-won amount, source attribution, and finance assumptions must be verified before CAC/ROAS.' },
];

const alertThresholds = [
  {
    metric: 'FightFlow 5-minute SLA rate',
    warning: '< 90% of response-required submissions inside 5 minutes',
    critical: '< 80% or 3 consecutive misses in a day',
    action: 'Create reliability regression task; notify FightFlow owner before any automation changes.',
  },
  {
    metric: 'Alert without response evidence',
    warning: '> 10% of submissions alerted with no response timestamp',
    critical: '> 20% or any high-intent lead older than 15 minutes without owner review',
    action: 'Open response-path QA; verify queue/Twilio/Wix freshness and owner assignment.',
  },
  {
    metric: 'Queue pending age',
    warning: 'Any pending message older than 10 minutes',
    critical: 'Any pending message older than 30 minutes or failed status present',
    action: 'Investigate outbound_message_queue; no resend/activation without approval.',
  },
  {
    metric: 'Connector freshness',
    warning: 'No new FightFlow/contact rows for an expected active period',
    critical: 'Freshness unknown while dashboard is used for decisions',
    action: 'Mark view placeholder/blocked and request connector QA before claims.',
  },
];

function stateClass(state: ConnectorState) {
  switch (state) {
    case 'live': return 'bg-green-100 text-green-800 border-green-300';
    case 'placeholder': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'blocked': return 'bg-red-100 text-red-800 border-red-300';
    case 'planned': return 'bg-blue-100 text-blue-800 border-blue-300';
  }
}

function percent(numerator: number, denominator: number) {
  if (!denominator) return '—';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function secondsBetween(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / 1000;
  return Number.isFinite(diff) ? diff : null;
}

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const value = String(row[key] ?? 'unknown');
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

async function safeQuery<T>(label: string, query: PromiseLike<{ data: unknown; error: { message?: string } | null }>, errors: string[]): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    errors.push(`${label}: ${error.message ?? 'query failed'}`);
    return [];
  }
  return (data ?? []) as T[];
}

async function fetchDashboardData(): Promise<DashboardData> {
  const errors: string[] = [];
  const [fightFlowLeads, fightFlowAppointments, queueMessages, contacts, prospects, formSubmissions, reviewItems] = await Promise.all([
    safeQuery<FightFlowLead>('fightflow_form_submissions', (supabase as any).from('fightflow_form_submissions').select('id, submitted_at, auto_responded, auto_response_sent_at, alerted, status').gte('submitted_at', range30Start).order('submitted_at', { ascending: false }).limit(500), errors),
    safeQuery<FightFlowAppointment>('fightflow_appointments', (supabase as any).from('fightflow_appointments').select('id, session_start, service_name').gte('session_start', range30Start).order('session_start', { ascending: false }).limit(500), errors),
    safeQuery<QueueMessage>('outbound_message_queue', (supabase as any).from('outbound_message_queue').select('id, status, created_at, sent_at').gte('created_at', range30Start).order('created_at', { ascending: false }).limit(500), errors),
    safeQuery<ContactRow>('contacts', (supabase as any).from('contacts').select('id, status, created_at').gte('created_at', range30Start).order('created_at', { ascending: false }).limit(500), errors),
    safeQuery<ProspectRow>('sales_prospects', (supabase as any).from('sales_prospects').select('id, status, pipeline_stage, created_at').gte('created_at', range30Start).order('created_at', { ascending: false }).limit(500), errors),
    safeQuery<FormSubmission>('sparkwave_contact_submissions', (supabase as any).from('sparkwave_contact_submissions').select('id, created_at, request_type, business_id, source_url, utm_source, utm_medium, utm_campaign').gte('created_at', range30Start).order('created_at', { ascending: false }).limit(500), errors),
    safeQuery<ReviewItem>('sw_review_items', (supabase as any).from('sw_review_items').select('id, status, review_type, platform, created_at').gte('created_at', range30Start).order('created_at', { ascending: false }).limit(500), errors),
  ]);

  return { fightFlowLeads, fightFlowAppointments, queueMessages, contacts, prospects, formSubmissions, reviewItems, errors };
}

export default function GrowthOSAnalytics() {
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['growth-os-analytics-dashboard', rangeStart, range30Start],
    queryFn: fetchDashboardData,
    refetchInterval: 5 * 60 * 1000,
  });

  const metrics = useMemo(() => {
    const d = data ?? {
      fightFlowLeads: [], fightFlowAppointments: [], queueMessages: [], contacts: [], prospects: [], formSubmissions: [], reviewItems: [], errors: [],
    };

    const sevenDayLeads = d.fightFlowLeads.filter((lead) => lead.submitted_at && lead.submitted_at >= rangeStart);
    const responded = sevenDayLeads.filter((lead) => lead.auto_responded || lead.auto_response_sent_at);
    const slaHits = sevenDayLeads.filter((lead) => {
      const diff = secondsBetween(lead.submitted_at, lead.auto_response_sent_at);
      return diff !== null && diff <= fiveMinuteSlaSeconds;
    });
    const alertedWithoutResponse = sevenDayLeads.filter((lead) => lead.alerted && !lead.auto_response_sent_at);
    const pendingQueue = d.queueMessages.filter((message) => (message.status ?? '').toLowerCase() === 'pending');
    const failedQueue = d.queueMessages.filter((message) => (message.status ?? '').toLowerCase() === 'failed');

    return {
      fightFlow: {
        leads7d: sevenDayLeads.length,
        responded: responded.length,
        responseRate: percent(responded.length, sevenDayLeads.length),
        slaHits: slaHits.length,
        slaRate: percent(slaHits.length, sevenDayLeads.length),
        alertedWithoutResponse: alertedWithoutResponse.length,
        appointments30d: d.fightFlowAppointments.length,
        pendingQueue: pendingQueue.length,
        failedQueue: failedQueue.length,
      },
      crm: {
        contacts30d: d.contacts.length,
        prospects30d: d.prospects.length,
        contactStatus: countBy(d.contacts, 'status'),
        prospectStatus: countBy(d.prospects, 'status'),
        pipelineStage: countBy(d.prospects, 'pipeline_stage'),
      },
      landing: {
        rawSubmissions30d: d.formSubmissions.length,
        byRequestType: countBy(d.formSubmissions, 'request_type'),
        byBusiness: countBy(d.formSubmissions, 'business_id'),
        utmTagged: d.formSubmissions.filter((row) => row.utm_source || row.utm_medium || row.utm_campaign).length,
      },
      content: {
        reviewItems30d: d.reviewItems.length,
        byStatus: countBy(d.reviewItems, 'status'),
        byType: countBy(d.reviewItems, 'review_type'),
      },
    };
  }, [data]);

  const dashboardState: ConnectorState = data?.errors.length ? 'placeholder' : 'placeholder';

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl bg-slate-950 p-6 text-white shadow-sm md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className={stateClass(dashboardState)}>connector state: {dashboardState}</Badge>
              <Badge className="border-slate-600 bg-slate-800 text-slate-100">internal reporting only</Badge>
              <Badge className="border-slate-600 bg-slate-800 text-slate-100">no CPA/CAC/revenue claims</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Growth OS Analytics Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Phase 1 control-plane reporting across outbound, CRM, content, FightFlow, and landing/forms. Operational source rows are separated from analytics instrumentation and public-performance claim gates.
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200">
            <div className="font-semibold">Refresh cadence</div>
            <div>App-load + 5 minute client refresh</div>
            <div className="mt-2 text-slate-400">Last refreshed: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString() : 'loading'}</div>
          </div>
        </div>

        {data?.errors.length ? (
          <Card className="border-amber-300 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900"><AlertTriangle className="h-5 w-5" /> Connector warnings</CardTitle>
              <CardDescription className="text-amber-800">Some source tables could not be read. Their panels remain placeholder/blocked until QA resolves access/schema issues.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-amber-900">
              {data.errors.map((error) => <div key={error}>{error}</div>)}
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="FightFlow SLA rate" value={isLoading ? '…' : metrics.fightFlow.slaRate} detail={`${metrics.fightFlow.slaHits}/${metrics.fightFlow.leads7d} leads inside 5 minutes`} state="placeholder" />
          <MetricCard title="CRM records 30d" value={isLoading ? '…' : String(metrics.crm.contacts30d + metrics.crm.prospects30d)} detail={`${metrics.crm.contacts30d} contacts, ${metrics.crm.prospects30d} prospects`} state="placeholder" />
          <MetricCard title="Raw form submissions 30d" value={isLoading ? '…' : String(metrics.landing.rawSubmissions30d)} detail={`${metrics.landing.utmTagged} with UTM fields; not qualified leads`} state="placeholder" />
          <MetricCard title="Outbound economics" value="Blocked" detail="Requires sender, reply, suppression, CRM, and cost QA" state="blocked" />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> FightFlow reliability monitoring</CardTitle>
              <CardDescription>Internal operational watch. Alert thresholds are configured below and require owner review before any automation changes.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <InlineStat label="Leads captured, 7d" value={metrics.fightFlow.leads7d} />
              <InlineStat label="Response rate" value={metrics.fightFlow.responseRate} />
              <InlineStat label="Alerted without response" value={metrics.fightFlow.alertedWithoutResponse} />
              <InlineStat label="Appointments, 30d" value={metrics.fightFlow.appointments30d} />
              <InlineStat label="Queue pending" value={metrics.fightFlow.pendingQueue} />
              <InlineStat label="Queue failed" value={metrics.fightFlow.failedQueue} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> CRM pipeline health</CardTitle>
              <CardDescription>Record health from operational tables. Qualification and raw-to-CRM bridge metrics remain blocked until event QA.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Breakdown title="Contact status" values={metrics.crm.contactStatus} />
              <Breakdown title="Prospect status" values={metrics.crm.prospectStatus} />
              <Breakdown title="Pipeline stage" values={metrics.crm.pipelineStage} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Landing/forms conversion shell</CardTitle>
              <CardDescription>Raw submissions with attribution fields. Form conversion rates require route/form events and controlled test traces.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Breakdown title="Request type" values={metrics.landing.byRequestType} />
              <Breakdown title="Business / brand" values={metrics.landing.byBusiness} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Content performance shell</CardTitle>
              <CardDescription>Review workflow status only. Platform performance metrics stay placeholder until Postiz/social exports and UTM clicks are verified.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Breakdown title="Review status" values={metrics.content.byStatus} />
              <Breakdown title="Review type" values={metrics.content.byType} />
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> View owners and refresh schedules</CardTitle>
            <CardDescription>Acceptance coverage for all five Phase 1 control-plane areas.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-500">
                <tr><th className="py-2 pr-4">View</th><th className="py-2 pr-4">State</th><th className="py-2 pr-4">Owner</th><th className="py-2 pr-4">Refresh</th><th className="py-2 pr-4">Source / note</th></tr>
              </thead>
              <tbody className="divide-y">
                {views.map((view) => (
                  <tr key={view.key} className="align-top">
                    <td className="py-3 pr-4 font-medium text-slate-900">{view.title}</td>
                    <td className="py-3 pr-4"><Badge className={stateClass(view.state)}>{view.state}</Badge></td>
                    <td className="py-3 pr-4">{view.owner}</td>
                    <td className="py-3 pr-4">{view.refresh}</td>
                    <td className="py-3 pr-4"><div className="font-medium">{view.source}</div><div className="text-slate-500">{view.note}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>FightFlow alert thresholds</CardTitle>
              <CardDescription>Configured as visible operating thresholds in this dashboard. External notifications require separate approval and implementation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {alertThresholds.map((threshold) => (
                <div key={threshold.metric} className="rounded-lg border p-3">
                  <div className="font-semibold text-slate-900">{threshold.metric}</div>
                  <div className="mt-1 text-sm text-amber-700">Warning: {threshold.warning}</div>
                  <div className="text-sm text-red-700">Critical: {threshold.critical}</div>
                  <div className="mt-1 text-sm text-slate-500">Action: {threshold.action}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Connector status and live-reporting gates</CardTitle>
              <CardDescription>Source states separate live, placeholder, blocked, and planned data. Placeholder rows must not be presented as live proof.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {connectorStatuses.map((connector) => (
                <div key={connector.name} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-slate-900">{connector.name}</div>
                    <Badge className={stateClass(connector.state)}>{connector.state}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">Source: {connector.source}</div>
                  <div className="text-sm text-slate-600">QA gate: {connector.qaGate}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ title, value, detail, state }: { title: string; value: string; detail: string; state: ConnectorState }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardDescription>{title}</CardDescription>
          <Badge className={stateClass(state)}>{state}</Badge>
        </div>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-500">{detail}</CardContent>
    </Card>
  );
}

function InlineStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Breakdown({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-900">{title}</div>
      {entries.length ? (
        <div className="space-y-2">
          {entries.slice(0, 6).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
              <span className="truncate pr-3 text-slate-600">{key}</span>
              <span className="font-semibold text-slate-900">{value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">No rows returned / not verified</div>
      )}
    </div>
  );
}
