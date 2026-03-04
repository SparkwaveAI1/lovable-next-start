import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
  Loader2,
  X,
} from "lucide-react";
import type { Task, TaskStatus, TaskPriority } from "@/types/mission-control";
import { PROJECT_OPTIONS } from "@/types/mission-control";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: { id: TaskStatus; label: string; color: string; headerBg: string; countBg: string; borderColor: string }[] = [
  { id: "todo", label: "Todo", color: "slate", headerBg: "bg-slate-50", countBg: "bg-slate-200 text-slate-700", borderColor: "border-slate-200" },
  { id: "in_progress", label: "In Progress", color: "amber", headerBg: "bg-amber-50", countBg: "bg-amber-100 text-amber-700", borderColor: "border-amber-200" },
  { id: "blocked", label: "Blocked", color: "red", headerBg: "bg-red-50", countBg: "bg-red-100 text-red-700", borderColor: "border-red-200" },
  { id: "review", label: "Review", color: "violet", headerBg: "bg-violet-50", countBg: "bg-violet-100 text-violet-700", borderColor: "border-violet-200" },
  { id: "done", label: "Done", color: "emerald", headerBg: "bg-emerald-50", countBg: "bg-emerald-100 text-emerald-700", borderColor: "border-emerald-200" },
];

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; tagBg: string; tagText: string; leftBorder: string; emoji: string }> = {
  critical: { label: "Critical", tagBg: "bg-red-100", tagText: "text-red-700", leftBorder: "border-l-red-500", emoji: "🔴" },
  high: { label: "High", tagBg: "bg-orange-100", tagText: "text-orange-700", leftBorder: "border-l-orange-500", emoji: "🟠" },
  medium: { label: "Medium", tagBg: "bg-yellow-100", tagText: "text-yellow-700", leftBorder: "border-l-yellow-500", emoji: "🟡" },
  low: { label: "Low", tagBg: "bg-slate-100", tagText: "text-slate-600", leftBorder: "border-l-slate-300", emoji: "🟢" },
};

const PROJECT_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  "Sparkwave App": { bg: "bg-violet-100", text: "text-violet-700" },
  "n8n Migration": { bg: "bg-blue-100", text: "text-blue-700" },
  "Fight Flow": { bg: "bg-orange-100", text: "text-orange-700" },
  "Twitter / Iris": { bg: "bg-sky-100", text: "text-sky-700" },
  Infrastructure: { bg: "bg-teal-100", text: "text-teal-700" },
  Website: { bg: "bg-pink-100", text: "text-pink-700" },
};

