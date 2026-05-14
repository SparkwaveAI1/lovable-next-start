export const SAFE_ACTION_TYPES = [
  "growth_brief.generate",
  "outreach_draft.generate",
  "campaign_ideas.generate",
  "record_summary.generate",
] as const;

export type SafeActionType = typeof SAFE_ACTION_TYPES[number];

export type JsonObject = Record<string, unknown>;

export interface GrowthAgentEnqueueRequest {
  business_id: string;
  action_type: SafeActionType;
  idempotency_key: string;
  payload: JsonObject;
  approval_required: true;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string; details?: string[] };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_STRING_LENGTH = 4000;
const MAX_ARRAY_ITEMS = 50;
const MAX_IDEMPOTENCY_KEY_LENGTH = 160;

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_STRING_LENGTH;
}

function isOptionalStringArray(value: unknown): value is string[] | undefined {
  return value === undefined || (
    Array.isArray(value) &&
    value.length <= MAX_ARRAY_ITEMS &&
    value.every((item) => isNonEmptyString(item))
  );
}

function isUuidArray(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_ARRAY_ITEMS &&
    value.every((item) => typeof item === "string" && UUID_RE.test(item));
}

function validatePayload(actionType: string, payload: unknown): string[] {
  if (!isRecord(payload)) return ["payload must be an object"];

  switch (actionType) {
    case "growth_brief.generate": {
      const errors: string[] = [];
      if (!isNonEmptyString(payload.goal)) errors.push("payload.goal is required");
      if (!isNonEmptyString(payload.audience)) errors.push("payload.audience is required");
      if (!isNonEmptyString(payload.offer)) errors.push("payload.offer is required");
      if (!isOptionalStringArray(payload.context_snippets)) {
        errors.push("payload.context_snippets must be an array of strings when provided");
      }
      return errors;
    }
    case "outreach_draft.generate": {
      const errors: string[] = [];
      if (!isNonEmptyString(payload.lead_summary)) errors.push("payload.lead_summary is required");
      if (!isNonEmptyString(payload.offer)) errors.push("payload.offer is required");
      if (!isNonEmptyString(payload.tone)) errors.push("payload.tone is required");
      if (!isNonEmptyString(payload.channel)) errors.push("payload.channel is required");
      return errors;
    }
    case "campaign_ideas.generate": {
      const errors: string[] = [];
      if (!isNonEmptyString(payload.icp)) errors.push("payload.icp is required");
      if (!isNonEmptyString(payload.channel)) errors.push("payload.channel is required");
      if (!isNonEmptyString(payload.budget_range)) errors.push("payload.budget_range is required");
      if (!isOptionalStringArray(payload.constraints)) {
        errors.push("payload.constraints must be an array of strings when provided");
      }
      return errors;
    }
    case "record_summary.generate": {
      const errors: string[] = [];
      if (!isUuidArray(payload.record_ids)) errors.push("payload.record_ids must contain 1-50 UUIDs");
      if (!isNonEmptyString(payload.record_type)) errors.push("payload.record_type is required");
      return errors;
    }
    default:
      return [`Unsupported action_type: ${actionType}`];
  }
}

export function validateGrowthAgentEnqueueRequest(input: unknown): ValidationResult<GrowthAgentEnqueueRequest> {
  if (!isRecord(input)) {
    return { ok: false, status: 400, error: "Request body must be a JSON object" };
  }

  const errors: string[] = [];
  const businessId = input.business_id;
  const actionType = input.action_type;
  const idempotencyKey = input.idempotency_key;

  if (typeof businessId !== "string" || !UUID_RE.test(businessId)) {
    errors.push("business_id must be a UUID");
  }

  if (typeof actionType !== "string" || !SAFE_ACTION_TYPES.includes(actionType as SafeActionType)) {
    errors.push(`Unsupported action_type: ${String(actionType)}`);
  }

  if (!isNonEmptyString(idempotencyKey) || idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    errors.push("idempotency_key is required and must be 1-160 characters");
  }

  if (typeof actionType === "string") {
    errors.push(...validatePayload(actionType, input.payload));
  }

  if (errors.length > 0) {
    return {
      ok: false,
      status: 400,
      error: errors[0],
      details: errors,
    };
  }

  return {
    ok: true,
    value: {
      business_id: businessId as string,
      action_type: actionType as SafeActionType,
      idempotency_key: (idempotencyKey as string).trim(),
      payload: input.payload as JsonObject,
      approval_required: true,
    },
  };
}

export function buildGrowthAgentActionInsert(request: GrowthAgentEnqueueRequest, userId: string) {
  return {
    business_id: request.business_id,
    user_id: userId,
    action_type: request.action_type,
    status: "queued",
    approval_required: true,
    idempotency_key: request.idempotency_key,
    payload: request.payload,
  };
}

