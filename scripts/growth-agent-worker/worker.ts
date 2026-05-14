import { createClient } from '@supabase/supabase-js';

export const DEFAULT_SAFE_ACTION_TYPES = [
  'growth_brief.generate',
  'outreach_draft.generate',
  'campaign_ideas.generate',
  'record_summary.generate',
] as const;

type RpcResult<T> = Promise<{ data: T | null; error: { message?: string } | null }>;

type SupabaseRpcClient = {
  rpc: <T = unknown>(fn: string, args?: Record<string, unknown>) => RpcResult<T>;
};

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type GrowthAgentAction = {
  id: string;
  user_id: string;
  business_id?: string | null;
  action_type: string;
  payload: unknown;
};

export type WorkerConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  hermesApiBaseUrl: string;
  apiServerKey: string;
  hermesProfile: string;
  hermesToolsets: string[];
  pollIntervalMs: number;
  maxRuntimeMs: number;
  staleAfterSeconds: number;
  safeActionTypes: string[];
  once: boolean;
};

type GrowthAgentWorkerDeps = {
  config: WorkerConfig;
  supabase?: SupabaseRpcClient;
  fetch?: FetchLike;
  workerId?: string;
  logger?: Pick<Console, 'log' | 'warn' | 'error'>;
};

type HermesRunCreated = {
  run_id?: string;
  id?: string;
  status?: string;
  output?: string;
};

type HermesRunStatus = {
  run_id?: string;
  id?: string;
  status?: string;
  output?: string;
  error?: string | { message?: string };
  usage?: unknown;
};