const OWNER_OPTIONS = [
  { value: "owner:dev", label: "Dev" },
  { value: "owner:rico", label: "Rico" },
  { value: "owner:scott", label: "Scott" },
  { value: "owner:iris", label: "Iris" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOwnerTag(tags: string[]): string | null {
  const t = tags.find((tag) => tag.startsWith("owner:"));
  if (!t) return null;
  const name = t.replace("owner:", "");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatRelative(dateString: string): string {
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

// ─── Task Detail Modal ────────────────────────────────────────────────────────

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
}

function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  if (!task) return null;
  const priority = PRIORITY_CONFIG[task.priority];
  const ownerTag = getOwnerTag(task.tags);
  const projectColor = task.project ? PROJECT_BADGE_COLORS[task.project] : null;

  return (
    <Dialog open={!!task} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold leading-tight pr-8">
            {task.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {/* Badges row */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", priority.tagBg, priority.tagText)}>
              {priority.emoji} {priority.label}
            </span>
            {task.project && projectColor && (
              <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", projectColor.bg, projectColor.text)}>
                {task.project}
              </span>
            )}
            {ownerTag && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                👤 {ownerTag}
              </span>
            )}
            <span className="text-[11px] text-slate-400 ml-auto flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelative(task.updated_at)}
            </span>
          </div>

          {/* Description */}
          {task.description ? (
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 leading-relaxed">
              {task.description}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No description provided.</p>
          )}

          {/* Non-owner tags */}
          {task.tags.filter((t) => !t.startsWith("owner:")).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.tags.filter((t) => !t.startsWith("owner:")).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── New Task Form ─────────────────────────────────────────────────────────────

interface NewTaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: () => void;
  businessId: string | null;
}

function NewTaskForm({ open, onOpenChange, onTaskCreated, businessId }: NewTaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [project, setProject] = useState<string>("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [owner, setOwner] = useState<string>("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const reset = () => {
    setTitle("");
    setDescription("");
    setProject("");
    setPriority("medium");
    setOwner("");
    setStatus("todo");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const tags: string[] = [];
      if (owner) tags.push(owner);

      const { error } = await supabase.from("mc_tasks").insert({
        title: title.trim(),
        description: description.trim() || "",
        status,
        priority,
        project: project || null,
        business_id: businessId,
        assignee_ids: [],
        tags,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({ title: "Task created", description: `"${title.trim()}" added to ${status.replace("_", " ")}` });
      reset();
      onOpenChange(false);
      onTaskCreated();
    } catch (err) {
      console.error("Failed to create task:", err);
      toast({
        title: "Failed to create task",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>Add a task to Mission Control.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tb-title">Title *</Label>
              <Input
                id="tb-title"
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tb-description">Description</Label>
              <Textarea
                id="tb-description"
                placeholder="Optional details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Project</Label>
                <Select value={project} onValueChange={setProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— None —</SelectItem>
                    {PROJECT_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">🔴 Critical</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">🟢 Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Owner</Label>
                <Select value={owner} onValueChange={setOwner}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— None —</SelectItem>
                    {OWNER_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Mini Task Card ───────────────────────────────────────────────────────────

interface MiniTaskCardProps {
  task: Task;
  onClick: () => void;
}

function MiniTaskCard({ task, onClick }: MiniTaskCardProps) {
  const priority = PRIORITY_CONFIG[task.priority];
  const ownerTag = getOwnerTag(task.tags);
  const projectColor = task.project ? PROJECT_BADGE_COLORS[task.project] : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border border-slate-200 border-l-4 p-3 bg-white cursor-pointer",
        "hover:shadow-md hover:border-slate-300 transition-all",
        priority.leftBorder
      )}
    >
      {/* Priority + Owner badges */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", priority.tagBg, priority.tagText)}>
          {priority.label}
        </span>
        {task.project && projectColor && (
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", projectColor.bg, projectColor.text)}>
            {task.project}
          </span>
        )}
        {ownerTag && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {ownerTag}
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="font-medium text-slate-900 text-sm line-clamp-2 mb-1">{task.title}</h4>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-slate-400 line-clamp-2 mb-1.5">
          {task.description.slice(0, 80)}{task.description.length > 80 ? "…" : ""}
        </p>
      )}

      {/* Timestamp */}
      <span className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
        <Clock className="h-3 w-3" />
        {formatRelative(task.updated_at)}
      </span>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  column: typeof COLUMNS[number];
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  collapsedByDefault?: boolean;
}

function KanbanColumn({ column, tasks, onTaskClick, collapsedByDefault = false }: KanbanColumnProps) {
  const [collapsed, setCollapsed] = useState(collapsedByDefault);

  return (
    <div className={cn(
      "flex-shrink-0 w-64 sm:w-72 flex flex-col rounded-xl border",
      column.borderColor,
      "bg-slate-50/50"
    )}>
      {/* Header */}
      <div
        className={cn("px-3 py-2.5 rounded-t-xl flex items-center justify-between cursor-pointer", column.headerBg)}
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-xs tracking-wide text-slate-700">{column.label}</h3>
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center", column.countBg)}>
            {tasks.length}
          </span>
        </div>
        {collapsed ? (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
        )}
      </div>

      {/* Task list */}
      {!collapsed && (
        <div className="flex-1 p-2 space-y-2 min-h-[80px] max-h-[600px] overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-16 border-2 border-dashed border-slate-200 rounded-lg">
              <span className="text-xs text-slate-400">No tasks</span>
            </div>
          ) : (
            tasks.map((task) => (
              <MiniTaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main TaskBoard Component ─────────────────────────────────────────────────

interface TaskBoardProps {
  businessId: string | null;
  isAllBusinesses: boolean;
}

export function TaskBoard({ businessId, isAllBusinesses }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const { toast } = useToast();

  // Filters
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("mc_tasks")
        .select("id,title,description,status,priority,tags,project,created_at,updated_at,assignee_ids,business_id,external_id,external_source,document_url,work_summary")
        .in("status", ["todo", "in_progress", "blocked", "review", "done"])
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setTasks((data as unknown as Task[]) || []);
    } catch (err) {
      console.error("TaskBoard fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("task_board_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "mc_tasks" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setTasks((prev) => [payload.new as Task, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setTasks((prev) =>
            prev.map((t) => (t.id === (payload.new as Task).id ? (payload.new as Task) : t))
          );
        } else if (payload.eventType === "DELETE") {
          setTasks((prev) => prev.filter((t) => t.id !== (payload.old as Task).id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter logic
  const filteredTasks = tasks.filter((task) => {
    if (filterProject !== "all" && task.project !== filterProject) return false;
    if (filterOwner !== "all" && !task.tags.includes(filterOwner)) return false;
    if (filterPriority !== "all" && task.priority !== filterPriority) return false;
    return true;
  });

  const clearFilters = () => {
    setFilterProject("all");
    setFilterOwner("all");
    setFilterPriority("all");
  };

  const hasActiveFilters = filterProject !== "all" || filterOwner !== "all" || filterPriority !== "all";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-slate-900">Task Board</h3>
          {isLoading && <RefreshCw className="h-3.5 w-3.5 text-slate-400 animate-spin" />}
          <span className="text-xs text-slate-400">{filteredTasks.length} tasks</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTasks()}
            disabled={isLoading}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4 text-slate-500", isLoading && "animate-spin")} />
          </button>
          <button
            onClick={() => setNewTaskOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Project filter */}
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="h-8 text-xs w-[160px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {PROJECT_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Owner filter */}
        <Select value={filterOwner} onValueChange={setFilterOwner}>
          <SelectTrigger className="h-8 text-xs w-[140px]">
            <SelectValue placeholder="All Owners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Owners</SelectItem>
            {OWNER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority filter */}
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-8 text-xs w-[130px]">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="critical">🔴 Critical</SelectItem>
            <SelectItem value="high">🟠 High</SelectItem>
            <SelectItem value="medium">🟡 Medium</SelectItem>
            <SelectItem value="low">🟢 Low</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => fetchTasks()} className="ml-2 underline">Retry</button>
        </div>
      )}

      {/* Kanban columns */}
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-1 px-1">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);
          return (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={colTasks}
              onTaskClick={setSelectedTask}
              collapsedByDefault={col.id === "done"}
            />
          );
        })}
      </div>

      {/* Task detail modal */}
      <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />

      {/* New task form */}
      <NewTaskForm
        open={newTaskOpen}
        onOpenChange={setNewTaskOpen}
        onTaskCreated={fetchTasks}
        businessId={businessId}
      />
    </div>
  );
}

export default TaskBoard;
