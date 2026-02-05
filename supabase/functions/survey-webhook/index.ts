import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Scoring configuration
const SCORING = {
  businessType: {
    "Marketing / creative agency": 3,
    "Consulting / coaching / professional services": 3,
    "Home services (HVAC, plumbing, landscaping, cleaning)": 3,
    "Health & wellness (med spa, dental, chiro, PT)": 3,
    "Legal / accounting / financial services": 3,
    "Real estate / property management": 3,
    "eCommerce / retail": 1,
    "Other": 1,
  },
  teamSize: {
    "Just me": 1,
    "2–5 people": 3,
    "6–15 people": 3,
    "16–30 people": 2,
    "30+ people": 1,
  },
  revenue: {
    "Under $100K": 0,
    "$100K–$300K": 2,
    "$300K–$1M": 3,
    "$1M–$5M": 3,
    "$5M+": 2,
  },
  timeWaste: {
    "Under 3 hours": 1,
    "3–8 hours": 2,
    "8–15 hours": 3,
    "15–25 hours": 3,
    "25+ hours / \"I honestly don't even know\"": 3,
  },
  previousAttempts: {
    "No — wouldn't know where to start": 1,
    "Yes — we tried but it didn't stick": 2,
    "Yes — we have some automations but want to do more": 3,
    "We hired someone / bought software but it was too complicated": 2,
  },
  timeline: {
    "Yesterday — we're actively losing money/time": 3,
    "This quarter — it's a priority": 2,
    "This year — important but not urgent": 1,
    "Just exploring — no timeline": 0,
  },
  budget: {
    "Under $200/month": 1,
    "$200–$500/month": 2,
    "$500–$1,500/month": 3,
    "$1,500–$3,000/month": 3,
    "Whatever it takes if the ROI is there": 3,
  },
};

const PAIN_POINT_MAP: Record<string, string> = {
  "Leads slip through the cracks — we forget to follow up": "lead_followup",
  "Too much time on admin — data entry, scheduling, invoicing": "admin_overhead",
  "Onboarding new clients is messy and inconsistent": "onboarding",
  "We can't keep up with customer messages and inquiries": "communication",
  "Quoting and proposals take forever": "proposals",
  "We're growing but things keep breaking": "scaling",
};

const TIME_WASTE_HOURS: Record<string, number> = {
  "Under 3 hours": 2,
  "3–8 hours": 5,
  "8–15 hours": 12,
  "15–25 hours": 20,
  "25+ hours / \"I honestly don't even know\"": 30,
};

function calculateScore(answers: Record<string, any>): { score: number; tier: string; priority: string } {
  let score = 0;

  // Q1 - Business Type
  score += SCORING.businessType[answers.business_type] || 0;

  // Q2 - Team Size
  score += SCORING.teamSize[answers.team_size] || 0;

  // Q3 - Revenue
  score += SCORING.revenue[answers.revenue] || 0;

  // Q4 - Pain Points (2 points each, max 2 selections = 4 points)
  const painPoints = answers.pain_points || [];
  score += Math.min(painPoints.length, 2) * 2;

  // Q5 - Time Waste
  score += SCORING.timeWaste[answers.time_waste] || 0;

  // Q7 - Previous Attempts
  score += SCORING.previousAttempts[answers.previous_attempts] || 0;

  // Q8 - Timeline
  score += SCORING.timeline[answers.timeline] || 0;

  // Q9 - Budget
  score += SCORING.budget[answers.budget] || 0;

  // Determine tier
  let tier: string;
  let priority: string;

  if (score >= 19) {
    tier = "automation_ready";
    priority = "hot";
  } else if (score >= 12) {
    tier = "growth_mode";
    priority = "warm";
  } else if (score >= 6) {
    tier = "foundation_first";
    priority = "nurture";
  } else {
    tier = "early_explorer";
    priority = "content";
  }

  return { score, tier, priority };
}

