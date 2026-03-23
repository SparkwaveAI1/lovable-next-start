import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, ExternalLink, AlertCircle, CheckCircle, Clock, SkipForward } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ProcessStatus = "ok" | "error" | "skip" | "unknown";
type OwnerAgent = "rico" | "jerry" | "iris" | "dev" | "opal" | "arlo";
type Category = "twitter" | "research" | "outreach" | "leads" | "karpathy" | "fight_flow" | "content" | "system";

interface ProcessMonitor {
  id: string;
  process_name: string;
  display_name: string;
  category: Category;
  owner_agent: OwnerAgent;
  server_name: string | null;
  server_ip: string | null;
  schedule_description: string | null;
  expected_interval_minutes: number | null;
  last_run_at: string | null;
  last_status: ProcessStatus;
  last_output: string | null;
  last_metric_key: string | null;
  last_metric_value: number | null;
  consecutive_errors: number;
  total_runs: number;
  total_errors: number;
  open_paperclip_issue_id: string | null;
  is_active: boolean;
  alert_threshold_errors: number;
}

const CATEGORIES: Category[] = ["twitter", "research", "outreach", "leads", "karpathy", "fight_flow", "content", "system"];
const OWNER_AGENTS: OwnerAgent[] = ["rico", "jerry", "iris", "dev", "opal", "arlo"];

const CATEGORY_LABELS: Record<Category, string> = {
  twitter: "🐦 Twitter",
  research: "🔬 Research",
  outreach: "📤 Outreach",
  leads: "🎯 Leads",
  karpathy: "🧠 Karpathy",
  fight_flow: "🥊 Fight Flow",
  content: "📝 Content",
  system: "⚙️ System",
};

const OWNER_COLORS: Record<OwnerAgent, string> = {
  rico:  "bg-blue-100 text-blue-800",
  jerry: "bg-purple-100 text-purple-800",
  iris:  "bg-pink-100 text-pink-800",
  dev:   "bg-green-100 text-green-800",
  opal:  "bg-amber-100 text-amber-800",
  arlo:  "bg-cyan-100 text-cyan-800",
};

function getHealthColor(process: ProcessMonitor): "green" | "yellow" | "red" | "gray" {
  if (!process.is_active) return "gray";
  if (process.last_status === "error") return "red";
  if (process.consecutive_errors > 0) return "red";
  if (!process.last_run_at) return "gray";

  const interval = process.expected_interval_minutes;
  if (!interval) return process.last_status === "ok" ? "green" : "gray";

  const elapsedMs = Date.now() - new Date(process.last_run_at).getTime();
  const elapsedMin = elapsedMs / 60000;

  if (elapsedMin > interval * 2) return "red";
  if (elapsedMin > interval * 1.5) return "yellow";
  return "green";
}

function StatusIcon({ status, health }: { status: ProcessStatus; health: string }) {
  if (health === "red" || status === "error") return <AlertCircle className="h-4 w-4 text-red-500" />;
  if (health === "yellow") return <Clock className="h-4 w-4 text-amber-500" />;
  if (status === "skip") return <SkipForward className="h-4 w-4 text-gray-400" />;
  if (status === "ok") return <CheckCircle className="h-4 w-4 text-green-500" />;
  return <Clock className="h-4 w-4 text-gray-400" />;
}

