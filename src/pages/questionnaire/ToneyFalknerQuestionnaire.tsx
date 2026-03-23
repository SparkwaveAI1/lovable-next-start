import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";

const TOTAL_SECTIONS = 8;

interface FormData {
  respondent_name: string;
  respondent_email: string;
  q1: string[];
  q2: string[];
  q3: string;
  q4: string[];
  q5: string;
  q6: string;
  q7: string;
  q8: string[];
  q9: string[];
  q10: string[];
  q11: string[];
  q12: string;
  q13: string[];
  q14_yes: string;
  q14_text: string;
  q15: string;
  q16: string[];
  q17: string;
  q18: string;
  q19: string;
  q20: string;
  q21: string[];
  q22_rank: string[];
  q23: string;
  q24: string;
}

const emptyForm: FormData = {
  respondent_name: "", respondent_email: "",
  q1: [], q2: [], q3: "", q4: [], q5: "", q6: "", q7: "", q8: [],
  q9: [], q10: [], q11: [], q12: "", q13: [],
  q14_yes: "", q14_text: "", q15: "", q16: [], q17: "", q18: "",
  q19: "", q20: "", q21: [], q22_rank: [], q23: "", q24: ""
};

function MultiCheck({ id, options, value, onChange, max }: {
  id: string; options: string[]; value: string[]; onChange: (v: string[]) => void; max?: number;
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt));
    } else {
      if (max && value.length >= max) return;
      onChange([...value, opt]);
    }
  };
  return (
    <div className="space-y-2">
      {max && <p className="text-sm text-muted-foreground">Select up to {max}</p>}
      {options.map(opt => (
        <div key={opt} className="flex items-center space-x-2">
          <Checkbox
            id={`${id}-${opt}`}
            checked={value.includes(opt)}
            onCheckedChange={() => toggle(opt)}
          />
          <Label htmlFor={`${id}-${opt}`} className="font-normal cursor-pointer">{opt}</Label>
        </div>
      ))}
    </div>
  );
}

function SingleSelect({ id, options, value, onChange }: {
  id: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="space-y-2">
      {options.map(opt => (
        <div key={opt} className="flex items-center space-x-2">
          <RadioGroupItem value={opt} id={`${id}-${opt}`} />
          <Label htmlFor={`${id}-${opt}`} className="font-normal cursor-pointer">{opt}</Label>
        </div>
      ))}
    </RadioGroup>
  );
}

