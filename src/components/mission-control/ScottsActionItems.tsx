import { cn } from "@/lib/utils";
import type { Task, TaskPriority } from "@/types/mission-control";
import { Zap, AlertTriangle, Clock, User, Users } from "lucide-react";

interface ScottsActionItemsProps {
  tasks: Task[];
  className?: string;
  onTaskClick?: (task: Task) => void;
}

const priorityOrder: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const priorityBadge: Record<TaskPriority, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-700', label: '🔴 Critical' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', label: '🟠 High' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '🟡 Medium' },
  low: { bg: 'bg-gray-100', text: 'text-gray-600', label: '🟢 Low' },
};

function getOwnerType(tags: string[] | null | undefined): 'human' | 'cooperative' | null {
  if (!tags || !Array.isArray(tags)) return null;
  for (const tag of tags) {
    if (tag === 'owner:human') return 'human';
    if (tag === 'owner:cooperative') return 'cooperative';
  }
  return null;
}

function isBlockedOnScott(task: Task): boolean {
  if (!task.tags || !Array.isArray(task.tags)) return false;
  return task.tags.some(t => 
    t === 'blocked-on-scott' || t === 'blocked' || t === 'needs-scott'
  );
}

export function ScottsActionItems({ tasks, className, onTaskClick }: ScottsActionItemsProps) {
  // Filter tasks that need Scott's input
  const scottTasks = tasks.filter(task => {
    if (task.status === 'done') return false;
    const ownerType = getOwnerType(task.tags);
    return ownerType === 'human' || ownerType === 'cooperative' || isBlockedOnScott(task);
  });

  // Sort: blocked items first, then by priority
  const sortedTasks = [...scottTasks].sort((a, b) => {
    const aBlocked = isBlockedOnScott(a) ? 0 : 1;
    const bBlocked = isBlockedOnScott(b) ? 0 : 1;
    if (aBlocked !== bBlocked) return aBlocked - bBlocked;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center gap-2">
        <Zap className="h-4 w-4 text-amber-600" />
        <h3 className="font-semibold text-sm text-slate-900">Scott's To-Do</h3>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
          {sortedTasks.length}
        </span>
        <span className="text-xs text-slate-400 ml-auto">Items needing your input</span>
      </div>

      {/* Items */}
      <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
        {sortedTasks.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-sm">
            ✨ All clear — nothing blocking Rico's work
          </div>
        )}
        {sortedTasks.map((task) => {
          const ownerType = getOwnerType(task.tags);
          const blocked = isBlockedOnScott(task);
          const pBadge = priorityBadge[task.priority];

          return (
            <div
              key={task.id}
              onClick={() => onTaskClick?.(task)}
              className={cn(
                "p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all",
                blocked
                  ? "bg-red-50/50 border-red-200 border-l-4 border-l-red-500"
                  : ownerType === 'human'
                    ? "bg-emerald-50/50 border-emerald-200 border-l-4 border-l-emerald-500"
                    : "bg-purple-50/50 border-purple-200 border-l-4 border-l-purple-500"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {/* Blocked badge */}
                    {blocked && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                        <AlertTriangle className="h-3 w-3" />
                        Blocking
                      </span>
                    )}
                    {/* Owner type */}
                    {ownerType === 'human' && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                        <User className="h-3 w-3" />
                        Scott
                      </span>
                    )}
                    {ownerType === 'cooperative' && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700">
                        <Users className="h-3 w-3" />
                        Co-op
                      </span>
                    )}
                    {/* Priority */}
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
                      pBadge.bg, pBadge.text
                    )}>
                      {pBadge.label}
                    </span>
                  </div>
                  <h4 className="font-medium text-sm text-slate-900">{task.title}</h4>
                  {task.description && (
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{task.description}</p>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5 shrink-0 mt-1">
                  <Clock className="h-3 w-3" />
                  {task.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ScottsActionItems;
