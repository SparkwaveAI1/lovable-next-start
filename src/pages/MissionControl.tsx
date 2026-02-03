import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import { 
  KanbanBoard, 
  RicoChat, 
  RicoChatModal, 
  AgentList, 
  AgentActivityMonitor 
} from "@/components/mission-control";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { useBusinesses } from "@/hooks/useBusinesses";
import { supabase } from "@/integrations/supabase/client";
import type { Agent, Task, Activity, TaskStatus } from "@/types/mission-control";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function MissionControl() {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();
  const { toast } = useToast();
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Chat state
  const [chatExpanded, setChatExpanded] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  // Fetch data from Supabase mc_ tables, filtered by selected business
  const fetchData = useCallback(async () => {
    if (!selectedBusiness?.id) {
      setAgents([]);
      setTasks([]);
      setActivities([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Fetch agents from mc_agents filtered by business
      const { data: agentsData, error: agentsError } = await supabase
        .from('mc_agents')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .order('created_at', { ascending: true });
      
      if (agentsError) throw agentsError;
      
      // Fetch tasks from mc_tasks filtered by business
      const { data: tasksData, error: tasksError } = await supabase
        .from('mc_tasks')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .order('created_at', { ascending: false });
      
      if (tasksError) throw tasksError;
      
      // Fetch activities from mc_activities filtered by business
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('mc_activities')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (activitiesError) throw activitiesError;
      
      // Cast to our TypeScript types (mc_ tables match mission-control types)
      setAgents((agentsData as unknown as Agent[]) || []);
      setTasks((tasksData as unknown as Task[]) || []);
      setActivities((activitiesData as unknown as Activity[]) || []);
    } catch (err) {
      console.error('Error fetching Mission Control data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBusiness?.id]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time subscriptions for live updates (filtered by business)
  useEffect(() => {
    if (!selectedBusiness?.id) return;

    const businessId = selectedBusiness.id;

    // Subscribe to mc_agents changes for this business
    const agentsChannel = supabase
      .channel(`mc_agents_changes_${businessId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mc_agents', filter: `business_id=eq.${businessId}` },
        (payload) => {
          console.log('Agent change:', payload);
          if (payload.eventType === 'INSERT') {
            setAgents(prev => [...prev, payload.new as Agent]);
          } else if (payload.eventType === 'UPDATE') {
            setAgents(prev => prev.map(a => 
              a.id === (payload.new as Agent).id ? payload.new as Agent : a
            ));
          } else if (payload.eventType === 'DELETE') {
            setAgents(prev => prev.filter(a => a.id !== (payload.old as Agent).id));
          }
        }
      )
      .subscribe();

    // Subscribe to mc_tasks changes for this business
    const tasksChannel = supabase
      .channel(`mc_tasks_changes_${businessId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mc_tasks', filter: `business_id=eq.${businessId}` },
        (payload) => {
          console.log('Task change:', payload);
          if (payload.eventType === 'INSERT') {
            setTasks(prev => [payload.new as Task, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t => 
              t.id === (payload.new as Task).id ? payload.new as Task : t
            ));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== (payload.old as Task).id));
          }
        }
      )
      .subscribe();

    // Subscribe to mc_activities changes for this business
    const activitiesChannel = supabase
      .channel(`mc_activities_changes_${businessId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mc_activities', filter: `business_id=eq.${businessId}` },
        (payload) => {
          console.log('Activity change:', payload);
          if (payload.eventType === 'INSERT') {
            // Add new activity at the top, keep only 50
            setActivities(prev => [payload.new as Activity, ...prev].slice(0, 50));
          } else if (payload.eventType === 'UPDATE') {
            setActivities(prev => prev.map(a => 
              a.id === (payload.new as Activity).id ? payload.new as Activity : a
            ));
          } else if (payload.eventType === 'DELETE') {
            setActivities(prev => prev.filter(a => a.id !== (payload.old as Activity).id));
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount or business change
    return () => {
      supabase.removeChannel(agentsChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(activitiesChannel);
    };
  }, [selectedBusiness?.id]);

  // Handle task status change via drag-drop
  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const oldStatus = task.status;
    
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t
    ));

    try {
      const { error: updateError } = await supabase
        .from('mc_tasks')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      // Log activity for the status change
      const { error: activityError } = await supabase
        .from('mc_activities')
        .insert({
          type: 'status_changed',
          agent_id: agents[0]?.id || null, // Use first agent or null
          task_id: taskId,
          message: `Moved "${task.title}" from ${oldStatus.replace('_', ' ')} to ${newStatus.replace('_', ' ')}`,
          metadata: { from: oldStatus, to: newStatus },
          business_id: selectedBusiness?.id || null
        });

      if (activityError) {
        console.error('Failed to log activity:', activityError);
      }

      toast({
        title: "Task updated",
        description: `Moved to ${newStatus.replace('_', ' ')}`,
      });
    } catch (err) {
      console.error('Failed to update task status:', err);
      
      // Revert optimistic update
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: oldStatus } : t
      ));

      toast({
        title: "Failed to update task",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  // Refresh handler
  const refreshData = async () => {
    await fetchData();
  };

  const handleTaskClick = (task: Task) => {
    console.log("Task clicked:", task);
    // TODO: Open task detail modal
  };

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(selectedAgent?.id === agent.id ? null : agent);
  };

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={(id) => {
        const business = businesses.find(b => b.id === id);
        if (business) setSelectedBusiness(business);
      }}
      businessName={selectedBusiness?.name}
    >
      <PageContent>
        {/* Page Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mission Control</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Coordinate agents and track task progress
            </p>
          </div>
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <p className="font-medium">Failed to load data</p>
            <p className="text-sm mt-1">{error}</p>
            <button 
              onClick={refreshData}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* LAYOUT: Simple flexbox with explicit heights */}
        <div className="h-[calc(100vh-140px)] flex flex-col gap-4 overflow-hidden">
          
          {/* RICO CHAT - fixed height, collapsible */}
          <div className={`${chatCollapsed ? 'h-12' : 'h-[280px]'} shrink-0 transition-all duration-300`}>
            <RicoChat 
              className="h-full"
              isCollapsed={chatCollapsed}
              onToggleCollapse={() => setChatCollapsed(!chatCollapsed)}
              onExpand={() => setChatExpanded(true)}
            />
          </div>

          {/* KANBAN - fills remaining space, min 250px */}
          <div className="flex-1 min-h-[250px] bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="shrink-0 p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-sm text-slate-900">Task Board</h3>
                  {selectedAgent && (
                    <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full">
                      Filtering: {selectedAgent.name}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  {tasks.length} tasks total
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <KanbanBoard
                tasks={selectedAgent ? tasks.filter(t => t.assignee_ids.includes(selectedAgent.id)) : tasks}
                agents={agents}
                onTaskClick={handleTaskClick}
                onTaskStatusChange={handleTaskStatusChange}
              />
            </div>
          </div>

          {/* BOTTOM - fixed height */}
          <div className="h-[220px] shrink-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Agent List */}
            <AgentList
              agents={agents}
              selectedAgent={selectedAgent}
              onAgentClick={handleAgentClick}
              onClearFilter={() => setSelectedAgent(null)}
              isLoading={isLoading}
              className="h-full"
            />

            {/* Agent Activity Monitor */}
            <AgentActivityMonitor className="h-full" />
          </div>
        </div>

        {/* Expanded Chat Modal */}
        <RicoChatModal 
          isOpen={chatExpanded} 
          onClose={() => setChatExpanded(false)} 
        />
      </PageContent>
    </DashboardLayout>
  );
}
