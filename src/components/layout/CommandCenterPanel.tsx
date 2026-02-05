import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, Zap, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScottsActionItems, AgentActivityMonitor } from "@/components/mission-control";
import { supabase } from "@/integrations/supabase/client";
import type { Task } from "@/types/mission-control";

interface CommandCenterPanelProps {
  className?: string;
}

export function CommandCenterPanel({ className }: CommandCenterPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sparkwave-command-panel-collapsed");
    return saved ? JSON.parse(saved) : false;
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Array<{ id: string; name: string; status: string; role: string }>>([]);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem("sparkwave-command-panel-collapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Fetch all tasks (for Scott's To-Do - always global)
  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('mc_tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setTasks(data as unknown as Task[]);
      }
    };

    const fetchAgents = async () => {
      const { data, error } = await supabase
        .from('mc_agents')
        .select('id, name, status, role')
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        setAgents(data);
      }
    };

    fetchTasks();
    fetchAgents();
  }, []);

  // Real-time subscription for tasks
  useEffect(() => {
    const tasksChannel = supabase
      .channel('command_center_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mc_tasks' },
        (payload) => {
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
      ).subscribe();

    const agentsChannel = supabase
      .channel('command_center_agents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mc_agents' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setAgents(prev => prev.map(a => 
              a.id === (payload.new as any).id 
                ? { id: a.id, name: (payload.new as any).name, status: (payload.new as any).status, role: (payload.new as any).role }
                : a
            ));
          }
        }
      ).subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(agentsChannel);
    };
  }, []);

  return (
    <div 
      className={cn(
        "fixed right-0 top-16 bottom-0 z-20 bg-slate-50 border-l border-slate-200 shadow-lg transition-all duration-300 flex flex-col",
        isCollapsed ? "w-12" : "w-80 lg:w-96",
        className
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute -left-3 top-4 z-30 w-6 h-12 bg-white border border-slate-200 rounded-l-md shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors",
        )}
        aria-label={isCollapsed ? "Expand command center" : "Collapse command center"}
      >
        {isCollapsed ? (
          <ChevronLeft className="h-4 w-4 text-slate-600" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-600" />
        )}
      </button>

      {isCollapsed ? (
        /* Collapsed state - just icons */
        <div className="flex flex-col items-center pt-6 gap-4">
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-2 rounded-lg hover:bg-slate-200 transition-colors group relative"
            title="Scott's To-Do"
          >
            <Zap className="h-5 w-5 text-amber-600" />
            {tasks.filter(t => t.status !== 'done').length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {Math.min(tasks.filter(t => t.status !== 'done').length, 99)}
              </span>
            )}
          </button>
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
            title="Agent Activity"
          >
            <Activity className="h-5 w-5 text-blue-600" />
          </button>
        </div>
      ) : (
        /* Expanded state - full panels */
        <div className="flex flex-col h-full overflow-hidden p-3 gap-3">
          {/* Agent Activity Monitor - top half */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <AgentActivityMonitor 
              agents={agents}
              className="h-full"
            />
          </div>
          
          {/* Scott's To-Do - bottom half */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScottsActionItems 
              tasks={tasks}
              className="h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default CommandCenterPanel;
