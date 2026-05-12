import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, PageContent } from "@/components/layout/PageLayout";
import { AgentHealthPanel } from "@/components/mission-control/AgentHealthPanel";
import { FightFlowDashboard } from "@/components/dashboard/FightFlowDashboard";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { useBusinesses } from "@/hooks/useBusinesses";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquareWarning,
  Route,
  Shield,
} from "lucide-react";

interface PaperclipSyncIssue {
  id: string;
  record_id: string;
  identifier: string | null;
  title: string | null;
  status: string | null;
  priority: string | null;
  assignee_name: string | null;
  goal_title: string | null;
  updated_at?: string | null;
  synced_at: string | null;
  metadata: Record<string, unknown> | null;
}

interface LaneDefinition {
  id: string;
  name: string;
  keywords: string[];
  surface: string;
  route: string;
}

const LANES: LaneDefinition[] = [
  {
    id: "approvals",
    name: "Approvals / Blockers",
    keywords: ["approval", "decision", "blocker", "gate", "scott"],
    surface: "Executive Control",
    route: "/executive-control",
  },
  {
    id: "crm",
    name: "Contacts / CRM",
    keywords: ["crm", "contact", "source-of-truth", "source truth", "lifecycle", "suppression"],
    surface: "CRM + Contacts",
    route: "/crm",
  },
  {
    id: "forms",
    name: "Landing Pages / Forms",
    keywords: ["form", "book", "booking", "intake", "cta", "landing"],
    surface: "Review Queue + Bookings",
    route: "/service-requests",
  },
  {
    id: "content",
    name: "Content OS",
    keywords: ["content", "postiz", "jerry", "larry", "publishing", "source package"],
    surface: "Content Hub",
    route: "/content-hub",
  },
  {
    id: "analytics",
    name: "Analytics / Learning",
    keywords: ["analytics", "event", "kpi", "learning", "dashboard", "metric"],
    surface: "Analytics & Learning",
    route: "/analytics-learning",
  },
  {
    id: "fightflow",
    name: "FightFlow Proof Loop",
    keywords: ["fightflow", "fight flow", "staff alert", "wix", "lead automation"],
    surface: "FightFlow + Review Queue",
    route: "/fight-flow",
  },
];

const COMPLETION_SURFACES = [
  {
    name: "Executive Control",
    route: "/executive-control",
    state: "Live Supabase-backed control surface",
    next: "Use for decisions, blockers, lane health, agent health, and exception routing.",
  },
  {
    name: "Review Queue",
    route: "/service-requests",
    state: "Operational intake/review lane",
    next: "Use for pending booking, SEO, PersonaAI, FightFlow, and service-review items.",
  },
  {
    name: "CRM",
    route: "/crm",
    state: "Interim source-of-truth lane",
    next: "Keep cold prospects separate from lifecycle/inbound contacts until engaged or qualified.",
  },
  {
    name: "Bookings",
    route: "/bookings",
    state: "Trial/booking operator surface",
    next: "Track request → confirmation → attendance/no-show → follow-up outcome.",
  },
  {
    name: "Content Hub",
    route: "/content-hub",
    state: "Content strategy/review surface",
    next: "Separate draft, approved-for-repurpose, approved-for-publishing, and posted states.",
  },
  {
    name: "Analytics & Learning",
    route: "/analytics-learning",
    state: "Event-backed learning surface",
    next: "Only trust verified event data; avoid placeholder business claims.",
  },
];

function getRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function issueText(issue: PaperclipSyncIssue): string {
  return [issue.identifier, issue.title, issue.status, issue.priority, issue.assignee_name, issue.goal_title]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function issueUpdatedAt(issue: PaperclipSyncIssue): string | null {
  return issue.updated_at ?? issue.synced_at ?? null;
}

function isOpenIssue(issue: PaperclipSyncIssue): boolean {
  return !["done", "cancelled", "canceled"].includes((issue.status ?? "").toLowerCase());
}

function hasBlockerAttention(issue: PaperclipSyncIssue): boolean {
  const metadata = issue.metadata ?? {};
  const blockerAttention = metadata.blockerAttention as Record<string, unknown> | undefined;
  return (
    (issue.status ?? "").toLowerCase() === "blocked" ||
    Number(blockerAttention?.unresolvedBlockerCount ?? 0) > 0 ||
    Number(blockerAttention?.stalledBlockerCount ?? 0) > 0 ||
    Number(blockerAttention?.attentionBlockerCount ?? 0) > 0
  );
}

function paperclipIssueUrl(issue: PaperclipSyncIssue): string {
  return `https://paperclip.sparkwaveai.app/issues/${issue.record_id || issue.id}`;
}

function statusBadgeClass(status: string | null): string {
  switch ((status ?? "").toLowerCase()) {
    case "blocked":
      return "bg-red-100 text-red-700 border-red-200";
    case "in_progress":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "todo":
    case "backlog":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "done":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function IssueCard({ issue, tone = "slate" }: { issue: PaperclipSyncIssue; tone?: "slate" | "red" | "amber" | "blue" }) {
  const toneClass = {
    slate: "border-slate-100 hover:bg-slate-50",
    red: "border-red-100 bg-red-50 hover:bg-red-100",
    amber: "border-amber-100 bg-amber-50 hover:bg-amber-100",
    blue: "border-blue-100 bg-blue-50 hover:bg-blue-100",
  }[tone];

  return (
    <a
      href={paperclipIssueUrl(issue)}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-start gap-2 p-2 rounded-lg border transition-colors group ${toneClass}`}
    >
      <span className="text-xs font-mono text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-indigo-100">
        {issue.identifier ?? "Paperclip"}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 line-clamp-2">{issue.title ?? "Untitled issue"}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {issue.assignee_name || "unassigned"} · {getRelativeTime(issueUpdatedAt(issue))}
        </p>
      </div>
      <Badge variant="outline" className={`text-[10px] ${statusBadgeClass(issue.status)}`}>
        {issue.status ?? "unknown"}
      </Badge>
      <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-indigo-500 flex-shrink-0 mt-0.5" />
    </a>
  );
}

function IssuePanel({
  title,
  icon,
  issues,
  empty,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  issues: PaperclipSyncIssue[];
  empty: string;
  tone: "slate" | "red" | "amber" | "blue";
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">{empty}</p>
        ) : (
          <div className="space-y-2">
            {issues.map((issue) => <IssueCard key={issue.id} issue={issue} tone={tone} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GrowthOSLaneHealth({ issues }: { issues: PaperclipSyncIssue[] }) {
  const laneStats = LANES.map((lane) => {
    const matches = issues.filter((issue) => lane.keywords.some((keyword) => issueText(issue).includes(keyword)));
    const open = matches.filter(isOpenIssue).length;
    const blocked = matches.filter(hasBlockerAttention).length;
    const recentlyDone = matches.filter((issue) => (issue.status ?? "").toLowerCase() === "done").slice(0, 10).length;
    return { ...lane, open, blocked, recentlyDone };
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Growth OS Lane Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {laneStats.map((lane) => (
            <Link
              key={lane.id}
              to={lane.route}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">{lane.name}</span>
                  <span className="text-xs text-slate-400">{lane.surface}</span>
                </div>
                <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${lane.blocked > 0 ? "bg-red-400" : lane.open > 0 ? "bg-blue-400" : "bg-emerald-400"}`}
                    style={{ width: `${Math.max(8, Math.min(100, (lane.open + lane.recentlyDone) * 12))}%` }}
                  />
                </div>
              </div>
              <div className="text-right text-xs text-slate-500 w-28">
                <div>{lane.open} open</div>
                <div className={lane.blocked > 0 ? "text-red-600" : "text-emerald-600"}>{lane.blocked} blocked</div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300" />
            </Link>
          ))}
        </div>
        <p className="text-[10px] text-slate-300 mt-3 text-right">Synced from Supabase paperclip_sync</p>
      </CardContent>
    </Card>
  );
}

