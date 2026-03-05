import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority, TaskStatus } from "@/types/mission-control";
import { Zap, AlertTriangle, Clock, User, Users, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: 'critical', label: '🔴 Critical' },
  { value: 'high', label: '🟠 High' },
  { value: 'medium', label: '🟡 Medium' },
  { value: 'low', label: '🟢 Low' },
];

function getOwnerType(tags: string[] | null | undefined): 'human' | 'cooperative' | null {
  if (!tags || !Array.isArray(tags)) return null;
  for (const tag of tags) {
    if (tag === 'owner:human' || tag === 'owner:scott') return 'human';
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
  const { toast } = useToast();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    status: 'inbox' as TaskStatus,
    work_summary: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Filter tasks that need Scott's input
  const scottTasks = tasks.filter(task => {
    if (task.status === 'done') return false;
    const ownerType = getOwnerType(task.tags);
    return ownerType === 'human' || ownerType === 'cooperative' || isBlockedOnScott(task);
  });

  // DEBUG: Log counts to console
  console.log('[ScottsActionItems] Total tasks:', tasks.length, '| Scott tasks:', scottTasks.length);

  // Sort: blocked items first, then by priority
  const sortedTasks = [...scottTasks].sort((a, b) => {
    const aBlocked = isBlockedOnScott(a) ? 0 : 1;
    const bBlocked = isBlockedOnScott(b) ? 0 : 1;
    if (aBlocked !== bBlocked) return aBlocked - bBlocked;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Open edit dialog with task data
  const openEditDialog = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTask(task);
    setEditForm({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      status: task.status || 'inbox',
      work_summary: task.work_summary || '',
    });
  };

  // Save task changes
  const handleSave = async () => {
    if (!editingTask) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('mc_tasks')
        .update({
          title: editForm.title,
          description: editForm.description,
          priority: editForm.priority,
          status: editForm.status,
          work_summary: editForm.work_summary,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingTask.id);

      if (error) throw error;

      // Log activity for status change
      if (editForm.status !== editingTask.status) {
        await supabase.from('mc_activities').insert({
          type: 'status_changed',
          agent_id: null,
          task_id: editingTask.id,
          message: `Scott updated "${editForm.title}" status from ${editingTask.status.replace('_', ' ')} to ${editForm.status.replace('_', ' ')}`,
          metadata: { from: editingTask.status, to: editForm.status, updated_by: 'scott' },
          business_id: editingTask.business_id,
        });
      }

      toast({ title: "Task updated", description: "Changes saved successfully" });
      setEditingTask(null);
    } catch (err) {
      console.error('Error updating task:', err);
      toast({ 
        title: "Failed to save", 
        description: err instanceof Error ? err.message : 'Unknown error', 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Quick action: Mark as Done
  const handleMarkDone = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('mc_tasks')
        .update({
          status: 'done',
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      if (error) throw error;

      // Log activity
      await supabase.from('mc_activities').insert({
        type: 'status_changed',
        agent_id: null,
        task_id: task.id,
        message: `Scott marked "${task.title}" as done ✓`,
        metadata: { from: task.status, to: 'done', updated_by: 'scott' },
        business_id: task.business_id,
      });

      toast({ title: "✓ Marked done", description: task.title });
    } catch (err) {
      console.error('Error marking done:', err);
      toast({ 
        title: "Failed to update", 
        description: err instanceof Error ? err.message : 'Unknown error', 
        variant: "destructive" 
      });
    }
  };

  // Quick action: Change priority
  const handleQuickPriority = async (task: Task, newPriority: TaskPriority, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (newPriority === task.priority) return;

    try {
      const { error } = await supabase
        .from('mc_tasks')
        .update({
          priority: newPriority,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      if (error) throw error;

      toast({ 
        title: "Priority updated", 
        description: `${task.title} → ${priorityBadge[newPriority].label}` 
      });
    } catch (err) {
      console.error('Error updating priority:', err);
      toast({ 
        title: "Failed to update", 
        description: err instanceof Error ? err.message : 'Unknown error', 
        variant: "destructive" 
      });
    }
  };

  return (
    <>
      <div className={cn("bg-white rounded-xl border border-slate-200 overflow-hidden", className)}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-600" />
          <h3 className="font-semibold text-sm text-slate-900">Scott's To-Do</h3>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
            {sortedTasks.length}
          </span>
          <span className="text-xs text-slate-400 ml-auto">Click to edit • Quick actions on hover</span>
        </div>

        {/* Items */}
        <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
          {sortedTasks.length === 0 && (
            <div className="text-center py-6 text-slate-400 text-sm">
              ✨ All clear — nothing blocking Scott's work
            </div>
          )}
          {sortedTasks.map((task) => {
            const ownerType = getOwnerType(task.tags);
            const blocked = isBlockedOnScott(task);
            const pBadge = priorityBadge[task.priority];

            return (
              <div
                key={task.id}
                className={cn(
                  "group p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all relative",
                  blocked
                    ? "bg-red-50/50 border-red-200 border-l-4 border-l-red-500"
                    : ownerType === 'human'
                      ? "bg-emerald-50/50 border-emerald-200 border-l-4 border-l-emerald-500"
                      : "bg-purple-50/50 border-purple-200 border-l-4 border-l-purple-500"
                )}
                onClick={(e) => openEditDialog(task, e)}
              >
                {/* Quick action buttons - visible on hover */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Quick Priority Dropdown */}
                  <Select
                    value={task.priority}
                    onValueChange={(value) => handleQuickPriority(task, value as TaskPriority, { stopPropagation: () => {} } as React.MouseEvent)}
                  >
                    <SelectTrigger 
                      className="h-7 w-24 text-xs bg-white shadow-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Mark Done Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                    onClick={(e) => handleMarkDone(task, e)}
                    title="Mark as Done"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span className="text-xs ml-1">Done</span>
                  </Button>
                  
                  {/* Edit Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0 bg-white hover:bg-slate-100"
                    onClick={(e) => openEditDialog(task, e)}
                    title="Edit Task"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>

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
                    {task.work_summary && (
                      <p className="text-xs text-blue-600 line-clamp-1 mt-0.5 italic">📝 {task.work_summary}</p>
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

      {/* Edit Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details, status, and add notes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Task title"
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Task description..."
                className="min-h-[80px]"
              />
            </div>

            {/* Priority & Status Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  value={editForm.priority}
                  onValueChange={(value) => setEditForm(f => ({ ...f, priority: value as TaskPriority }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => setEditForm(f => ({ ...f, status: value as TaskStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes/Work Summary */}
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes / Work Summary</Label>
              <Textarea
                id="edit-notes"
                value={editForm.work_summary}
                onChange={(e) => setEditForm(f => ({ ...f, work_summary: e.target.value }))}
                placeholder="Add notes, comments, or work summary..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditingTask(null)}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ScottsActionItems;
