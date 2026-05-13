import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import {
  AlertTriangle,
  Archive,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Lightbulb,
  MessageSquareWarning,
  Route,
} from "lucide-react";

const latestScans = [
  {
    date: "2026-05-13",
    title: "PersonaAI Decision Preflight beta is the next narrow revenue move",
    mainConnection:
      "PersonaAI should not be treated as publicly/automatically launch-ready. The useful next move is a narrow private/manual Decision Preflight paid beta, while live CTA, tracking, CRM mutation, automation, public page, email/social, and lead contact stay blocked until their specific gates are satisfied.",
    whyItMatters:
      "This separates safe revenue validation from a public launch that could create positioning, proof, tracking, and fulfillment risk.",
    recommendedAction:
      "Discuss and decide whether to approve a private founder-led paid beta concept before any public channel activation.",
    status: "Decision discussion needed",
    artifact: "/root/wiki/ops/learning-layer/daily/2026-05-13-daily-connection-scan.md",
  },
  {
    date: "2026-05-12",
    title: "CRM readiness does not mean PersonaAI acquisition is ready",
    mainConnection:
      "CRM/source-of-truth work moved forward, but PersonaAI still needed approved public CTA, sample artifact/proof, methodology/limitations language, and owner/SLA before acquisition could safely launch.",
    whyItMatters:
      "Operational readiness in the Growth OS can create false confidence if the offer-specific proof and messaging are not ready.",
    recommendedAction:
      "Keep PersonaAI acquisition prep moving, but do not launch public acquisition until the proof/messaging/owner gates are settled.",
    status: "Prep-only",
    artifact: "/root/wiki/ops/learning-layer/daily/2026-05-12-daily-connection-scan.md",
  },
];

const pageRequirements = [
  "Readable daily Learner output, not just server artifacts.",
  "Archive of prior scans with date, main connection, why it matters, recommendation, and saved artifact.",
  "Decision-needed lane when Learner output requires Scott discussion.",
  "Task-candidate lane when an insight should become Paperclip work.",
  "Clear separation between Learner insight, Rico recommendation, and approved execution.",
  "No automatic public launch, outreach, publishing, spend, or CRM mutation from Learner output without approval.",
];

const nextImplementationSteps = [
  "Back the page with a Supabase learner_outputs table instead of static snapshots.",
  "Update the Learner cron to insert one structured record per run after writing the wiki artifact.",
  "Add filters for all, decisions needed, task candidates, PersonaAI, FightFlow, CRM, content, and operations drift.",
  "Add an Executive Control card showing the latest Learner scan and unresolved decision count.",
  "Allow Rico/PM to promote an output into a Paperclip task only after acceptance criteria are clear.",
];

function StatusPill({ label }: { label: string }) {
  const urgent = label.toLowerCase().includes("decision");
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        urgent ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
      }`}
    >
      {urgent ? <MessageSquareWarning className="mr-1.5 h-3.5 w-3.5" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export default function LearnerOutput() {
  return (
    <DashboardLayout businessName="Sparkwave">
      <PageContent>
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
              <Lightbulb className="h-4 w-4" />
              Learning Layer
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Learner Output</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Daily Sparkwave Learning Layer output in a readable control surface: what Learner noticed,
              why it matters, what decision or task it implies, and where the durable artifact was saved.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:min-w-72">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Clock className="h-4 w-4 text-indigo-600" />
              Runtime
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Job</dt>
                <dd className="font-mono text-xs text-slate-700">043c63cbfb92</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Cadence</dt>
                <dd className="text-slate-700">Daily, 12:00 UTC</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Delivery</dt>
                <dd className="text-slate-700">Telegram origin + wiki</dd>
              </div>
            </dl>
          </div>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Archive className="h-4 w-4 text-indigo-600" />
              Latest archive
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-950">2</p>
            <p className="mt-1 text-sm text-slate-500">Recent scans surfaced here as first slice.</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <MessageSquareWarning className="h-4 w-4" />
              Decisions to discuss
            </div>
            <p className="mt-3 text-3xl font-bold text-amber-950">1</p>
            <p className="mt-1 text-sm text-amber-800">PersonaAI private beta approval question.</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <CheckCircle2 className="h-4 w-4" />
              Guardrail
            </div>
            <p className="mt-3 text-lg font-bold text-emerald-950">Insight ≠ execution</p>
            <p className="mt-1 text-sm text-emerald-800">Learner suggests; Scott/Rico approve and convert.</p>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <h2 className="font-semibold text-amber-950">Plain-English read on today’s Learner output</h2>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                Learner is not saying “launch PersonaAI publicly.” It is saying the only potentially safe near-term
                revenue experiment is a narrow, manually fulfilled, private paid beta — and even that needs discussion.
                Everything public or automated should remain blocked until the PersonaAI-specific proof, messaging,
                tracking, fulfillment, and owner gates are settled.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-950">Recent scans</h2>
            <span className="text-sm text-slate-500">First visible slice; DB-backed archive is next.</span>
          </div>
          {latestScans.map((scan) => (
            <article key={scan.date} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{scan.date}</span>
                    <StatusPill label={scan.status} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-950">{scan.title}</h3>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  <FileText className="h-4 w-4" />
                  Artifact saved
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Main connection</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{scan.mainConnection}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Why it matters</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{scan.whyItMatters}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recommended action</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{scan.recommendedAction}</p>
                </div>
              </div>
              <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500">{scan.artifact}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-950">Page requirements</h2>
            </div>
            <ul className="space-y-3 text-sm text-slate-700">
              {pageRequirements.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Route className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-950">Next implementation steps</h2>
            </div>
            <ol className="space-y-3 text-sm text-slate-700">
              {nextImplementationSteps.map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </PageContent>
    </DashboardLayout>
  );
}
