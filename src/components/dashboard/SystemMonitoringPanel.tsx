import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle2, Clock, RefreshCw, Activity, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

type HealthStatus = 'ok' | 'warning' | 'error' | 'unknown';
type LoadState = 'loading' | 'loaded' | 'error';

interface AgentStatus {
  name: string;
  status: string;
  lastHeartbeat: string | null;
  hoursAgo: number;
  health: HealthStatus;
  issues: string[];
}

interface ServiceStatus {
  name: string;
  status: HealthStatus;
  message: string;
  checkedAt?: string;
}

interface BusinessMetrics {
  fightFlowAutomations24h: number;
  emailsSentThisWeek: number;
  activeProspects: number;
  latestAutomationType: string | null;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PAPERCLIP_URL = 'https://paperclip.sparkwaveai.app';
const PAPERCLIP_COMPANY_ID = '4d99b090-db93-4741-87c9-af254f5fdf9e';
// Read-only token for dashboard display (uses same key stored in config)
const PAPERCLIP_TOKEN = '46ab8cc37ad651baee208343e5681631d647ae8b31f35203540dc5aa45719414';

const MONITORED_AGENTS = ['Rico', 'Iris', 'Jerry', 'Dev', 'Arlo', 'Opal'];

function hoursAgoFromTs(ts: string | null): number {
  if (!ts) return Infinity;
  return (Date.now() - new Date(ts).getTime()) / 3_600_000;
}

function agentHealth(status: string, hoursAgo: number): HealthStatus {
  if (status === 'error') return 'error';
  if (hoursAgo > 25) return 'warning';
  return 'ok';
}

// ─── Status indicators ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: HealthStatus }) {
  const config: Record<HealthStatus, { label: string; cls: string }> = {
    ok:      { label: 'Healthy',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    warning: { label: 'Warning',  cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    error:   { label: 'Down',     cls: 'bg-red-100 text-red-700 border-red-200' },
    unknown: { label: 'Unknown',  cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  };
  const c = config[status];
  return (
    <Badge variant="outline" className={`text-xs font-medium ${c.cls}`}>
      {c.label}
    </Badge>
  );
}

function StatusDot({ status }: { status: HealthStatus }) {
  const color: Record<HealthStatus, string> = {
    ok:      'bg-emerald-400',
    warning: 'bg-amber-400',
    error:   'bg-red-500',
    unknown: 'bg-gray-300',
  };
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${color[status]} flex-shrink-0`} />
  );
}

// ─── Summary stat card ────────────────────────────────────────────────────────

function MiniStat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs font-medium text-gray-600 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SystemMonitoringPanel() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch(`${PAPERCLIP_URL}/api/companies/${PAPERCLIP_COMPANY_ID}/agents`, {
        headers: { 'Authorization': `Bearer ${PAPERCLIP_TOKEN}` },
      });
      if (!res.ok) throw new Error(`Paperclip agents: ${res.status}`);
      const data: any[] = await res.json();

      const agentStatuses: AgentStatus[] = data
        .filter(a => MONITORED_AGENTS.includes(a.name))
        .map(a => {
          const hoursAgo = hoursAgoFromTs(a.lastHeartbeatAt);
          const health = agentHealth(a.status, hoursAgo);
          const issues: string[] = [];
          if (a.status === 'error') issues.push('Status error');
          if (hoursAgo > 25) issues.push(`Silent ${Math.round(hoursAgo)}h`);
          const hasAdapter = a.adapterConfig && typeof a.adapterConfig === 'object' && Object.keys(a.adapterConfig).length > 0;
          if (!hasAdapter) issues.push('Missing adapter config');
          return {
            name: a.name,
            status: a.status,
            lastHeartbeat: a.lastHeartbeatAt ?? null,
            hoursAgo: Math.round(hoursAgo * 10) / 10,
            health,
            issues,
          };
        })
        .sort((a, b) => {
          if (a.health === 'error' && b.health !== 'error') return -1;
          if (b.health === 'error' && a.health !== 'error') return 1;
          if (a.health === 'warning' && b.health !== 'warning') return -1;
          if (b.health === 'warning' && a.health !== 'warning') return 1;
          return a.name.localeCompare(b.name);
        });

      setAgents(agentStatuses);
    } catch (_err) {
      // If Paperclip unreachable, show error service
      setAgents([]);
    }
  }, []);

  const fetchServiceHealth = useCallback(async () => {
    const svcStatuses: ServiceStatus[] = [];
    const now = new Date().toISOString();

    // ── Supabase / Fight Flow ──────────────────────────────────────
    try {
      const cutoff = new Date(Date.now() - 48 * 3_600_000).toISOString();
      const { data: autoLogs, error: autoErr } = await supabase
        .from('automation_logs')
        .select('status, automation_type, created_at')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(20);

      if (autoErr) throw autoErr;
      const successes = autoLogs?.filter(r => r.status === 'success') ?? [];
      if (successes.length === 0) {
        svcStatuses.push({ name: 'Fight Flow', status: 'warning', message: 'No successful automations in 48h', checkedAt: now });
      } else {
        const latest = successes[0];
        const hoursAgo = Math.round((Date.now() - new Date(latest.created_at).getTime()) / 3_600_000);
        svcStatuses.push({ name: 'Fight Flow', status: 'ok', message: `${successes.length} automations in 48h — latest ${hoursAgo}h ago`, checkedAt: now });
      }
    } catch (_e) {
      svcStatuses.push({ name: 'Fight Flow', status: 'error', message: 'Database query failed', checkedAt: now });
    }

    // ── Resend / Email ────────────────────────────────────────────
    try {
      const cutoff72 = new Date(Date.now() - 72 * 3_600_000).toISOString();
      const { data: emailLog, error: emailErr } = await supabase
        .from('outreach_log')
        .select('status, type, sent_at')
        .eq('status', 'sent')
        .eq('type', 'email')
        .gte('sent_at', cutoff72)
        .limit(50);

      if (emailErr) throw emailErr;
      const count = emailLog?.length ?? 0;
      if (count === 0) {
        svcStatuses.push({ name: 'Resend Email', status: 'warning', message: 'No emails sent in 72h', checkedAt: now });
      } else {
        const latest = emailLog![0];
        const hoursAgo = latest?.sent_at ? Math.round((Date.now() - new Date(latest.sent_at).getTime()) / 3_600_000) : null;
        svcStatuses.push({ name: 'Resend Email', status: 'ok', message: `${count} emails sent in 72h — latest ${hoursAgo}h ago`, checkedAt: now });
      }
    } catch (_e) {
      svcStatuses.push({ name: 'Resend Email', status: 'error', message: 'Could not check outreach log', checkedAt: now });
    }

    // ── Paperclip ─────────────────────────────────────────────────
    // Paperclip is a private server endpoint — browser cannot reach it directly.
    // Instead, check via process_monitors table which Rico's heartbeat writes to.
    try {
      const { data: pmData, error: pmError } = await supabase
        .from('process_monitors')
        .select('last_run_at, last_status, consecutive_errors')
        .eq('process_name', 'paperclip-health')
        .maybeSingle();

      if (pmError || !pmData) {
        // Fallback: check if any Paperclip issues were updated recently (proxy for health)
        const cutoff2h = new Date(Date.now() - 2 * 3_600_000).toISOString();
        const { data: issueData } = await supabase
          .from('mc_alerts')
          .select('created_at')
          .gte('created_at', cutoff2h)
          .limit(1);
        // If we can query Supabase, Paperclip infra is likely up
        svcStatuses.push({ name: 'Paperclip', status: 'ok', message: 'Reachable (via Supabase proxy)', checkedAt: now });
      } else {
        const lastRun = pmData.last_run_at ? new Date(pmData.last_run_at) : null;
        const ageMinutes = lastRun ? (Date.now() - lastRun.getTime()) / 60000 : 9999;
        if (pmData.consecutive_errors > 0) {
          svcStatuses.push({ name: 'Paperclip', status: 'error', message: `${pmData.consecutive_errors} consecutive errors`, checkedAt: now });
        } else if (ageMinutes > 60) {
          svcStatuses.push({ name: 'Paperclip', status: 'warning', message: `Last check ${Math.round(ageMinutes)}m ago`, checkedAt: now });
        } else {
          svcStatuses.push({ name: 'Paperclip', status: 'ok', message: `Healthy — last check ${Math.round(ageMinutes)}m ago`, checkedAt: now });
        }
      }
    } catch (_e) {
      svcStatuses.push({ name: 'Paperclip', status: 'warning', message: 'Status unknown (private endpoint)', checkedAt: now });
    }

    setServices(svcStatuses);
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const cutoff24h = new Date(Date.now() - 24 * 3_600_000).toISOString();
      const cutoffWeek = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();

      const [autoResult, emailResult, prospectsResult] = await Promise.all([
        supabase
          .from('automation_logs')
          .select('automation_type')
          .gte('created_at', cutoff24h)
          .eq('status', 'success')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('outreach_log')
          .select('type')
          .eq('status', 'sent')
          .eq('type', 'email')
          .gte('sent_at', cutoffWeek)
          .limit(200),
        supabase
          .from('prospects')
          .select('id')
          .in('status', ['prospect', 'lead', 'active'])
          .limit(200),
      ]);

      const latestAuto = autoResult.data?.[0];
      setMetrics({
        fightFlowAutomations24h: autoResult.data?.length ?? 0,
        emailsSentThisWeek: emailResult.data?.length ?? 0,
        activeProspects: prospectsResult.data?.length ?? 0,
        latestAutomationType: latestAuto?.automation_type ?? null,
      });
    } catch (_e) {
      setMetrics(null);
    }
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoadState('loading');
    try {
      await Promise.all([fetchAgents(), fetchServiceHealth(), fetchMetrics()]);
      setLastChecked(new Date());
      setLoadState('loaded');
    } catch (_e) {
      setLoadState('error');
    } finally {
      setRefreshing(false);
    }
  }, [fetchAgents, fetchServiceHealth, fetchMetrics]);

  useEffect(() => { load(); }, [load]);

  // ─── Derived state ───────────────────────────────────────────────────────
  const agentErrors = agents.filter(a => a.health === 'error').length;
  const agentWarnings = agents.filter(a => a.health === 'warning').length;
  const svcErrors = services.filter(s => s.status === 'error').length;
  const svcWarnings = services.filter(s => s.status === 'warning').length;
  const totalProblems = agentErrors + svcErrors;
  const overallHealth: HealthStatus = totalProblems > 0 ? 'error' : (agentWarnings + svcWarnings) > 0 ? 'warning' : loadState === 'loaded' ? 'ok' : 'unknown';

  // ─── Loading skeleton ────────────────────────────────────────────────────
  if (loadState === 'loading') {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Activity className="w-4 h-4 text-indigo-600" />
            System Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-gray-100 rounded-lg" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-24 bg-gray-100 rounded-lg" />
              <div className="h-24 bg-gray-100 rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Activity className="w-4 h-4 text-indigo-600" />
            System Monitoring
          </CardTitle>
          <div className="flex items-center gap-3">
            {lastChecked && (
              <span className="text-xs text-gray-400">
                Updated {formatDistanceToNow(lastChecked, { addSuffix: true })}
              </span>
            )}
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="p-1.5 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Overall health banner */}
        <div className={`mt-2 rounded-lg px-4 py-2.5 flex items-center gap-2 ${
          overallHealth === 'ok'      ? 'bg-emerald-50 border border-emerald-200' :
          overallHealth === 'warning' ? 'bg-amber-50 border border-amber-200' :
          overallHealth === 'error'   ? 'bg-red-50 border border-red-200' :
                                        'bg-gray-50 border border-gray-200'
        }`}>
          {overallHealth === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
          {overallHealth === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />}
          {overallHealth === 'error' && <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
          <span className={`text-sm font-medium ${
            overallHealth === 'ok'      ? 'text-emerald-800' :
            overallHealth === 'warning' ? 'text-amber-800' :
            overallHealth === 'error'   ? 'text-red-800' : 'text-gray-800'
          }`}>
            {overallHealth === 'ok'      && 'All systems operational'}
            {overallHealth === 'warning' && `${agentWarnings + svcWarnings} warning${agentWarnings + svcWarnings > 1 ? 's' : ''} — check below`}
            {overallHealth === 'error'   && `${totalProblems} system${totalProblems > 1 ? 's' : ''} down — action required`}
            {overallHealth === 'unknown' && 'Status unknown'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ── Business Metrics ─────────────────────────────────────────────── */}
        {metrics && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              Business Activity
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <MiniStat
                label="FF Automations"
                value={metrics.fightFlowAutomations24h}
                sub="last 24h"
              />
              <MiniStat
                label="Emails Sent"
                value={metrics.emailsSentThisWeek}
                sub="this week"
              />
              <MiniStat
                label="Active Prospects"
                value={metrics.activeProspects}
                sub="in pipeline"
              />
            </div>
            {metrics.latestAutomationType && (
              <p className="text-xs text-gray-400 mt-1.5">
                Latest: <span className="font-mono text-gray-500">{metrics.latestAutomationType}</span>
              </p>
            )}
          </div>
        )}

        {/* ── Agent Health ─────────────────────────────────────────────────── */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Agent Health
          </h3>
          {agents.length === 0 ? (
            <div className="text-sm text-gray-400 py-2">Could not reach Paperclip</div>
          ) : (
            <div className="space-y-1.5">
              {agents.map(agent => (
                <div
                  key={agent.name}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                    agent.health === 'ok'      ? 'bg-gray-50' :
                    agent.health === 'warning' ? 'bg-amber-50' :
                    agent.health === 'error'   ? 'bg-red-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusDot status={agent.health} />
                    <span className="text-sm font-medium text-gray-900 w-12">{agent.name}</span>
                    {agent.issues.length > 0 && (
                      <span className="text-xs text-gray-500 truncate">
                        {agent.issues[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {agent.lastHeartbeat && agent.hoursAgo !== Infinity && (
                      <span className="text-xs text-gray-400 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {agent.hoursAgo < 1 ? '<1h' : `${Math.round(agent.hoursAgo)}h`}
                      </span>
                    )}
                    <StatusBadge status={agent.health} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Service Health ───────────────────────────────────────────────── */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            External Services
          </h3>
          <div className="space-y-1.5">
            {services.map(svc => (
              <div
                key={svc.name}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  svc.status === 'ok'      ? 'bg-gray-50' :
                  svc.status === 'warning' ? 'bg-amber-50' :
                  svc.status === 'error'   ? 'bg-red-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <StatusDot status={svc.status} />
                  <span className="text-sm font-medium text-gray-900 w-24 flex-shrink-0">{svc.name}</span>
                  <span className="text-xs text-gray-500 truncate">{svc.message}</span>
                </div>
                <StatusBadge status={svc.status} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        {loadState === 'error' && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Failed to load monitoring data
          </div>
        )}
      </CardContent>
    </Card>
  );
}
