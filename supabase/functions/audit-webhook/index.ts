import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

// Domain configuration
const DOMAINS = {
  lead_capture: ["lead_source", "lead_response", "lead_tracking", "lead_leakage"],
  sales_process: ["booking_method", "proposal_method", "followup_process", "sales_cycle"],
  client_communication: ["onboarding_method", "support_handling", "status_updates", "feedback_collection"],
  operations: ["invoicing_method", "task_management", "admin_time", "calendar_management"],
  marketing: ["social_frequency", "email_marketing", "lead_nurturing", "marketing_roi"],
};

// Grade calculation
function getGrade(score: number): { grade: string; label: string } {
  if (score >= 85) return { grade: "A", label: "Automation Leader" };
  if (score >= 70) return { grade: "B", label: "Well Automated" };
  if (score >= 55) return { grade: "C", label: "Room to Grow" };
  if (score >= 40) return { grade: "D", label: "Significant Gaps" };
  return { grade: "F", label: "Manual Mode" };
}

// Find weakest domain from scores
function findWeakestDomain(domainScores: Record<string, number>): string {
  let weakest = "lead_capture";
  let lowestScore = 20;

  for (const [domain, score] of Object.entries(domainScores)) {
    if (score < lowestScore) {
      lowestScore = score;
      weakest = domain;
    }
  }

  return weakest;
}

// Parse Typeform webhook payload
function parseTypeformPayload(payload: any): {
  contact: { name: string; email: string; company: string };
  scores: Record<string, any>;
  responses: Record<string, any>;
  conditionalResponses: Record<string, any>;
  submittedAt: string;
  formId: string;
} {
  // Typeform sends form_response with answers array
  const formResponse = payload.form_response || payload;
  const answers = formResponse.answers || [];
  const definition = formResponse.definition || {};

  const contact = { name: "", email: "", company: "" };
  const responses: Record<string, any> = {};
  const conditionalResponses: Record<string, any> = {};

  // Build field ref map from definition
  const fieldRefMap: Record<string, string> = {};
  for (const field of definition.fields || []) {
    if (field.ref) {
      fieldRefMap[field.id] = field.ref;
    }
  }

  // Parse answers
  for (const answer of answers) {
    const fieldId = answer.field?.id;
    const fieldRef = answer.field?.ref || fieldRefMap[fieldId];

    // Get the answer value based on type
    let value = answer.text || answer.choice?.label || answer.email || answer.number || "";

    // Map to our schema
    if (fieldRef === "contact_name" || fieldRef?.includes("name")) {
      contact.name = value;
    } else if (fieldRef === "contact_email" || fieldRef?.includes("email")) {
      contact.email = value;
    } else if (fieldRef === "company_name" || fieldRef?.includes("company")) {
      contact.company = value;
    } else if (fieldRef?.startsWith("Q") && fieldRef.includes("a")) {
      // Conditional response (e.g., Q1.3a)
      conditionalResponses[fieldRef] = value;
    } else if (fieldRef) {
      responses[fieldRef] = value;
    }
  }

  // Extract scores from hidden fields or calculated variables
  const hiddenFields = formResponse.hidden || {};
  const variables = formResponse.variables || {};

  const scores: Record<string, any> = {
    total: parseInt(hiddenFields.score || variables.score || "0"),
    lead_capture: parseInt(hiddenFields.lead_capture_score || variables.lead_capture_score || "0"),
    sales_process: parseInt(hiddenFields.sales_process_score || variables.sales_process_score || "0"),
    client_communication: parseInt(hiddenFields.client_communication_score || variables.client_communication_score || "0"),
    operations: parseInt(hiddenFields.operations_score || variables.operations_score || "0"),
    marketing: parseInt(hiddenFields.marketing_score || variables.marketing_score || "0"),
    weakest_domain: hiddenFields.weakest_domain || variables.weakest_domain || "",
  };

  return {
    contact,
    scores,
    responses,
    conditionalResponses,
    submittedAt: formResponse.submitted_at || new Date().toISOString(),
    formId: definition.id || payload.form_id || "unknown",
  };
}

