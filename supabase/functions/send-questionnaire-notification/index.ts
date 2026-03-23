import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const NOTIFY_EMAIL = "scott@sparkwave-ai.com";
const FROM_EMAIL = "info@sparkwave-ai.com";

const Q_LABELS: Record<string, string> = {
  q1: "Q1. Primary business focus",
  q2: "Q2. Client types to attract",
  q3: "Q3. Top 3 business priorities",
  q4: "Q4. Current marketing activities",
  q5: "Q5. Content creation frequency",
  q6: "Q6. Most frustrating about marketing",
  q7: "Q7. Content reflects voice?",
  q8: "Q8. What feels off",
  q9: "Q9. Most valuable topics",
  q10: "Q10. Topics to avoid",
  q11: "Q11. Communication style",
  q12: "Q12. Tone that would feel wrong",
  q13: "Q13. How communicate with clients",
  q14_yes: "Q14. Explains things repeatedly?",
  q14_text: "Q14. What is explained repeatedly",
  q15: "Q15. Room to improve communication?",
  q16: "Q16. Where time is spent",
  q17: "Q17. Repetitive / low-value tasks",
  q18: "Q18. Tasks that should be automated",
  q19: "Q19. Core tools used",
  q20: "Q20. Comfort with AI",
  q21: "Q21. AI concerns",
  q22_rank: "Q22. Top 3 priorities ranked",
  q23: "Q23. One improvement in 30 days",
  q24: "Q24. Anything else",
};

function formatVal(v: unknown): string {
  if (Array.isArray(v)) return v.length ? v.join(", ") : "(none)";
  if (typeof v === "string") return v.trim() || "(blank)";
  return String(v ?? "(blank)");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { respondent_name, respondent_email, responses } = await req.json();

    const rows = Object.entries(Q_LABELS)
      .map(([key, label]) => {
        const val = (responses as Record<string, unknown>)[key];
        if (val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) return "";
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f1f1;font-weight:600;color:#555;font-size:13px;vertical-align:top;width:40%">${label}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f1f1;color:#222;font-size:13px;vertical-align:top">${formatVal(val)}</td>
        </tr>`;
      })
      .filter(Boolean)
      .join("");

    const html = `
      <div style="font-family:sans-serif;max-width:700px;margin:0 auto;background:#fff">
        <div style="background:#1e293b;color:#fff;padding:24px 32px;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:20px">New Questionnaire Submission</h1>
          <p style="margin:6px 0 0;opacity:0.7;font-size:14px">Toney Falkner — AI & Marketing Optimization Assessment</p>
        </div>
        <div style="padding:24px 32px;background:#f8f9fa">
          <p style="margin:0;font-size:15px;color:#333">
            <strong>${respondent_name || "Unknown"}</strong>${respondent_email ? ` (${respondent_email})` : ""} has completed the questionnaire.
          </p>
        </div>
        <div style="padding:0 32px 32px">
          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            ${rows}
          </table>
        </div>
        <div style="padding:16px 32px;background:#f8f9fa;border-radius:0 0 8px 8px;font-size:12px;color:#999">
          View all responses: <a href="https://sparkwaveai.app/questionnaire/toney-falkner/results" style="color:#1e293b">sparkwaveai.app/questionnaire/toney-falkner/results</a>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        subject: `New questionnaire: ${respondent_name || "Unknown"} — Toney Falkner`,
        html,
      }),
    });

    const result = await res.json();

    return new Response(JSON.stringify({ ok: true, resend: result }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
