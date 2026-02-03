import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { 
  Activity, 
  Bot, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Sparkles
} from "lucide-react";

export interface ActiveAgentTask {
  id: string;
  business_id: string;
  agent_id: string | null;
  agent_name: string;
  agent_type: 'primary' | 'subagent' | 'builtin';
  task_description: string;
  status: 'running' | 'waiting' | 'completed' | 'error';
  started_at: string;
  completed_at: string | null;
  progress: number | null;
  metadata: Record<string, unknown> | null;
  parent_agent_id: string | null;
  created_at: string;
}

interface AgentActivityMonitorProps {
  className?: string;
}

function formatDuration(startTime: string): string {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function getStatusIcon(status: ActiveAgentTask['status']) {
  switch (status) {
    case 'running':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'waiting':
      return <Clock className="h-4 w-4 text-amber-500" />;
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
  }
}

function getStatusColor(status: ActiveAgentTask['status']) {
  switch (status) {
    case 'running':
      return 'bg-blue-50 border-blue-200';
    case 'waiting':
      return 'bg-amber-50 border-amber-200';
    case 'completed':
      return 'bg-emerald-50 border-emerald-200';
    case 'error':
      return 'bg-red-50 border-red-200';
  }
}

function getAgentTypeBadge(type: ActiveAgentTask['agent_type']) {
  switch (type) {
    case 'primary':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700">
          <Sparkles className="h-3 w-3" />
          Primary
        </span>
      );
    case 'subagent':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-700">
          <Bot className="h-3 w-3" />
          Subagent
        </span>
      );
    case 'builtin':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
          Built-in
        </span>
      );
  }
}

export function AgentActivityMonitor({ className }: AgentActivityMonitorProps) {
  const { selectedBusiness } = useBusinessContext();
  const [tasks, setTasks] = useState<ActiveAgentTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch active tasks
  useEffect(() => {
    if (!selectedBusiness?.id) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    const fetchTasks = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('mc_active_agent_tasks')
          .select('*')
          .eq('business_id', selectedBusiness.id)
          .in('status', ['running', 'waiting'])
          .order('started_at', { ascending: false });

        if (error) throw error;
        setTasks((data as unknown as ActiveAgentTask[]) || []);
      } catch (err) {
        console.error('Error fetching active agent tasks:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [selectedBusiness?.id]);

  // Real-time subscription
  useEffect(() => {
    if (!selectedBusiness?.id) return;

    const channel = supabase
      .channel(`mc_active_agent_tasks_${selectedBusiness.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'mc_active_agent_tasks',
          filter: `business_id=eq.${selectedBusiness.id}`
        },
        (payload) => {
          console.log('Active task change:', payload);
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as ActiveAgentTask;
            if (newTask.status === 'running' || newTask.status === 'waiting') {
              setTasks(prev => [newTask, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ActiveAgentTask;
            if (updated.status === 'completed' || updated.status === 'error') {
              // Remove completed/errored tasks after a brief delay
              setTimeout(() => {
                setTasks(prev => prev.filter(t => t.id !== updated.id));
              }, 3000);
            }
            setTasks(prev => prev.map(t => 
              t.id === updated.id ? updated : t
            ));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== (payload.old as ActiveAgentTask).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedBusiness?.id]);

  // Update durations every second for running tasks
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 shrink-0">
        <Activity className="h-4 w-4 text-blue-600" />
        <h3 className="font-semibold text-sm text-slate-900">Agent Activity</h3>
        <span className="text-xs text-slate-400">
          ({tasks.length} active)
        </span>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <Activity className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No active agent tasks</p>
            <p className="text-xs mt-1">Tasks will appear here when agents are working</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "p-3 rounded-lg border transition-all",
                getStatusColor(task.status)
              )}
            >
              {/* Header row: agent name + type + status */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm text-slate-900 truncate">
                    {task.agent_name}
                  </span>
                  {getAgentTypeBadge(task.agent_type)}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {getStatusIcon(task.status)}
                  <span className="text-xs text-slate-500 capitalize">
                    {task.status}
                  </span>
                </div>
              </div>

              {/* Task description */}
              <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                {task.task_description}
              </p>

              {/* Footer: duration + progress */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(task.started_at)}
                </span>
                
                {task.progress !== null && (
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-slate-500">{task.progress}%</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AgentActivityMonitor;
