import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bot,
  Zap,
  MessageSquare,
  Mail,
  Calendar,
  FileText,
  Settings,
  Pause,
  Play,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AgentStatusIndicator } from "./AgentStatusIndicator";
import {
  type AgentWithStatus,
  type AgentRuntimeStatus,
  REGISTRY_STATUS_CONFIG,
} from "@/types/agent-registry";

interface AgentCardProps {
  agent: AgentWithStatus;
  onClick?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onEdit?: () => void;
  className?: string;
}

// Map icon names to components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  bot: Bot,
  zap: Zap,
  message: MessageSquare,
  mail: Mail,
  calendar: Calendar,
  file: FileText,
  settings: Settings,
};

// Color theme map
const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  violet: { bg: 'bg-violet-100', text: 'text-violet-600', border: 'border-violet-200' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' },
  rose: { bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-200' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
};

export function AgentCard({
  agent,
  onClick,
  onPause,
  onResume,
  onEdit,
  className,
}: AgentCardProps) {
  const IconComponent = iconMap[agent.icon] || Bot;
  const colors = colorMap[agent.color] || colorMap.violet;
  const registryStatus = REGISTRY_STATUS_CONFIG[agent.status];
  const runtimeStatus: AgentRuntimeStatus = agent.runtime_status?.status || 'idle';
  const currentTask = agent.runtime_status?.current_task;

  const capabilities = Array.isArray(agent.capabilities) 
    ? agent.capabilities.slice(0, 3) 
    : [];

  return (
    <div
      className={cn(
        "relative bg-white rounded-xl border border-slate-200 p-5 transition-all",
        "hover:shadow-md hover:border-slate-300",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={cn(
            "flex items-center justify-center h-12 w-12 rounded-xl",
            colors.bg
          )}>
            <IconComponent className={cn("h-6 w-6", colors.text)} />
          </div>
          
          {/* Name and status */}
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">{agent.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <AgentStatusIndicator
                status={runtimeStatus}
                currentTask={currentTask}
                size="sm"
                showLabel
              />
              <Badge
                variant="outline"
                className={cn("text-[10px] font-semibold", registryStatus.className)}
              >
                {registryStatus.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onClick && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
            )}
            {agent.status === 'active' && onPause && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPause(); }}>
                <Pause className="h-4 w-4 mr-2" />
                Pause Agent
              </DropdownMenuItem>
            )}
            {agent.status === 'paused' && onResume && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onResume(); }}>
                <Play className="h-4 w-4 mr-2" />
                Resume Agent
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Configuration
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description */}
      {agent.description && (
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
          {agent.description}
        </p>
      )}

      {/* Current task (if working) */}
      {currentTask && runtimeStatus === 'working' && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-4">
          <p className="text-xs text-blue-600 font-medium">Currently:</p>
          <p className="text-sm text-blue-800 truncate">{currentTask}</p>
        </div>
      )}

      {/* Capabilities tags */}
      {capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {capabilities.map((cap, idx) => (
            <span
              key={idx}
              className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full"
            >
              {cap}
            </span>
          ))}
          {Array.isArray(agent.capabilities) && agent.capabilities.length > 3 && (
            <span className="text-xs text-slate-400 px-2 py-1">
              +{agent.capabilities.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default AgentCard;
