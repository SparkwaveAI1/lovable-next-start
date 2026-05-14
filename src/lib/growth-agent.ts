export const GROWTH_AGENT_ACTION_CONFIGS = [
  {
    type: 'growth_brief.generate',
    label: 'Growth brief',
    description: 'Create a markdown strategy brief from your goal, audience, offer, and context.',
    fields: ['audience', 'offer'],
  },
  {
    type: 'outreach_draft.generate',
    label: 'Outreach draft',
    description: 'Draft an email, DM, or call script. Nothing is sent automatically.',
    fields: ['channel', 'tone', 'offer'],
  },
  {
    type: 'campaign_ideas.generate',
    label: 'Campaign ideas',
    description: 'Generate campaign concepts and ad/email angles for a safe planning workflow.',
    fields: ['channel', 'budget_range', 'constraints'],
  },
  {
    type: 'record_summary.generate',
    label: 'Record summary',
    description: 'Summarize records already visible to the signed-in user.',
    fields: ['record_ids', 'record_type'],
  },
] as const;

export type GrowthAgentActionType = (typeof GROWTH_AGENT_ACTION_CONFIGS)[number]['type'];

export type GrowthAgentStatus =
  | 'queued'
  | 'needs_approval'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type GrowthAgentActionConfig = (typeof GROWTH_AGENT_ACTION_CONFIGS)[number];

export type BuildGrowthAgentPayloadInput = {
  actionType: GrowthAgentActionType;
  businessId: string;
  userId: string;
  goal: string;
  context?: string;
  fields?: Record<string, string>;
};

export function getGrowthAgentActionConfig(actionType: string): GrowthAgentActionConfig | undefined {
  return GROWTH_AGENT_ACTION_CONFIGS.find((config) => config.type === actionType);
}

export function isDraftOnlyActionType(actionType: string): actionType is GrowthAgentActionType {
  return Boolean(getGrowthAgentActionConfig(actionType));
}

export function buildGrowthAgentPayload({
  actionType,
  businessId,
  userId,
  goal,
  context = '',
  fields = {},
}: BuildGrowthAgentPayloadInput) {
  if (!isDraftOnlyActionType(actionType)) {
    throw new Error(`Unsupported Growth Agent action type: ${actionType}`);
  }

  return {
    business_id: businessId,
    action_type: actionType,
    approval_required: true,
    idempotency_key: buildIdempotencyKey(userId, actionType, goal),
    payload: buildPayload(actionType, goal, context, fields),
  };
}

function buildPayload(
  actionType: GrowthAgentActionType,
  goal: string,
  context: string,
  fields: Record<string, string>,
): Record<string, unknown> {
  const cleaned = removeEmptyFields(fields);
  const contextSnippets = context.trim() ? [context.trim()] : [];

  switch (actionType) {
    case 'growth_brief.generate':
      return {
        goal: goal.trim(),
        audience: cleaned.audience ?? 'current target audience',
        offer: cleaned.offer ?? 'current offer',
        context_snippets: contextSnippets,
        draft_only: true,
        side_effects_allowed: false,
      };
    case 'outreach_draft.generate':
      return {
        lead_summary: goal.trim(),
        offer: cleaned.offer ?? 'current offer',
        tone: cleaned.tone ?? 'friendly and professional',
        channel: cleaned.channel ?? 'email',
        context_snippets: contextSnippets,
        draft_only: true,
        side_effects_allowed: false,
      };
    case 'campaign_ideas.generate':
      return {
        icp: goal.trim(),
        channel: cleaned.channel ?? 'email and social',
        budget_range: cleaned.budget_range ?? 'approval required before spend',
        constraints: splitList(cleaned.constraints),
        context_snippets: contextSnippets,
        draft_only: true,
        side_effects_allowed: false,
      };
    case 'record_summary.generate':
      return {
        record_ids: splitList(cleaned.record_ids),
        record_type: cleaned.record_type ?? 'contact',
        context_snippets: contextSnippets,
        draft_only: true,
        side_effects_allowed: false,
      };
  }
}

export function summarizeGrowthAgentStatus(status: GrowthAgentStatus | string): string {
  switch (status) {
    case 'queued':
      return 'Queued for the Growth Agent worker.';
    case 'needs_approval':
      return 'Waiting for explicit approval before any execution.';
    case 'approved':
      return 'Approved and waiting for a worker claim.';
    case 'processing':
      return 'Hermes is working on the draft.';
    case 'completed':
      return 'Draft result is ready for review.';
    case 'failed':
      return 'The Growth Agent run failed. No side effects were applied.';
    case 'cancelled':
      return 'This request was cancelled.';
    default:
      return 'Status is being synchronized.';
  }
}

export function statusTone(status: GrowthAgentStatus | string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default';
    case 'failed':
      return 'destructive';
    case 'processing':
    case 'approved':
      return 'secondary';
    default:
      return 'outline';
  }
}

function removeEmptyFields(fields: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fields)
      .map(([key, value]) => [key, value.trim()] as const)
      .filter(([, value]) => value.length > 0),
  );
}

function splitList(value?: string): string[] {
  return (value ?? '')
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildIdempotencyKey(userId: string, actionType: string, goal: string): string {
  const normalizedGoal = goal.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 80);
  return `${userId}:${actionType}:${normalizedGoal}:${Date.now()}`.slice(0, 160);
}
