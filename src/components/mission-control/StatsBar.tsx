import { cn } from "@/lib/utils";
import type { Agent, Task } from "@/types/mission-control";
import { Users, Inbox, CheckCircle2, Clock, TrendingUp } from "lucide-react";

interface StatsBarProps {
  agents: Agent[];
  tasks: Task[];
  className?: string;
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color: 'emerald' | 'amber' | 'blue' | 'violet' | 'slate';
}

const colorClasses = {
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', accent: 'text-emerald-700' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', accent: 'text-amber-700' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', accent: 'text-blue-700' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-600', accent: 'text-violet-700' },
  slate: { bg: 'bg-slate-50', icon: 'text-slate-600', accent: 'text-slate-700' },
};

function StatItem({ icon, label, value, subValue, color }: StatItemProps) {
  const colors = colorClasses[color];
  
  return (
    <div className="flex items-center gap-3">
      <div className={cn("p-2 rounded-lg", colors.bg)}>
        <div className={colors.icon}>{icon}</div>
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className={cn("text-xl font-bold", colors.accent)}>{value}</span>
          {subValue && (
            <span className="text-xs text-slate-400">{subValue}</span>
          )}
        </div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}

function getCompletedToday(tasks: Task[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return tasks.filter((task) => {
    if (task.status !== 'done') return false;
    const updated = new Date(task.updated_at);
    updated.setHours(0, 0, 0, 0);
    return updated.getTime() === today.getTime();
  }).length;
}

export function StatsBar({ agents, tasks, className }: StatsBarProps) {
  const workingAgents = agents.filter((a) => a.status === 'working').length;
  const idleAgents = agents.filter((a) => a.status === 'idle').length;
  const inboxTasks = tasks.filter((t) => t.status === 'inbox').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const completedToday = getCompletedToday(tasks);
  const totalCompleted = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className={cn(
      "bg-white rounded-xl border border-slate-200 p-4",
      className
    )}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {/* Active Agents */}
        <StatItem
          icon={<Users className="h-5 w-5" />}
          label="Agents Active"
          value={workingAgents}
          subValue={`/ ${agents.length}`}
          color="emerald"
        />

        {/* Idle Agents */}
        <StatItem
          icon={<Clock className="h-5 w-5" />}
          label="Agents Idle"
          value={idleAgents}
          color="slate"
        />

        {/* Tasks in Queue (Inbox) */}
        <StatItem
          icon={<Inbox className="h-5 w-5" />}
          label="In Queue"
          value={inboxTasks}
          color="amber"
        />

        {/* Tasks In Progress */}
        <StatItem
          icon={<TrendingUp className="h-5 w-5" />}
          label="In Progress"
          value={inProgressTasks}
          color="blue"
        />

        {/* Completed Today */}
        <StatItem
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Done Today"
          value={completedToday}
          subValue={`(${totalCompleted} total)`}
          color="violet"
        />
      </div>
    </div>
  );
}

export default StatsBar;
