import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { AlertCircle, Bot, CheckCircle2, Clock, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  GROWTH_AGENT_ACTION_CONFIGS,
  GrowthAgentActionType,
  buildGrowthAgentPayload,
  getGrowthAgentActionConfig,
  statusTone,
  summarizeGrowthAgentStatus,
} from '@/lib/growth-agent';

type GrowthAgentActionRow = {
  id: string;
  action_type: string;
  status: string;
  approval_required?: boolean | null;
  payload?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  result_markdown?: string | null;
  proposed_actions?: unknown[] | Record<string, unknown> | null;
  error_message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
};

type GrowthAgentEventRow = {
  id: string;
  action_id: string;
  event_type: string;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

type GrowthAgentSupabaseError = { message?: string } | null;

type GrowthAgentQueryBuilder = {
  select: (columns: string) => GrowthAgentQueryBuilder;
  eq: (column: string, value: string) => GrowthAgentQueryBuilder;
  order: (column: string, options: { ascending: boolean }) => GrowthAgentQueryBuilder;
  limit: (count: number) => Promise<{ data: unknown; error: GrowthAgentSupabaseError }>;
};

type GrowthAgentSupabaseClient = {
  from: (table: 'growth_agent_actions' | 'growth_agent_action_events') => GrowthAgentQueryBuilder;
  functions: {
    invoke: (name: 'growth-agent-enqueue', options: { body: unknown }) => Promise<{ data: unknown; error: GrowthAgentSupabaseError }>;
  };
};

const growthAgentSupabase = supabase as unknown as GrowthAgentSupabaseClient;

const initialFields: Record<string, string> = {
  audience: '',
  offer: '',
  channel: '',
  tone: '',
  budget_range: '',
  constraints: '',
  record_ids: '',
};

export default function GrowthAgent() {
  const { user, loading: authLoading, isAuthenticated } = useAuthContext();
  const { selectedBusiness } = useBusinessContext();
  const [actionType, setActionType] = useState<GrowthAgentActionType>('growth_brief.generate');
  const [goal, setGoal] = useState('');
  const [context, setContext] = useState('');
  const [fields, setFields] = useState(initialFields);
  const [actions, setActions] = useState<GrowthAgentActionRow[]>([]);
  const [events, setEvents] = useState<GrowthAgentEventRow[]>([]);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const selectedConfig = getGrowthAgentActionConfig(actionType) ?? GROWTH_AGENT_ACTION_CONFIGS[0];
  const selectedAction = useMemo(
    () => actions.find((action) => action.id === selectedActionId) ?? actions[0] ?? null,
    [actions, selectedActionId],
  );

  const loadActions = useCallback(async () => {
    if (!user?.id || !selectedBusiness?.id) return;

    setIsLoadingActions(true);
    setErrorMessage(null);

    const { data, error } = await growthAgentSupabase
      .from('growth_agent_actions')
      .select('id, action_type, status, approval_required, payload, result, result_markdown, proposed_actions, error_message, created_at, updated_at, completed_at')
      .eq('business_id', selectedBusiness.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      setErrorMessage(error.message ?? 'Unable to load Growth Agent actions.');
    } else {
      const rows = (data ?? []) as GrowthAgentActionRow[];
      setActions(rows);
      setSelectedActionId((current) => current ?? rows[0]?.id ?? null);
    }

    setIsLoadingActions(false);
  }, [selectedBusiness?.id, user?.id]);

  const loadEvents = useCallback(async (actionId: string | null) => {
    if (!actionId) {
      setEvents([]);
      return;
    }

    const { data, error } = await growthAgentSupabase
      .from('growth_agent_action_events')
      .select('id, action_id, event_type, message, metadata, created_at')
      .eq('action_id', actionId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      setErrorMessage(error.message ?? 'Unable to load Growth Agent events.');
    } else {
      setEvents((data ?? []) as GrowthAgentEventRow[]);
    }
  }, []);

  useEffect(() => {
    void loadActions();
  }, [loadActions]);

  useEffect(() => {
    void loadEvents(selectedAction?.id ?? null);
  }, [loadEvents, selectedAction?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const interval = window.setInterval(() => {
      void loadActions();
      void loadEvents(selectedAction?.id ?? null);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadActions, loadEvents, selectedAction?.id, user?.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.id) {
      setErrorMessage('Sign in before enqueueing a Growth Agent draft.');
      return;
    }

    if (!selectedBusiness?.id) {
      setErrorMessage('Choose a business before enqueueing a Growth Agent draft.');
      return;
    }

    if (!goal.trim()) {
      setErrorMessage('Add a goal so the Growth Agent has a safe, bounded task.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSubmitMessage(null);

    const body = buildGrowthAgentPayload({
      actionType,
      userId: user.id,
      businessId: selectedBusiness.id,
      goal,
      context,
      fields,
    });

    const { data, error } = await growthAgentSupabase.functions.invoke('growth-agent-enqueue', { body });

    if (error) {
      setErrorMessage(error.message ?? 'Unable to enqueue Growth Agent draft.');
    } else {
      const actionId = getEnqueuedActionId(data);
      setSubmitMessage('Draft action queued. Hermes will only return drafts/recommendations in this phase.');
      setGoal('');
      setContext('');
      setFields(initialFields);
      await loadActions();
      if (actionId) {
        setSelectedActionId(actionId);
        await loadEvents(actionId);
      }
    }

    setIsSubmitting(false);
  }

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
        <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading Growth Agent auth state...
        </div>
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
        <div className="mx-auto max-w-5xl">
          <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-100">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Sign in required</AlertTitle>
            <AlertDescription>
              Growth Agent actions are stored in user-scoped Supabase rows. Sign in to enqueue drafts and view results.
            </AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="space-y-6">
          <div>
            <Badge variant="outline" className="border-cyan-400/40 text-cyan-200">Hermes queue MVP</Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Growth Agent</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Enqueue safe phase-1 draft actions through Supabase. The browser never receives Hermes or service-role secrets.
            </p>
          </div>

          <Alert className="border-cyan-500/40 bg-cyan-500/10 text-cyan-50">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Draft/approval-only boundary</AlertTitle>
            <AlertDescription>
              Phase 1 can draft briefs, outreach, campaign ideas, and record summaries. CRM/contact/billing/message mutations stay disabled until a later explicit approval flow.
            </AlertDescription>
          </Alert>

          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-cyan-300" /> New draft action</CardTitle>
              <CardDescription className="text-slate-400">Calls supabase.functions.invoke('growth-agent-enqueue') with a draft-only payload.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="action-type">Safe action type</Label>
                  <select
                    id="action-type"
                    value={actionType}
                    onChange={(event) => setActionType(event.target.value as GrowthAgentActionType)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  >
                    {GROWTH_AGENT_ACTION_CONFIGS.map((config) => (
                      <option key={config.type} value={config.type}>{config.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400">{selectedConfig.description}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal">Goal</Label>
                  <Textarea
                    id="goal"
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    placeholder="Example: Draft a friendly follow-up for a lead who asked about Tuesday availability."
                    className="min-h-24 border-slate-700 bg-slate-950"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="context">Visible context/snippets</Label>
                  <Textarea
                    id="context"
                    value={context}
                    onChange={(event) => setContext(event.target.value)}
                    placeholder="Paste only context the signed-in user can already view."
                    className="min-h-24 border-slate-700 bg-slate-950"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {selectedConfig.fields.map((field) => (
                    <div className="space-y-2" key={field}>
                      <Label htmlFor={field}>{formatFieldLabel(field)}</Label>
                      <Input
                        id={field}
                        value={fields[field] ?? ''}
                        onChange={(event) => setFields((current) => ({ ...current, [field]: event.target.value }))}
                        className="border-slate-700 bg-slate-950"
                      />
                    </div>
                  ))}
                </div>

                {errorMessage && (
                  <Alert className="border-red-500/40 bg-red-500/10 text-red-100">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Growth Agent error</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}

                {submitMessage && (
                  <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-100">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Queued</AlertTitle>
                    <AlertDescription>{submitMessage}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={isSubmitting} className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                  Enqueue draft action
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Queue status</CardTitle>
                <CardDescription className="text-slate-400">Queued, processing, completed, and failed rows scoped to your user.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => void loadActions()} disabled={isLoadingActions} className="border-slate-700">
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingActions ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {actions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-700 p-6 text-sm text-slate-400">
                  No Growth Agent actions yet. Submit a draft action to create the first queue row.
                </div>
              ) : (
                actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => setSelectedActionId(action.id)}
                    className={`w-full rounded-lg border p-4 text-left transition hover:border-cyan-400/60 ${selectedAction?.id === action.id ? 'border-cyan-400/70 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/60'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{getGrowthAgentActionConfig(action.action_type)?.label ?? action.action_type}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatDate(action.created_at)}</p>
                      </div>
                      <Badge variant={statusTone(action.status)}>{action.status}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{summarizeGrowthAgentStatus(action.status)}</p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader>
              <CardTitle>Result and timeline</CardTitle>
              <CardDescription className="text-slate-400">Worker events, markdown artifact, and proposed side effects stay review-only.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!selectedAction ? (
                <p className="text-sm text-slate-400">Select or enqueue an action to view details.</p>
              ) : (
                <>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{getGrowthAgentActionConfig(selectedAction.action_type)?.label ?? selectedAction.action_type}</p>
                        <p className="text-xs text-slate-400">{selectedAction.id}</p>
                      </div>
                      <Badge variant={statusTone(selectedAction.status)}>{selectedAction.status}</Badge>
                    </div>
                    {selectedAction.error_message && <p className="mt-3 text-sm text-red-300">{selectedAction.error_message}</p>}
                  </div>

                  <div>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Event timeline</h2>
                    {events.length === 0 ? (
                      <p className="rounded-lg border border-slate-800 p-4 text-sm text-slate-400">No events have been written yet.</p>
                    ) : (
                      <ol className="space-y-3">
                        {events.map((event) => (
                          <li key={event.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <Badge variant="outline" className="border-slate-600">{event.event_type}</Badge>
                              <span className="text-xs text-slate-500">{formatDate(event.created_at)}</span>
                            </div>
                            {event.message && <p className="mt-2 text-sm text-slate-300">{event.message}</p>}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>

                  <div>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Result markdown</h2>
                    {selectedAction.result_markdown ? (
                      <div className="prose prose-invert max-w-none rounded-lg border border-slate-800 bg-slate-950/60 p-4 prose-headings:text-slate-100 prose-a:text-cyan-300">
                        <ReactMarkdown>{selectedAction.result_markdown}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="rounded-lg border border-slate-800 p-4 text-sm text-slate-400">No markdown result yet.</p>
                    )}
                  </div>

                  <div>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Proposed side effects</h2>
                    <ProposedActions proposedActions={selectedAction.proposed_actions} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function getEnqueuedActionId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;

  const record = data as Record<string, unknown>;
  if (typeof record.id === 'string') return record.id;
  if (typeof record.action_id === 'string') return record.action_id;

  if (record.action && typeof record.action === 'object') {
    const action = record.action as Record<string, unknown>;
    if (typeof action.id === 'string') return action.id;
  }

  return null;
}

function ProposedActions({ proposedActions }: { proposedActions: GrowthAgentActionRow['proposed_actions'] }) {
  const proposals = Array.isArray(proposedActions)
    ? proposedActions
    : proposedActions
      ? [proposedActions]
      : [];

  if (proposals.length === 0) {
    return (
      <p className="rounded-lg border border-slate-800 p-4 text-sm text-slate-400">
        No proposed side effects. If Hermes suggests one later, it will appear here as approval-only and will not be applied from this panel.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {proposals.map((proposal, index) => (
        <div key={index} className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-amber-100">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-sm font-medium">Draft proposal only — explicit approval required</span>
          </div>
          <pre className="overflow-auto whitespace-pre-wrap rounded bg-slate-950/80 p-3 text-xs text-slate-200">
            {JSON.stringify(proposal, null, 2)}
          </pre>
          <Button type="button" variant="outline" disabled className="mt-3 border-amber-400/40 text-amber-100">
            Approval flow not enabled in phase 1
          </Button>
        </div>
      ))}
    </div>
  );
}

function formatFieldLabel(field: string): string {
  return field.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null): string {
  if (!value) return 'No timestamp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
