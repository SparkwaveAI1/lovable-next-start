import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileText, PenLine, Search, Share2, ShieldAlert } from "lucide-react";

interface RoadmapItem {
  priority: string;
  title: string;
  audience: string;
  cta: string;
  status: string;
  nextOwner: string;
  decision: string;
  risks: string[];
}

const roadmap: RoadmapItem[] = [
  {
    priority: "P0",
    title: "PersonaAI — Behavioral Simulation Research for enterprise insights",
    audience: "Enterprise insights professionals, market research directors, UX research leaders, innovation/product strategy teams.",
    cta: "Run Your First Study + $25 credits",
    status: "Approved for draft-only social handoff — no scheduling/publishing yet",
    nextOwner: "Larry prepares LinkedIn, X/thread, and short-video drafts; SEO remains no-deploy until signup/credit path is verified",
    decision: "Approved: enterprise-insights audience, Behavioral Simulation Research category, and Run Your First Study + $25 credits CTA.",
    risks: [
      "Do not lead with synthetic-research language.",
      "Keep claim boundary: directional, pre-fieldwork, complements primary research, not representative proof.",
      "Confirm signup/credit path before public push.",
    ],
  },
  {
    priority: "P1",
    title: "Sparkwave AI — Growth OS operating loop",
    audience: "Operators, founders, marketing/sales leaders, and Growth OS prospects.",
    cta: "Ask for a 72-hour Growth OS sprint map / Growth OS diagnostic",
    status: "Second candidate — sales/authority infrastructure first",
    nextOwner: "Jerry tightens with 72-hour sprint map; SEO defines page path and internal links",
    decision: "Approve public frame: Growth OS vs AI Marketing Agency Install, and CTA destination.",
    risks: [
      "Avoid abstract Growth OS claims without concrete handoffs/artifacts.",
      "Do not imply fully autonomous publishing/sending/spend.",
      "No performance claims without verified data.",
    ],
  },
  {
    priority: "P2",
    title: "FightFlow — beginner first-class trust content",
    audience: "Local adults, parents, beginners, and fitness prospects considering BJJ/martial arts.",
    cta: "Claim a free first class / book beginner intro",
    status: "Refinement lane — needs local facts and offer confirmation",
    nextOwner: "Jerry adds class/offer specifics; SEO prepares local checklist",
    decision: "Confirm exact offer, location context, class flow, and approved publishing surfaces.",
    risks: ["Avoid medical/safety/guaranteed-transformation claims.", "Verify booking path before CTA goes live."],
  },
  {
    priority: "P3",
    title: "CharX World — living character world education",
    audience: "Creators, AI character fans, world-builders, storytellers, and roleplay communities.",
    cta: "Explore CharX World / join early creator updates / create a character world",
    status: "Refinement lane — live vs planned capabilities need boundaries",
    nextOwner: "Jerry marks current/planned features; SEO chooses blog vs explainer vs community post",
    decision: "Approve current capability language, roadmap boundaries, and CTA.",
    risks: ["Do not overstate marketplace/token/earning features unless live and approved."],
  },
  {
    priority: "P4",
    title: "Elisa Veras Imoveis — neighborhood decision guidance",
    audience: "Local buyers, sellers, renters, and relocation prospects.",
    cta: "Message Elisa on WhatsApp / request neighborhood guidance",
    status: "Refinement lane — needs local market facts",
    nextOwner: "Jerry localizes; Luna/Larry drafts social only after approval",
    decision: "Confirm geography, WhatsApp/contact path, language preference, and real estate claim boundaries.",
    risks: ["Generic real estate content will underperform without city/neighborhood specifics.", "Verify local claims before publishing."],
  },
];

const reviewQueue = [
  "PersonaAI approved for Larry draft-only social handoff: LinkedIn Page, X/thread, and optional short-form video.",
  "Before any public push: confirm PersonaAI signup/credit path and final destination URL.",
  "Review Sparkwave Growth OS public frame and CTA destination.",
  "Fact-check FightFlow, CharX, and Elisa before any public push.",
];

export default function ContentStrategy() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-indigo-600">
                <FileText className="h-4 w-4" />
                Content OS / review surface
              </div>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">Content Strategy & Review Queue</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Working surface for the 2026-05-11 content strategy sprint. This is the place to see what exists, what gets reviewed first, and what must not publish until approved.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/content-hub"><PenLine className="mr-2 h-4 w-4" /> Content Hub</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/content-review"><CheckCircle2 className="mr-2 h-4 w-4" /> Approval Queue</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Strategy owner</CardTitle></CardHeader>
              <CardContent className="font-semibold text-slate-900">Strategist</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Draft owner</CardTitle></CardHeader>
              <CardContent className="font-semibold text-slate-900">Jerry</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Distribution</CardTitle></CardHeader>
              <CardContent className="font-semibold text-slate-900">Larry/Luna after approval</CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-amber-700"><ShieldAlert className="h-4 w-4" /> Guardrail</CardTitle></CardHeader>
              <CardContent className="font-semibold text-amber-900">No publish / queue / send without approval</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Scott review queue</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {reviewQueue.map((item, index) => (
                  <li key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <Badge variant="secondary" className="h-6 min-w-6 justify-center">{index + 1}</Badge>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {roadmap.map((item) => (
              <Card key={item.priority} className={item.priority === "P0" ? "border-indigo-300 shadow-sm" : undefined}>
                <CardHeader>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={item.priority === "P0" ? "bg-indigo-600" : "bg-slate-700"}>{item.priority}</Badge>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </div>
                    <Badge variant="outline">{item.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Search className="h-3.5 w-3.5" /> Audience</div>
                    <p className="text-sm text-slate-700">{item.audience}</p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><ArrowRight className="h-3.5 w-3.5" /> CTA / decision</div>
                    <p className="text-sm font-medium text-slate-900">{item.cta}</p>
                    <p className="mt-2 text-sm text-slate-600">{item.decision}</p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Share2 className="h-3.5 w-3.5" /> Next owner</div>
                    <p className="text-sm text-slate-700">{item.nextOwner}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-500">
                      {item.risks.map((risk) => <li key={risk}>{risk}</li>)}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
