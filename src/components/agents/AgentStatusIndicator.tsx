import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RUNTIME_STATUS_CONFIG, type AgentRuntimeStatus } from "@/types/agent-registry";

interface AgentStatusIndicatorProps {
  status: AgentRuntimeStatus;
  currentTask?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { dot: 'h-2 w-2', pulse: 'h-4 w-4', label: 'text-xs' },
  md: { dot: 'h-3 w-3', pulse: 'h-5 w-5', label: 'text-sm' },
  lg: { dot: 'h-4 w-4', pulse: 'h-6 w-6', label: 'text-base' },
};

export function AgentStatusIndicator({
  status,
  currentTask,
  size = 'md',
  showLabel = false,
  className,
}: AgentStatusIndicatorProps) {
  const config = RUNTIME_STATUS_CONFIG[status];
  const sizes = sizeConfig[size];

  const indicator = (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex items-center justify-center">
        {/* Pulsing animation for non-idle states */}
        {status !== 'idle' && (
          <span
            className={cn(
              "absolute animate-ping rounded-full opacity-75",
              sizes.pulse,
              config.pulseColor
            )}
          />
        )}
        {/* Solid dot */}
        <span
          className={cn(
            "relative rounded-full",
            sizes.dot,
            config.bgColor
          )}
        />
      </div>
      {showLabel && (
        <span className={cn("font-medium", sizes.label, config.color)}>
          {config.label}
        </span>
      )}
    </div>
  );

  // If there's a current task, show it in a tooltip
  if (currentTask) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            {indicator}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-slate-400 mt-1">{currentTask}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return indicator;
}

export default AgentStatusIndicator;