function StatusBadge({ status, health }: { status: ProcessStatus; health: string }) {
  const colorMap: Record<string, string> = {
    green:  "bg-green-100 text-green-800 border-green-200",
    yellow: "bg-amber-100 text-amber-800 border-amber-200",
    red:    "bg-red-100 text-red-800 border-red-200",
    gray:   "bg-gray-100 text-gray-600 border-gray-200",
  };
  // If DB says "ok" but computed health says overdue/stale, show the real state
  const label =
    health === "yellow" && status === "ok" ? "stale"
    : health === "red" && status === "ok" ? "overdue"
    : status;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colorMap[health]}`}>
      <StatusIcon status={status} health={health} />
      {label}
    </span>
  );
}

function ProcessRow({ process }: { process: ProcessMonitor }) {
  const health = getHealthColor(process);
  const borderColor = health === "red" ? "border-l-red-500" : health === "yellow" ? "border-l-amber-400" : health === "green" ? "border-l-green-500" : "border-l-gray-300";

  return (
    <div className={`border-l-4 ${borderColor} bg-white rounded-r-lg p-4 mb-2 shadow-sm`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 truncate">{process.display_name}</span>
            <Badge variant="outline" className={`text-xs ${OWNER_COLORS[process.owner_agent]}`}>
              {process.owner_agent}
            </Badge>
            <StatusBadge status={process.last_status} health={health} />
            {process.consecutive_errors > 0 && (
              <span className="text-xs text-red-600 font-medium">
                {process.consecutive_errors} consecutive errors
              </span>
            )}
            {!process.is_active && (
              <span className="text-xs text-gray-400 italic">inactive</span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <span>{process.schedule_description || "no schedule"}</span>
            {process.server_name && <span>📍 {process.server_name}</span>}
            {process.last_run_at ? (
              <span>Last run: {formatDistanceToNow(new Date(process.last_run_at), { addSuffix: true })}</span>
            ) : (
              <span className="text-gray-400">Never run</span>
            )}
            {process.last_metric_key && process.last_metric_value !== null && (
              <span className="text-blue-600">{process.last_metric_key}: {process.last_metric_value}</span>
            )}
          </div>
          {process.last_output && (
            <p className="mt-1 text-xs text-gray-500 truncate max-w-xl">{process.last_output}</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
          <span>{process.total_runs} runs</span>
          {process.total_errors > 0 && <span className="text-red-500">{process.total_errors} errors</span>}
          {process.open_paperclip_issue_id && (
            <a
              href={`https://paperclip.sparkwaveai.app/issues/${process.open_paperclip_issue_id}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-500 hover:text-blue-700"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProcessMonitoring() {
  const [processes, setProcesses] = useState<ProcessMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const fetchProcesses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("process_monitors" as any)
      .select("*")
      .order("category", { ascending: true })
      .order("display_name", { ascending: true });

    if (!error && data) {
      setProcesses(data as unknown as ProcessMonitor[]);
    }
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 60000);
    return () => clearInterval(interval);
  }, [fetchProcesses]);

  // Filter logic
  const filtered = processes.filter((p) => {
    if (filterOwner !== "all" && p.owner_agent !== filterOwner) return false;
    if (filterStatus !== "all") {
      const health = getHealthColor(p);
      if (filterStatus === "healthy" && health !== "green") return false;
      if (filterStatus === "warning" && health !== "yellow") return false;
      if (filterStatus === "error" && health !== "red") return false;
    }
    if (search && !p.display_name.toLowerCase().includes(search.toLowerCase()) && !p.process_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by category
  const grouped: Record<string, ProcessMonitor[]> = {};
  for (const p of filtered) {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  }

  // Summary counts
  const total = processes.length;
  const healthy = processes.filter((p) => getHealthColor(p) === "green").length;
  const warning = processes.filter((p) => getHealthColor(p) === "yellow").length;
  const errored = processes.filter((p) => getHealthColor(p) === "red").length;
  const inactive = processes.filter((p) => !p.is_active).length;

  const activeCategories = CATEGORIES.filter((c) => grouped[c]?.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Process Monitoring</h1>
            <p className="text-sm text-gray-500 mt-1">
              Org-wide automated process health — {total} processes tracked
              {" · "}Last updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchProcesses} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-green-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-700">{healthy}</div>
              <div className="text-sm text-gray-500">Healthy</div>
            </CardContent>
          </Card>
          <Card className="border-amber-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-700">{warning}</div>
              <div className="text-sm text-gray-500">Overdue</div>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-700">{errored}</div>
              <div className="text-sm text-gray-500">Erroring</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-500">{inactive}</div>
              <div className="text-sm text-gray-500">Inactive</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-3 flex-wrap">
              <Input
                placeholder="Search processes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
              <Select value={filterOwner} onValueChange={setFilterOwner}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agents</SelectItem>
                  {OWNER_AGENTS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="warning">Overdue</SelectItem>
                  <SelectItem value="error">Erroring</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Category tabs */}
        {loading && processes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Loading processes...</div>
        ) : activeCategories.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No processes match filters.</div>
        ) : (
          <Tabs defaultValue={activeCategories[0]}>
            <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
              {activeCategories.map((cat) => {
                const catProcesses = grouped[cat] || [];
                const hasError = catProcesses.some((p) => getHealthColor(p) === "red");
                const hasWarn = catProcesses.some((p) => getHealthColor(p) === "yellow");
                return (
                  <TabsTrigger key={cat} value={cat} className="text-sm">
                    {CATEGORY_LABELS[cat]}
                    <span className={`ml-1 text-xs font-bold ${hasError ? "text-red-500" : hasWarn ? "text-amber-500" : "text-green-500"}`}>
                      ({catProcesses.length})
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {activeCategories.map((cat) => (
              <TabsContent key={cat} value={cat}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{CATEGORY_LABELS[cat]} — {grouped[cat].length} processes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {grouped[cat].map((p) => (
                      <ProcessRow key={p.id} process={p} />
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
}
