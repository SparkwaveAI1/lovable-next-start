import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import { AgentCard, StatsBar, RicoChat, ScottsActionItems, AgentActivityMonitor, HealthDashboard, AnalyticsMonitor, AddTaskDialog, EditTaskDialog, QualityDashboard } from "@/components/mission-control";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { useBusinesses } from "@/hooks/useBusinesses";
import { supabase } from "@/integrations/supabase/client";
import type { Agent, Task, TaskStatus } from "@/types/mission-control";
import { RefreshCw, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ALL_BUSINESSES_ID } from "@/components/BusinessSwitcher";

export default function MissionControl() {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();
  const { toast } = useToast();
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [editTaskDialogOpen, setEditTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Fetch data from Supabase mc_ tables, filtered by selected business
  // Global agents (scope='global') are always included regardless of business selection
  // If "All Businesses" is selected, show everything
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const isAll = selectedBusiness?.id === ALL_BUSINESSES_ID;
    const businessId = (!isAll && selectedBusiness?.id) ? selectedBusiness.id : null;
    
    try {
      // Fetch agents: global agents + business-specific agents
      let agentsQuery = supabase
        .from('mc_agents')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (isAll) {
        // "All" selected: get all agents
        // No filter needed
      } else if (businessId) {
        // Specific business: get global agents OR agents for this business
        agentsQuery = agentsQuery.or(`scope.eq.global,business_id.eq.${businessId}`);
      } else {
        // No business selected: only global agents
        agentsQuery = agentsQuery.eq('scope', 'global');
      }
      
      const { data: agentsData, error: agentsError } = await agentsQuery;
      if (agentsError) throw agentsError;

      // Fetch recent agent_logs to derive live status
      const { data: agentLogsData } = await supabase
        .from('agent_logs')
        .select('agent, event_type, status, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      // Derive agent status: "working" if log entry in last 30 min, "idle" otherwise
      const now = new Date();
      const activeThresholdMs = 30 * 60 * 1000; // 30 min

      const agentLastSeen: Record<string, Date> = {};
      for (const log of agentLogsData ?? []) {
        const agentKey = (log.agent ?? '').toLowerCase();
        if (agentKey && !agentLastSeen[agentKey]) {
          agentLastSeen[agentKey] = new Date(log.created_at);
        }
      }

      const agentsWithLiveStatus = (agentsData ?? []).map((agent: any) => {
        const lastSeen = agentLastSeen[agent.name.toLowerCase()];
        const isRecentlyActive = lastSeen && (now.getTime() - lastSeen.getTime()) < activeThresholdMs;
        return {
          ...agent,
          status: isRecentlyActive ? 'working' : 'idle',
          last_active: lastSeen?.toISOString() ?? agent.last_active ?? null,
        };
      });

      // Fetch ALL tasks (always global for Scott's To-Do)
      // Kanban will filter client-side by business
      const { data: tasksData, error: tasksError } = await supabase
        .from('mc_tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (tasksError) throw tasksError;
      
    } catch (err) {
      console.error('Error fetching Mission Control data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBusiness?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time subscriptions
  // Listen for global agents + business-specific data
  useEffect(() => {
    const isAll = selectedBusiness?.id === ALL_BUSINESSES_ID;
    const businessId = (!isAll && selectedBusiness?.id) ? selectedBusiness.id : null;
    const channelSuffix = isAll ? 'all' : (businessId || 'global');

    // Subscribe to global agents (always)
    // Note: Subscriptions may fail silently if Realtime is not enabled on Supabase project
    const globalAgentsChannel = supabase
      .channel(`mc_agents_global_${channelSuffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mc_agents', filter: `scope=eq.global` },
        (payload) => {
          if (payload.eventType === 'INSERT') setAgents(prev => [...prev, payload.new as Agent]);
          else if (payload.eventType === 'UPDATE') setAgents(prev => prev.map(a => a.id === (payload.new as Agent).id ? payload.new as Agent : a));
          else if (payload.eventType === 'DELETE') setAgents(prev => prev.filter(a => a.id !== (payload.old as Agent).id));
        }
      ).subscribe((status, err) => {
        if (err) {
          console.warn('Realtime subscription error (global agents):', err.message);
        }
      });

    // Subscribe to business-specific agents (if business selected, or all agents if "All" selected)
    let businessAgentsChannel: ReturnType<typeof supabase.channel> | null = null;
    if (isAll) {
      // "All" mode: subscribe to ALL agent changes
      businessAgentsChannel = supabase
        .channel(`mc_agents_all`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mc_agents' },
          (payload) => {
            const agent = payload.new as Agent;
            // Skip global agents (handled by global channel)
            if ((agent as any).scope === 'global') return;
            if (payload.eventType === 'INSERT') setAgents(prev => [...prev, agent]);
            else if (payload.eventType === 'UPDATE') setAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
            else if (payload.eventType === 'DELETE') setAgents(prev => prev.filter(a => a.id !== (payload.old as Agent).id));
          }
        ).subscribe((status, err) => {
          if (err) console.warn('Realtime subscription error (all agents):', err.message);
        });
    } else if (businessId) {
      businessAgentsChannel = supabase
        .channel(`mc_agents_business_${businessId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mc_agents', filter: `business_id=eq.${businessId}` },
          (payload) => {
            const agent = payload.new as Agent;
            // Skip global agents (handled by global channel)
            if ((agent as any).scope === 'global') return;
            if (payload.eventType === 'INSERT') setAgents(prev => [...prev, agent]);
            else if (payload.eventType === 'UPDATE') setAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
            else if (payload.eventType === 'DELETE') setAgents(prev => prev.filter(a => a.id !== (payload.old as Agent).id));
          }
        ).subscribe((status, err) => {
          if (err) console.warn('Realtime subscription error (business agents):', err.message);
        });
    }

    // Subscribe to tasks (filter by business if selected, or all if "All")
    const tasksChannel = supabase
      .channel(`mc_tasks_changes_${channelSuffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mc_tasks', filter: businessId ? `business_id=eq.${businessId}` : undefined },
        (payload) => {
          // Skip if business-filtered and doesn't match (not needed for "All" mode)
          if (businessId && (payload.new as any)?.business_id !== businessId) return;
          if (payload.eventType === 'INSERT') setTasks(prev => [payload.new as Task, ...prev]);
          else if (payload.eventType === 'UPDATE') setTasks(prev => prev.map(t => t.id === (payload.new as Task).id ? payload.new as Task : t));
          else if (payload.eventType === 'DELETE') setTasks(prev => prev.filter(t => t.id !== (payload.old as Task).id));
        }
      ).subscribe((status, err) => {
        if (err) console.warn('Realtime subscription error (tasks):', err.message);
      });

    // Subscribe to ALL activities (always global - Scott wants to see everything)
    };
  }, [selectedBusiness?.id]);

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const oldStatus = task.status;
    
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t
    ));

    try {
      const { error: updateError } = await supabase
        .from('mc_tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId);
      if (updateError) throw updateError;

      await supabase.from('mc_activities').insert({
        type: 'status_changed',
        agent_id: agents[0]?.id || null,
        task_id: taskId,
        message: `Moved "${task.title}" from ${oldStatus.replace('_', ' ')} to ${newStatus.replace('_', ' ')}`,
        metadata: { from: oldStatus, to: newStatus },
        business_id: selectedBusiness?.id || null
      });

      toast({ title: "Task updated", description: `Moved to ${newStatus.replace('_', ' ')}` });
    } catch (err) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: oldStatus } : t));
      toast({ title: "Failed to update task", description: err instanceof Error ? err.message : 'Unknown error', variant: "destructive" });
    }
  };

  const handleTaskClick = (task: Task) => console.log("Task clicked:", task);
  const handleAgentClick = (agent: Agent) => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent);
  
  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
    setEditTaskDialogOpen(true);
  };

  const handleTaskDelete = async (taskId: string) => {
    // This is called for legacy compatibility
    // The actual deletion is now handled directly in TaskCard
    console.log('Task deleted:', taskId);
  };
  
  const handleTaskDeleteComplete = async () => {
    // Refresh data after successful deletion
    await fetchData();
  };

  const handleTaskReorder = async (taskId: string, newIndex: number, status: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      // Log the reorder activity
      await supabase.from('mc_activities').insert({
        type: 'task_updated',
        agent_id: agents[0]?.id || null,
        task_id: taskId,
        message: `Reordered "${task.title}" within ${status.replace('_', ' ')}`,
        metadata: { 
          action: 'reorder',
          status: status,
          newIndex: newIndex,
          source: 'mission-control-ui'
        },
        business_id: selectedBusiness?.id || null
      });

      // Update the task's updated_at to reflect the change
      await supabase
        .from('mc_tasks')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', taskId);

      toast({ 
        title: "Task reordered", 
        description: `"${task.title}" position updated` 
      });
      
      // Refresh data to reflect changes
      await fetchData();
    } catch (err) {
      console.error('Failed to reorder task:', err);
      toast({ 
        title: "Failed to reorder task", 
        description: err instanceof Error ? err.message : 'Unknown error', 
        variant: "destructive" 
      });
    }
  };

  // Check if "All Businesses" is selected
  const isAllBusinessesSelected = selectedBusiness?.id === ALL_BUSINESSES_ID;

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={(id) => {
        if (id === ALL_BUSINESSES_ID) {
          // Set a special "all" business selection
          setSelectedBusiness({ id: ALL_BUSINESSES_ID, name: "All Businesses" } as any);
        } else {
          const business = businesses.find(b => b.id === id);
          if (business) {
            setSelectedBusiness(business);
          } else {
            console.error('Business not found:', id, 'Available:', businesses.map(b => b.id));
            // Still update UI with minimal data so it doesn't silently fail
            setSelectedBusiness({ id, name: 'Unknown', slug: '' } as any);
          }
        }
      }}
      businessName={isAllBusinessesSelected ? "All Businesses" : selectedBusiness?.name}
      showAllOption={true}
    >
      <PageContent>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Mission Control</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Coordinate agents and track task progress</p>
          </div>
          <button
            onClick={() => fetchData()}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <p className="font-medium">Failed to load data</p>
            <p className="text-sm mt-1">{error}</p>
            <button onClick={() => fetchData()} className="mt-2 text-sm underline hover:no-underline">Try again</button>
          </div>
        )}

        {/* 1. Agent Activity + Scott's To-Do (top, side by side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <AgentActivityMonitor
            agents={agents.map(a => ({ id: a.id, name: a.name, status: a.status, role: a.role, last_active: (a as any).last_active ?? null }))}
          />

          <ScottsActionItems
            tasks={tasks}
            onTaskClick={handleTaskClick}
          />
        </div>

        {/* 2. Task Board (full width) — project/owner/priority kanban */}
        <div className="mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
          </div>
        </div>

        <div className="mb-6 bg-white rounded-xl border border-slate-200">
        </div>

        {/* 4. System Health Dashboard + Analytics Monitor (side by side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <HealthDashboard />
          <AnalyticsMonitor />
        </div>

        {/* 5. Quality Dashboard (full width) */}
        <div className="mb-6">
          <QualityDashboard
            businessId={isAllBusinessesSelected ? null : (selectedBusiness?.id || null)}
          />
        </div>

        {/* Add Task Dialog */}
        <AddTaskDialog
          open={addTaskDialogOpen}
          onOpenChange={setAddTaskDialogOpen}
          businessId={isAllBusinessesSelected ? null : (selectedBusiness?.id || null)}
          onTaskCreated={() => fetchData()}
        />

        {/* Edit Task Dialog */}
        <EditTaskDialog
          open={editTaskDialogOpen}
          onOpenChange={setEditTaskDialogOpen}
          task={editingTask}
          onTaskUpdated={() => fetchData()}
          onTaskDeleted={() => fetchData()}
        />

      </PageContent>
    </DashboardLayout>
  );
}
// Build: 1770303228
