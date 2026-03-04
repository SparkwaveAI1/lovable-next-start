import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Plus, ChevronDown, ChevronRight, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskPriority = "critical" | "high" | "medium" | "low";
type TaskStatus = "todo" | "in_progress" | "blocked" | "done";

interface MCTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: TaskPriority;
  tags: string[];
  project: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECTS = [
  "Sparkwave App",
  "n8n Migration",
  "Fight Flow",
  "Twitter / Iris",
  "Infrastructure",
  "Website",
];

const OWNER_OPTIONS = [
  { value: "dev", label: "Dev" },
  { value: "rico", label: "Rico" },
  { value: "scott", label: "Scott" },
  { value: "iris", label: "Iris" },
  { value: "agent", label: "Agent" },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "critical", label: "🔴 Critical" },
  { value: "high", label: "🟠 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low", label: "🟢 Low" },
];

const COLUMNS: { id: string; label: string; color: string; headerBg: string; countBg: string }[] = [
  { id: "todo", label: "Todo", color: "border-t-slate-400", headerBg: "bg-slate-50", countBg: "bg-slate-200 text-slate-700" },
  { id: "in_progress", label: "In Progress", color: "border-t-amber-400", headerBg: "bg-amber-50", countBg: "bg-amber-200 text-amber-800" },
  { id: "blocked", label: "Blocked", color: "border-t-red-400", headerBg: "bg-red-50", countBg: "bg-red-200 text-red-800" },
  { id: "done", label: "Done", color: "border-t-emerald-400", headerBg: "bg-emerald-50", countBg: "bg-emerald-200 text-emerald-800" },
];

// ─── Project badge colors ────────────────────────────────────────────────────

const PROJECT_COLORS: Record<string, { bg: string; text: string }> = {
  "Sparkwave App": { bg: "bg-violet-100", text: "text-violet-700" },
  "n8n Migration": { bg: "bg-blue-100", text: "text-blue-700" },
  "Fight Flow": { bg: "bg-orange-100", text: "text-orange-700" },
  "Twitter / Iris": { bg: "bg-pink-100", text: "text-pink-700" },
  "Infrastructure": { bg: "bg-slate-100", text: "text-slate-700" },
  "Website": { bg: "bg-teal-100", text: "text-teal-700" },
};

function projectBadge(project: string | null) {
  if (!project) return null;
  const colors = PROJECT_COLORS[project] || { bg: "bg-gray-100", text: "text-gray-700" };
  return (
    <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", colors.bg, colors.text)}>
      {project}
    </span>
  );
}

// ─── Priority badge ───────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<TaskPriority, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-red-100", text: "text-red-700", label: "Critical" },
  high: { bg: "bg-orange-100", text: "text-orange-700", label: "High" },
  medium: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Medium" },
  low: { bg: "bg-gray-100", text: "text-gray-500", label: "Low" },
};

function priorityBadge(priority: TaskPriority) {
  const s = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
  return (
    <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", s.bg, s.text)}>
      {s.label}
    </span>
  );
}

// ─── Owner extraction ─────────────────────────────────────────────────────────

