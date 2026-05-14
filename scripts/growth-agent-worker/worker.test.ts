import { describe, expect, it, vi } from 'vitest';
import {
  buildGrowthAgentPrompt,
  DEFAULT_SAFE_ACTION_TYPES,
  GrowthAgentWorker,
  parseWorkerConfig,
} from './worker';

const baseAction = {
  id: '00000000-0000-4000-8000-000000000001',
  user_id: '00000000-0000-4000-8000-000000000002',
  business_id: '11111111-1111-4111-8111-111111111111',
  action_type: 'growth_brief.generate',
  payload: {
    goal: 'Launch draft-only growth agent',
    audience: 'founders',
    offer: 'private beta',
    context_snippets: ['Existing Supabase queue pattern', 'Hermes API server is localhost-only'],
  },
};

describe('parseWorkerConfig', () => {
  it('requires secrets and applies safe defaults', () => {
    expect(() => parseWorkerConfig({})).toThrow(/SUPABASE_URL/);

    const config = parseWorkerConfig({
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      API_SERVER_KEY: 'api-key',
    });

    expect(config.supabaseUrl).toBe('http://127.0.0.1:54321');
    expect(config.hermesApiBaseUrl).toBe('http://127.0.0.1:8642');
    expect(config.hermesProfile).toBe('growth-agent');
    expect(config.hermesToolsets).toEqual(['terminal', 'file']);
    expect(config.pollIntervalMs).toBe(5000);
    expect(config.maxRuntimeMs).toBe(10 * 60 * 1000);
    expect(config.safeActionTypes).toEqual(DEFAULT_SAFE_ACTION_TYPES);
  });
});

describe('buildGrowthAgentPrompt', () => {
  it('builds a bounded draft-only prompt for safe action rows', () => {
    const prompt = buildGrowthAgentPrompt(baseAction);

    expect(prompt).toContain('draft-only Growth Agent');
    expect(prompt).toContain('Action type: growth_brief.generate');
    expect(prompt).toContain('Launch draft-only growth agent');
    expect(prompt).toContain('Do not mutate CRM, Supabase application tables, contacts, billing, auth, or external automations');
    expect(prompt).toContain('Return JSON with keys: result_markdown, proposed_actions');
    expect(prompt.length).toBeLessThan(6000);
  });

  it('rejects unsafe or oversized action rows before invoking Hermes', () => {
    expect(() => buildGrowthAgentPrompt({ ...baseAction, action_type: 'crm_contact.update' })).toThrow(/not safe/);
    expect(() => buildGrowthAgentPrompt({ ...baseAction, payload: { text: 'x'.repeat(22000) } })).toThrow(/too large/);
  });
});

describe('GrowthAgentWorker.processOne', () => {
  it('claims one action, invokes Hermes runs API, mirrors progress, and completes with parsed draft output', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: baseAction, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ run_id: 'run_123', status: 'started' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        run_id: 'run_123',
        status: 'completed',
        output: JSON.stringify({
          result_markdown: '# Draft brief\nShip safely.',
          proposed_actions: [{ type: 'draft_review', label: 'Review brief' }],
        }),
        usage: { total_tokens: 123 },
      }), { status: 200 }));

    const worker = new GrowthAgentWorker({
      config: parseWorkerConfig({
        SUPABASE_URL: 'http://127.0.0.1:54321',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
        API_SERVER_KEY: 'api-key',
      }),
      supabase: { rpc },
      fetch,
      workerId: 'worker-test',
    });

    const processed = await worker.processOne();

    expect(processed).toBe(true);
    expect(rpc).toHaveBeenNthCalledWith(1, 'claim_next_growth_agent_action', {
      p_worker_id: 'worker-test',
      p_safe_action_types: DEFAULT_SAFE_ACTION_TYPES,
      p_stale_after_seconds: 900,
    });
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8642/v1/runs', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer api-key' }),
    }));
    expect(rpc).toHaveBeenNthCalledWith(2, 'heartbeat_growth_agent_action', expect.objectContaining({
      p_action_id: baseAction.id,
      p_worker_id: 'worker-test',
    }));
    expect(rpc).toHaveBeenNthCalledWith(4, 'complete_growth_agent_action', expect.objectContaining({
      p_action_id: baseAction.id,
      p_worker_id: 'worker-test',
      p_result_markdown: '# Draft brief\nShip safely.',
      p_proposed_actions: [{ type: 'draft_review', label: 'Review brief' }],
    }));
  });

  it('fails claimed action when Hermes returns an error', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: baseAction, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const fetch = vi.fn().mockResolvedValueOnce(new Response('bad gateway', { status: 502 }));

    const worker = new GrowthAgentWorker({
      config: parseWorkerConfig({
        SUPABASE_URL: 'http://127.0.0.1:54321',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
        API_SERVER_KEY: 'api-key',
      }),
      supabase: { rpc },
      fetch,
      workerId: 'worker-test',
    });

    await expect(worker.processOne()).resolves.toBe(true);
    expect(rpc).toHaveBeenNthCalledWith(3, 'fail_growth_agent_action', expect.objectContaining({
      p_action_id: baseAction.id,
      p_worker_id: 'worker-test',
      p_retryable: true,
    }));
  });
});

