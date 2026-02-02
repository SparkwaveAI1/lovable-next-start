import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority, Agent } from "@/types/mission-control";
import { Clock, Tag, GripVertical } from "lucide-react";

interface TaskCardProps {
  task: Task;
  agents: Agent[];
  onClick?: () => void;
  isDragging?: boolean;
}

interface SortableTaskCardProps extends TaskCardProps {}

const priorityConfig: Record<TaskPriority, { className: string; dotColor: string; emoji: string }> = {
  critical: {
    className: 'border-l-red-500',
    dotColor: 'bg-red-500',
    emoji: '🔴',
  },
  high: {
    className: 'border-l-orange-500',
    dotColor: 'bg-orange-500',
    emoji: '🟠',
  },
  medium: {
    className: 'border-l-yellow-500',
    dotColor: 'bg-yellow-500',
    emoji: '🟡',
  },
  low: {
    className: 'border-l-slate-300',
    dotColor: 'bg-slate-400',
    emoji: '🟢',
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

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function TaskCard({ task, agents, onClick, isDragging }: TaskCardProps) {
  const priority = priorityConfig[task.priority];
  const assignees = agents.filter((a) => task.assignee_ids.includes(a.id));

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-lg border border-slate-200 border-l-4 p-3 cursor-pointer",
        "hover:shadow-md hover:border-slate-300 transition-all",
        priority.className,
        isDragging && "shadow-xl ring-2 ring-violet-400 opacity-90 rotate-2"
      )}
    >
      {/* Header with priority and drag handle */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          {/* Priority emoji + Title */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">{priority.emoji}</span>
            <h4 className="font-medium text-slate-900 text-sm line-clamp-2">
              {task.title}
            </h4>
          </div>
        </div>
        <GripVertical className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
      </div>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-2 ml-5">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 ml-5">
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-[10px] text-slate-400">+{task.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer: Assignees + Timestamp */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
        {/* Assignee avatars */}
        <div className="flex -space-x-2">
          {assignees.length > 0 ? (
            assignees.slice(0, 3).map((agent) => (
              <Avatar key={agent.id} className="h-6 w-6 border-2 border-white">
                <AvatarImage src={agent.avatar_url || undefined} alt={agent.name} />
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-[10px] font-medium">
                  {getInitials(agent.name)}
                </AvatarFallback>
              </Avatar>
            ))
          ) : (
            <span className="text-xs text-slate-400 italic">Unassigned</span>
          )}
          {assignees.length > 3 && (
            <div className="h-6 w-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center">
              <span className="text-[10px] text-slate-600">+{assignees.length - 3}</span>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="flex items-center gap-1 text-[10px] text-slate-400">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(task.updated_at)}
        </span>
      </div>
    </div>
  );
}

export function SortableTaskCard({ task, agents, onClick, isDragging }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        isSortableDragging && "opacity-50"
      )}
    >
      <TaskCard
        task={task}
        agents={agents}
        onClick={onClick}
        isDragging={isDragging || isSortableDragging}
      />
    </div>
  );
}

export default TaskCard;
