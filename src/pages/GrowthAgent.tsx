import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent, PageHeader } from "@/components/layout/PageLayout";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Brain, CheckCircle2, Clock3, MessageSquare, ShieldCheck, Sparkles, Target } from "lucide-react";

type Contact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string | null;
  pipeline_stage: string | null;
  last_activity_date: string | null;
  created_at: string;
};

type EmailReply = {
  id: string;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  status: string | null;
  received_at: string | null;
  contact_id: string | null;
};

const promptChips = [
  "Which leads need follow-up today?",
  "Which opportunities are going stale?",
  "Where are we missing response evidence?",
  "What should we improve next?",
] as const;

function formatName(contact: Contact) {
  return [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email || contact.phone || "Unnamed lead";
}

function formatRelative(value: string | null | undefined) {
  if (!value) return "No activity recorded";
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

function isLead(contact: Contact) {
  const statusText = `${contact.status || ""} ${contact.pipeline_stage || ""}`.toLowerCase();
  return ["lead", "new_lead", "qualified", "trial", "opportunity", "consult", "estimate"].some(term => statusText.includes(term));
}

export default function GrowthAgent() {
  const { selectedBusiness } = useBusinessContext();
  const [selectedPrompt, setSelectedPrompt] = useState<(typeof promptChips)[number]>(promptChips[0]);

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["growth-agent-contacts", selectedBusiness?.id],
    queryFn: async () => {
      if (!selectedBusiness?.id) return [];
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, phone, source, status, pipeline_stage, last_activity_date, created_at")
        .eq("business_id", selectedBusiness.id)
        .order("last_activity_date", { ascending: false, nullsFirst: false })
        .limit(500);

      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!selectedBusiness?.id,
  });

  const { data: recentReplies = [] } = useQuery({
    queryKey: ["growth-agent-replies", selectedBusiness?.id],
    queryFn: async () => {
      if (!selectedBusiness?.id) return [];
      const { data, error } = await supabase
        .from("email_replies")
        .select("id, from_email, from_name, subject, status, received_at, contact_id")
        .eq("business_id", selectedBusiness.id)
        .order("received_at", { ascending: false })
        .limit(25);

      if (error) throw error;
      return data as EmailReply[];
    },
    enabled: !!selectedBusiness?.id,
    refetchInterval: 30000,
  });

  const leadContacts = useMemo(() => contacts.filter(isLead), [contacts]);
  const staleLeads = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return leadContacts
      .filter(contact => !contact.last_activity_date || new Date(contact.last_activity_date).getTime() < oneDayAgo)
      .sort((a, b) => {
        const aTime = a.last_activity_date ? new Date(a.last_activity_date).getTime() : 0;
        const bTime = b.last_activity_date ? new Date(b.last_activity_date).getTime() : 0;
        return aTime - bTime;
      })
      .slice(0, 5);
  }, [leadContacts]);

  const missingResponseEvidence = useMemo(() => {
    return leadContacts
      .filter(contact => !contact.last_activity_date)
      .slice(0, 5);
  }, [leadContacts]);

  const answer = useMemo(() => {
    if (selectedPrompt === "Which leads need follow-up today?") {
      return {
        title: "Follow up with the oldest open leads first.",
        summary: staleLeads.length > 0
          ? `${staleLeads.length} lead${staleLeads.length === 1 ? "" : "s"} in this sample need attention based on stale or missing activity.`
          : "No stale lead sample was found for the selected business. Use this as the place to confirm the live lead source is connected.",
        bullets: staleLeads.map(contact => `${formatName(contact)} — ${formatRelative(contact.last_activity_date)} · ${contact.source || "unknown source"}`),
      };
    }

    if (selectedPrompt === "Which opportunities are going stale?") {
      return {
        title: "Stale means no recent touch or no booking signal.",
        summary: staleLeads.length > 0
          ? "These are the records to review before making any live-send claim."
          : "No stale opportunities found in the current sample.",
        bullets: staleLeads.map(contact => `${formatName(contact)} — status: ${contact.status || "unknown"}, stage: ${contact.pipeline_stage || "none"}`),
      };
    }

    if (selectedPrompt === "Where are we missing response evidence?") {
      return {
        title: "Response evidence should be visible before the demo claims automation is working.",
        summary: missingResponseEvidence.length > 0
          ? `${missingResponseEvidence.length} lead${missingResponseEvidence.length === 1 ? "" : "s"} have no recorded last activity date in the current sample.`
          : "No missing-response rows found in the current sample.",
        bullets: missingResponseEvidence.map(contact => `${formatName(contact)} — created ${formatRelative(contact.created_at)}`),
      };
    }

    return {
      title: "Improve the demo by tightening the handoff path.",
      summary: "The next product work should make every lead show a source, first response evidence, next action, and booking or human-review signal.",
      bullets: [
        "Generalize Speed-to-Lead beyond the FightFlow proof case.",
        "Keep Business Brain recommendations evidence-bound.",
        "Add approved prompt chips before enabling live customer-facing actions.",
        `${recentReplies.length} recent inbound repl${recentReplies.length === 1 ? "y" : "ies"} are available as review signals.`,
      ],
    };
  }, [missingResponseEvidence, recentReplies.length, selectedPrompt, staleLeads]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Ask Your Growth Agent"
        description="A demo-safe assistant surface for lead follow-up, stale opportunities, and next actions. It summarizes available signals; it does not take live customer-facing action."
      />
      <PageContent>
        <div className="space-y-6">
          <section className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-950 via-indigo-900 to-cyan-800 p-6 text-white shadow-xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-indigo-100">
                  <Bot className="h-4 w-4" /> Growth Agent demo surface
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Ask plain-English questions about growth.</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-indigo-100">
                  This page makes the “AI assistant” part of the demo concrete without overclaiming. It reads lead records and reply signals, then gives a simple next-action answer.
                </p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-indigo-50">
                <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Guardrail</div>
                <p className="mt-2">Drafts, recommendations, and approved handoffs only. Do not imply live sends or autonomous customer actions without approval.</p>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between"><Target className="h-5 w-5 text-indigo-600" /><Badge>Lead sample</Badge></div>
                <div className="mt-3 text-2xl font-bold">{leadContacts.length.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">lead-stage records detected</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between"><Clock3 className="h-5 w-5 text-amber-600" /><Badge variant="outline">Attention</Badge></div>
                <div className="mt-3 text-2xl font-bold">{staleLeads.length.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">stale/missing activity sample</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between"><MessageSquare className="h-5 w-5 text-emerald-600" /><Badge variant="secondary">Replies</Badge></div>
                <div className="mt-3 text-2xl font-bold">{recentReplies.length.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">recent inbound reply signals</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-indigo-600" /> Prompt chips</CardTitle>
                <CardDescription>Use these in the demo instead of asking open-ended questions the system is not ready to answer.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {promptChips.map(prompt => (
                  <Button
                    key={prompt}
                    variant={selectedPrompt === prompt ? "default" : "outline"}
                    className="h-auto w-full justify-start whitespace-normal py-3 text-left"
                    onClick={() => setSelectedPrompt(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-cyan-600" /> Growth Agent answer</CardTitle>
                <CardDescription>{selectedPrompt}</CardDescription>
              </CardHeader>
              <CardContent>
                {contactsLoading ? (
                  <div className="py-10 text-center text-muted-foreground">Loading lead signals...</div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
                      <h3 className="font-semibold text-cyan-950">{answer.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-cyan-900">{answer.summary}</p>
                    </div>
                    <div className="space-y-2">
                      {answer.bullets.length > 0 ? answer.bullets.map(item => (
                        <div key={item} className="flex items-start gap-2 rounded-lg border bg-white p-3 text-sm text-slate-700">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span>{item}</span>
                        </div>
                      )) : (
                        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                          No matching rows in the current sample. Connect or select a business with live lead activity to populate this answer.
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button asChild>
                        <Link to="/crm">Open Lead Dashboard</Link>
                      </Button>
                      <Button asChild variant="outline">
                        <Link to="/communications">Review communications</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </DashboardLayout>
  );
}