function CompletionSurfaceMap() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Route className="h-4 w-4 text-indigo-500" />
          Operating Center Surface Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {COMPLETION_SURFACES.map((surface) => (
            <Link key={surface.route} to={surface.route} className="rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm text-slate-800">{surface.name}</p>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">active</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">{surface.state}</p>
              <p className="text-xs text-slate-400 mt-2 line-clamp-2">{surface.next}</p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ControlPlaneSnapshot({ issues }: { issues: PaperclipSyncIssue[] }) {
  const open = issues.filter(isOpenIssue).length;
  const blocked = issues.filter(hasBlockerAttention).length;
  const done = issues.filter((issue) => (issue.status ?? "").toLowerCase() === "done").length;
  const staleOpen = issues.filter((issue) => {
    if (!isOpenIssue(issue)) return false;
    const updated = issueUpdatedAt(issue);
    if (!updated) return false;
    return Date.now() - new Date(updated).getTime() > 48 * 60 * 60 * 1000;
  }).length;

  const metrics = [
    { label: "Open work", value: open, icon: Clock, className: "text-blue-600" },
    { label: "Blocked", value: blocked, icon: Shield, className: blocked ? "text-red-600" : "text-emerald-600" },
    { label: "Recently done", value: done, icon: CheckCircle2, className: "text-emerald-600" },
    { label: "Stale >48h", value: staleOpen, icon: MessageSquareWarning, className: staleOpen ? "text-amber-600" : "text-emerald-600" },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-slate-50 p-2">
                <Icon className={`h-5 w-5 ${metric.className}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{metric.value}</p>
                <p className="text-xs text-slate-500">{metric.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function ExecutiveControl() {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();
  const [issues, setIssues] = useState<PaperclipSyncIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchIssues() {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("paperclip_sync")
          .select("*")
          .eq("record_type", "issue")
          .order("synced_at", { ascending: false })
          .limit(250);

        if (fetchError) throw fetchError;
        if (!cancelled) setIssues((data ?? []) as PaperclipSyncIssue[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load control-plane issues");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchIssues();

    const channel = supabase
      .channel("executive_control_issues")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "paperclip_sync", filter: "record_type=eq.issue" },
        () => fetchIssues()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const openIssues = useMemo(() => issues.filter(isOpenIssue), [issues]);
  const decisions = useMemo(
    () =>
      openIssues
        .filter((issue) => /decision|approval|approve|source-of-truth|source truth|gate|blocked|scott/i.test(issueText(issue)))
        .slice(0, 6),
    [openIssues]
  );
  const blockers = useMemo(() => openIssues.filter(hasBlockerAttention).slice(0, 6), [openIssues]);
  const evidenceDue = useMemo(
    () =>
      openIssues
        .filter((issue) => /verify|verification|qa|audit|proof|evidence|test|controlled/i.test(issueText(issue)))
        .slice(0, 6),
    [openIssues]
  );

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={(id) => {
        const business = businesses.find((b) => b.id === id);
        if (business) setSelectedBusiness(business);
      }}
      businessName={selectedBusiness?.name}
    >
      <PageContent>
        <PageHeader
          title="Executive Control"
          description="Growth OS operating center — approvals, blockers, live lane state, and next action routing"
        />

        <div className="mb-6 rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
          <strong>Operating rule:</strong> Paperclip remains the execution source of truth; SW app shows the decision, review, intake, CRM, analytics, and follow-up surfaces needed to run the work without digging through server files.
        </div>

        <div className="mb-6">
          <AgentHealthPanel />
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-10 flex items-center justify-center text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading control-plane state...
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-6 text-sm text-amber-800">
              Could not load synced Paperclip state: {error}. The operating surfaces below remain available.
            </CardContent>
          </Card>
        ) : (
          <>
            <ControlPlaneSnapshot issues={issues} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <IssuePanel
                title="Decisions / Approvals"
                icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
                issues={decisions}
                empty="No approval or decision issues in synced open work"
                tone="amber"
              />
              <IssuePanel
                title="Blockers"
                icon={<Shield className="h-4 w-4 text-red-500" />}
                issues={blockers}
                empty="No blockers in synced open work"
                tone="red"
              />
              <IssuePanel
                title="Evidence / QA Due"
                icon={<FileText className="h-4 w-4 text-blue-500" />}
                issues={evidenceDue}
                empty="No QA/evidence issues in synced open work"
                tone="blue"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
              <GrowthOSLaneHealth issues={issues} />
              <CompletionSurfaceMap />
            </div>
          </>
        )}

        <div className="mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-slate-500" />
                Completion Focus
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <p><strong>Now:</strong> make every visible surface route an operator can use: intake → review → CRM/booking → response/follow-up → analytics/learning.</p>
              <p><strong>Not counted as done:</strong> stale dashboards, draft-only content, unverified forms, fake CRM pipeline, placeholder metrics, or external publishing without explicit approval.</p>
            </CardContent>
          </Card>
        </div>

        {selectedBusiness &&
          (selectedBusiness.name.toLowerCase().includes("fight") ||
            selectedBusiness.slug?.toLowerCase().includes("fight")) && (
            <div className="mb-6">
              <FightFlowDashboard businessId={selectedBusiness.id} onContactClick={() => {}} />
            </div>
          )}
      </PageContent>
    </DashboardLayout>
  );
}
