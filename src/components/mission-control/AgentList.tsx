import { cn } from "@/lib/utils";
import { Bot, Circle } from "lucide-react";
import type { Agent } from "@/types/mission-control";

interface AgentListProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onAgentClick: (agent: Agent) => void;
  onClearFilter: () => void;
  isLoading?: boolean;
  className?: string;
}

function getStatusColor(status: Agent['status']): string {
  switch (status) {
    case 'active':
      return 'text-emerald-500';
    case 'idle':
      return 'text-amber-500';
    case 'offline':
      return 'text-slate-400';
    default:
      return 'text-slate-400';
  }
}

export function AgentList({ 
  agents, 
  selectedAgent, 
  onAgentClick, 
  onClearFilter,
  isLoading = false,
  className 
}: AgentListProps) {
  return (
    <div className={cn("flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-violet-600" />
          <h3 className="font-semibold text-sm text-slate-900">Agents</h3>
          <span className="text-xs text-slate-400">({agents.length})</span>
        </div>
        {selectedAgent && (
          <button
            onClick={onClearFilter}
            className="text-xs text-violet-600 hover:text-violet-700 hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {isLoading ? (
          <div className="text-center py-4 text-slate-400 text-sm">Loading...</div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <Bot className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No agents configured</p>
          </div>
        ) : (
          agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => onAgentClick(agent)}
              className={cn(
                "w-full p-3 rounded-lg border text-left transition-all",
                "hover:bg-slate-50 hover:border-slate-300",
                selectedAgent?.id === agent.id
                  ? "bg-violet-50 border-violet-300 ring-1 ring-violet-200"
                  : "bg-white border-slate-200"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                  agent.type === 'rico' 
                    ? "bg-gradient-to-br from-violet-500 to-indigo-600" 
                    : "bg-slate-100"
                )}>
                  {agent.avatar_url ? (
                    <img 
                      src={agent.avatar_url} 
                      alt={agent.name}
                      className="h-full w-full rounded-lg object-cover"
                    />
                  ) : (
                    <Bot className={cn(
                      "h-5 w-5",
                      agent.type === 'rico' ? "text-white" : "text-slate-500"
                    )} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-slate-900 truncate">
                      {agent.name}
                    </span>
                    <Circle 
                      className={cn("h-2 w-2 fill-current shrink-0", getStatusColor(agent.status))} 
                    />
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {agent.role || agent.type}
                  </p>
                  {agent.description && (
                    <p className="text-xs text-slate-400 line-clamp-1 mt-1">
                      {agent.description}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default AgentList;