// Parse Tally webhook payload
function parseTallyPayload(payload: any): {
  contact: { name: string; email: string; company: string };
  scores: Record<string, any>;
  responses: Record<string, any>;
  conditionalResponses: Record<string, any>;
  submittedAt: string;
  formId: string;
} {
  const fields = payload.data?.fields || [];

  const contact = { name: "", email: "", company: "" };
  const responses: Record<string, any> = {};
  const conditionalResponses: Record<string, any> = {};
  const scores: Record<string, any> = {
    total: 0,
    lead_capture: 0,
    sales_process: 0,
    client_communication: 0,
    operations: 0,
    marketing: 0,
    weakest_domain: "",
  };

  // Map Tally fields to our schema
  for (const field of fields) {
    const label = (field.label || "").toLowerCase();
    const key = field.key || "";
    const value = field.value;

    // Contact info
    if (label.includes("name") && !label.includes("company")) {
      contact.name = value;
    } else if (label.includes("email")) {
      contact.email = value;
    } else if (label.includes("company")) {
      contact.company = value;
    }
    // Score fields
    else if (key === "total_score" || label.includes("total score")) {
      scores.total = parseInt(value) || 0;
    } else if (key === "lead_capture_score" || label.includes("lead capture")) {
      scores.lead_capture = parseInt(value) || 0;
    } else if (key === "sales_process_score" || label.includes("sales process")) {
      scores.sales_process = parseInt(value) || 0;
    } else if (key === "client_communication_score" || label.includes("client communication")) {
      scores.client_communication = parseInt(value) || 0;
    } else if (key === "operations_score" || label.includes("operations")) {
      scores.operations = parseInt(value) || 0;
    } else if (key === "marketing_score" || label.includes("marketing")) {
      scores.marketing = parseInt(value) || 0;
    } else if (key === "weakest_domain" || label.includes("weakest")) {
      scores.weakest_domain = value;
    }
    // Question responses
    else if (key && key.includes("_")) {
      responses[key] = value;
    }
  }

  return {
    contact,
    scores,
    responses,
    conditionalResponses,
    submittedAt: payload.createdAt || new Date().toISOString(),
    formId: payload.formId || "tally-unknown",
  };
}

// Parse direct/custom webhook payload (matches spec exactly)
function parseDirectPayload(payload: any): {
  contact: { name: string; email: string; company: string };
  scores: Record<string, any>;
  responses: Record<string, any>;
  conditionalResponses: Record<string, any>;
  submittedAt: string;
  formId: string;
} {
  return {
    contact: {
      name: payload.contact?.name || "",
      email: payload.contact?.email || "",
      company: payload.contact?.company || "",
    },
    scores: {
      total: parseInt(payload.scores?.total) || 0,
      lead_capture: parseInt(payload.scores?.lead_capture) || 0,
      sales_process: parseInt(payload.scores?.sales_process) || 0,
      client_communication: parseInt(payload.scores?.client_communication) || 0,
      operations: parseInt(payload.scores?.operations) || 0,
      marketing: parseInt(payload.scores?.marketing) || 0,
      weakest_domain: payload.scores?.weakest_domain || "",
    },
    responses: payload.responses || {},
    conditionalResponses: payload.conditional_responses || {},
    submittedAt: payload.submitted_at || new Date().toISOString(),
    formId: payload.form_id || "direct",
  };
}

