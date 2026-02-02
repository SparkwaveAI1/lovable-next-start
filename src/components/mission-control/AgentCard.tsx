import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Agent, AgentStatus, AgentLevel } from "@/types/mission-control";

interface AgentCardProps {
  agent: Agent;
  isActive?: boolean;
  onClick?: () => void;
}

const statusConfig: Record<AgentStatus, { label: string; className: string }> = {
  working: {
    label: 'WORKING',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  idle: {
    label: 'IDLE',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  blocked: {
    label: 'BLOCKED',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
};

const levelConfig: Record<AgentLevel, { label: string; className: string }> = {
  lead: {
    label: 'LEAD',
    className: 'bg-violet-50 text-violet-700',
  },
  specialist: {
    label: 'SPC',
    className: 'bg-blue-50 text-blue-700',
  },
  intern: {
    label: 'INT',
    className: 'bg-slate-50 text-slate-600',
  },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function AgentCard({ agent, isActive, onClick }: AgentCardProps) {
  const status = statusConfig[agent.status];
  const level = levelConfig[agent.level];

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-white transition-all cursor-pointer",
        "hover:shadow-sm hover:border-slate-300",
        isActive && "ring-2 ring-violet-500 border-violet-300"
      )}
    >
      {/* Avatar with status ring */}
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={agent.avatar_url || undefined} alt={agent.name} />
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-sm font-medium">
            {getInitials(agent.name)}
          </AvatarFallback>
        </Avatar>
        {/* Status indicator dot */}
        <span
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white",
            agent.status === 'working' && "bg-emerald-500",
            agent.status === 'idle' && "bg-slate-400",
            agent.status === 'blocked' && "bg-amber-500"
          )}
        />
      </div>

      {/* Agent info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 truncate">{agent.name}</span>
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", level.className)}>
            {level.label}
          </span>
        </div>
        <p className="text-xs text-slate-500 truncate">{agent.role}</p>
      </div>

      {/* Status badge */}
      <Badge
        variant="outline"
        className={cn("text-[10px] font-semibold shrink-0", status.className)}
      >
        {status.label}
      </Badge>
    </div>
  );
}

export default AgentCard;
