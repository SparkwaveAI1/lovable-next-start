import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildGrowthAgentActionInsert,
  validateGrowthAgentEnqueueRequest,
} from "./validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_MAX_ACTIONS = 20;

type JsonBody = Record<string, unknown>;

function jsonResponse(body: JsonBody, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("growth-agent-enqueue missing Supabase environment variables");
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch (_error) {
      return jsonResponse({ error: "Request body must be valid JSON" }, 400);
    }

    const parsed = validateGrowthAgentEnqueueRequest(body);
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error, details: parsed.details }, parsed.status);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const request = parsed.value;

    const { data: membership, error: membershipError } = await supabase
      .from("business_permissions")
      .select("business_id")
      .eq("business_id", request.business_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (membershipError) {
      console.error("growth-agent-enqueue membership lookup failed", membershipError.message);
      return jsonResponse({ error: "Unable to verify business access" }, 500);
    }

    if (!membership) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const { data: existing, error: existingError } = await supabase
      .from("growth_agent_actions")
      .select("id, status")
      .eq("business_id", request.business_id)
      .eq("user_id", user.id)
      .eq("idempotency_key", request.idempotency_key)
      .maybeSingle();

    if (existingError) {
      console.error("growth-agent-enqueue idempotency lookup failed", existingError.message);
      return jsonResponse({ error: "Unable to check existing action" }, 500);
    }

    if (existing) {
      return jsonResponse({
        success: true,
        action_id: existing.id,
        status: existing.status,
        idempotent: true,
      });
    }

    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count, error: rateLimitError } = await supabase
      .from("growth_agent_actions")
      .select("id", { count: "exact", head: true })
      .eq("business_id", request.business_id)
      .eq("user_id", user.id)
      .eq("action_type", request.action_type)
      .gte("created_at", windowStart);

    if (rateLimitError) {
      console.error("growth-agent-enqueue rate limit lookup failed", rateLimitError.message);
      return jsonResponse({ error: "Unable to check rate limit" }, 500);
    }

    if ((count ?? 0) >= RATE_LIMIT_MAX_ACTIONS) {
      return jsonResponse({
        error: "Rate limit exceeded",
        retry_after_seconds: RATE_LIMIT_WINDOW_MINUTES * 60,
      }, 429);
    }

    const insert = buildGrowthAgentActionInsert(request, user.id);
    const { data: action, error: insertError } = await supabase
      .from("growth_agent_actions")
      .insert(insert)
      .select("id, status")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: duplicate } = await supabase
          .from("growth_agent_actions")
          .select("id, status")
          .eq("business_id", request.business_id)
          .eq("user_id", user.id)
          .eq("idempotency_key", request.idempotency_key)
          .maybeSingle();

        if (duplicate) {
          return jsonResponse({
            success: true,
            action_id: duplicate.id,
            status: duplicate.status,
            idempotent: true,
          });
        }
      }

      console.error("growth-agent-enqueue insert failed", insertError.message);
      return jsonResponse({ error: "Failed to enqueue Growth Agent action" }, 500);
    }

    await supabase.from("growth_agent_action_events").insert({
      action_id: action.id,
      event_type: "queued",
      message: "Growth Agent action queued",
      metadata: {
        action_type: request.action_type,
        approval_required: true,
      },
    });

    return jsonResponse({
      success: true,
      action_id: action.id,
      status: action.status,
      idempotent: false,
    }, 202);
  } catch (error) {
    console.error("growth-agent-enqueue unexpected error", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