// Detect payload source and parse accordingly
function parsePayload(payload: any) {
  // Check if it's the direct format from spec
  if (payload.contact && payload.scores && payload.responses) {
    return { source: "direct", data: parseDirectPayload(payload) };
  }

  // Check if it's Typeform format
  if (payload.form_response || payload.event_type === "form_response") {
    return { source: "typeform", data: parseTypeformPayload(payload) };
  }

  // Check if it's Tally format
  if (payload.data?.fields || payload.eventType === "FORM_RESPONSE") {
    return { source: "tally", data: parseTallyPayload(payload) };
  }

  // Default to direct format
  return { source: "unknown", data: parseDirectPayload(payload) };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("AUDIT_WEBHOOK_SECRET");

    // Validate webhook secret if configured
    if (webhookSecret) {
      const providedSecret = req.headers.get("x-webhook-secret");
      if (providedSecret !== webhookSecret) {
        console.error("Invalid webhook secret");
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse incoming payload
    const rawPayload = await req.json();
    console.log("Received audit webhook:", JSON.stringify(rawPayload, null, 2));

    // Detect source and parse
    const { source, data } = parsePayload(rawPayload);
    console.log(`Parsed ${source} payload:`, JSON.stringify(data, null, 2));

    const { contact, scores, responses, conditionalResponses, submittedAt, formId } = data;

    // Validate required fields
    if (!contact.email) {
      return new Response(
        JSON.stringify({ error: "Missing required field: contact email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate weakest domain if not provided
    let weakestDomain = scores.weakest_domain;
    if (!weakestDomain && scores.total > 0) {
      const domainScores = {
        lead_capture: scores.lead_capture,
        sales_process: scores.sales_process,
        client_communication: scores.client_communication,
        operations: scores.operations,
        marketing: scores.marketing,
      };
      weakestDomain = findWeakestDomain(domainScores);
    }

    // Calculate grade
    const { grade, label: gradeLabel } = getGrade(scores.total);

    // Store audit result
    const { data: auditResult, error: insertError } = await supabase
      .from("audit_results")
      .insert({
        contact_name: contact.name,
        contact_email: contact.email,
        company_name: contact.company || null,
        total_score: scores.total,
        lead_capture_score: scores.lead_capture,
        sales_process_score: scores.sales_process,
        client_communication_score: scores.client_communication,
        operations_score: scores.operations,
        marketing_score: scores.marketing,
        weakest_domain: weakestDomain,
        grade: grade,
        grade_label: gradeLabel,
        raw_responses: responses,
        conditional_responses: conditionalResponses,
        submitted_at: submittedAt,
        form_id: formId,
        source: source,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting audit result:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Audit result stored:", auditResult.id);

    // Also upsert to contacts table for CRM integration
    // Note: lead_score stored in metadata.audit_score (not as separate column)
    const { error: contactError } = await supabase
      .from("contacts")
      .upsert({
        email: contact.email,
        first_name: contact.name.split(" ")[0],
        last_name: contact.name.split(" ").slice(1).join(" ") || null,
        company_name: contact.company || null,
        source: "automation_audit",
        pipeline_stage: scores.total >= 55 ? "qualified" : "lead",
        tags: ["automation_audit", `grade_${grade.toLowerCase()}`],
        metadata: {
          audit_id: auditResult.id,
          audit_score: scores.total,
          lead_score: scores.total, // Stored here for scoring access
          audit_grade: grade,
          weakest_domain: weakestDomain,
          domain_scores: {
            lead_capture: scores.lead_capture,
            sales_process: scores.sales_process,
            client_communication: scores.client_communication,
            operations: scores.operations,
            marketing: scores.marketing,
          },
          submitted_at: submittedAt,
        },
        business_id: "5a9bbfcf-e484-4633-abcd-b78f2e432f5e", // Sparkwave business ID
      }, {
        onConflict: "email",
      });

    if (contactError) {
      console.error("Error upserting contact:", contactError);
      // Don't fail the webhook for contact errors
    } else {
      console.log("Contact upserted successfully for:", contact.email);
    }

    // Trigger follow-up automation (if the function exists)
    let followupTriggered = false;
    let followupError: string | null = null;
    try {
      const followupResult = await supabase.functions.invoke("audit-followup", {
        body: {
          audit_id: auditResult.id,
          email: contact.email,
          name: contact.name,
          score: scores.total,
          grade: grade,
          weakest_domain: weakestDomain,
        },
      });

      // Check if the function returned an error
      if (followupResult.error) {
        followupError = followupResult.error.message || "Unknown error from audit-followup";
        console.error("Follow-up function returned error:", followupError);
      } else if (followupResult.data?.success === false) {
        followupError = followupResult.data.error || "Follow-up reported failure";
        console.error("Follow-up function failed:", followupError);
      } else {
        followupTriggered = true;
        console.log("Follow-up automation triggered successfully:", followupResult.data);
      }
    } catch (err: any) {
      followupError = err.message || "Exception invoking audit-followup";
      console.error("Follow-up function exception:", followupError);
    }

    // If follow-up failed, record it for later retry
    if (!followupTriggered && followupError) {
      try {
        await supabase
          .from("audit_results")
          .update({
            followup_error: followupError,
            followup_attempted_at: new Date().toISOString(),
          })
          .eq("id", auditResult.id);
        console.log("Recorded follow-up error for retry");
      } catch (updateErr) {
        console.error("Could not record follow-up error:", updateErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        audit_id: auditResult.id,
        score: scores.total,
        grade: grade,
        grade_label: gradeLabel,
        weakest_domain: weakestDomain,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
