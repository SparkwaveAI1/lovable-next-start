import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PERSONAAI_BUSINESS_ID = "18d0dbb1-a82d-4477-a9f8-816a1fa2ee08";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const name = clean(body.name);
    const email = clean(body.email).toLowerCase();
    const company = clean(body.company);
    const role = clean(body.role);
    const studyGoal = clean(body.studyGoal);
    const timeline = clean(body.timeline);
    const sourceUrl = clean(body.sourceUrl) || req.headers.get("referer") || "unknown";
    const utm = typeof body.utm === "object" && body.utm ? body.utm : {};

    if (!name || !email || !studyGoal) {
      return json({ error: "Name, email, and study goal are required." }, 422);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Invalid email address." }, 422);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("Missing Supabase edge function environment");
      return json({ error: "Server configuration error." }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const [firstName, ...rest] = name.split(/\s+/);
    const lastName = rest.join(" ") || null;

    const { data, error } = await supabase
      .from("contacts")
      .insert({
        business_id: PERSONAAI_BUSINESS_ID,
        first_name: firstName,
        last_name: lastName,
        email,
        source: "personaai_run_your_first_study",
        source_type: "inbound",
        source_campaign: "behavioral_simulation_research_cta",
        status: "new",
        pipeline_stage: "inquiry",
        lead_type: "personaai_enterprise_research",
        priority: "high",
        owner_agent: "rico",
        consent_status: "opted_in",
        consent_notes: "Submitted public PersonaAI Run Your First Study inquiry form; no automated outreach approved by this endpoint.",
        comments: `PersonaAI inquiry. Company: ${company || "n/a"}. Role: ${role || "n/a"}. Timeline: ${timeline || "n/a"}. Study goal: ${studyGoal}`,
        next_action: "Review PersonaAI inquiry and approve next contact path before outreach.",
        tags: ["personaai", "behavioral-simulation-research", "run-your-first-study"],
        metadata: {
          company,
          role,
          study_goal: studyGoal,
          timeline,
          source_url: sourceUrl,
          utm,
          credit_offer: "$25 credits",
          approval_gated: true,
        },
      })
      .select("id")
      .single();

    if (error) {
      console.error("PersonaAI inquiry insert failed", error);
      return json({ error: "Failed to save inquiry." }, 500);
    }

    return json({ ok: true, contactId: data.id });
  } catch (err) {
    console.error("PersonaAI inquiry failed", err);
    return json({ error: "Invalid request." }, 400);
  }
});