function extractOwners(tags: string[]): string[] {
  return tags
    .filter((t) => t.startsWith("owner:") && t !== "owner:agent")
    .map((t) => {
      const raw = t.replace("owner:", "");
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    });
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCardItem({ task, onClick }: { task: MCTask; onClick: (t: MCTask) => void }) {
  const owners = extractOwners(task.tags);
  const desc = task.description ? task.description.slice(0, 80) + (task.description.length > 80 ? "…" : "") : "";

  return (
    <div
      className="bg-white border border-slate-200 rounded-lg p-3 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all space-y-2"
      onClick={() => onClick(task)}
    >
      <p className="font-semibold text-sm text-slate-900 leading-snug">{task.title}</p>

      <div className="flex flex-wrap gap-1 items-center">
        {projectBadge(task.project)}
        {priorityBadge(task.priority as TaskPriority)}
        {owners.map((o) => (
          <span key={o} className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">
            {o}
          </span>
        ))}
      </div>

      {desc && <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>}
    </div>
  );
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────

function TaskDetailModal({ task, onClose }: { task: MCTask; onClose: () => void }) {
  const owners = extractOwners(task.tags);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">{task.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex flex-wrap gap-2">
            {projectBadge(task.project)}
            {priorityBadge(task.priority as TaskPriority)}
            {owners.map((o) => (
              <span key={o} className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">
                {o}
              </span>
            ))}
          </div>
          {task.description ? (
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{task.description}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">No description</p>
          )}
          <div className="text-xs text-slate-400 space-y-1">
            <p>Status: <span className="font-medium text-slate-600">{task.status.replace("_", " ")}</span></p>
            <p>Tags: {task.tags.length ? task.tags.join(", ") : "none"}</p>
            <p>Created: {new Date(task.created_at).toLocaleString()}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── New Task Modal ───────────────────────────────────────────────────────────

interface NewTaskModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function NewTaskModal({ onClose, onCreated }: NewTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [project, setProject] = useState<string>("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [owner, setOwner] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const tags: string[] = [];
      if (owner) tags.push(`owner:${owner}`);

      const { error } = await supabase.from("mc_tasks").insert({
        title: title.trim(),
        description: description.trim() || null,
        status: "todo",
        priority,
        project: project || null,
        tags,
        assignee_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({ title: "Task created", description: `"${title.trim()}" added to Todo` });
      onCreated();
      onClose();
    } catch (err) {
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
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-title">Title *</Label>
              <Input
                id="task-title"
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea
                id="task-desc"
                placeholder="Optional context..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Project</Label>
                <Select value={project} onValueChange={setProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECTS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select value={owner} onValueChange={setOwner}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign owner" />
                </SelectTrigger>
                <SelectContent>
                  {OWNER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</> : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main TaskBoardPanel ──────────────────────────────────────────────────────

export function TaskBoardPanel() {
  const [tasks, setTasks] = useState<MCTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // UI state
  const [doneExpanded, setDoneExpanded] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MCTask | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("mc_tasks")
        .select("id,title,description,status,priority,tags,project,created_at,updated_at")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setTasks((data as MCTask[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Apply filters
  const filteredTasks = tasks.filter((t) => {
    if (filterProject !== "all" && t.project !== filterProject) return false;
    if (filterOwner !== "all" && !t.tags.includes(`owner:${filterOwner}`)) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  // Group tasks by column
  // Map DB statuses: todo→todo, in_progress→in_progress, blocked→blocked, done→done
  // Everything else (inbox, assigned, review, cancelled) → show in todo column
  function mapToColumn(status: string): string {
    if (status === "in_progress") return "in_progress";
    if (status === "blocked") return "blocked";
    if (status === "done") return "done";
    return "todo"; // inbox, assigned, todo, review, cancelled all go to todo
  }

  const columnTasks: Record<string, MCTask[]> = {
    todo: [],
    in_progress: [],
    blocked: [],
    done: [],
  };

  for (const t of filteredTasks) {
    const col = mapToColumn(t.status);
    columnTasks[col].push(t);
  }

  // Extract all unique owners from all tasks for filter dropdown
  const allOwners = Array.from(
    new Set(
      tasks
        .flatMap((t) => t.tags)
        .filter((tag) => tag.startsWith("owner:") && tag !== "owner:agent")
        .map((tag) => tag.replace("owner:", ""))
    )
  );

  // Extract all unique projects
  const allProjects = Array.from(new Set(tasks.map((t) => t.project).filter(Boolean))) as string[];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Task Board</h2>
          <p className="text-xs text-slate-500">{filteredTasks.length} tasks across all columns</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTasks}
            disabled={isLoading}
            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4 text-slate-500", isLoading && "animate-spin")} />
          </button>
          <button
            onClick={() => setShowNewTask(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {allProjects.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterOwner} onValueChange={setFilterOwner}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="All Owners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Owners</SelectItem>
            {allOwners.map((o) => (
              <SelectItem key={o} value={o}>
                {o.charAt(0).toUpperCase() + o.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterProject !== "all" || filterOwner !== "all" || filterPriority !== "all") && (
          <button
            onClick={() => { setFilterProject("all"); setFilterOwner("all"); setFilterPriority("all"); }}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button onClick={fetchTasks} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {/* Kanban columns */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-500">Loading tasks…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = columnTasks[col.id];
            const isDone = col.id === "done";
            const isExpanded = isDone ? doneExpanded : true;

            return (
              <div
                key={col.id}
                className={cn(
                  "rounded-xl border border-slate-200 overflow-hidden",
                  col.color,
                  "border-t-4"
                )}
              >
                {/* Column header */}
                <div
                  className={cn(
                    "px-3 py-2.5 flex items-center justify-between",
                    col.headerBg,
                    isDone && "cursor-pointer select-none"
                  )}
                  onClick={isDone ? () => setDoneExpanded((v) => !v) : undefined}
                >
                  <div className="flex items-center gap-2">
                    {isDone && (
                      isExpanded
                        ? <ChevronDown className="h-4 w-4 text-slate-500" />
                        : <ChevronRight className="h-4 w-4 text-slate-500" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                      {col.label}
                    </span>
                  </div>
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", col.countBg)}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                {isExpanded && (
                  <div className="p-2 space-y-2 min-h-[60px]">
                    {colTasks.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-4">No tasks</p>
                    ) : (
                      colTasks.map((task) => (
                        <TaskCardItem key={task.id} task={task} onClick={setSelectedTask} />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}

      {/* New task modal */}
      {showNewTask && (
        <NewTaskModal onClose={() => setShowNewTask(false)} onCreated={fetchTasks} />
      )}
    </div>
  );
}

export default TaskBoardPanel;