function generateResultsEmail(answers: Record<string, any>, score: number, tier: string): { subject: string; html: string } {
  const firstName = answers.first_name || "there";
  const painPoints = answers.pain_points || [];
  const timeWaste = answers.time_waste || "several hours";
  const magicWand = answers.magic_wand || "streamline operations";
  const hoursPerWeek = TIME_WASTE_HOURS[timeWaste] || 10;
  const annualCost = hoursPerWeek * 52 * 30; // $30/hr assumption

  const painPointInsights = painPoints.map((p: string) => {
    const tag = PAIN_POINT_MAP[p];
    const insights: Record<string, string> = {
      lead_followup: "**Lead follow-up automation** — You mentioned leads slipping through the cracks. Businesses like yours typically recover 15-30% of lost leads just by automating the first 48 hours of follow-up.",
      admin_overhead: "**Administrative workflow automation** — The data entry, scheduling, and invoicing you described can be reduced by 70-80% with the right systems.",
      onboarding: "**Client onboarding automation** — Inconsistent onboarding is one of the top reasons service businesses lose clients in the first 90 days.",
      communication: "**AI-powered client communication** — You're drowning in messages. An AI assistant can handle 60-70% of routine inquiries instantly.",
      proposals: "**Proposal and quoting automation** — If proposals take you hours, you're leaving deals on the table. Automated quoting cuts this to minutes.",
      scaling: "**Operational systems for scale** — You're growing faster than your processes can keep up. This is the #1 reason growing businesses plateau.",
    };
    return insights[tag] || "";
  }).filter(Boolean).join("\n\n");

  let subject: string;
  let headline: string;
  let body: string;
  let cta: string;
  let ctaUrl: string;

  if (tier === "automation_ready") {
    subject = `🟢 ${firstName}, your business is ready to scale`;
    headline = "Your Business Is Ready to Scale — And Automation Is the Key";
    body = `Based on your answers, you're sitting on a significant automation opportunity.

**Your biggest time drain:** You're spending ${hoursPerWeek}+ hours per week on tasks that should run themselves. At $30/hour, that's over $${annualCost.toLocaleString()} per year.

**Your #1 automation priorities:**
${painPointInsights}

**Your automation readiness:** HIGH. You have the pain, the awareness, and the business maturity to see massive ROI from automation.

**You mentioned wanting to:** "${magicWand}" — we can absolutely help with that.`;
    cta = "Book Your Free Automation Blueprint Session";
    ctaUrl = "https://calendly.com/sparkwave-ai/automation-blueprint";
  } else if (tier === "growth_mode") {
    subject = `🟡 ${firstName}, here's how to grow smarter`;
    headline = "You're Growing — Here's How to Grow Smarter, Not Harder";
    body = `You're in growth mode, and your answers reveal some clear opportunities.

**The time tax you're paying:** Roughly ${hoursPerWeek} hours per week on repetitive work. That's $${annualCost.toLocaleString()} per year in lost productivity.

**Where automation would help most:**
${painPointInsights}

**What we'd recommend:** Start with one high-impact automation that saves you 5+ hours per week. We call it the "Quick Win" approach — prove the value fast, then expand.`;
    cta = "See What Your Quick Win Could Be";
    ctaUrl = "https://calendly.com/sparkwave-ai/quick-chat";
  } else if (tier === "foundation_first") {
    subject = `🔵 ${firstName}, your automation roadmap`;
    headline = "You've Got Potential — Here's Your Automation Roadmap";
    body = `Every automated business started exactly where you are right now.

**Here are 3 things you can automate THIS WEEK with free tools:**
1. Email templates for your most common client communications
2. Calendar scheduling (Calendly free tier eliminates back-and-forth)
3. Basic lead capture with auto-responders

**When you're ready to level up:** We're here. No pressure, no timeline.`;
    cta = "Download Your Free Automation Starter Kit";
    ctaUrl = "https://sparkwave-ai.com/starter-kit";
  } else {
    subject = `${firstName}, smart move thinking about this early`;
    headline = "Smart Move — You're Thinking About This Early";
    body = `Most businesses don't think about automation until they're drowning. The fact that you're exploring now puts you ahead.

**Start here (all free):**
1. Follow our newsletter for weekly automation tips
2. Check out our free guide: "5 Automations Every Small Business Should Set Up"

**No sales pitch. Just value.**`;
    cta = "Get Free Weekly Automation Tips";
    ctaUrl = "https://sparkwave-ai.com/newsletter";
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #4F46E5; }
    .score-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
    .hot { background: #DEF7EC; color: #03543F; }
    .warm { background: #FEF3C7; color: #92400E; }
    .nurture { background: #DBEAFE; color: #1E40AF; }
    .content { background: #F3F4F6; color: #374151; }
    .cta { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 20px 0; }
    .cta:hover { background: #4338CA; }
    blockquote { border-left: 3px solid #4F46E5; padding-left: 15px; margin-left: 0; color: #555; font-style: italic; }
  </style>
</head>
<body>
  <h1>${headline}</h1>
  
  <p>Hey ${firstName},</p>
  
  <p>Thanks for taking the 3-Minute Automation Audit. Here's what we found:</p>
  
  <div class="score-badge ${tier === 'automation_ready' ? 'hot' : tier === 'growth_mode' ? 'warm' : tier === 'foundation_first' ? 'nurture' : 'content'}">
    Your Score: ${score}/25 — ${tier.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
  </div>
  
  ${body.split('\n').map(p => p.startsWith('**') ? `<p><strong>${p.replace(/\*\*/g, '')}</strong></p>` : `<p>${p}</p>`).join('')}
  
  <a href="${ctaUrl}" class="cta">${cta} →</a>
  
  <p>Questions? Just reply to this email or text us at (919) 737-2900.</p>
  
  <p>— Scott Johnson<br>Founder, Sparkwave AI</p>
</body>
</html>`;

  return { subject, html };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const discordWebhook = Deno.env.get("DISCORD_WEBHOOK_URL");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse Tally webhook payload
    const payload = await req.json();
    console.log("Received Tally submission:", JSON.stringify(payload, null, 2));

    // Extract answers from Tally format
    // Tally sends: { data: { fields: [...] } }
    const fields = payload.data?.fields || [];
    
    const answers: Record<string, any> = {};
    
    // Map Tally field labels to our keys
    for (const field of fields) {
      const label = field.label?.toLowerCase() || "";
      const value = field.value;
      
      if (label.includes("business")) answers.business_type = value;
      else if (label.includes("people") || label.includes("team")) answers.team_size = value;
      else if (label.includes("revenue")) answers.revenue = value;
      else if (label.includes("keeps you up") || label.includes("pain")) answers.pain_points = Array.isArray(value) ? value : [value];
      else if (label.includes("hours") || label.includes("repetitive")) answers.time_waste = value;
      else if (label.includes("tools") || label.includes("currently use")) answers.tech_stack = Array.isArray(value) ? value : [value];
      else if (label.includes("tried") || label.includes("automate") && label.includes("before")) answers.previous_attempts = value;
      else if (label.includes("soon") || label.includes("timeline")) answers.timeline = value;
      else if (label.includes("investing") || label.includes("budget")) answers.budget = value;
      else if (label.includes("magic wand") || label.includes("one thing")) answers.magic_wand = value;
      else if (label.includes("first name") || label === "name") answers.first_name = value;
      else if (label.includes("email")) answers.email = value;
      else if (label.includes("phone")) answers.phone = value;
      else if (label.includes("company") || label.includes("business name")) answers.company = value;
    }

    console.log("Parsed answers:", answers);

    // Calculate score
    const { score, tier, priority } = calculateScore(answers);
    console.log(`Score: ${score}, Tier: ${tier}, Priority: ${priority}`);

    // Generate results email
    const { subject, html } = generateResultsEmail(answers, score, tier);

    // Store in database
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .upsert({
        email: answers.email,
        first_name: answers.first_name,
        phone: answers.phone,
        company_name: answers.company,
        source: "automation_audit",
        lead_score: score,
        lead_tier: tier,
        pipeline_stage: priority === "hot" ? "qualified" : priority === "warm" ? "lead" : "subscriber",
        tags: ["automation_audit", tier],
        custom_fields: {
          audit_answers: answers,
          audit_score: score,
          audit_tier: tier,
          magic_wand: answers.magic_wand,
          pain_points: answers.pain_points,
          submitted_at: new Date().toISOString(),
        },
        business_id: "5a9bbfcf-e484-4633-abcd-b78f2e432f5e", // Sparkwave business ID
      }, {
        onConflict: "email",
      })
      .select()
      .single();

    if (contactError) {
      console.error("Error saving contact:", contactError);
    } else {
      console.log("Contact saved:", contact?.id);
    }

    // Send results email via Resend
    if (resendKey && answers.email) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Scott Johnson <scott@reply.sparkwave-ai.com>",
            to: answers.email,
            subject: subject,
            html: html,
          }),
        });
        const emailResult = await emailRes.json();
        console.log("Email sent:", emailResult);
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
      }
    }

    // Send Discord alert for hot leads
    if (discordWebhook && (priority === "hot" || priority === "warm")) {
      const emoji = priority === "hot" ? "🔥" : "🟡";
      const discordMsg = {
        content: `${emoji} **New ${priority.toUpperCase()} Lead from Automation Audit**\n` +
          `**Name:** ${answers.first_name || "Unknown"}\n` +
          `**Company:** ${answers.company || "Not provided"}\n` +
          `**Email:** ${answers.email}\n` +
          `**Phone:** ${answers.phone || "Not provided"}\n` +
          `**Score:** ${score}/25 (${tier.replace(/_/g, " ")})\n` +
          `**Pain Points:** ${(answers.pain_points || []).join(", ")}\n` +
          `**Magic Wand:** "${answers.magic_wand || "Not provided"}"\n` +
          `**Timeline:** ${answers.timeline}\n` +
          `**Budget:** ${answers.budget}`,
      };
      
      try {
        await fetch(discordWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discordMsg),
        });
        console.log("Discord alert sent");
      } catch (discordErr) {
        console.error("Discord alert error:", discordErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        score,
        tier,
        priority,
        contact_id: contact?.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
