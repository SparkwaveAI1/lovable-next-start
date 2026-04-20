import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Users,
  TrendingUp,
  XCircle,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Types
interface AutomationLog {
  id: string;
  automation_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
  execution_time_ms: number | null;
}

interface SMSMessage {
  id: string;
  direction: string;
  message: string | null;
  created_at: string;
}

interface FollowUp {
  id: string;
  status: string;
  current_step: number;
  created_at: string;
}

interface DayVolume {
  date: string;
  day: string;
  inbound: number;
  outbound: number;
  total: number;
}

type SystemStatus = "GREEN" | "YELLOW" | "RED";

// Status styling
const STATUS_COLORS: Record<SystemStatus, string> = {
  GREEN: "from-emerald-500 to-emerald-600",
  YELLOW: "from-yellow-500 to-amber-500",
  RED: "from-red-500 to-rose-600",
};

const STATUS_BG: Record<SystemStatus, string> = {
  GREEN: "bg-emerald-50 border-emerald-200",
  YELLOW: "bg-yellow-50 border-yellow-200",
  RED: "bg-red-50 border-red-200",
};

const STATUS_TEXT: Record<SystemStatus, string> = {
  GREEN: "All Systems Operational",
  YELLOW: "Degraded Performance",
  RED: "Critical Issues Detected",
};

const STATUS_ICON: Record<SystemStatus, React.ReactNode> = {
  GREEN: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
  YELLOW: <AlertCircle className="h-5 w-5 text-yellow-600" />,
  RED: <XCircle className="h-5 w-5 text-red-600" />,
};

function formatTimeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getLastNDays(n: number): string[] {
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

interface QualityDashboardProps {
  className?: string;
  businessId?: string | null;
}

export function QualityDashboard({ className, businessId }: QualityDashboardProps) {
  const [automationLogs, setAutomationLogs] = useState<AutomationLog[]>([]);
  const [smsMessages, setSmsMessages] = useState<SMSMessage[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setRefreshing(true);

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString();

      // Fetch automation logs (last 7 days)
      let logsQuery = supabase
        .from("automation_logs")
        .select("id, automation_type, status, error_message, created_at, execution_time_ms")
        .gte("created_at", sevenDaysAgoStr)
        .order("created_at", { ascending: false });

      if (businessId) {
        logsQuery = logsQuery.eq("business_id", businessId);
      }

      const { data: logsData, error: logsError } = await logsQuery;
      if (logsError) throw logsError;

      // Fetch SMS messages (last 7 days)
      let smsQuery = supabase
        .from("sms_messages")
        .select("id, direction, message, created_at")
        .gte("created_at", sevenDaysAgoStr)
        .order("created_at", { ascending: false });

      const { data: smsData, error: smsError } = await smsQuery;
      if (smsError) throw smsError;

      // Fetch follow-ups (all active/recent)
      let followQuery = supabase
        .from("contact_follow_ups")
        .select("id, status, current_step, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (businessId) {
        followQuery = followQuery.eq("business_id", businessId);
      }

      const { data: followData, error: followError } = await followQuery;
      if (followError) throw followError;

      setAutomationLogs((logsData as AutomationLog[]) || []);
      setSmsMessages((smsData as SMSMessage[]) || []);
      setFollowUps((followData as FollowUp[]) || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch quality data:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [businessId]);

  // Calculate metrics
  const metrics = useMemo(() => {
    // Automation success rate
    const totalLogs = automationLogs.length;
    const successLogs = automationLogs.filter((l) => l.status === "success").length;
    const errorLogs = automationLogs.filter((l) => l.status === "error").length;
    const successRate = totalLogs > 0 ? (successLogs / totalLogs) * 100 : 100;

    // Recent errors (last 10)
    const recentErrors = automationLogs
      .filter((l) => l.status === "error" && l.error_message)
      .slice(0, 10);

    // SMS volume by day
    const last7Days = getLastNDays(7);
    const volumeByDay: DayVolume[] = last7Days.map((date) => {
      const dayMessages = smsMessages.filter(
        (m) => m.created_at.split("T")[0] === date
      );
      const inbound = dayMessages.filter((m) => m.direction === "inbound").length;
      const outbound = dayMessages.filter((m) => m.direction === "outbound").length;
      return {
        date,
        day: getDayName(date),
        inbound,
        outbound,
        total: inbound + outbound,
      };
    });

    // Total SMS volume
    const totalSMS = smsMessages.length;
    const inboundSMS = smsMessages.filter((m) => m.direction === "inbound").length;
    const outboundSMS = smsMessages.filter((m) => m.direction === "outbound").length;

    // Follow-up funnel
    const activeFollowUps = followUps.filter((f) => f.status === "active").length;
    const pausedFollowUps = followUps.filter((f) => f.status === "paused").length;
    const completedFollowUps = followUps.filter((f) => f.status === "completed").length;
    const totalFollowUps = followUps.length;

    // Overall system status
    let systemStatus: SystemStatus = "GREEN";
    if (successRate < 95 || errorLogs > 5) systemStatus = "YELLOW";
    if (successRate < 80 || errorLogs > 20) systemStatus = "RED";

    return {
      totalLogs,
      successLogs,
      errorLogs,
      successRate,
      recentErrors,
      volumeByDay,
      totalSMS,
      inboundSMS,
      outboundSMS,
      activeFollowUps,
      pausedFollowUps,
      completedFollowUps,
      totalFollowUps,
      systemStatus,
    };
  }, [automationLogs, smsMessages, followUps]);

  // Gauge arc calculation
  const gaugeAngle = (metrics.successRate / 100) * 180;

  return (
    <div
      className={cn(
        "flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-violet-500" />
          <h3 className="font-semibold text-sm text-slate-900">
            📊 Quality Dashboard
          </h3>
          {lastUpdated && (
            <span className="text-xs text-slate-400">
              {formatTimeAgo(lastUpdated.toISOString())}
            </span>
          )}
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="p-1 rounded hover:bg-slate-100 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw
            className={cn(
              "h-3.5 w-3.5 text-slate-400",
              refreshing && "animate-spin"
            )}
          />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <RefreshCw className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* System Status Banner */}
            <div
              className={cn(
                "p-4 rounded-xl border flex items-center gap-4",
                STATUS_BG[metrics.systemStatus]
              )}
            >
              <div
                className={cn(
                  "h-12 w-12 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg",
                  STATUS_COLORS[metrics.systemStatus]
                )}
              >
                <span className="text-white font-bold text-lg">
                  {Math.round(metrics.successRate)}%
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {STATUS_ICON[metrics.systemStatus]}
                  <span className="font-semibold text-slate-900">
                    {STATUS_TEXT[metrics.systemStatus]}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-0.5">
                  {metrics.successLogs} successful / {metrics.totalLogs} total operations (7d)
                </p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* SMS Volume */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium text-slate-500">SMS Volume</span>
                </div>
                <p className="text-xl font-bold text-slate-900">{metrics.totalSMS}</p>
                <p className="text-xs text-slate-500">
                  ↓{metrics.inboundSMS} / ↑{metrics.outboundSMS}
                </p>
              </div>

              {/* Error Count */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-xs font-medium text-slate-500">Errors</span>
                </div>
                <p className="text-xl font-bold text-slate-900">{metrics.errorLogs}</p>
                <p className="text-xs text-slate-500">Last 7 days</p>
              </div>

              {/* Active Follow-ups */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-violet-500" />
                  <span className="text-xs font-medium text-slate-500">Active Sequences</span>
                </div>
                <p className="text-xl font-bold text-slate-900">{metrics.activeFollowUps}</p>
                <p className="text-xs text-slate-500">of {metrics.totalFollowUps} total</p>
              </div>

              {/* Success Rate */}
              <div className={cn(
                "p-3 rounded-lg border",
                metrics.successRate >= 80 ? "bg-slate-50 border-slate-200" : metrics.successRate >= 50 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className={cn(
                    "h-4 w-4",
                    metrics.successRate >= 80 ? "text-emerald-500" : metrics.successRate >= 50 ? "text-amber-500" : "text-red-500"
                  )} />
                  <span className="text-xs font-medium text-slate-500">Success Rate</span>
                </div>
                <p className={cn(
                  "text-xl font-bold",
                  metrics.successRate >= 80 ? "text-emerald-700" : metrics.successRate >= 50 ? "text-amber-700" : "text-red-700"
                )}>
                  {metrics.successRate.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500">Automation ops</p>
              </div>
            </div>

            {/* Message Volume Chart */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                Message Volume (7 Days)
              </h4>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.volumeByDay} barCategoryGap="15%">
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number, name: string) => [
                        value,
                        name === "inbound" ? "Inbound" : "Outbound",
                      ]}
                    />
                    <Bar dataKey="inbound" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="outbound" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-blue-500" /> Inbound
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-violet-500" /> Outbound
                </span>
              </div>
            </div>

            {/* Follow-up Funnel */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-500" />
                Follow-up Funnel
              </h4>
              <div className="flex items-center gap-3">
                {/* Active */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs flex items-center gap-1 text-emerald-700">
                      <PlayCircle className="h-3 w-3" /> Active
                    </span>
                    <span className="text-xs font-medium text-slate-700">
                      {metrics.activeFollowUps}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{
                        width: `${
                          metrics.totalFollowUps > 0
                            ? (metrics.activeFollowUps / metrics.totalFollowUps) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Paused */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs flex items-center gap-1 text-yellow-700">
                      <PauseCircle className="h-3 w-3" /> Paused
                    </span>
                    <span className="text-xs font-medium text-slate-700">
                      {metrics.pausedFollowUps}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full transition-all"
                      style={{
                        width: `${
                          metrics.totalFollowUps > 0
                            ? (metrics.pausedFollowUps / metrics.totalFollowUps) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Completed */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs flex items-center gap-1 text-blue-700">
                      <CheckCircle2 className="h-3 w-3" /> Completed
                    </span>
                    <span className="text-xs font-medium text-slate-700">
                      {metrics.completedFollowUps}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{
                        width: `${
                          metrics.totalFollowUps > 0
                            ? (metrics.completedFollowUps / metrics.totalFollowUps) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Errors */}
            {metrics.recentErrors.length > 0 && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Recent Errors ({metrics.recentErrors.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {metrics.recentErrors.map((err) => (
                    <div
                      key={err.id}
                      className="p-2 bg-white rounded-lg border border-red-100"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">
                            {err.automation_type}
                          </p>
                          <p className="text-xs text-red-600 line-clamp-2 mt-0.5">
                            {err.error_message}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTimeAgo(err.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Errors Message */}
            {metrics.recentErrors.length === 0 && metrics.totalLogs > 0 && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">No errors detected</p>
                  <p className="text-xs text-emerald-600">
                    All {metrics.totalLogs} operations completed successfully
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default QualityDashboard;
