import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  LineChart,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

type ConnectorState = "live" | "placeholder" | "blocked";

interface ConnectorRow {
  name: string;
  purpose: string;
  state: ConnectorState;
  qaGate: string;
}

interface MetricRow {
  metric: string;
  cadence: "daily" | "weekly" | "launch-gated";
  sourceEvent: string;
  state: ConnectorState;
  owner: string;
}

interface FunnelStage {
  stage: string;
  event: string;
  definition: string;
  state: ConnectorState;
}

const stateStyles: Record<ConnectorState, string> = {
  live: "bg-emerald-50 text-emerald-700 border-emerald-200",
  placeholder: "bg-amber-50 text-amber-700 border-amber-200",
  blocked: "bg-red-50 text-red-700 border-red-200",
};

const connectors: ConnectorRow[] = [
  {
    name: "Lead inventory / ICP scorecard",
    purpose: "Daily outbound lead pool, vertical, segment, geography, source, ICP fit",
    state: "placeholder",
    qaGate: "First lead batch schema and suppression rules approved before import/send",
  },
  {
    name: "Sending platform",
    purpose: "Schedules, sends, bounces, replies, unsubscribes, complaints",
    state: "blocked",
    qaGate: "Platform selected, secure credentials verified, export/API fields mapped, launch approved",
  },
  {
    name: "CRM / positive reply queue",
    purpose: "Reply category, qualification status, owner, next action, opportunity stages",
    state: "blocked",
    qaGate: "Qualification fields, owner SLA, source/consent/suppression mapping verified",
  },
  {
    name: "Calendar / booking",
    purpose: "Booked and attended calls tied back to lead, campaign, and owner",
    state: "blocked",
    qaGate: "Calendar meeting IDs match CRM lead/contact/opportunity records",
  },
  {
    name: "Cost log",
    purpose: "Lead data, verification, sending, inbox/domain, and optional handling cost allocation",
    state: "placeholder",
    qaGate: "Cost allocation policy approved before cost-per-conversation reporting",
  },
  {
    name: "Content performance",
    purpose: "Views, saves, replies, DMs, clicks, platform/account/source package",
    state: "placeholder",
    qaGate: "Platform exports or Postiz/account analytics verified; publishing remains approval-gated",
  },
];

const dailyOutboundMetrics: MetricRow[] = [
  { metric: "Emails sent", cadence: "daily", sourceEvent: "outbound_email_sent", state: "blocked", owner: "Analytics RevOps" },
  { metric: "Bounce rate", cadence: "daily", sourceEvent: "outbound_email_bounced / outbound_email_sent", state: "blocked", owner: "Analytics RevOps" },
  { metric: "Total replies", cadence: "daily", sourceEvent: "outbound_reply_received", state: "blocked", owner: "Analytics RevOps" },
  { metric: "Positive replies", cadence: "daily", sourceEvent: "outbound_reply_classified", state: "blocked", owner: "Analytics RevOps + CRM owner" },
  { metric: "Qualified conversations", cadence: "daily", sourceEvent: "qualified_conversation_created", state: "blocked", owner: "Analytics RevOps + CRM owner" },
  { metric: "Complaints / unsubscribes", cadence: "daily", sourceEvent: "outbound_complaint_logged / outbound_unsubscribed", state: "blocked", owner: "Analytics RevOps" },
];

const weeklyScorecardMetrics: MetricRow[] = [
  { metric: "ICP segment score", cadence: "weekly", sourceEvent: "vertical + segment + geography + lead_source dimensions", state: "placeholder", owner: "Analytics RevOps" },
  { metric: "Positive reply rate", cadence: "weekly", sourceEvent: "positive replies / outbound_email_sent", state: "blocked", owner: "Analytics RevOps" },
  { metric: "Booked-call rate", cadence: "weekly", sourceEvent: "sales_call_booked / outbound_email_sent", state: "blocked", owner: "Analytics RevOps" },
  { metric: "Cost per qualified conversation", cadence: "weekly", sourceEvent: "outbound_campaign_cost / qualified_conversations", state: "blocked", owner: "Analytics RevOps" },
  { metric: "Top objections", cadence: "weekly", sourceEvent: "reply_category_detail / objection tags", state: "blocked", owner: "Analytics RevOps + Account Strategy" },
];

const contentMetrics: MetricRow[] = [
  { metric: "Views / impressions", cadence: "weekly", sourceEvent: "content_viewed or platform impressions", state: "placeholder", owner: "Analytics RevOps" },
  { metric: "Saves", cadence: "weekly", sourceEvent: "content_saved", state: "placeholder", owner: "Analytics RevOps" },
  { metric: "Replies / comments", cadence: "weekly", sourceEvent: "content_reply_received", state: "placeholder", owner: "Analytics RevOps" },
  { metric: "DMs", cadence: "weekly", sourceEvent: "content_dm_started", state: "placeholder", owner: "Analytics RevOps + Social" },
  { metric: "Clicks", cadence: "weekly", sourceEvent: "content_link_clicked with UTM", state: "placeholder", owner: "Analytics RevOps" },
];

