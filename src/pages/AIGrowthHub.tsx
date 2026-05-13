import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Zap,
} from "lucide-react";

const demoSurfaces = [
  {
    title: "Lead dashboard",
    href: "/crm",
    icon: Target,
    status: "demo-critical",
    description: "See every inquiry, source, status, owner, last activity, and follow-up gap in one place.",
    bullets: ["New consultation / estimate leads", "Stale leads needing action", "Booked vs. not booked", "Source and pipeline stage"],
  },
  {
    title: "Speed-to-lead automation",
    href: "/fight-flow",
    icon: Zap,
    status: "demo-critical",
    description: "Show what happens after a form fill, call, or message so clients understand we stop lead leakage.",
    bullets: ["First response path", "SMS/email follow-up", "Human handoff queue", "No customer-facing claims without verified events"],
  },
  {
    title: "Business Brain report",
    href: "/analytics",
    icon: Brain,
    status: "demo-critical",
    description: "Plain-English daily learning layer: it watches what is happening and tells the business what matters.",
    bullets: ["What changed today", "Risks and stale assumptions", "Recommended next actions", "Evidence and confidence boundaries"],
  },
  {
    title: "Ask Your Growth Agent",
    href: "/mission-control",
    icon: Bot,
    status: "demo-critical",
    description: "Client-facing assistant surface for asking about leads, follow-up, content, and growth priorities.",
    bullets: ["Ask what needs attention", "Summarize a lead", "Draft follow-up", "Explain today's priorities"],
  },
  {
    title: "Content / SEO preview",
    href: "/content-strategy",
    icon: FileText,
    status: "expansion layer",
    description: "Secondary value story after speed-to-lead: turn real business questions into content and SEO opportunities.",
    bullets: ["Content ideas from inquiries", "Local SEO topics", "Approval-gated drafts", "Postiz/social handoff"],
  },
];

const verticalModules = [
  {
    vertical: "Med spa",
    modules: ["New Consultation Leads", "Speed-to-Lead Follow-Up", "Treatment Inquiry Nurture", "No-Show Recovery", "Before/After Content Ideas", "Ask Your Growth Agent"],
  },
  {
    vertical: "Home services",
    modules: ["Estimate Requests", "Missed Call Recovery", "Quote Follow-Up", "Seasonal Campaigns", "Review Requests", "Ask Your Growth Agent"],
  },
  {
    vertical: "Organic farm",
    modules: ["Wholesale Leads", "CSA Follow-Up", "Seasonal Product Campaigns", "Recipe/Education Content", "Agritourism SEO", "Ask Your Farm Growth Agent"],
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
                  This is the modular SW app story: a client-specific growth hub that responds faster, follows up automatically,
                  tracks what is running, supports content, and learns from the business every day.
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
                  <Rocket className="h-5 w-5 text-cyan-200" /> Monday demo gate
                </div>
                <div className="space-y-3 text-sm text-indigo-50">
                  <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" /> Show the five demo-critical surfaces, not the whole product.</div>
                  <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" /> Use simple buyer language: speed, follow-up, revenue leakage, Business Brain.</div>
                  <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" /> Keep claims evidence-bound until connectors and outcomes are verified.</div>
                </div>
              </div>
            </div>
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
            <div className="grid gap-4 lg:grid-cols-3">
              {verticalModules.map((item) => (
                <Card key={item.vertical}>
                  <CardHeader>
                    <CardTitle>{item.vertical}</CardTitle>
                    <CardDescription>Same product spine, vertical-specific labels, examples, workflows, and reports.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {item.modules.map((module) => <Badge key={module} variant="outline">{module}</Badge>)}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </PageContent>
    </DashboardLayout>
  );
}
