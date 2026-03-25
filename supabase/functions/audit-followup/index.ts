import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withRetry, EMAIL_RETRY_OPTIONS } from "../_shared/retry.ts";

/**
 * Audit Follow-up Email Edge Function
 * 
 * Sends personalized follow-up emails after audit submission.
 * Leads with the weakest domain and provides one specific actionable fix.
 * 
 * Called by audit-webhook after storing the audit result.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Domain configuration with personalized content
const DOMAIN_CONTENT: Record<string, {
  name: string;
  insight: string;
  fixes: Array<{
    condition: string;
    conditionField: string;
    conditionValue: number;
    fix: string;
    timeSaved: string;
  }>;
  defaultFix: { fix: string; timeSaved: string };
}> = {
  lead_capture: {
    name: "Lead Capture",
    insight: "Leads are slipping through the cracks before they ever become customers. You're doing the work to attract them, but losing them in the handoff.",
    fixes: [
      {
        condition: "lead_response <= 2",
        conditionField: "lead_response",
        conditionValue: 2,
        fix: "Set up an instant auto-responder for new inquiries. Use Calendly + Zapier to send a confirmation email within 60 seconds of any form submission. This alone increases conversion by 21%.",
        timeSaved: "2-3 hours",
      },
      {
        condition: "lead_tracking <= 2",
        conditionField: "lead_tracking",
        conditionValue: 2,
        fix: "Create a simple lead tracking spreadsheet or sign up for HubSpot Free CRM. Add every lead, set follow-up reminders, and check it daily. Takes 15 minutes to set up.",
        timeSaved: "1-2 hours",
      },
      {
        condition: "lead_leakage <= 2",
        conditionField: "lead_leakage",
        conditionValue: 2,
        fix: "Audit your last 10 leads. How many got a second touchpoint? Set up a 3-email follow-up sequence that triggers automatically after first contact.",
        timeSaved: "3-4 hours",
      },
    ],
    defaultFix: {
      fix: "Set up an instant auto-responder for new inquiries. Even a simple 'Thanks for reaching out, we'll be in touch within 24 hours' email builds trust and keeps leads warm.",
      timeSaved: "2-3 hours",
    },
  },

  sales_process: {
    name: "Sales Process",
    insight: "Your sales process has friction that's costing you deals. The back-and-forth, the manual follow-ups, the 'I'll get back to you' that never happens — it adds up.",
    fixes: [
      {
        condition: "booking_method <= 2",
        conditionField: "booking_method",
        conditionValue: 2,
        fix: "Set up Calendly or Cal.com (free) with your availability. Add it to your email signature and every proposal. Eliminates 5-10 back-and-forth emails per booking.",
        timeSaved: "3-5 hours",
      },
      {
        condition: "proposal_method <= 2",
        conditionField: "proposal_method",
        conditionValue: 2,
        fix: "Create a proposal template in Google Docs or use PandaDoc (free tier). Fill in the blanks instead of writing from scratch. Include e-signature to close faster.",
        timeSaved: "2-3 hours",
      },
      {
        condition: "followup_process <= 2",
        conditionField: "followup_process",
        conditionValue: 2,
        fix: "Add calendar reminders: 2 days, 5 days, and 10 days after sending any quote. Or use a free CRM with automated reminders. No more forgotten follow-ups.",
        timeSaved: "2-4 hours",
      },
    ],
    defaultFix: {
      fix: "Set up Calendly or Cal.com (free) with your availability. Add the link to your email signature. This single change eliminates the back-and-forth scheduling dance.",
      timeSaved: "3-5 hours",
    },
  },

  client_communication: {
    name: "Client Communication",
    insight: "Client communication is eating your time. Every status update, every 'just checking in' email, every repeated question — it's manual work that doesn't need to be.",
    fixes: [
      {
        condition: "onboarding_method <= 2",
        conditionField: "onboarding_method",
        conditionValue: 2,
        fix: "Create a simple onboarding checklist in Notion or Google Docs. Send it to every new client on day 1. Add automatic reminder emails at day 3 and day 7.",
        timeSaved: "2-3 hours",
      },
      {
        condition: "support_handling <= 2",
        conditionField: "support_handling",
        conditionValue: 2,
        fix: "Create a FAQ document and send it with onboarding. For common questions, build canned response templates you can paste in 2 seconds.",
        timeSaved: "3-5 hours",
      },
      {
        condition: "feedback_collection <= 2",
        conditionField: "feedback_collection",
        conditionValue: 2,
        fix: "Set up a Typeform or Google Form for reviews. Send automatically 1 week after project completion using Zapier or simple calendar reminders.",
        timeSaved: "1-2 hours",
      },
    ],
    defaultFix: {
      fix: "Create a simple onboarding checklist and send it to every new client on day 1. This sets expectations and reduces the 'what happens next?' questions by 80%.",
      timeSaved: "2-3 hours",
    },
  },

  operations: {
    name: "Operations",
    insight: "Admin tasks are consuming hours that should go toward revenue-generating work. Data entry, invoicing, scheduling — it's the 'business of the business' that buries you.",
    fixes: [
      {
        condition: "invoicing_method <= 2",
        conditionField: "invoicing_method",
        conditionValue: 2,
        fix: "Switch to automated invoicing (Stripe, Square, or Wave — all free). Set up recurring invoices and automatic payment reminders. Never chase a payment manually again.",
        timeSaved: "3-4 hours",
      },
      {
        condition: "admin_time >= 10",
        conditionField: "admin_time",
        conditionValue: 1, // admin_time score of 1 means 10+ hours
        fix: "Track your tasks for one day. Identify the top 3 most repetitive tasks. Automate just ONE of them this week — even a simple Zapier connection counts.",
        timeSaved: "5-10 hours",
      },
      {
        condition: "task_management <= 2",
        conditionField: "task_management",
        conditionValue: 2,
        fix: "Move from mental lists to a simple task app (Todoist free, or Notion). Takes 10 minutes to set up, saves hours of 'what was I supposed to do?' anxiety.",
        timeSaved: "2-3 hours",
      },
    ],
    defaultFix: {
      fix: "Switch to automated invoicing (Stripe, Square, or Wave — all free). Set up recurring invoices and automatic payment reminders. This single change frees up hours every month.",
      timeSaved: "3-4 hours",
    },
  },

  marketing: {
    name: "Marketing",
    insight: "Your marketing is inconsistent because it depends on you remembering to do it. Social posts when you have time, emails when you remember — it's not a system.",
    fixes: [
      {
        condition: "social_frequency <= 2",
        conditionField: "social_frequency",
        conditionValue: 2,
        fix: "Batch-create 4 posts in one sitting (30 min). Schedule them using Buffer or Later (free tiers). You just automated a month of consistency.",
        timeSaved: "2-3 hours",
      },
      {
        condition: "email_marketing <= 2",
        conditionField: "email_marketing",
        conditionValue: 2,
        fix: "Sign up for Mailchimp or ConvertKit (free tiers). Add a simple signup form to your website. Send ONE email per month. Start small, stay consistent.",
        timeSaved: "1-2 hours",
      },
      {
        condition: "lead_nurturing <= 2",
        conditionField: "lead_nurturing",
        conditionValue: 2,
        fix: "Create a 3-email welcome sequence for new leads. Set it to send over 2 weeks. Every new lead gets value without you lifting a finger.",
        timeSaved: "3-5 hours",
      },
    ],
    defaultFix: {
      fix: "Batch-create 4 social posts in one sitting (30 min). Schedule them using Buffer or Later (free tiers). You just automated a month of consistency.",
      timeSaved: "2-3 hours",
    },
  },
};

// Score to response value mapping (reverse of score calculation)
// Scores: 1-5 where 1 is worst, 5 is best
function getResponseScore(responses: Record<string, any>, fieldId: string): number {
  const value = responses[fieldId];
  if (typeof value === "number") return value;
  
  // If it's a string answer, try to extract score from option number
  // Options are typically numbered and map to scores
  if (typeof value === "string") {
    // Common patterns: "Option 1", "1", first option text
    const match = value.match(/(\d)/);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return 3; // Default middle score if unknown
}

// Select the best fix based on responses
function selectBestFix(
  domain: string,
  responses: Record<string, any>
): { fix: string; timeSaved: string } {
  const content = DOMAIN_CONTENT[domain];
  if (!content) {
    return { fix: "Review your processes and identify one task you do more than 3 times per week. Automate it.", timeSaved: "2-3 hours" };
  }

  // Check each fix condition
  for (const fixOption of content.fixes) {
    const responseScore = getResponseScore(responses, fixOption.conditionField);
    if (responseScore <= fixOption.conditionValue) {
      return { fix: fixOption.fix, timeSaved: fixOption.timeSaved };
    }
  }

  // Return default fix for this domain
  return content.defaultFix;
}

// Get status emoji and label for a score
function getScoreStatus(score: number, maxScore: number): string {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 85) return "🟢 Strong";
  if (percentage >= 70) return "🟡 Good";
  if (percentage >= 50) return "🟠 Needs Work";
  return "🔴 Priority Fix";
}

// Get grade label
function getGradeLabel(score: number): string {
  if (score >= 85) return "Automation Leader";
  if (score >= 70) return "Well Automated";
  if (score >= 55) return "Room to Grow";
  if (score >= 40) return "Significant Gaps";
  return "Manual Mode";
}

// Generate personalized email HTML
function generateEmailHtml(auditData: {
  firstName: string;
  companyName: string;
  totalScore: number;
  gradeLabel: string;
  weakestDomain: string;
  weakestDomainScore: number;
  domainScores: Record<string, number>;
  insight: string;
  fix: string;
  timeSaved: string;
  bookingUrl: string;
}): string {
  const domainName = DOMAIN_CONTENT[auditData.weakestDomain]?.name || auditData.weakestDomain;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Automation Audit Results</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a1a; font-size: 24px; }
    h2 { color: #2563eb; font-size: 20px; margin-top: 30px; }
    .score-highlight { background: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; }
    .score-big { font-size: 32px; font-weight: bold; color: #2563eb; }
    .opportunity-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .fix-box { background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .cta-button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .cta-button:hover { background: #1d4ed8; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
    .ps { margin-top: 30px; font-style: italic; color: #4b5563; }
  </style>
</head>
<body>
  <p>Hi ${auditData.firstName},</p>

  <p>Thanks for taking the Sparkwave Automation Audit!</p>

  <div class="score-highlight">
    <p>You scored <span class="score-big">${auditData.totalScore}/100</span></p>
    <p>But I want to skip the overall picture and cut straight to what matters most:</p>
  </div>

  <div class="opportunity-box">
    <h2>🎯 Your #1 Automation Opportunity: ${domainName}</h2>
    <p>You scored <strong>${auditData.weakestDomainScore}/20</strong> in ${domainName} — this is where you're leaving the most time and money on the table.</p>
    <p>${auditData.insight}</p>
  </div>

  <div class="fix-box">
    <h3>✅ One Thing You Can Fix This Week:</h3>
    <p>${auditData.fix}</p>
    <p><strong>This alone could save you ${auditData.timeSaved} every week.</strong></p>
  </div>

  <h2>📊 Your Full Score Breakdown</h2>

  <table>
    <thead>
      <tr>
        <th>Domain</th>
        <th>Score</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Lead Capture</td>
        <td>${auditData.domainScores.lead_capture}/20</td>
        <td>${getScoreStatus(auditData.domainScores.lead_capture, 20)}</td>
      </tr>
      <tr>
        <td>Sales Process</td>
        <td>${auditData.domainScores.sales_process}/20</td>
        <td>${getScoreStatus(auditData.domainScores.sales_process, 20)}</td>
      </tr>
      <tr>
        <td>Client Communication</td>
        <td>${auditData.domainScores.client_communication}/20</td>
        <td>${getScoreStatus(auditData.domainScores.client_communication, 20)}</td>
      </tr>
      <tr>
        <td>Operations</td>
        <td>${auditData.domainScores.operations}/20</td>
        <td>${getScoreStatus(auditData.domainScores.operations, 20)}</td>
      </tr>
      <tr>
        <td>Marketing</td>
        <td>${auditData.domainScores.marketing}/20</td>
        <td>${getScoreStatus(auditData.domainScores.marketing, 20)}</td>
      </tr>
    </tbody>
  </table>

  <p><strong>Overall: ${auditData.totalScore}/100 — ${auditData.gradeLabel}</strong></p>

  <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

  <h2>What's Next?</h2>

  <p>I've prepared a custom Automation Map for ${auditData.companyName || "your business"} based on your answers. In 20 minutes, I'll show you:</p>

  <ul>
    <li>✅ Exactly which automations will 10x your output</li>
    <li>✅ The implementation order that makes sense for your business</li>
    <li>✅ What you can DIY vs. what needs help</li>
  </ul>

  <p>No pitch. No pressure. Just a clear roadmap you can use whether you work with us or not.</p>

  <p style="text-align: center;">
    <a href="${auditData.bookingUrl}" class="cta-button">Get Your Custom Automation Map →</a>
  </p>

  <p>Talk soon,<br>Scott</p>

  <p class="ps">P.S. — That ${domainName} fix I mentioned? Most people implement it in under an hour and see results the same day.</p>

  <div class="footer">
    <p>Sparkwave AI | <a href="https://sparkwaveai.app">sparkwaveai.app</a></p>
  </div>
</body>
</html>
`;
}

// Generate plain text version
function generateEmailText(auditData: {
  firstName: string;
  companyName: string;
  totalScore: number;
  gradeLabel: string;
  weakestDomain: string;
  weakestDomainScore: number;
  domainScores: Record<string, number>;
  insight: string;
  fix: string;
  timeSaved: string;
  bookingUrl: string;
}): string {
  const domainName = DOMAIN_CONTENT[auditData.weakestDomain]?.name || auditData.weakestDomain;

  return `
Hi ${auditData.firstName},

Thanks for taking the Sparkwave Automation Audit!

You scored ${auditData.totalScore}/100 — but I want to skip the overall picture and cut straight to what matters most:

---

🎯 YOUR #1 AUTOMATION OPPORTUNITY: ${domainName.toUpperCase()}

You scored ${auditData.weakestDomainScore}/20 in ${domainName} — this is where you're leaving the most time and money on the table.

${auditData.insight}

ONE THING YOU CAN FIX THIS WEEK:

${auditData.fix}

This alone could save you ${auditData.timeSaved} every week.

---

YOUR FULL SCORE BREAKDOWN:

Lead Capture: ${auditData.domainScores.lead_capture}/20
Sales Process: ${auditData.domainScores.sales_process}/20
Client Communication: ${auditData.domainScores.client_communication}/20
Operations: ${auditData.domainScores.operations}/20
Marketing: ${auditData.domainScores.marketing}/20

Overall: ${auditData.totalScore}/100 — ${auditData.gradeLabel}

---

WHAT'S NEXT?

I've prepared a custom Automation Map for ${auditData.companyName || "your business"} based on your answers. In 20 minutes, I'll show you:

✅ Exactly which automations will 10x your output
✅ The implementation order that makes sense for your business
✅ What you can DIY vs. what needs help

No pitch. No pressure. Just a clear roadmap you can use whether you work with us or not.

Book your free Automation Map call: ${auditData.bookingUrl}

Talk soon,
Scott

P.S. — That ${domainName} fix I mentioned? Most people implement it in under an hour and see results the same day.

---
Sparkwave AI | sparkwaveai.app
`.trim();
}

// Send email via Resend API
async function sendViaResend(
  apiKey: string,
  payload: {
    from: string;
    to: string[];
    subject: string;
    html: string;
    text?: string;
    reply_to?: string;
  }
): Promise<{ id: string }> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || `Resend API error (${response.status})`);
  }

  return result;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] audit-followup started`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body = await req.json();
    const { audit_id, email, name, score, grade, weakest_domain } = body;

    console.log(`[${requestId}] Processing follow-up for audit:`, audit_id);

    if (!audit_id || !email) {
      throw new Error("Missing required fields: audit_id and email");
    }

    // Fetch the full audit result from database
    const { data: audit, error: fetchError } = await supabase
      .from("audit_results")
      .select("*")
      .eq("id", audit_id)
      .single();

    if (fetchError || !audit) {
      throw new Error(`Audit not found: ${audit_id}`);
    }

    // Check if follow-up already sent
    if (audit.followup_sent_at) {
      console.log(`[${requestId}] Follow-up already sent at:`, audit.followup_sent_at);
      return new Response(
        JSON.stringify({ success: true, message: "Follow-up already sent", sent_at: audit.followup_sent_at }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email data
    const firstName = (audit.contact_name || name || "there").split(" ")[0];
    const companyName = audit.company_name || "";
    const totalScore = audit.total_score || score || 0;
    const weakestDomain = audit.weakest_domain || weakest_domain || "operations";
    const gradeLabel = getGradeLabel(totalScore);

    const domainScores = {
      lead_capture: audit.lead_capture_score || 0,
      sales_process: audit.sales_process_score || 0,
      client_communication: audit.client_communication_score || 0,
      operations: audit.operations_score || 0,
      marketing: audit.marketing_score || 0,
    };

    const domainContent = DOMAIN_CONTENT[weakestDomain];
    const insight = domainContent?.insight || "There's room for improvement in your processes.";
    
    // Select the best fix based on their raw responses
    const rawResponses = audit.raw_responses || {};
    const selectedFix = selectBestFix(weakestDomain, rawResponses);

    const bookingUrl = `https://sparkwaveai.app/book?source=audit&score=${totalScore}&domain=${weakestDomain}&email=${encodeURIComponent(email)}`;

    const emailData = {
      firstName,
      companyName,
      totalScore,
      gradeLabel,
      weakestDomain,
      weakestDomainScore: domainScores[weakestDomain as keyof typeof domainScores] || 0,
      domainScores,
      insight,
      fix: selectedFix.fix,
      timeSaved: selectedFix.timeSaved,
      bookingUrl,
    };

    // Generate email content
    const subject = `Your biggest automation gap: ${domainContent?.name || weakestDomain}`;
    const html = generateEmailHtml(emailData);
    const text = generateEmailText(emailData);

    console.log(`[${requestId}] Sending follow-up email to:`, email);

    // Send via Resend with retry
    const result = await withRetry(
      () => sendViaResend(resendApiKey, {
        from: "Scott <scott@reply.sparkwave-ai.com>",
        to: [email],
        subject,
        html,
        text,
        reply_to: "scott@sparkwaveai.app",
      }),
      EMAIL_RETRY_OPTIONS
    );

    console.log(`[${requestId}] Email sent successfully:`, result.id);

    // Update audit_results with followup_sent_at timestamp
    const { error: updateError } = await supabase
      .from("audit_results")
      .update({
        followup_sent_at: new Date().toISOString(),
      })
      .eq("id", audit_id);

    if (updateError) {
      console.error(`[${requestId}] Failed to update followup_sent_at:`, updateError);
      // Don't fail the function for this
    }

    // Log to email_sends for tracking (best effort)
    try {
      await supabase.from("email_sends").insert({
        resend_id: result.id,
        status: "sent",
        sent_at: new Date().toISOString(),
        campaign_id: null,
        subscriber_id: null,
        contact_id: null, // We don't have a contact_id here, but the email is tracked
        business_id: null, // SPA-1583: no campaign/contact context here; acceptable per spec
      });
    } catch (e: any) {
      console.log(`[${requestId}] Could not log to email_sends:`, e.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Follow-up email sent",
        resend_id: result.id,
        audit_id,
        email,
        subject,
        weakest_domain: weakestDomain,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[${requestId}] Error:`, error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
