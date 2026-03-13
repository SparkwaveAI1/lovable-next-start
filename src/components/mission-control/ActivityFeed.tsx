import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Activity, ActivityType, Agent } from "@/types/mission-control";
import { ACTIVITY_FILTERS } from "@/types/mission-control";
import {
  FileText,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  PlusCircle,
} from "lucide-react";

interface ActivityFeedProps {
  activities: Activity[];
  agents: Agent[];
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

const activityIcons: Record<ActivityType, React.ReactNode> = {
  task_created: <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />,
  task_updated: <ArrowRight className="h-3.5 w-3.5 text-blue-600" />,
  status_changed: <CheckCircle2 className="h-3.5 w-3.5 text-violet-600" />,
  message_sent: <MessageSquare className="h-3.5 w-3.5 text-amber-600" />,
  decision_made: <Lightbulb className="h-3.5 w-3.5 text-orange-600" />,
  document_created: <FileText className="h-3.5 w-3.5 text-slate-600" />,
};

const activityColors: Record<ActivityType, string> = {
  task_created: "bg-emerald-50 border-emerald-200",
  task_updated: "bg-blue-50 border-blue-200",
  status_changed: "bg-violet-50 border-violet-200",
  message_sent: "bg-amber-50 border-amber-200",
  decision_made: "bg-orange-50 border-orange-200",
  document_created: "bg-slate-50 border-slate-200",
};

export function ActivityFeed({ activities, agents, className }: ActivityFeedProps) {
  const [filter, setFilter] = useState<string>("all");

  const filteredActivities =
    filter === "all"
      ? activities
      : activities.filter((a) => a.type === filter);

  const getAgent = (agentId: string) => agents.find((a) => a.id === agentId);

  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      {/* Header with filters */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <h3 className="font-semibold text-sm text-slate-900 mb-2">Activity Feed</h3>
        <div className="flex flex-wrap gap-1">
          {ACTIVITY_FILTERS.map((f) => (
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {filteredActivities.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-slate-400">No activities yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredActivities.map((activity) => {
              const agent = getAgent(activity.agent_id);
              if (process.env.NODE_ENV !== 'production' && !agent && !activity.agent_name) { console.warn(`[ActivityFeed] Activity ${activity.id} missing both agent_id and agent_name`); }
              return (
                <div
                  key={activity.id}
                  className="px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex gap-3">
                    {/* Agent avatar */}
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage
                        src={agent?.avatar_url || undefined}
                        alt={agent?.name || "Agent"}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-medium">
                        {agent ? getInitials(agent.name) : activity.agent_name ? getInitials(activity.agent_name) : "??"}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm text-slate-900 truncate">
                          {agent?.name || activity.agent_name || "Unknown"}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border",
                            activityColors[activity.type]
                          )}
                        >
                          {activityIcons[activity.type]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 break-words">
                        {activity.message}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {formatRelativeTime(activity.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityFeed;