function RankSelect({ options, value, onChange }: {
  options: string[]; value: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt));
    } else {
      if (value.length >= 3) return;
      onChange([...value, opt]);
    }
  };
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Select your top 3 in order of priority</p>
      {options.map(opt => {
        const rank = value.indexOf(opt);
        return (
          <div key={opt} className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => toggle(opt)}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors
                ${rank >= 0 ? "bg-slate-800 border-slate-800 text-white" : "border-slate-300 text-slate-400 hover:border-slate-500"}`}
            >
              {rank >= 0 ? rank + 1 : ""}
            </button>
            <span className="text-sm">{opt}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ToneyFalknerQuestionnaire() {
  const [section, setSection] = useState(0); // 0 = intro
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const progress = section === 0 ? 0 : Math.round((section / TOTAL_SECTIONS) * 100);

  const handleSubmit = async () => {
    if (!form.respondent_name.trim()) {
      setError("Please enter your name before submitting.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const { error: insertError } = await supabase
        .from("questionnaire_responses" as any)
        .insert({
          respondent_name: form.respondent_name,
          respondent_email: form.respondent_email,
          questionnaire_id: "toney-falkner-v1",
          responses: form as any
        });

      if (insertError) {
        setError("There was a problem saving your responses. Please try again.");
        setSubmitting(false);
        return;
      }

      // Fire notification email via edge function (non-blocking)
      try {
        const answerRows = Object.entries({
          "Business focus": form.q1.join(", "),
          "Client types": form.q2.join(", "),
          "Top 3 priorities": form.q3,
          "Current marketing": form.q4.join(", "),
          "Content frequency": form.q5,
          "Marketing frustration": form.q6,
          "Topics (top)": form.q9.join(", "),
          "Communication style": form.q11.join(", "),
          "AI comfort": form.q20,
          "Top priorities ranked": form.q22_rank.join(" → "),
          "30-day improvement": form.q23,
        }).filter(([, v]) => v).map(([k, v]) =>
          `<tr><td style="padding:6px 10px;font-weight:600;color:#555;font-size:13px;width:40%;border-bottom:1px solid #f0f0f0">${k}</td><td style="padding:6px 10px;color:#222;font-size:13px;border-bottom:1px solid #f0f0f0">${v}</td></tr>`
        ).join("");

        const html = `<div style="font-family:sans-serif;max-width:680px">
          <div style="background:#1e293b;color:#fff;padding:20px 28px;border-radius:8px 8px 0 0">
            <h1 style="margin:0;font-size:18px">New Questionnaire Submission</h1>
            <p style="margin:4px 0 0;opacity:.7;font-size:13px">Toney Falkner — AI & Marketing Assessment</p>
          </div>
          <div style="padding:14px 28px;background:#f8f9fa">
            <p style="margin:0;font-size:14px;color:#333"><strong>${form.respondent_name}</strong>${form.respondent_email ? ` (${form.respondent_email})` : ""} completed the questionnaire.</p>
          </div>
          <div style="padding:0 28px 24px">
            <table style="width:100%;border-collapse:collapse;margin-top:12px">${answerRows}</table>
          </div>
          <div style="padding:12px 28px;background:#f8f9fa;border-radius:0 0 8px 8px;font-size:12px;color:#999">
            View all responses: <a href="https://sparkwaveai.app/questionnaire/toney-falkner/results" style="color:#1e293b">sparkwaveai.app/questionnaire/toney-falkner/results</a>
          </div>
        </div>`;

        await supabase.functions.invoke("send-email", {
          body: {
            to: "scott@sparkwave-ai.com",
            from_email: "info@sparkwave-ai.com",
            from_name: "Sparkwave AI",
            subject: `New questionnaire: ${form.respondent_name} — Toney Falkner`,
            html,
          }
        });
      } catch {
        // Non-blocking — submission is already saved
      }

      setSubmitted(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center shadow-lg">
          <CardContent className="pt-12 pb-10 px-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-slate-800 mb-3">Thank You, {form.respondent_name.split(" ")[0]}.</h2>
            <p className="text-slate-600 leading-relaxed">
              We'll review your responses and follow up shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-slate-700">AI & Marketing Optimization Assessment</span>
            {section > 0 && (
              <span className="text-sm text-muted-foreground">Section {section} of {TOTAL_SECTIONS}</span>
            )}
          </div>
          {section > 0 && (
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div
                className="bg-slate-700 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Intro */}
        {section === 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-slate-800">AI & Marketing Optimization Questionnaire</CardTitle>
              <CardDescription className="text-base mt-2">
                This questionnaire helps us understand your business goals, marketing needs, and communication priorities
                so we can build the most effective AI strategy for your practice.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-1">
                <p>📋 8 sections · 24 questions</p>
                <p>⏱ Approximately 10–15 minutes</p>
                <p>🔒 Your responses are confidential</p>
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    value={form.respondent_name}
                    onChange={e => set("respondent_name", e.target.value)}
                    placeholder="Toney Falkner"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Your Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.respondent_email}
                    onChange={e => set("respondent_email", e.target.value)}
                    placeholder="toney@example.com"
                    className="mt-1"
                  />
                </div>
              </div>
              <Button
                className="w-full bg-slate-800 hover:bg-slate-700"
                onClick={() => setSection(1)}
                disabled={!form.respondent_name.trim()}
              >
                Begin Questionnaire <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Section 1: Business Focus & Goals */}
        {section === 1 && (
          <Card className="shadow-sm">
            <CardHeader>
              <Badge variant="outline" className="w-fit mb-2">Section 1 of 8</Badge>
              <CardTitle>Business Focus & Goals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <Label className="text-base font-medium">Q1. What is your primary business focus right now? (Select up to 2)</Label>
                <div className="mt-3">
                  <MultiCheck id="q1" max={2} options={[
                    "Growing new client acquisition",
                    "Nurturing existing clients",
                    "Increasing referrals",
                    "Improving operational efficiency",
                    "Building brand / visibility"
                  ]} value={form.q1} onChange={v => set("q1", v)} />
                </div>
              </div>
              <div>
                <Label className="text-base font-medium">Q2. What types of clients are you most focused on attracting? (Check all that apply)</Label>
                <div className="mt-3">
                  <MultiCheck id="q2" options={[
                    "Pre-retirees",
                    "Retirees",
                    "High-income professionals (30–50)",
                    "Business owners",
                    "High net worth individuals",
                    "Other"
                  ]} value={form.q2} onChange={v => set("q2", v)} />
                </div>
              </div>
              <div>
                <Label className="text-base font-medium">Q3. What are your top 3 business priorities for the next 6–12 months?</Label>
                <Textarea
                  className="mt-2"
                  rows={4}
                  placeholder="Please describe your top priorities..."
                  value={form.q3}
                  onChange={e => set("q3", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 2: Current Marketing & Content */}
        {section === 2 && (
          <Card className="shadow-sm">
            <CardHeader>
              <Badge variant="outline" className="w-fit mb-2">Section 2 of 8</Badge>
              <CardTitle>Current Marketing & Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <Label className="text-base font-medium">Q4. What are you currently doing for marketing and content? (Check all that apply)</Label>
                <div className="mt-3">
                  <MultiCheck id="q4" options={[
                    "Email newsletter",
                    "Blog posts",
                    "LinkedIn posting",
                    "Facebook posting",
                    "Video content",
                    "Paid ads",
                    "None / very limited"
                  ]} value={form.q4} onChange={v => set("q4", v)} />
                </div>
              </div>
              <div>
                <Label className="text-base font-medium">Q5. How often do you currently create content?</Label>
                <div className="mt-3">
                  <SingleSelect id="q5" options={["Rarely", "Monthly", "Weekly", "Multiple times per week"]} value={form.q5} onChange={v => set("q5", v)} />
                </div>
              </div>
              <div>
                <Label className="text-base font-medium">Q6. What is most frustrating about your current marketing efforts?</Label>
                <Textarea className="mt-2" rows={3} value={form.q6} onChange={e => set("q6", e.target.value)} />
              </div>
              <div>
                <Label className="text-base font-medium">Q7. Does your current content accurately reflect your voice and perspective?</Label>
                <div className="mt-3">
                  <SingleSelect id="q7" options={["Yes", "Somewhat", "No"]} value={form.q7} onChange={v => set("q7", v)} />
                </div>
              </div>
              <div>
                <Label className="text-base font-medium">Q8. If not, what feels off? (Check all that apply)</Label>
                <div className="mt-3">
                  <MultiCheck id="q8" options={[
                    "Too generic",
                    "Too salesy",
                    "Not how I naturally speak",
                    "Doesn't reflect my philosophy",
                    "Other"
                  ]} value={form.q8} onChange={v => set("q8", v)} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 3: Content Direction */}
        {section === 3 && (
          <Card className="shadow-sm">
            <CardHeader>
              <Badge variant="outline" className="w-fit mb-2">Section 3 of 8</Badge>
              <CardTitle>Content Direction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <Label className="text-base font-medium">Q9. What topics are most valuable for you to communicate to clients and prospects? (Select up to 5)</Label>
                <div className="mt-3">
                  <MultiCheck id="q9" max={5} options={[
                    "Retirement planning clarity",
                    "Behavioral finance / decision-making",
                    "Market perspective",
                    "Client scenarios / real-life examples",
                    "Common mistakes to avoid",
                    "Financial education",
                    "Life planning / lifestyle in retirement",
                    "Other"
                  ]} value={form.q9} onChange={v => set("q9", v)} />
                </div>
              </div>
              <div>
                <Label className="text-base font-medium">Q10. Are there any topics you want to avoid? (Check all that apply)</Label>
                <div className="mt-3">
                  <MultiCheck id="q10" options={[
                    "Market predictions",
                    "Specific investment recommendations",
                    "Short-term trading",
                    "Political / economic opinions",
                    "Controversial topics",
                    "Other"
                  ]} value={form.q10} onChange={v => set("q10", v)} />
                </div>
              </div>
              <div>
                <Label className="text-base font-medium">Q11. How would you describe your communication style? (Select all that apply)</Label>
                <div className="mt-3">
                  <MultiCheck id="q11" options={[
                    "Conservative",
                    "Direct",
                    "Educational",
                    "Conversational",
                    "Analytical",
                    "Story-driven",
                    "Other"
                  ]} value={form.q11} onChange={v => set("q11", v)} />
                </div>
              </div>
              <div>
                <Label className="text-base font-medium">Q12. What tone or style would feel WRONG for your brand?</Label>
                <Textarea className="mt-2" rows={3} value={form.q12} onChange={e => set("q12", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 4: Client Communication */}
        {section === 4 && (
          <Card className="shadow-sm">
            <CardHeader>
              <Badge variant="outline" className="w-fit mb-2">Section 4 of 8</Badge>
              <CardTitle>Client Communication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <Label className="text-base font-medium">Q13. How do you communicate with clients most often? (Check all that apply)</Label>
                <div className="mt-3">
                  <MultiCheck id="q13" options={[
                    "Email",
                    "Phone",
                    "In-person meetings",
                    "Text",
                    "Client portal",
                    "Other"
                  ]} value={form.q13} onChange={v => set("q13", v)} />
                </div>
              </div>
              <div>
                <Label className="text-base font-medium">Q14. Are there things you find yourself explaining repeatedly to clients?</Label>
                <div className="mt-3 space-y-3">
                  <SingleSelect id="q14" options={["Yes", "No"]} value={form.q14_yes} onChange={v => set("q14_yes", v)} />
                  {form.q14_yes === "Yes" && (
                    <Textarea
                      placeholder="What do you find yourself explaining most often?"
                      rows={3}
                      value={form.q14_text}
                      onChange={e => set("q14_text", e.target.value)}
                    />
                  )}
                </div>
              </div>
              <div>
                <Label className="text-base font-medium">Q15. Do you feel there's room to improve the consistency or quality of your client communication?</Label>
                <div className="mt-3">
                  <SingleSelect id="q15" options={["Yes", "Maybe", "No"]} value={form.q15} onChange={v => set("q15", v)} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 5: Time & Workflow */}
        {section === 5 && (
          <Card className="shadow-sm">
            <CardHeader>
              <Badge variant="outline" className="w-fit mb-2">Section 5 of 8</Badge>
              <CardTitle>Time & Workflow / Automation Opportunities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <Label className="text-base font-medium">Q16. Where do you spend most of your time each week? (Select up to 3)</Label>
                <div className="mt-3">
                  <MultiCheck id="q16" max={3} options={[
                    "Client meetings",
                    "Writing emails",
                    "Preparing reports",
                    "Marketing / content",
                    "Admin tasks",
                    "Business development",
                    "Other"
                  ]} value={form.q16} onChange={v => set("q16", v)} />
                </div>
              </div>
              <div>
                <Label className="text-base font-medium">Q17. What tasks feel repetitive or low-value to you?</Label>
                <Textarea className="mt-2" rows={3} value={form.q17} onChange={e => set("q17", e.target.value)} />
              </div>
              <div>
                <Label className="text-base font-medium">Q18. What tasks should be easier or more automated than they currently are?</Label>
                <Textarea className="mt-2" rows={3} value={form.q18} onChange={e => set("q18", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 6: Technology & Tools */}
        {section === 6 && (
          <Card className="shadow-sm">
            <CardHeader>
              <Badge variant="outline" className="w-fit mb-2">Section 6 of 8</Badge>
              <CardTitle>Technology & Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <Label className="text-base font-medium">Q19. What are the core tools you use in your business today?</Label>
                <Textarea className="mt-2" rows={3} placeholder="CRM, email platform, portfolio management software, etc." value={form.q19} onChange={e => set("q19", e.target.value)} />
              </div>
              <div>
                <Label className="text-base font-medium">Q20. How comfortable are you with introducing AI into your practice?</Label>
                <div className="mt-3">
                  <SingleSelect id="q20" options={[
                    "Very comfortable",
                    "Somewhat comfortable",
                    "Cautious",
                    "Very cautious"
                  ]} value={form.q20} onChange={v => set("q20", v)} />
                </div>
              </div>
              <div>
                <Label className="text-base font-medium">Q21. What are your biggest concerns about AI? (Check all that apply)</Label>
                <div className="mt-3">
                  <MultiCheck id="q21" options={[
                    "Data privacy / client information",
                    "Compliance / regulatory risk",
                    "Accuracy / reliability",
                    "Loss of control over messaging",
                    "Other"
                  ]} value={form.q21} onChange={v => set("q21", v)} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 7: Priorities & Quick Wins */}
        {section === 7 && (
          <Card className="shadow-sm">
            <CardHeader>
              <Badge variant="outline" className="w-fit mb-2">Section 7 of 8</Badge>
              <CardTitle>Priorities & Quick Wins</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <Label className="text-base font-medium">Q22. What would be most valuable to you right now? Rank your top 3:</Label>
                <div className="mt-3">
                  <RankSelect options={[
                    "Better newsletter / email communication",
                    "More consistent content output",
                    "Improved marketing reach",
                    "Saving time on admin tasks",
                    "Better client education materials",
                    "Lead generation / outreach"
                  ]} value={form.q22_rank} onChange={v => set("q22_rank", v)} />
                </div>
              </div>
              <div>
                <Label className="text-base font-medium">Q23. If you could improve one thing in the next 30 days, what would it be?</Label>
                <Textarea className="mt-2" rows={3} value={form.q23} onChange={e => set("q23", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 8: Final */}
        {section === 8 && (
          <Card className="shadow-sm">
            <CardHeader>
              <Badge variant="outline" className="w-fit mb-2">Section 8 of 8</Badge>
              <CardTitle>Final Thoughts</CardTitle>
              <CardDescription>Almost done — just one last question.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium">Q24. Is there anything else you'd like us to understand about your business or goals?</Label>
                <Textarea className="mt-2" rows={5} placeholder="Any additional context, priorities, or concerns you'd like to share..." value={form.q24} onChange={e => set("q24", e.target.value)} />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        {section > 0 && (
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setSection(s => s - 1)}
            >
              <ChevronLeft className="mr-2 w-4 h-4" /> Back
            </Button>
            {section < TOTAL_SECTIONS ? (
              <Button
                className="bg-slate-800 hover:bg-slate-700"
                onClick={() => setSection(s => s + 1)}
              >
                Next <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            ) : (
              <Button
                className="bg-slate-800 hover:bg-slate-700 min-w-[140px]"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> Submitting...</> : "Submit Questionnaire"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
