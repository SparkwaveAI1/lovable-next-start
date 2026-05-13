import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { aiGrowthHubDemoPackage } from "@/lib/aiGrowthHubDemoPackage";
import {
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquare,
  Rocket,
  Sparkles,
  Target,
  XCircle,
  Zap,
} from "lucide-react";

const walkthroughSteps = [
  {
    time: "0:00–0:40",
    title: "Open the Growth Hub",
    route: "/growth-hub",
    say: "Most businesses do not need another dashboard. They need fewer missed opportunities. This hub helps you see every lead, respond faster, follow up, and know what needs attention.",
  },
  {
    time: "0:40–1:45",
    title: "Show the Lead Dashboard",
    route: "/crm",
    say: "This is the front door. Which leads need attention right now? New, stale, not booked, or missing follow-up should be visible here.",
  },
  {
    time: "1:45–2:40",
    title: "Show Speed-to-Lead",
    route: "/fight-flow",
    say: "This shows the first response path: lead captured, first reply, follow-up or booking signal, and whether a human needs to review anything.",
  },
  {
    time: "2:40–3:35",
    title: "Show the Business Brain",
    route: "/analytics",
    say: "Think of this as the daily report: what changed, what might be slipping, what customers are asking about, and what to do next.",
  },
  {
    time: "3:35–4:25",
    title: "Show Ask Your Growth Agent",
    route: "/growth-agent",
    say: "This is where the team asks plain-English questions like: which leads need follow-up today, where are we losing people, and what should we improve next?",
  },
  {
    time: "4:25–4:45",
    title: "Optional Content Ideas preview",
    route: "/content-strategy",
    say: "Once lead response is credible, the same hub can suggest useful content based on what customers are already asking.",
  },
];

const sayInstead = [
  "Stop losing leads",
  "Respond faster",
  "Follow up consistently",
  "See what needs attention",
  "Know which leads are stale",
  "Business Brain",
  "Growth Agent",
  "Simple next steps",
];

const avoidSaying = [
  "Agentic architecture",
  "Learning layer",
  "Context ingestion",
  "Semantic monitoring",
  "Guaranteed revenue lift",
  "Guaranteed booked appointments",
  "Live sends are active unless verified and approved",
];

const demoSurfaces = [
  {
    title: "Lead dashboard",
    href: "/crm",
    icon: Target,
    status: "demo-critical",
    description: "The front door for every lead: source, status, last activity, booking signal, and next action.",
    bullets: ["New inquiries in one place", "Stale leads needing action", "Booked vs. not booked", "Source, status, and last activity"],
  },
  {
    title: "Speed-to-lead",
    href: "/fight-flow",
    icon: Zap,
    status: "demo-critical",
    description: "Show what happens immediately after a form fill, call, text, or message.",
    bullets: ["Lead captured", "First response evidence", "Follow-up or booking signal", "Human review when needed"],
  },
  {
    title: "Business Brain report",
    href: "/analytics",
    icon: Brain,
    status: "demo-critical",
    description: "A plain-English report showing what changed, what might be slipping, and what to do next.",
    bullets: ["What changed today", "Leads or follow-up at risk", "Customer questions noticed", "Recommended next actions"],
  },
  {
    title: "Ask Your Growth Agent",
    href: "/growth-agent",
    icon: Bot,
    status: "demo-critical",
    description: "Client-facing assistant surface for asking about leads, follow-up, content, and growth priorities.",
    bullets: ["Which leads need follow-up today?", "Which opportunities are going stale?", "What did customers ask this week?", "What should we improve next?"],
  },
  {
    title: "Content Ideas",
    href: "/content-strategy",
    icon: FileText,
    status: "expansion layer",
    description: "A small expansion preview: turn common lead and customer questions into useful content topics.",
    bullets: ["Ideas from inquiries", "Customer question topics", "Local SEO opportunities", "Approval required before publishing"],
  },
];

