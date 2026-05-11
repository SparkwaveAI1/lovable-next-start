import { describe, expect, it } from 'vitest';
import { buildSafeFightFlowContactUpdate } from '../../supabase/functions/_shared/fightflow-crm-state';

describe('buildSafeFightFlowContactUpdate', () => {
  it('blocks downgrades from scheduled/qualified back to new lead', () => {
    const result = buildSafeFightFlowContactUpdate(
      { status: 'qualified', pipeline_stage: 'trial_scheduled' },
      { status: 'new_lead', pipeline_stage: 'new', last_activity_date: '2026-05-11T00:00:00.000Z' },
    );

    expect(result.update).toEqual({ last_activity_date: '2026-05-11T00:00:00.000Z' });
    expect(result.blockedDowngrades).toContain('status:qualified->new_lead');
    expect(result.blockedDowngrades).toContain('pipeline_stage:trial_scheduled->new');
  });

  it('allows upgrades into trial scheduled', () => {
    const result = buildSafeFightFlowContactUpdate(
      { status: 'new_lead', pipeline_stage: 'new' },
      { status: 'qualified', pipeline_stage: 'trial_scheduled' },
    );

    expect(result.update).toEqual({ status: 'qualified', pipeline_stage: 'trial_scheduled' });
    expect(result.blockedDowngrades).toEqual([]);
  });
});
