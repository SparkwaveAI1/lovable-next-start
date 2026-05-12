import { useState } from "react";
import { SEO } from "@/components/SEO";
import { SEO_CONFIG } from "@/lib/seo-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  LockKeyhole,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

const timelineOptions = [
  "This week",
  "Next 2 weeks",
  "This month",
  "Exploring for a future study",
];

export default function PersonaAIPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    timeline: "",
    studyGoal: "",
  });

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const scrollToInquiry = () => {
    document.getElementById("run-first-study")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const params = new URLSearchParams(window.location.search);
      const { data, error } = await supabase.functions.invoke("personaai-inquiry", {
        body: {
          ...form,
          sourceUrl: window.location.href,
          utm: {
            utm_source: params.get("utm_source"),
            utm_medium: params.get("utm_medium"),
            utm_campaign: params.get("utm_campaign"),
            utm_content: params.get("utm_content"),
            utm_term: params.get("utm_term"),
          },
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Inquiry submission failed");
      }

      setSubmitted(true);
      toast({
        title: "Study request captured",
        description: "Your inquiry is saved for review before any follow-up.",
      });
    } catch (err) {
      console.error("PersonaAI inquiry error", err);
      toast({
        title: "Could not submit request",
        description: "Please try again or email Scott directly if this keeps happening.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const researchSteps = [
    {
      icon: Target,
      title: "Define the research decision",
      description: "Tell us the concept, message, offer, or audience decision you need to pressure-test.",
    },
    {
      icon: Users,
      title: "Select the audience lens",
      description: "Model the people you need to understand by role, market, behavior, objections, and buying context.",
    },
    {
      icon: MessageSquare,
      title: "Run the study prompts",
      description: "Collect structured responses, objections, questions, and decision signals across the audience model.",
    },
    {
      icon: ClipboardCheck,
      title: "Review before action",
      description: "Use the output as directional research, then decide what to validate next with customers or campaigns.",
    },
  ];

  const useCases = [
    "Message and positioning tests",
    "Product concept screening",
    "Offer and pricing objection discovery",
    "Customer interview prep",
    "Landing page feedback",
    "Research backlog prioritization",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <SEO {...SEO_CONFIG.personaAI} />

      <section className="relative overflow-hidden px-4 pb-20 pt-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.22),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_34%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Badge variant="outline" className="mb-6 border-violet-500/50 bg-violet-500/10 text-violet-200">
              <Sparkles className="mr-2 h-4 w-4" />
              Behavioral Simulation Research
            </Badge>
            <h1 className="mb-6 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Run your first customer insight study before the next big decision.
            </h1>
            <p className="mb-8 max-w-2xl text-xl leading-8 text-slate-300">
              PersonaAI helps research, product, and marketing teams explore how defined audiences may react to concepts, messages, offers, and product decisions — in hours instead of weeks.
            </p>
            <div className="mb-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-6 text-lg font-semibold text-white hover:from-violet-700 hover:to-indigo-700"
                onClick={scrollToInquiry}
              >
                Run Your First Study
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 px-8 py-6 text-lg font-semibold text-white hover:bg-white/10"
                onClick={() => window.open("https://personaresearch.ai", "_blank")}
              >
                View Platform
              </Button>
            </div>
            <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="font-semibold text-white">$25 credits</div>
                <div>for the first approved study path</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="font-semibold text-white">Approval-gated</div>
                <div>reviewed before follow-up or outreach</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="font-semibold text-white">Decision-ready</div>
                <div>built around one concrete research question</div>
              </div>
            </div>
          </div>

          <Card className="border-white/10 bg-white/[0.06] shadow-2xl shadow-violet-950/30 backdrop-blur">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-violet-500/20 p-3">
                  <Brain className="h-7 w-7 text-violet-200" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-white">Example study brief</div>
                  <div className="text-sm text-slate-400">Structured for fast review</div>
                </div>
              </div>
              <div className="space-y-4 text-sm">
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="mb-1 text-slate-400">Question</div>
                  <div className="text-white">Will enterprise insights teams trust this new product claim enough to request a demo?</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="mb-1 text-slate-400">Audience lens</div>
                  <div className="text-white">Research directors, customer insights leads, and product marketers at mid-market SaaS companies.</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="mb-1 text-slate-400">Outputs</div>
                  <div className="text-white">Likely objections, credibility gaps, questions to answer, and strongest message variants.</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="mb-4 text-3xl font-bold">How a study moves from question to insight</h2>
            <p className="mx-auto max-w-3xl text-lg text-slate-400">
              The workflow is designed to keep research useful: start with a decision, model the audience carefully, and treat results as an input to the next validation step.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-4">
            {researchSteps.map((step) => (
              <Card key={step.title} className="border-slate-800 bg-slate-900/60">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15">
                    <step.icon className="h-6 w-6 text-violet-200" />
                  </div>
                  <h3 className="mb-2 font-semibold text-white">{step.title}</h3>
                  <p className="text-sm leading-6 text-slate-400">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950/50 px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
          <div>
            <Badge variant="outline" className="mb-5 border-cyan-500/40 text-cyan-200">Built for enterprise research teams</Badge>
            <h2 className="mb-5 text-3xl font-bold">Use it when speed matters, but rigor still matters too.</h2>
            <p className="mb-6 text-lg leading-8 text-slate-400">
              PersonaAI is best used before expensive fieldwork, before a campaign launch, or before a product team commits to a direction. It helps surface the questions you should ask next.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {useCases.map((useCase) => (
                <div key={useCase} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-300" />
                  {useCase}
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Card className="border-slate-800 bg-slate-900/60">
              <CardContent className="p-6">
                <BarChart3 className="mb-4 h-8 w-8 text-cyan-300" />
                <h3 className="mb-2 font-semibold text-white">Structured outputs</h3>
                <p className="text-sm leading-6 text-slate-400">Compare themes, objections, confidence levels, and segment differences instead of reading one-off chats.</p>
              </CardContent>
            </Card>
            <Card className="border-slate-800 bg-slate-900/60">
              <CardContent className="p-6">
                <ShieldCheck className="mb-4 h-8 w-8 text-emerald-300" />
                <h3 className="mb-2 font-semibold text-white">Clear claim boundaries</h3>
                <p className="text-sm leading-6 text-slate-400">Directional insight for faster decisions, not a replacement for every human validation method.</p>
              </CardContent>
            </Card>
            <Card className="border-slate-800 bg-slate-900/60 sm:col-span-2">
              <CardContent className="p-6">
                <LockKeyhole className="mb-4 h-8 w-8 text-violet-300" />
                <h3 className="mb-2 font-semibold text-white">Approval-gated inquiry capture</h3>
                <p className="text-sm leading-6 text-slate-400">Submissions are saved to the Sparkwave CRM as PersonaAI research inquiries. They are reviewed before any manual follow-up or campaign enrollment.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="run-first-study" className="px-4 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Badge variant="outline" className="mb-5 border-violet-500/50 text-violet-200">Run Your First Study</Badge>
            <h2 className="mb-5 text-3xl font-bold">Request the $25 credit path.</h2>
            <p className="mb-6 text-lg leading-8 text-slate-400">
              Send one concrete research decision. We will review fit, route it to the PersonaAI source of truth in CRM, and confirm the next step before any outreach automation.
            </p>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
              <div className="mb-2 font-semibold text-white">Good first-study questions:</div>
              <ul className="space-y-2">
                <li>• Which message will make a research leader request a demo?</li>
                <li>• What objections will a target segment raise about this offer?</li>
                <li>• Which product concept deserves customer interviews first?</li>
              </ul>
            </div>
          </div>

          <Card className="border-white/10 bg-white/[0.06]">
            <CardContent className="p-6 sm:p-8">
              {submitted ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                    <CheckCircle2 className="h-9 w-9 text-emerald-300" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-white">Inquiry captured for review.</h3>
                  <p className="mx-auto max-w-md text-slate-400">
                    Your request is now in the PersonaAI CRM path. We will review the study fit and confirm the next step before any follow-up.
                  </p>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="name" className="text-slate-200">Name *</Label>
                      <Input id="name" required value={form.name} onChange={(e) => updateForm("name", e.target.value)} className="mt-2 border-white/10 bg-slate-950/60 text-white" />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-slate-200">Work email *</Label>
                      <Input id="email" required type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} className="mt-2 border-white/10 bg-slate-950/60 text-white" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="company" className="text-slate-200">Company</Label>
                      <Input id="company" value={form.company} onChange={(e) => updateForm("company", e.target.value)} className="mt-2 border-white/10 bg-slate-950/60 text-white" />
                    </div>
                    <div>
                      <Label htmlFor="role" className="text-slate-200">Role</Label>
                      <Input id="role" value={form.role} onChange={(e) => updateForm("role", e.target.value)} className="mt-2 border-white/10 bg-slate-950/60 text-white" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-200">Timeline</Label>
                    <Select value={form.timeline} onValueChange={(value) => updateForm("timeline", value)}>
                      <SelectTrigger className="mt-2 border-white/10 bg-slate-950/60 text-white">
                        <SelectValue placeholder="When do you want to run it?" />
                      </SelectTrigger>
                      <SelectContent>
                        {timelineOptions.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="studyGoal" className="text-slate-200">What decision should this study inform? *</Label>
                    <Textarea
                      id="studyGoal"
                      required
                      rows={5}
                      value={form.studyGoal}
                      onChange={(e) => updateForm("studyGoal", e.target.value)}
                      placeholder="Example: We need to know which positioning angle will resonate with enterprise insights directors before launching a campaign."
                      className="mt-2 border-white/10 bg-slate-950/60 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 py-6 text-base font-semibold text-white hover:from-violet-700 hover:to-indigo-700">
                    {loading ? "Submitting..." : "Run Your First Study"}
                    {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
                  </Button>
                  <p className="text-center text-xs leading-5 text-slate-500">
                    Submission creates a PersonaAI inquiry record for review. It does not auto-enroll you in outreach.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
