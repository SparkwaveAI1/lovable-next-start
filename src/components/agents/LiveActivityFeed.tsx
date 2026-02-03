import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Lightbulb,
  Zap,
  Settings,
  Filter,
} from "lucide-react";
import {
  type AgentRegistryActivity,
  type AgentActivityType,
  AGENT_ACTIVITY_FILTERS,
} from "@/types/agent-registry";

interface LiveActivityFeedProps {
  activities: AgentRegistryActivity[];
  agentId?: string;
  agentNames?: Record<string, string>;
  className?: string;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 10) return "just now";
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const activityIcons: Record<AgentActivityType, React.ReactNode> = {
  task_started: <Play className="h-3.5 w-3.5 text-blue-600" />,
  task_completed: <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />,
  error: <AlertCircle className="h-3.5 w-3.5 text-red-600" />,
  message_sent: <MessageSquare className="h-3.5 w-3.5 text-amber-600" />,
  decision_made: <Lightbulb className="h-3.5 w-3.5 text-orange-600" />,
  api_call: <Zap className="h-3.5 w-3.5 text-violet-600" />,
  config_changed: <Settings className="h-3.5 w-3.5 text-slate-600" />,
};

const activityColors: Record<AgentActivityType, string> = {
  task_started: "bg-blue-50 border-blue-200",
  task_completed: "bg-emerald-50 border-emerald-200",
  error: "bg-red-50 border-red-200",
  message_sent: "bg-amber-50 border-amber-200",
  decision_made: "bg-orange-50 border-orange-200",
  api_call: "bg-violet-50 border-violet-200",
  config_changed: "bg-slate-50 border-slate-200",
};

const activityLabels: Record<AgentActivityType, string> = {
  task_started: "Started",
  task_completed: "Completed",
  error: "Error",
  message_sent: "Message",
  decision_made: "Decision",
  api_call: "API Call",
  config_changed: "Config",
};

export function LiveActivityFeed({
  activities,
  agentId,
  agentNames = {},
  className,
}: LiveActivityFeedProps) {
  const [filter, setFilter] = useState<string>("all");

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    // Filter by agent if specified
    if (agentId && activity.agent_id !== agentId) return false;
    // Filter by type
    if (filter !== "all" && activity.action_type !== filter) return false;
    return true;
  });

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header with filters */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm text-slate-900">Live Activity</h3>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Real-time
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {AGENT_ACTIVITY_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "text-[10px] font-medium px-2 py-1 rounded-full transition-colors",
                filter === f.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity list */}
      <ScrollArea className="flex-1">
        {filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <Filter className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">No activity recorded yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Agent actions will appear here in real-time
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredActivities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                agentName={agentNames[activity.agent_id]}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface ActivityItemProps {
  activity: AgentRegistryActivity;
  agentName?: string;
}

function ActivityItem({ activity, agentName }: ActivityItemProps) {
  const icon = activityIcons[activity.action_type];
  const color = activityColors[activity.action_type];
  const label = activityLabels[activity.action_type];

  return (
    <div className="px-4 py-3 hover:bg-slate-50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Icon badge */}
        <div
          className={cn(
            "flex items-center justify-center h-7 w-7 rounded-lg border shrink-0",
            color
          )}
        >
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              {label}
            </span>
            {agentName && (
              <span className="text-[10px] text-slate-400">
                by {agentName}
              </span>
            )}
          </div>
          
          {activity.description && (
            <p className="text-sm text-slate-700 line-clamp-2">
              {activity.description}
            </p>
          )}

          {/* Show error details if applicable */}
          {activity.action_type === 'error' && activity.details?.error && (
            <div className="mt-2 bg-red-50 border border-red-100 rounded px-2 py-1">
              <p className="text-xs text-red-600 font-mono truncate">
                {activity.details.error}
              </p>
            </div>
          )}

          <span className="text-[10px] text-slate-400 mt-1 block">
            {formatRelativeTime(activity.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default LiveActivityFeed;
