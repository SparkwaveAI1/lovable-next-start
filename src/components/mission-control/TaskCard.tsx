import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority, Agent } from "@/types/mission-control";
import { Clock, Tag, GripVertical, FileText, ChevronDown, ChevronUp, ExternalLink, Bot, User, Users, Edit, Trash, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

type TaskOwner = 'agent' | 'human' | 'cooperative' | null;

function getOwnerFromTags(tags: string[]): TaskOwner {
  for (const tag of tags) {
    if (tag === 'owner:agent') return 'agent';
    if (tag === 'owner:human') return 'human';
    if (tag === 'owner:cooperative') return 'cooperative';
  }
  return null;
}

const ownerConfig: Record<string, { 
  borderColor: string; 
  badgeBg: string; 
  badgeText: string; 
  label: string;
  icon: React.ReactNode;
}> = {
  agent: {
    borderColor: 'border-l-blue-500',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    label: 'Rico',
    icon: <Bot className="h-3 w-3" />,
  },
  human: {
    borderColor: 'border-l-emerald-500',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    label: 'Scott',
    icon: <User className="h-3 w-3" />,
  },
  cooperative: {
    borderColor: 'border-l-purple-500',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-700',
    label: 'Co-op',
    icon: <Users className="h-3 w-3" />,
  },
};

interface TaskCardProps {
  task: Task;
  agents: Agent[];
  onClick?: () => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onDeleteComplete?: () => void;
  isDragging?: boolean;
}

interface SortableTaskCardProps extends TaskCardProps {}

const priorityConfig: Record<TaskPriority, { 
  className: string; 
  dotColor: string; 
  emoji: string;
  tagBg: string;
  tagText: string;
  cardBg: string;
  label: string;
}> = {
  critical: {
    className: 'border-l-red-500',
    dotColor: 'bg-red-500',
    emoji: '🔴',
    tagBg: 'bg-red-100',
    tagText: 'text-red-700',
    cardBg: 'bg-red-50',
    label: 'Critical',
  },
  high: {
    className: 'border-l-orange-500',
    dotColor: 'bg-orange-500',
    emoji: '🟠',
    tagBg: 'bg-orange-100',
    tagText: 'text-orange-700',
    cardBg: '',
    label: 'High',
  },
  medium: {
    className: 'border-l-yellow-500',
    dotColor: 'bg-yellow-500',
    emoji: '🟡',
    tagBg: 'bg-yellow-100',
    tagText: 'text-yellow-700',
    cardBg: '',
    label: 'Medium',
  },
  low: {
    className: 'border-l-slate-300',
    dotColor: 'bg-slate-400',
    emoji: '🟢',
    tagBg: 'bg-gray-100',
    tagText: 'text-gray-600',
    cardBg: '',
    label: 'Low',
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

export function TaskCard({ task, agents, onClick, onEdit, onDelete, onDeleteComplete, isDragging }: TaskCardProps) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  
  const priority = priorityConfig[task.priority];
  const owner = getOwnerFromTags(task.tags);
  const ownerStyle = owner ? ownerConfig[owner] : null;
  const assignees = agents.filter((a) => task.assignee_ids.includes(a.id));
  const hasDocument = !!task.document_url;
  const hasSummary = !!task.work_summary;

  const handleDocumentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.document_url) {
      window.open(task.document_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSummaryToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSummaryExpanded(!summaryExpanded);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(task);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from("mc_tasks")
        .delete()
        .eq("id", task.id);

      if (error) throw error;

      // Log activity
      await supabase.from("mc_activities").insert({
        type: "task_deleted",
        agent_id: null,
        task_id: null,
        message: `Task "${task.title}" deleted`,
        metadata: { 
          task_id: task.id,
          task_title: task.title,
          source: "mission-control-ui",
        },
        business_id: task.business_id,
        created_at: new Date().toISOString(),
      });

      toast({
        title: "Task deleted",
        description: `"${task.title}" has been deleted`,
      });

      setShowDeleteConfirm(false);
      
      // Call the onDelete callback if provided (for legacy compatibility)
      onDelete?.(task.id);
      
      // Call onDeleteComplete to trigger UI refresh
      onDeleteComplete?.();
    } catch (err) {
      console.error("Failed to delete task:", err);
      toast({
        title: "Failed to delete task",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        onClick={onClick}
        className={cn(
          "rounded-lg border border-slate-200 border-l-4 p-3 cursor-pointer",
          "hover:shadow-md hover:border-slate-300 transition-all",
          ownerStyle ? ownerStyle.borderColor : priority.className,
          priority.cardBg || "bg-white",
          isDragging && "shadow-xl ring-2 ring-violet-400 opacity-90 rotate-2"
        )}
      >
        {/* Header with priority, drag handle, edit, and delete */}
        <div className="flex items-start gap-2">
          <div className="flex-1">
            {/* Priority pill tag + Owner badge + Title */}
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
                priority.tagBg,
                priority.tagText
              )}>
                {priority.label}
              </span>
              {ownerStyle && (
                <span className={cn(
                  "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                  ownerStyle.badgeBg,
                  ownerStyle.badgeText
                )}>
                  {ownerStyle.icon}
                  {ownerStyle.label}
                </span>
              )}
              <h4 className="font-medium text-slate-900 text-sm line-clamp-2">
                {task.title}
              </h4>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <GripVertical className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
            <button onClick={handleEdit} className="p-1 hover:bg-slate-100 rounded transition-colors">
              <Edit className="h-4 w-4 text-slate-500" />
            </button>
            <button onClick={handleDelete} className="p-1 hover:bg-slate-100 rounded transition-colors">
              <Trash className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Description preview */}
        {task.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-2 ml-5">
            {task.description}
          </p>
        )}

        {/* Tags */}
        {task.tags.filter(t => !t.startsWith('owner:')).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2 ml-5">
            {task.tags.filter(t => !t.startsWith('owner:')).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
            {task.tags.filter(t => !t.startsWith('owner:')).length > 3 && (
              <span className="text-[10px] text-slate-400">+{task.tags.filter(t => !t.startsWith('owner:')).length - 3}</span>
            )}
          </div>
        )}

        {/* Document Link & Work Summary */}
        {(hasDocument || hasSummary) && (
          <div className="ml-5 mb-2 space-y-1">
            {/* Document link button */}
            {hasDocument && (
              <button
                onClick={handleDocumentClick}
                className="inline-flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 hover:underline transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>View Document</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
            
            {/* Work summary toggle */}
            {hasSummary && (
              <div>
                <button
                  onClick={handleSummaryToggle}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {summaryExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  <span>{summaryExpanded ? 'Hide Summary' : 'Show Summary'}</span>
                </button>
                
                {summaryExpanded && (
                  <div className="mt-1.5 p-2 bg-slate-50 rounded text-xs text-slate-600 border border-slate-200">
                    {task.work_summary}
                  </div>
                )}
              </div>
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

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function SortableTaskCard({ task, agents, onClick, onEdit, onDelete, onDeleteComplete, isDragging }: SortableTaskCardProps) {
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
        onEdit={onEdit}
        onDelete={onDelete}
        onDeleteComplete={onDeleteComplete}
        isDragging={isDragging || isSortableDragging}
      />
    </div>
  );
}

export default TaskCard;