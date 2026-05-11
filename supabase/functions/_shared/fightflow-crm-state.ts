export type FightFlowContactState = {
  status?: string | null;
  pipeline_stage?: string | null;
};

export type FightFlowContactStateUpdate = {
  status?: string;
  pipeline_stage?: string;
  last_activity_date?: string;
};

const STATUS_RANK: Record<string, number> = {
  new_lead: 10,
  new: 10,
  contacted: 20,
  engaged: 30,
  qualified: 40,
  trial_pending: 50,
  trial_scheduled: 60,
  customer: 80,
  member: 80,
  needs_human: 90,
  cancelled: -10,
  opted_out: -10,
};

const STAGE_RANK: Record<string, number> = {
  new: 10,
  inquiry: 15,
  contacted: 20,
  engaged: 30,
  qualified: 40,
  trial_pending: 50,
  trial_scheduled: 60,
  needs_staff_booking_confirmation: 70,
  pending_review: 80,
  customer: 90,
};

function rank(value: string | null | undefined, ranks: Record<string, number>): number {
  if (!value) return 0;
  return ranks[value] ?? 0;
}

export function buildSafeFightFlowContactUpdate(
  current: FightFlowContactState,
  desired: FightFlowContactStateUpdate,
): { update: FightFlowContactStateUpdate; blockedDowngrades: string[] } {
  const update: FightFlowContactStateUpdate = { ...desired };
  const blockedDowngrades: string[] = [];

  if (desired.status && rank(desired.status, STATUS_RANK) < rank(current.status, STATUS_RANK)) {
    delete update.status;
    blockedDowngrades.push(`status:${current.status}->${desired.status}`);
  }

  if (desired.pipeline_stage && rank(desired.pipeline_stage, STAGE_RANK) < rank(current.pipeline_stage, STAGE_RANK)) {
    delete update.pipeline_stage;
    blockedDowngrades.push(`pipeline_stage:${current.pipeline_stage}->${desired.pipeline_stage}`);
  }

  return { update, blockedDowngrades };
}