const funnelStages: FunnelStage[] = [
  { stage: "Reply", event: "outbound_reply_received", definition: "Prospect responds to an approved campaign message", state: "blocked" },
  { stage: "Positive reply", event: "outbound_reply_classified", definition: "Reply category is positive, interested_but_vague, wants_info, or price_question", state: "blocked" },
  { stage: "Qualified conversation", event: "qualified_conversation_created", definition: "Fit, pain, authority/influence, plausible value, and next-step openness are recorded", state: "blocked" },
  { stage: "Booked", event: "sales_call_booked", definition: "Calendar event is booked and matched to CRM lead/contact", state: "blocked" },
  { stage: "Attended", event: "sales_call_attended", definition: "Meeting status confirms prospect attended", state: "blocked" },
  { stage: "Proposal", event: "proposal_sent", definition: "Proposal sent against a CRM opportunity", state: "blocked" },
  { stage: "Close", event: "closed_won / closed_lost", definition: "Opportunity is closed with source/campaign attribution preserved", state: "blocked" },
];

function StateBadge({ state }: { state: ConnectorState }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${stateStyles[state]}`}>
      {state}
    </span>
  );
}

function MetricTable({ rows }: { rows: MetricRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Metric</th>
            <th className="px-4 py-3">Cadence</th>
            <th className="px-4 py-3">Mapped event / formula</th>
            <th className="px-4 py-3">State</th>
            <th className="px-4 py-3">Owner</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={`${row.metric}-${row.sourceEvent}`}>
              <td className="px-4 py-3 font-medium text-gray-900">{row.metric}</td>
              <td className="px-4 py-3 text-gray-600">{row.cadence}</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.sourceEvent}</td>
              <td className="px-4 py-3"><StateBadge state={row.state} /></td>
              <td className="px-4 py-3 text-gray-600">{row.owner}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GrowthOSAnalytics() {
  return (
    <DashboardLayout>
      <PageContent>
        <div className="space-y-8">
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-7 w-7 text-indigo-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-950">Growth OS Analytics</h1>
                    <p className="text-sm text-gray-600">Area 9 dashboard/reporting shell for outbound, content, pipeline, and ICP learning.</p>
                  </div>
                </div>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-700">
                  This view maps SPA-4651 KPI/event definitions to the reporting cadence required for SPA-5417. It is an analytics setup surface only: no live sends, no publishing, no CRM migration, no tracking changes, and no CPA/CAC or revenue claims are made here.
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 lg:max-w-sm">
                <div className="mb-2 flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Claim boundary</div>
                Live performance remains blocked until sending, CRM qualification, calendar matching, cost allocation, and connector QA are verified end-to-end.
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-600"><CalendarClock className="h-4 w-4 text-indigo-600" /> Daily report</div>
              <div className="text-2xl font-bold text-gray-950">Outbound readiness</div>
              <p className="mt-2 text-sm text-gray-600">Sent, bounce, reply, positive reply, qualified conversation, complaint, and unsubscribe metrics.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-600"><TrendingUp className="h-4 w-4 text-indigo-600" /> Weekly scorecard</div>
              <div className="text-2xl font-bold text-gray-950">ICP + economics</div>
              <p className="mt-2 text-sm text-gray-600">Vertical, segment, geography, source, variant, cost, objection, and action recommendations.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-600"><LineChart className="h-4 w-4 text-indigo-600" /> Funnel tracking</div>
              <div className="text-2xl font-bold text-gray-950">Reply → close</div>
              <p className="mt-2 text-sm text-gray-600">Reply, positive reply, booked, attended, proposal, won/lost stages mapped to blocked events.</p>
            </div>
          </div>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-950">Connector status and live-reporting gates</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {connectors.map((connector) => (
                <div key={connector.name} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-950">{connector.name}</h3>
                      <p className="mt-1 text-sm text-gray-600">{connector.purpose}</p>
                    </div>
                    <StateBadge state={connector.state} />
                  </div>
                  <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-600">
                    <span className="font-semibold text-gray-800">QA gate:</span> {connector.qaGate}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-950">Daily outbound performance report</h2>
            </div>
            <MetricTable rows={dailyOutboundMetrics} />
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-950">Weekly ICP test and cost-per-qualified-conversation scorecard</h2>
            </div>
            <MetricTable rows={weeklyScorecardMetrics} />
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-950">Content performance report setup</h2>
            </div>
            <MetricTable rows={contentMetrics} />
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-950">Account pipeline funnel mapping</h2>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Stage</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Definition</th>
                    <th className="px-4 py-3">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {funnelStages.map((stage) => (
                    <tr key={stage.event}>
                      <td className="px-4 py-3 font-medium text-gray-900">{stage.stage}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{stage.event}</td>
                      <td className="px-4 py-3 text-gray-600">{stage.definition}</td>
                      <td className="px-4 py-3"><StateBadge state={stage.state} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
              <div className="mb-2 flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" /> Reporting cadence now defined</div>
              Daily outbound performance is checked during an approved test. Weekly scorecards roll up ICP segment performance, content performance, funnel conversion, and economics with explicit connector states.
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
              <div className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Still blocked before launch/live claims</div>
              Sending platform, CRM qualification workflow, suppression test, calendar matching, cost allocation, and revenue/source mapping must be verified before live reporting or optimization claims.
            </div>
          </section>
        </div>
      </PageContent>
    </DashboardLayout>
  );
}
