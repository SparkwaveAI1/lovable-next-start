import { useMemo } from 'react';
import { Activity, ArrowRight, CheckCircle2, Clock3, ShieldCheck, Zap } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageContent, PageHeader } from '@/components/layout/PageLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useBusinessContext } from '@/contexts/BusinessContext';

const demoStages = [
  {
    label: 'Raw Lead',
    timing: '0:00',
    detail: 'Website form, missed call, ad DM, or booking request enters the queue.',
    metric: '18 waiting',
  },
  {
    label: 'Instant Reply Sent',
    timing: '0:45',
    detail: 'AI drafts the first response and routes it through the owner-approved guardrail.',
    metric: '14 drafted',
  },
  {
    label: '5-min Follow-Up',
    timing: '5:00',
    detail: 'Unanswered leads get a safe follow-up task before the window turns cold.',
    metric: '4 at risk',
  },
  {
    label: 'Booked / Human Handoff',
    timing: 'same day',
    detail: 'Hot leads become booked consults or clean handoffs for the front desk.',
    metric: '7 booked',
  },
] as const;

const triggerLog = [
  'New form inquiry: Botox consult, prefers Friday afternoon.',
  'Missed call: laser hair removal pricing question.',
  'Instagram DM: membership plan details requested.',
  'Stale lead: body contouring follow-up due before close of day.',
] as const;

export default function SpeedToLead() {
  const { selectedBusiness } = useBusinessContext();

  const businessName = selectedBusiness?.name || 'Demo Med Spa';
  const demoModel = useMemo(() => ({
    businessName,
    revenueAtRisk: '$8,450',
    medianResponse: '4m 12s',
    targetResponse: '<5m',
    automationCoverage: 78,
  }), [businessName]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Speed-to-Lead Automation"
        description={`Selected business context: ${demoModel.businessName}. Demo-safe automation view for seeing how raw leads become reviewed replies, follow-ups, and human handoffs.`}
      />
      <PageContent>
        <div className="space-y-6">
          <section className="rounded-3xl bg-gradient-to-br from-indigo-950 via-blue-900 to-cyan-800 p-6 text-white shadow-xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-cyan-100">
                  <Zap className="h-4 w-4" /> Monday demo speed-to-lead scenario
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Stop lead leakage before it becomes missed revenue.</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-cyan-50">
                  This surface is static/demo-safe: it visualizes the workflow and approval gates without sending messages, mutating CRM records, changing schedules, or touching production customer data.
                </p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-cyan-50">
                <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Guardrail</div>
                <p className="mt-2">Drafts and internal tasks only until an owner explicitly approves live outreach or automation.</p>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between"><Activity className="h-5 w-5 text-indigo-600" /><Badge>At risk</Badge></div>
                <div className="mt-3 text-2xl font-bold">{demoModel.revenueAtRisk}</div>
                <p className="text-sm text-muted-foreground">demo revenue waiting on reply</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between"><Clock3 className="h-5 w-5 text-cyan-600" /><Badge variant="outline">Median</Badge></div>
                <div className="mt-3 text-2xl font-bold">{demoModel.medianResponse}</div>
                <p className="text-sm text-muted-foreground">current response window</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between"><Zap className="h-5 w-5 text-amber-600" /><Badge variant="outline">Target</Badge></div>
                <div className="mt-3 text-2xl font-bold">{demoModel.targetResponse}</div>
                <p className="text-sm text-muted-foreground">owner-approved reply SLA</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><Badge variant="outline">Coverage</Badge></div>
                <div className="mt-3 text-2xl font-bold">{demoModel.automationCoverage}%</div>
                <Progress className="mt-3" value={demoModel.automationCoverage} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardHeader>
                <CardTitle>Lead response flow</CardTitle>
                <CardDescription>Raw lead → instant reply → 5-minute follow-up → booked or human handoff.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-4">
                  {demoStages.map((stage, index) => (
                    <div key={stage.label} className="relative rounded-2xl border bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={index === 0 ? 'default' : 'outline'}>{stage.timing}</Badge>
                        {index < demoStages.length - 1 ? <ArrowRight className="hidden h-4 w-4 text-muted-foreground md:block" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      </div>
                      <h3 className="mt-4 font-semibold">{stage.label}</h3>
                      <div className="mt-1 text-lg font-bold text-indigo-700">{stage.metric}</div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{stage.detail}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trigger log</CardTitle>
                <CardDescription>Static sample events for the Monday demo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {triggerLog.map(item => (
                  <div key={item} className="rounded-lg border bg-muted/30 p-3 text-sm leading-6">
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </DashboardLayout>
  );
}
