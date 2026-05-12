import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, PageContent } from "@/components/layout/PageLayout";
import { AgentHealthPanel } from "@/components/mission-control/AgentHealthPanel";
import { FightFlowDashboard } from "@/components/dashboard/FightFlowDashboard";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { useBusinesses } from "@/hooks/useBusinesses";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Clock, FileText, Shield, Loader2, ExternalLink, ArrowRight } from "lucide-react";

const PAPERCLIP_API = "http://127.0.0.1:3100/api";
const COMPANY_ID = "4d99b090-db93-4741-87c9-af254f5fdf9e";

// ─── Paperclip API Types ────────────────────────────────────────────────────

interface PaperclipIssue {
  id: string;
  identifier: string;
  title: string;
  status: string;
  priority: string | null;
  assigneeAgentId: string | null;
  assigneeAgentName: string | null;
  blockerAttention: {
    state: string;
    unresolvedBlockerCount: number;
    stalledBlockerCount: number;
    attentionBlockerCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface PaperclipGoal {
  id: string;
  title: string;
  status: string;
  level: string;
}

// ─── Growth OS Area Names ───────────────────────────────────────────────────

const GROWTH_OS_AREAS = [
  { id: "area-1", name: "GTM Strategy & ICP" },
  { id: "area-2", name: "SW App CRM / GTM Data" },
  { id: "area-3", name: "Lead Generation" },
  { id: "area-4", name: "Outbound Infra" },
  { id: "area-5", name: "Outbound Campaigns" },
  { id: "area-6", name: "Reply Handling" },
  { id: "area-7", name: "Content OS" },
  { id: "area-8", name: "Postiz / Publishing" },
  { id: "area-9", name: "Analytics" },
  { id: "area-10", name: "Agent Orchestration" },
  { id: "area-11", name: "Integrated GTM OS" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getRelativeTime(isoString: string | null): string {
  if (!isoString) return "—";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function getDaysSince(isoString: string): number {
  const diffMs = Date.now() - new Date(isoString).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ─── Decisions Needed Panel ─────────────────────────────────────────────────

function DecisionsNeededPanel() {
  const [issues, setIssues] = useState<PaperclipIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDecisions = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch issues that need attention (blocker state = attention)
      const res = await fetch(
        `${PAPERCLIP_API}/companies/${COMPANY_ID}/issues?blockerAttention.state=attention`
      );
      if (!res.ok) throw new Error("Failed to fetch decisions");
      const data = await res.json();
      setIssues(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDecisions(); }, [fetchDecisions]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          Decisions Needed
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : issues.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No decisions pending</p>
        ) : (
          <div className="space-y-2">
            {issues.map((issue) => (
              <a
                key={issue.id}
                href={`http://127.0.0.1:3100/issues/${issue.identifier}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors group"
              >
                <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                  {issue.identifier}
                </span>
                <span className="text-sm text-slate-700 flex-1 line-clamp-2">{issue.title}</span>
                <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-indigo-500 flex-shrink-0 mt-0.5" />
              </a>
            ))}
          </div>
        )}
        <p className="text-[10px] text-slate-300 mt-3 text-right">Live · Paperclip API</p>
      </CardContent>
    </Card>
  );
}

// ─── Blockers Panel ─────────────────────────────────────────────────────────

function BlockersPanel() {
  const [issues, setIssues] = useState<PaperclipIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBlockers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch stalled blockers (issues with stalled blocker count > 0)
      const res = await fetch(
        `${PAPERCLIP_API}/companies/${COMPANY_ID}/issues?blockerAttention.stalledBlockerCount.gt=0`
      );
      if (!res.ok) throw new Error("Failed to fetch blockers");
      const data = await res.json();
      setIssues(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchBlockers(); }, [fetchBlockers]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-red-500" />
          Blockers
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : issues.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No stalled blockers</p>
        ) : (
          <div className="space-y-2">
            {issues.map((issue) => (
              <a
                key={issue.id}
                href={`http://127.0.0.1:3100/issues/${issue.identifier}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 p-2 rounded-lg border border-red-100 bg-red-50 hover:bg-red-100 transition-colors group"
              >
                <span className="text-xs font-mono text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                  {issue.identifier}
                </span>
                <span className="text-sm text-slate-700 flex-1 line-clamp-2">{issue.title}</span>
                {issue.blockerAttention.stalledBlockerCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {issue.blockerAttention.stalledBlockerCount} stalled
                  </Badge>
                )}
                <ExternalLink className="h-3 w-3 text-red-300 group-hover:text-red-500 flex-shrink-0 mt-0.5" />
              </a>
            ))}
          </div>
        )}
        <p className="text-[10px] text-slate-300 mt-3 text-right">Live · Paperclip API</p>
      </CardContent>
    </Card>
  );
}

// ─── Evidence Due Panel ─────────────────────────────────────────────────────

function EvidenceDuePanel() {
  const [issues, setIssues] = useState<PaperclipIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvidenceDue = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch issues with attention blockers (evidence/inbound deliverables past SLA)
      const res = await fetch(
        `${PAPERCLIP_API}/companies/${COMPANY_ID}/issues?blockerAttention.attentionBlockerCount.gt=0`
      );
      if (!res.ok) throw new Error("Failed to fetch evidence due");
      const data = await res.json();
      setIssues(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvidenceDue(); }, [fetchEvidenceDue]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-500" />
          Evidence Due
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : issues.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No evidence due</p>
        ) : (
          <div className="space-y-2">
            {issues.map((issue) => (
              <a
                key={issue.id}
                href={`http://127.0.0.1:3100/issues/${issue.identifier}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 p-2 rounded-lg border border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors group"
              >
                <span className="text-xs font-mono text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                  {issue.identifier}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 line-clamp-1">{issue.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {getDaysSince(issue.createdAt)}d old · {issue.assigneeAgentName || "unassigned"}
                  </p>
                </div>
                <ExternalLink className="h-3 w-3 text-blue-300 group-hover:text-blue-500 flex-shrink-0 mt-0.5" />
              </a>
            ))}
          </div>
        )}
        <p className="text-[10px] text-slate-300 mt-3 text-right">Live · Paperclip API</p>
      </CardContent>
    </Card>
  );
}

// ─── Growth OS Lane Health ───────────────────────────────────────────────────

function GrowthOSLaneHealth() {
  const [issues, setIssues] = useState<PaperclipIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLaneHealth = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all in-progress and open issues to derive lane health
      const res = await fetch(
        `${PAPERCLIP_API}/companies/${COMPANY_ID}/issues?status=in_progress`
      );
      if (!res.ok) throw new Error("Failed to fetch lane health");
      const data = await res.json();
      setIssues(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLaneHealth(); }, [fetchLaneHealth]);

  // Compute lane stats by counting issues per area (using goal association)
  const laneStats = GROWTH_OS_AREAS.map((area) => {
    const areaIssues = issues.filter((issue) => {
      // Match issues by checking if title or goal references the area
      const titleLower = (issue.title || "").toLowerCase();
      const areaNum = area.id.replace("area-", "");
      return (
        titleLower.includes(`area ${areaNum}`) ||
        titleLower.includes(area.name.toLowerCase()) ||
        issue.identifier?.includes(`E${areaNum}-`)
      );
    });
    const open = areaIssues.filter((i) => i.status === "in_progress" || i.status === "todo").length;
    const blocked = areaIssues.filter(
      (i) => i.blockerAttention.unresolvedBlockerCount > 0
    ).length;
    return {
      ...area,
      open,
      blocked,
      total: areaIssues.length,
    };
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
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <div className="space-y-2">
            {laneStats.map((lane) => (
              <div
                key={lane.id}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-100"
              >
                <span className="text-xs text-slate-600 w-36 truncate">{lane.name}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      lane.blocked > 0 ? "bg-red-400" : "bg-emerald-400"
                    }`}
                    style={{ width: `${lane.total > 0 ? Math.min(100, (lane.open / lane.total) * 100) : 0}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-16 text-right">
                  {lane.open} open{lane.blocked > 0 ? ` · ${lane.blocked} blocked` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-slate-300 mt-3 text-right">Live · Paperclip API</p>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ExecutiveControl() {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();

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
          description="Growth OS control plane — decisions, blockers, and lane health from Paperclip"
        />

        {/* Agent Health Strip — always visible at top */}
        <div className="mb-6">
          <AgentHealthPanel />
        </div>

        {/* Top Row: Decisions + Blockers + Evidence Due */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <DecisionsNeededPanel />
          <BlockersPanel />
          <EvidenceDuePanel />
        </div>

        {/* Middle Row: Growth OS Lane Health */}
        <div className="mb-6">
          <GrowthOSLaneHealth />
        </div>

        {/* Bottom: FightFlow Exceptions (if Fight Flow business selected) */}
        {selectedBusiness &&
          (selectedBusiness.name.toLowerCase().includes("fight") ||
            selectedBusiness.slug?.toLowerCase().includes("fight")) && (
            <div className="mb-6">
              <FightFlowDashboard
                businessId={selectedBusiness.id}
                onContactClick={() => {}}
              />
            </div>
          )}
      </PageContent>
    </DashboardLayout>
  );
}
