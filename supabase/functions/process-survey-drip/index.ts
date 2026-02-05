import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Process Survey Drip Emails
 * 
 * Sends scheduled drip emails to survey respondents:
 * - Day 2: Quick win tip based on their pain points
 * - Day 5: Case study / success story
 * - Day 9: "Still struggling with [pain point]?" + CTA
 * - Day 14: Final value offer + book call CTA
 * 
 * Run via cron or manual trigger.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pain point to quick win mapping
const QUICK_WINS: Record<string, { title: string; tip: string }> = {
  lead_followup: {
    title: "Automating Lead Follow-Up",
    tip: `Here's a quick win you can implement TODAY:

**The "5-Minute Response" Rule**

Set up an auto-responder that sends immediately when a lead comes in. Studies show leads contacted within 5 minutes are 21x more likely to convert.

**Free tool to try:** Use Google Forms + Zapier (free tier) to auto-send a personalized email the moment someone fills out your contact form.

Even a simple "Thanks for reaching out! I'll personally get back to you within 24 hours." keeps leads warm while you're busy.`,
  },
  admin_overhead: {
    title: "Cutting Admin Time in Half",
    tip: `Here's a quick win you can implement TODAY:

**The "Template Everything" Strategy**

Take 30 minutes and create email templates for your 5 most common client communications:
1. New client welcome
2. Project update
3. Invoice follow-up
4. Meeting confirmation
5. Thank you / review request

**Free tool to try:** Gmail canned responses or TextExpander free trial. Just type a shortcut and boom — professional email ready to send.

One client saved 4 hours/week just with email templates. No fancy software needed.`,
  },
  onboarding: {
    title: "Streamlining Client Onboarding",
    tip: `Here's a quick win you can implement TODAY:

**The "One-Page Onboarding Doc"**

Create a single document that answers the 10 questions every new client asks:
- How do I pay?
- What's the timeline?
- Who do I contact?
- What do you need from me?

**Free tool to try:** Notion or Google Docs. Share the link in your welcome email.

Clients feel more confident, you answer fewer repetitive questions, everyone wins.`,
  },
  communication: {
    title: "Managing Client Communication",
    tip: `Here's a quick win you can implement TODAY:

**The "Office Hours" Approach**

Instead of responding to every message immediately, batch your communication:
- Check messages at 9 AM, 1 PM, and 5 PM
- Set client expectations upfront ("I respond within 4 business hours")
- Use auto-replies outside those windows

**Free tool to try:** Set up Gmail/Outlook vacation responder with your response times.

You'll actually respond faster because you're focused, not constantly context-switching.`,
  },
  proposals: {
    title: "Speeding Up Proposals",
    tip: `Here's a quick win you can implement TODAY:

**The "Modular Proposal" System**

Break your proposals into reusable blocks:
- Company intro (same every time)
- Service descriptions (pick and choose)
- Case studies (rotate relevant ones)
- Pricing section (plug in numbers)
- Terms & next steps (standardized)

**Free tool to try:** Create a "Proposal Parts" folder in Google Docs. Copy/paste to build new proposals in 15 minutes instead of 2 hours.`,
  },
  scaling: {
    title: "Scaling Without Breaking",
    tip: `Here's a quick win you can implement TODAY:

**The "SOP Sprint" Method**

Pick ONE process that causes headaches when you're busy. Spend 30 minutes writing it down step-by-step.

Format:
- Trigger: "When [X] happens..."
- Steps: 1, 2, 3... (with screenshots)
- Done when: "[Y] is complete"

**Free tool to try:** Loom to record yourself doing it + a Google Doc for steps.

Next time you're swamped, anyone can follow the SOP. That's how you scale.`,
  },
};