type ParsedHermesOutput = {
  result_markdown: string;
  proposed_actions: unknown[];
  raw_output: string;
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function splitCsv(value: string | undefined, fallback: readonly string[]): string[] {
  if (!value) return [...fallback];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export function parseWorkerConfig(env: Record<string, string | undefined> = process.env): WorkerConfig {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'API_SERVER_KEY'] as const;
  for (const key of required) {
    if (!env[key]) throw new Error(`${key} is required for growth agent worker`);
  }

  return {
    supabaseUrl: env.SUPABASE_URL!,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY!,
    hermesApiBaseUrl: (env.HERMES_API_BASE_URL || 'http://127.0.0.1:8642').replace(/\/$/, ''),
    apiServerKey: env.API_SERVER_KEY!,
    hermesProfile: env.HERMES_GROWTH_AGENT_PROFILE || 'growth-agent',
    hermesToolsets: splitCsv(env.HERMES_GROWTH_AGENT_TOOLSETS, ['terminal', 'file']),
    pollIntervalMs: parsePositiveInt(env.GROWTH_AGENT_POLL_INTERVAL_MS, 5000),
    maxRuntimeMs: parsePositiveInt(env.GROWTH_AGENT_MAX_RUNTIME_MS, 10 * 60 * 1000),
    staleAfterSeconds: parsePositiveInt(env.GROWTH_AGENT_STALE_AFTER_SECONDS, 15 * 60),
    safeActionTypes: splitCsv(env.GROWTH_AGENT_SAFE_ACTION_TYPES, DEFAULT_SAFE_ACTION_TYPES),
    once: env.GROWTH_AGENT_ONCE === '1' || env.GROWTH_AGENT_ONCE === 'true',
  };
}

export function buildGrowthAgentPrompt(action: GrowthAgentAction, safeActionTypes: readonly string[] = DEFAULT_SAFE_ACTION_TYPES): string {
  if (!safeActionTypes.includes(action.action_type)) {
    throw new Error(`Action type ${action.action_type} is not safe for draft-only Growth Agent execution`);
  }

  const payloadJson = JSON.stringify(action.payload ?? {}, null, 2);
  if (payloadJson.length > 20_000) {
    throw new Error(`Action payload is too large (${payloadJson.length} bytes; max 20000)`);
  }

  return [
    'You are the private, draft-only Growth Agent for the Sparkwave app.',
    '',
    'Safety boundary:',
    '- Produce drafts, analysis, recommendations, and proposed next actions only.',
    '- Do not mutate CRM, Supabase application tables, contacts, billing, auth, or external automations.',
    '- Do not send email, DMs, webhooks, payments, or bulk actions.',
    '- If the user asks for a side effect, return it as a proposed action requiring explicit approval.',
    '',
    `Action id: ${action.id}`,
    `Business id: ${action.business_id ?? 'unknown'}`,
    `User id: ${action.user_id}`,
    `Action type: ${action.action_type}`,
    '',
    'Structured payload:',
    payloadJson,
    '',
    'Return JSON with keys: result_markdown, proposed_actions.',
    'result_markdown must be user-visible markdown. proposed_actions must be an array of draft actions only.',
  ].join('\n');
}

function parseHermesOutput(output: string | undefined): ParsedHermesOutput {
  const raw = output || '';
  try {
    const parsed = JSON.parse(raw);
    return {
      result_markdown: String(parsed.result_markdown || parsed.markdown || raw),
      proposed_actions: Array.isArray(parsed.proposed_actions) ? parsed.proposed_actions : [],
      raw_output: raw,
    };
  } catch {
    return { result_markdown: raw, proposed_actions: [], raw_output: raw };
  }
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Hermes API ${response.status}: ${text.slice(0, 1000)}`);
  }
  return text ? JSON.parse(text) as T : {} as T;
}

function terminalStatus(status: string | undefined): boolean {
  return ['completed', 'failed', 'cancelled', 'canceled'].includes(status || '');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GrowthAgentWorker {
  private config: WorkerConfig;
  private supabase: SupabaseRpcClient;
  private fetch: FetchLike;
  private workerId: string;
  private logger: Pick<Console, 'log' | 'warn' | 'error'>;

  constructor(deps: GrowthAgentWorkerDeps) {
    this.config = deps.config;
    this.supabase = deps.supabase || (createClient(deps.config.supabaseUrl, deps.config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as unknown as SupabaseRpcClient);
    this.fetch = deps.fetch || globalThis.fetch.bind(globalThis);
    this.workerId = deps.workerId || `growth-agent-${process.pid}-${Date.now()}`;
    this.logger = deps.logger || console;
  }

  async processOne(): Promise<boolean> {
    const claim = await this.supabase.rpc<GrowthAgentAction>('claim_next_growth_agent_action', {
      p_worker_id: this.workerId,
      p_safe_action_types: this.config.safeActionTypes,
      p_stale_after_seconds: this.config.staleAfterSeconds,
    });
    if (claim.error) throw new Error(`claim_next_growth_agent_action failed: ${claim.error.message || 'unknown error'}`);
    if (!claim.data || !claim.data.id) return false;

    const action = claim.data;
    try {
      this.logger.log(`claimed growth action ${action.id} (${action.action_type})`);
      const prompt = buildGrowthAgentPrompt(action, this.config.safeActionTypes);
      await this.heartbeat(action.id, 'claimed', { action_type: action.action_type });
      const run = await this.createHermesRun(action, prompt);
      const finalStatus = await this.pollHermesRun(action.id, run.run_id || run.id || '');
      if (finalStatus.status !== 'completed') {
        const err = typeof finalStatus.error === 'string' ? finalStatus.error : finalStatus.error?.message;
        throw new Error(err || `Hermes run ended with status ${finalStatus.status || 'unknown'}`);
      }

      const parsedOutput = parseHermesOutput(finalStatus.output || run.output);
      const complete = await this.supabase.rpc('complete_growth_agent_action', {
        p_action_id: action.id,
        p_worker_id: this.workerId,
        p_result: {
          hermes_run_id: finalStatus.run_id || finalStatus.id || run.run_id || run.id,
          usage: finalStatus.usage || null,
          raw_output: parsedOutput.raw_output,
        },
        p_result_markdown: parsedOutput.result_markdown,
        p_proposed_actions: parsedOutput.proposed_actions,
      });
      if (complete.error) throw new Error(`complete_growth_agent_action failed: ${complete.error.message || 'unknown error'}`);
      this.logger.log(`completed growth action ${action.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`failed growth action ${action.id}: ${message}`);
      const failed = await this.supabase.rpc('fail_growth_agent_action', {
        p_action_id: action.id,
        p_worker_id: this.workerId,
        p_error_message: message.slice(0, 2000),
        p_retryable: true,
      });
      if (failed.error) throw new Error(`fail_growth_agent_action failed after ${message}: ${failed.error.message || 'unknown error'}`);
    }

    return true;
  }

  async runForever(): Promise<void> {
    let keepRunning = true;
    while (keepRunning) {
      const processed = await this.processOne();
      if (this.config.once) {
        keepRunning = false;
      } else if (!processed) {
        await sleep(this.config.pollIntervalMs);
      }
    }
  }

  private async createHermesRun(action: GrowthAgentAction, prompt: string): Promise<HermesRunCreated> {
    const response = await this.fetch(`${this.config.hermesApiBaseUrl}/v1/runs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiServerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: prompt,
        session_id: `growth-agent:${action.id}`,
        instructions: 'Use the Growth Agent safety boundary. Return only the requested JSON object.',
        metadata: {
          source: 'swapp-growth-agent-worker',
          profile: this.config.hermesProfile,
          toolsets: this.config.hermesToolsets,
          action_id: action.id,
        },
      }),
    });
    return readJsonResponse<HermesRunCreated>(response);
  }

  private async pollHermesRun(actionId: string, runId: string): Promise<HermesRunStatus> {
    if (!runId) throw new Error('Hermes /v1/runs did not return run_id');
    const deadline = Date.now() + this.config.maxRuntimeMs;
    let lastStatus: HermesRunStatus = { run_id: runId, status: 'started' };

    while (Date.now() < deadline) {
      const response = await this.fetch(`${this.config.hermesApiBaseUrl}/v1/runs/${encodeURIComponent(runId)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.config.apiServerKey}` },
      });
      lastStatus = await readJsonResponse<HermesRunStatus>(response);
      await this.heartbeat(actionId, 'progress', { hermes_run_id: runId, status: lastStatus.status });
      if (terminalStatus(lastStatus.status)) return lastStatus;
      await sleep(Math.min(this.config.pollIntervalMs, 5000));
    }

    throw new Error(`Hermes run ${runId} timed out after ${this.config.maxRuntimeMs}ms (last status ${lastStatus.status || 'unknown'})`);
  }

  private async heartbeat(actionId: string, eventType: string, metadata: Record<string, unknown>): Promise<void> {
    const heartbeat = await this.supabase.rpc('heartbeat_growth_agent_action', {
      p_action_id: actionId,
      p_worker_id: this.workerId,
      p_event: { event_type: eventType, message: `Worker ${eventType}`, metadata },
    });
    if (heartbeat.error) throw new Error(`heartbeat_growth_agent_action failed: ${heartbeat.error.message || 'unknown error'}`);
  }
}


if (import.meta.url === `file://${process.argv[1]}`) {
  const worker = new GrowthAgentWorker({
    config: parseWorkerConfig({
      ...process.env,
      GROWTH_AGENT_ONCE: process.argv.includes('--once') ? '1' : process.env.GROWTH_AGENT_ONCE,
    }),
  });
  worker.runForever().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