const verticalModules = [
  {
    vertical: "Med spa",
    promise: "Help consultation inquiries get answered, followed up, and booked instead of slipping through the cracks.",
    modules: ["New Consultation Leads", "Speed-to-Lead Follow-Up", "Treatment Inquiry Nurture", "No-Show Recovery", "Clinic Growth Report", "Ask Your Clinic Growth Agent", "Treatment Education Topics"],
    cta: "Show me which consultation leads need follow-up today.",
  },
  {
    vertical: "Dental / ortho / implants",
    promise: "Help high-value patient inquiries get answered, followed up, and booked.",
    modules: ["New Patient & Consult Leads", "Fast Patient Response", "Treatment Plan Follow-Up", "Unbooked Consultation Recovery", "Practice Growth Report", "Ask Your Practice Growth Agent", "Patient Education Topics"],
    cta: "Show me which new patient or consult leads are not booked yet.",
  },
  {
    vertical: "Home services",
    promise: "Respond to estimate requests faster, follow up on open quotes, and recover missed calls.",
    modules: ["Estimate Requests", "Missed Call & Estimate Response", "Quote Follow-Up", "Job Booking Opportunities", "Service Growth Report", "Ask Your Service Growth Agent", "Local Service Content Ideas"],
    cta: "Show me which estimate requests and quotes need follow-up today.",
  },
  {
    vertical: "Organic farm / local example",
    promise: "A custom/local skin for CSA, wholesale, farm stand, and seasonal product inquiries.",
    modules: ["Wholesale Leads", "CSA Follow-Up", "Seasonal Product Campaigns", "Recipe/Education Content", "Farm Growth Report", "Ask Your Farm Growth Agent"],
    cta: "Show me which customer and wholesale inquiries need follow-up today.",
  },
];