// Day 2: Quick win email based on primary pain point
function generateDay2Email(firstName: string, painPoints: string[], tier: string): { subject: string; html: string } {
  // Get primary pain point (first one they selected)
  const primaryPain = painPoints[0] || "admin_overhead";
  const quickWin = QUICK_WINS[primaryPain] || QUICK_WINS.admin_overhead;

  const subject = `${firstName}, try this quick win today`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h2 { color: #4F46E5; margin-top: 30px; }
    .tip-box { background: #F0F9FF; border-left: 4px solid #4F46E5; padding: 20px; margin: 20px 0; }
    .cta { display: inline-block; background: #4F46E5; color: white !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <p>Hey ${firstName},</p>

  <p>Hope your week is going well! After looking at your automation audit results, I wanted to share something you can implement <strong>today</strong> — no software purchase required.</p>

  <h2>🎯 Quick Win: ${quickWin.title}</h2>

  <div class="tip-box">
    ${quickWin.tip.split('\n').map(line => `<p style="margin: 8px 0;">${line}</p>`).join('')}
  </div>

  <p>This isn't fancy, but it works. Sometimes the best automation is just better systems.</p>

  ${tier === "automation_ready" || tier === "growth_mode" ? `
  <p><strong>Want to see what a fully automated version looks like?</strong></p>
  <p>I've helped businesses like yours save 15+ hours per week with proper automation. Happy to show you what's possible.</p>
  <a href="https://calendly.com/sparkwave-ai/quick-chat" class="cta">Book a 15-Min Chat →</a>
  ` : `
  <p>Try it out and let me know how it goes — just reply to this email!</p>
  `}

  <div class="footer">
    <p>— Scott Johnson<br>Founder, Sparkwave AI</p>
    <p><a href="https://sparkwave-ai.com/unsubscribe">Unsubscribe</a> from these tips</p>
  </div>
</body>
</html>`;

  return { subject, html };
}

// Day 5: Case study email
function generateDay5Email(firstName: string, tier: string): { subject: string; html: string } {
  const subject = `How a ${tier === "automation_ready" ? "marketing agency" : "small business"} saved 12 hours/week`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h2 { color: #4F46E5; margin-top: 30px; }
    .case-study { background: #F9FAFB; border-radius: 12px; padding: 24px; margin: 20px 0; }
    .stat { font-size: 28px; font-weight: bold; color: #4F46E5; }
    .cta { display: inline-block; background: #4F46E5; color: white !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <p>Hey ${firstName},</p>

  <p>I wanted to share a quick story about a business similar to yours...</p>

  <div class="case-study">
    <h2 style="margin-top: 0;">📊 Real Results: Marketing Agency Case Study</h2>

    <p><strong>The Problem:</strong> A 5-person marketing agency was spending 15+ hours per week on:</p>
    <ul>
      <li>Manually sending client reports</li>
      <li>Chasing down content approvals</li>
      <li>Copying data between tools</li>
      <li>Following up on late invoices</li>
    </ul>

    <p><strong>What We Built:</strong></p>
    <ul>
      <li>Automated report generation + delivery</li>
      <li>Client approval portal with reminders</li>
      <li>Data sync between CRM, project tool, and invoicing</li>
      <li>Smart payment follow-up sequences</li>
    </ul>

    <p><strong>The Results (after 30 days):</strong></p>
    <p><span class="stat">12 hours/week</span> saved</p>
    <p><span class="stat">$62,400/year</span> in recovered time</p>
    <p><span class="stat">40%</span> faster client onboarding</p>
  </div>

  <p>The best part? Most of this was built with tools they already had — just connected properly.</p>

  ${tier === "automation_ready" || tier === "growth_mode" ? `
  <p><strong>Curious what this could look like for your business?</strong></p>
  <p>I'd love to map out your specific automation opportunities. No pressure, just a conversation.</p>
  <a href="https://calendly.com/sparkwave-ai/automation-blueprint" class="cta">Get Your Custom Blueprint →</a>
  ` : `
  <p>When you're ready to explore what automation could do for you, I'm here to help.</p>
  <a href="https://calendly.com/sparkwave-ai/quick-chat" class="cta">Let's Chat →</a>
  `}

  <div class="footer">
    <p>— Scott Johnson<br>Founder, Sparkwave AI</p>
    <p><a href="https://sparkwave-ai.com/unsubscribe">Unsubscribe</a></p>
  </div>
</body>
</html>`;

  return { subject, html };
}

// Day 9: Pain point reminder + urgency
function generateDay9Email(firstName: string, painPoints: string[], magicWand: string, tier: string): { subject: string; html: string } {
  const painPointLabels: Record<string, string> = {
    lead_followup: "leads slipping through the cracks",
    admin_overhead: "too much time on admin work",
    onboarding: "messy client onboarding",
    communication: "drowning in customer messages",
    proposals: "proposals taking forever",
    scaling: "things breaking as you grow",
  };

  const primaryPain = painPoints[0] || "admin_overhead";
  const painLabel = painPointLabels[primaryPain] || "repetitive tasks eating up your time";

  const subject = `${firstName}, still dealing with ${painLabel.split(" ").slice(0, 3).join(" ")}...?`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h2 { color: #4F46E5; margin-top: 30px; }
    .highlight { background: #FEF3C7; padding: 16px 20px; border-radius: 8px; margin: 20px 0; }
    .cta { display: inline-block; background: #4F46E5; color: white !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin: 20px 0; font-weight: bold; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <p>Hey ${firstName},</p>

  <p>Quick question: Are you still dealing with <strong>${painLabel}</strong>?</p>

  <p>When you took our automation audit, you mentioned this was eating into your time. And you said if you had a magic wand, you'd want to "${magicWand || 'streamline operations'}".</p>

  <div class="highlight">
    <p style="margin: 0;"><strong>Here's the thing:</strong> Every week that goes by without fixing this costs you time and money. If you're losing even 5 hours a week, that's over 250 hours this year.</p>
  </div>

  <p>I don't want to be pushy. But I also don't want you to look back in 6 months and wish you'd started sooner.</p>

  <h2>Here's what I can do for you:</h2>

  <p>A free 30-minute Automation Blueprint call where we:</p>
  <ol>
    <li>Map your current workflow (the messy reality)</li>
    <li>Identify the #1 bottleneck to fix first</li>
    <li>Sketch out an automation plan (that you can implement yourself or with us)</li>
  </ol>

  <p>No pitch. No pressure. Just clarity on what's possible.</p>

  <a href="https://calendly.com/sparkwave-ai/automation-blueprint" class="cta">Grab a Time That Works →</a>

  <p>If now's not the right time, no worries — I'll check back in a few days.</p>

  <div class="footer">
    <p>— Scott<br>Sparkwave AI</p>
    <p><a href="https://sparkwave-ai.com/unsubscribe">Unsubscribe</a></p>
  </div>
</body>
</html>`;

  return { subject, html };
}

// Day 14: Final offer
function generateDay14Email(firstName: string, tier: string): { subject: string; html: string } {
  const subject = `${firstName}, last call (+ something I normally don't offer)`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h2 { color: #4F46E5; margin-top: 30px; }
    .offer-box { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; border-radius: 12px; padding: 24px; margin: 20px 0; }
    .offer-box h3 { color: white; margin-top: 0; }
    .cta { display: inline-block; background: white; color: #4F46E5 !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin: 10px 0; font-weight: bold; }
    .cta-secondary { display: inline-block; background: #4F46E5; color: white !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin: 20px 0; font-weight: bold; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <p>Hey ${firstName},</p>

  <p>This is my last email in this series (I promise I won't keep bugging you).</p>

  <p>But before I go, I wanted to make you an offer I don't usually put in writing:</p>

  <div class="offer-box">
    <h3>🎁 Free Automation Roadmap Session</h3>
    <p>Book a call with me this week, and I'll personally create a custom automation roadmap for your business.</p>
    <p>Not a sales deck. An actual document you can use — whether you work with us or not.</p>
    <p><strong>What you'll get:</strong></p>
    <ul style="margin: 10px 0;">
      <li>Prioritized list of automation opportunities</li>
      <li>Time and cost savings estimates</li>
      <li>Tool recommendations based on what you already use</li>
      <li>90-day implementation timeline</li>
    </ul>
    <a href="https://calendly.com/sparkwave-ai/automation-blueprint" class="cta">Book Your Free Session →</a>
  </div>

  <p>If automation isn't a priority right now, I totally get it. Just reply "not now" and I'll make a note to check back in a few months.</p>

  <p>But if you've been meaning to tackle this and just haven't gotten around to it... this is your sign.</p>

  <a href="https://calendly.com/sparkwave-ai/automation-blueprint" class="cta-secondary">Yes, I Want My Roadmap →</a>

  <p>Either way, thanks for taking the audit and engaging with these emails. I genuinely hope some of the tips were useful.</p>

  <div class="footer">
    <p>— Scott Johnson<br>Founder, Sparkwave AI<br>(919) 737-2900</p>
    <p><a href="https://sparkwave-ai.com/unsubscribe">Unsubscribe</a></p>
  </div>
</body>
</html>`;

  return { subject, html };
}

// Map raw pain point text to our keys
const PAIN_POINT_MAP: Record<string, string> = {
  "Leads slip through the cracks — we forget to follow up": "lead_followup",
  "Too much time on admin — data entry, scheduling, invoicing": "admin_overhead",
  "Onboarding new clients is messy and inconsistent": "onboarding",
  "We can't keep up with customer messages and inquiries": "communication",
  "Quoting and proposals take forever": "proposals",
  "We're growing but things keep breaking": "scaling",
};

function normalizePainPoints(painPoints: any): string[] {
  if (!painPoints) return ["admin_overhead"];
  
  const arr = Array.isArray(painPoints) ? painPoints : [painPoints];
  
  return arr.map((p: string) => {
    // Check if it's already a key
    if (Object.values(PAIN_POINT_MAP).includes(p)) return p;
    // Try to map from full text
    return PAIN_POINT_MAP[p] || "admin_overhead";
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📧 process-survey-drip started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse optional limit from request
    let limit = 50;
    try {
      const body = await req.json();
      limit = body.limit || 50;
    } catch {
      // No body, use default
    }

    // Get pending drips
    const { data: pendingDrips, error: fetchError } = await supabase
      .rpc("get_pending_survey_drips", { p_limit: limit });

    if (fetchError) {
      console.error("Error fetching pending drips:", fetchError);
      throw fetchError;
    }

    if (!pendingDrips || pendingDrips.length === 0) {
      console.log("✅ No pending drips to process");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No pending drips" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📧 Processing ${pendingDrips.length} pending drips`);

    let sent = 0;
    let failed = 0;
    const results: any[] = [];

    for (const drip of pendingDrips) {
      try {
        const { drip_id, email, first_name, tier, pain_points, magic_wand, pending_drip_day } = drip;
        const name = first_name || "there";
        const normalizedPainPoints = normalizePainPoints(pain_points);

        // Generate email based on day
        let emailContent: { subject: string; html: string };

        switch (pending_drip_day) {
          case 2:
            emailContent = generateDay2Email(name, normalizedPainPoints, tier);
            break;
          case 5:
            emailContent = generateDay5Email(name, tier);
            break;
          case 9:
            emailContent = generateDay9Email(name, normalizedPainPoints, magic_wand, tier);
            break;
          case 14:
            emailContent = generateDay14Email(name, tier);
            break;
          default:
            console.log(`⚠️ Unknown drip day: ${pending_drip_day}`);
            continue;
        }

        // Send via Resend
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Scott Johnson <scott@reply.sparkwave-ai.com>",
            to: email,
            subject: emailContent.subject,
            html: emailContent.html,
          }),
        });

        const emailResult = await emailRes.json();

        if (!emailRes.ok) {
          throw new Error(emailResult.message || "Email send failed");
        }

        // Mark drip as sent
        await supabase.rpc("mark_drip_sent", { p_drip_id: drip_id, p_day: pending_drip_day });

        // Update contact's last email date
        await supabase
          .from("contacts")
          .update({ email_last_contacted: new Date().toISOString() })
          .eq("id", drip.contact_id);

        console.log(`✅ Sent day ${pending_drip_day} to ${email}`);
        sent++;
        results.push({ email, day: pending_drip_day, status: "sent", resend_id: emailResult.id });

      } catch (err: any) {
        console.error(`❌ Failed to process drip for ${drip.email}:`, err.message);
        failed++;
        results.push({ email: drip.email, day: drip.pending_drip_day, status: "failed", error: err.message });
      }
    }

    console.log(`📧 Drip processing complete: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingDrips.length,
        sent,
        failed,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Error in process-survey-drip:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
