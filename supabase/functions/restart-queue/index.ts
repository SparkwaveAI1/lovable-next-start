import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * restart-queue
 * 
 * Triggers queue processing by:
 * 1. Finding available (unblocked) tasks
 * 2. Logging a "queue_restarted" activity
 * 3. Returning available tasks for UI display
 * 
 * Called from Mission Control "Restart Queue" button.
 */

// Phrases that indicate a task needs human action
const HUMAN_BLOCKED_PHRASES = [
  'fund anthropic',
  'provide linkedin',
  'set up stripe',
  'run discovery call',
  'needs human',
  'manual intervention',
  'waiting on scott',
  'decision needed'
];

const TITLE_BLOCKS = [
  'record',
  'provide access',
  'close first',
  'negotiate',
  'discovery call',
  'decide'
];

// Task prefixes -> agent routing
const AGENT_ROUTES: Record<string, string> = {
  'RS-': 'Rico-Sales',
  'AUTO-': 'Rico-Automation',
  'MKT-': 'Rico-Marketing',
  'DOC-': 'Rico-Documentation',
  'TW-': 'Rico-Twitter',
  'AUDIT-': 'Rico-Audit',
  'WEB-': 'Rico-Main',
  'LP-': 'Rico-Main',
  'LOG-': 'Rico-Automation',
  'COMM-': 'Rico-Automation',
  'MC-': 'Rico-Automation'
};

interface Task {
  id: string;
  title: string;
  description?: string;
  external_id?: string;
  status: string;
  priority?: string;
}

function isBlocked(task: Task): boolean {
  const text = ((task.title || '') + ' ' + (task.description || '')).toLowerCase();
  const titleLower = (task.title || '').toLowerCase();
  
  if (HUMAN_BLOCKED_PHRASES.some(phrase => text.includes(phrase))) return true;
  if (TITLE_BLOCKS.some(word => titleLower.includes(word))) return true;
  
  return false;
}

function getAgent(task: Task): string {
  const id = task.external_id || '';
  for (const [prefix, agent] of Object.entries(AGENT_ROUTES)) {
    if (id.startsWith(prefix)) return agent;
  }
  return 'Rico-Main';
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get inbox and assigned tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('mc_tasks')
      .select('*')
      .in('status', ['inbox', 'assigned'])
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(30);

    if (tasksError) throw tasksError;

    const available: Array<Task & { agent: string }> = [];
    const blocked: Task[] = [];

    for (const task of (tasks || []) as Task[]) {
      if (isBlocked(task)) {
        blocked.push(task);
      } else {
        available.push({
          ...task,
          agent: getAgent(task)
        });
      }
    }

    // Log activity that queue was restarted
    await supabase.from('mc_activities').insert({
      type: 'queue_restarted',
      agent_id: null,
      message: `Queue restarted: ${available.length} available, ${blocked.length} blocked`,
      metadata: {
        available_count: available.length,
        blocked_count: blocked.length,
        triggered_by: 'dashboard'
      }
    });

    // Return summary for UI
    return new Response(JSON.stringify({
      success: true,
      available_count: available.length,
      blocked_count: blocked.length,
      tasks: available.slice(0, 10).map(t => ({
        id: t.id,
        external_id: t.external_id,
        title: t.title,
        agent: t.agent,
        priority: t.priority || 'medium'
      })),
      message: available.length > 0 
        ? `${available.length} task${available.length !== 1 ? 's' : ''} ready to process`
        : 'No actionable tasks in queue'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in restart-queue:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: (error as Error).message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
