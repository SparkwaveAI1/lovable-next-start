import { describe, expect, it } from 'vitest';
import {
  buildGrowthAgentPayload,
  getGrowthAgentActionConfig,
  isDraftOnlyActionType,
  summarizeGrowthAgentStatus,
} from '@/lib/growth-agent';

describe('growth agent phase-1 action helpers', () => {
  it('marks every phase-1 action type as draft-only with no automatic side effects', () => {
    expect(isDraftOnlyActionType('growth_brief.generate')).toBe(true);
    expect(isDraftOnlyActionType('outreach_draft.generate')).toBe(true);
    expect(isDraftOnlyActionType('campaign_ideas.generate')).toBe(true);
    expect(isDraftOnlyActionType('record_summary.generate')).toBe(true);
    expect(isDraftOnlyActionType('crm_contact.update')).toBe(false);
  });

  it('builds a growth-agent-enqueue request body that is approval-only and business-scoped', () => {
    const payload = buildGrowthAgentPayload({
      actionType: 'outreach_draft.generate',
      businessId: '11111111-1111-4111-8111-111111111111',
      userId: '00000000-0000-4000-8000-000000000001',
      goal: 'Draft a follow-up',
      context: 'Lead asked about Tuesday availability',
      fields: { tone: 'warm', channel: 'email' },
    });

    expect(payload.action_type).toBe('outreach_draft.generate');
    expect(payload.approval_required).toBe(true);
    expect(payload.business_id).toBe('11111111-1111-4111-8111-111111111111');
    expect(payload.idempotency_key).toContain('outreach_draft.generate');
    expect(payload.payload).toEqual({
      lead_summary: 'Draft a follow-up',
      offer: 'current offer',
      context_snippets: ['Lead asked about Tuesday availability'],
      tone: 'warm',
      channel: 'email',
      draft_only: true,
      side_effects_allowed: false,
    });
  });

  it('returns safe labels and status copy for the UI', () => {
    expect(getGrowthAgentActionConfig('campaign_ideas.generate')?.label).toBe('Campaign ideas');
    expect(summarizeGrowthAgentStatus('processing')).toContain('working');
    expect(summarizeGrowthAgentStatus('failed')).toContain('failed');
  });
});