export default function AIGrowthHub() {
  return (
    <DashboardLayout>
      <PageContent>
        <div className="space-y-8">
          <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-950 via-indigo-900 to-cyan-800 text-white shadow-xl">
            <div className="grid gap-8 p-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-10">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-indigo-100">
                  <Sparkles className="h-4 w-4" /> AI Growth Hub demo shell
                </div>
                <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">We help you stop losing leads.</h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-indigo-100">
                  The AI Growth Hub gives your team one place to see new inquiries, respond faster,
                  follow up consistently, and know what needs attention today.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-indigo-100/90">
                  Start with the lead leak. Do not demo the whole product. Show the path from new lead
                  to first response, follow-up, Business Brain report, and Ask Your Growth Agent.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild size="lg" className="bg-white text-indigo-950 hover:bg-indigo-50">
                    <Link to="/crm">Open lead dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                    <Link to="/analytics">Open Business Brain</Link>
                  </Button>
                </div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
                <div className="mb-4 flex items-center gap-2 font-semibold">
                  <Rocket className="h-5 w-5 text-cyan-200" /> Demo readiness gate
                </div>
                <div className="space-y-3 text-sm text-indigo-50">
                  <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" /> Show the five demo-critical surfaces, not the whole product.</div>
                  <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" /> Use simple buyer language: leads, response, follow-up, Business Brain.</div>
                  <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" /> Keep claims evidence-bound until connectors and outcomes are verified.</div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardHeader>
                <CardTitle>5-minute buyer walkthrough</CardTitle>
                <CardDescription>Show the buyer problem in order: leads, response, follow-up, Business Brain, then Growth Agent.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {walkthroughSteps.map((step) => (
                  <div key={step.time} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{step.time}</Badge>
                          <span className="font-semibold text-slate-900">{step.title}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">“{step.say}”</p>
                      </div>
                      <Button asChild variant="outline" size="sm" className="shrink-0">
                        <Link to={step.route}>Open step <ArrowRight className="ml-2 h-4 w-4" /></Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Demo language guardrails</CardTitle>
                <CardDescription>Keep the story buyer-simple and evidence-bound.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Say this
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sayInstead.map((phrase) => <Badge key={phrase} variant="secondary">{phrase}</Badge>)}
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700">
                    <XCircle className="h-4 w-4" /> Avoid this
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {avoidSaying.map((phrase) => <Badge key={phrase} variant="outline" className="border-red-200 text-red-700">{phrase}</Badge>)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between"><Clock3 className="h-5 w-5 text-indigo-600" /><Badge>Primary wedge</Badge></div>
                <div className="mt-3 text-2xl font-bold">Speed-to-lead</div>
                <p className="text-sm text-muted-foreground">Urgent, concrete, easy to understand.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between"><Brain className="h-5 w-5 text-cyan-600" /><Badge variant="outline">Value layer</Badge></div>
                <div className="mt-3 text-2xl font-bold">Business Brain</div>
                <p className="text-sm text-muted-foreground">Watches activity and tells you what matters.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between"><MessageSquare className="h-5 w-5 text-emerald-600" /><Badge variant="secondary">Interface</Badge></div>
                <div className="mt-3 text-2xl font-bold">Growth Agent</div>
                <p className="text-sm text-muted-foreground">A business-specific assistant for action.</p>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="border-cyan-100 bg-gradient-to-br from-white via-cyan-50/60 to-indigo-50">
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <Badge variant="secondary" className="mb-3">Demo business package</Badge>
                    <CardTitle>{aiGrowthHubDemoPackage.businessProfile.name}: full loop story</CardTitle>
                    <CardDescription>
                      {aiGrowthHubDemoPackage.businessProfile.vertical} in {aiGrowthHubDemoPackage.businessProfile.location} · {aiGrowthHubDemoPackage.weeklyFocus.title}
                    </CardDescription>
                  </div>
                  <div className="rounded-xl border border-cyan-100 bg-white/80 p-3 text-sm text-slate-700">
                    {aiGrowthHubDemoPackage.businessProfile.safeDataNote}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-xl border bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Business profile</div>
                    <div className="mt-2 font-semibold text-slate-900">{aiGrowthHubDemoPackage.businessProfile.buyer}</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Lead sources: {aiGrowthHubDemoPackage.businessProfile.leadSources.join(", ")}.
                    </p>
                  </div>
                  <div className="rounded-xl border bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-cyan-600">Uploaded intake</div>
                    <div className="mt-2 font-semibold text-slate-900">{aiGrowthHubDemoPackage.uploadedIntake.fileName}</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {aiGrowthHubDemoPackage.uploadedIntake.rows} demo rows · {aiGrowthHubDemoPackage.uploadedIntake.example}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Business Brain insight</div>
                    <div className="mt-2 font-semibold text-slate-900">{aiGrowthHubDemoPackage.businessBrainInsight.headline}</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{aiGrowthHubDemoPackage.businessBrainInsight.confidence}</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {aiGrowthHubDemoPackage.timeline.map((step) => (
                    <Link key={step.stage} to={step.route} className="rounded-xl border bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={step.status === "approved" ? "default" : step.status === "evidence" ? "outline" : "secondary"}>{step.owner}</Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="mt-3 font-semibold text-slate-900">{step.stage}</div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.evidence}</p>
                    </Link>
                  ))}
                </div>
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <div className="text-sm font-semibold text-indigo-950">Growth Agent proposed action</div>
                  <p className="mt-2 text-sm leading-6 text-indigo-900">{aiGrowthHubDemoPackage.growthAgentAction.recommendation}</p>
                  <p className="mt-2 text-sm font-medium text-indigo-950">{aiGrowthHubDemoPackage.growthAgentAction.approvalGate}</p>
                  <Button asChild className="mt-4">
                    <Link to="/growth-agent">Open demo in Growth Agent <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Demo-critical surfaces</h2>
                <p className="text-muted-foreground">These are the surfaces that need to look coherent first for internal use and custom demos.</p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {demoSurfaces.map((surface) => {
                const Icon = surface.icon;
                return (
                  <Card key={surface.title} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-indigo-50 p-2"><Icon className="h-5 w-5 text-indigo-600" /></div>
                          <div>
                            <CardTitle>{surface.title}</CardTitle>
                            <CardDescription>{surface.description}</CardDescription>
                          </div>
                        </div>
                        <Badge variant={surface.status === "demo-critical" ? "default" : "secondary"}>{surface.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {surface.bullets.map((bullet) => (
                          <div key={bullet} className="flex items-start gap-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> {bullet}
                          </div>
                        ))}
                      </div>
                      <Button asChild variant="outline" className="mt-4">
                        <Link to={surface.href}>Open surface <ArrowRight className="ml-2 h-4 w-4" /></Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold tracking-tight">Vertical skins, one modular system</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {verticalModules.map((item) => (
                <Card key={item.vertical}>
                  <CardHeader>
                    <CardTitle>{item.vertical}</CardTitle>
                    <CardDescription>{item.promise}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {item.modules.map((module) => <Badge key={module} variant="outline">{module}</Badge>)}
                    </div>
                    <div className="rounded-lg bg-indigo-50 p-3 text-sm font-medium text-indigo-900">“{item.cta}”</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-cyan-50">
            <CardHeader>
              <CardTitle>Best next step</CardTitle>
              <CardDescription>Do not connect everything at once. Start by mapping the lead leak.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Let us map where your leads are coming from and where follow-up is getting missed.
                Then we pick one lead source and show the first response and follow-up path we would install first.
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-900">
                Which lead source should we map first: forms, calls, texts, ads, or your CRM?
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/crm">Map lead sources</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/fight-flow">Show first response path</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </DashboardLayout>
  );
}
