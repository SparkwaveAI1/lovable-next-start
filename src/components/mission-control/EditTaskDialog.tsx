"use client";

import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import type { Task, TaskPriority, TaskStatus } from "@/types/mission-control";
import { KANBAN_COLUMNS } from "@/types/mission-control";
import { Loader2, Trash2 } from "lucide-react";
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

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onTaskUpdated?: () => void;
  onTaskDeleted?: () => void;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; emoji: string }[] = [
  { value: "critical", label: "Critical", emoji: "🔴" },
  { value: "high", label: "High", emoji: "🟠" },
  { value: "medium", label: "Medium", emoji: "🟡" },
  { value: "low", label: "Low", emoji: "🟢" },
];

export function EditTaskDialog({
  open,
  onOpenChange,
  task,
  onTaskUpdated,
  onTaskDeleted,
}: EditTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("inbox");
  const [workSummary, setWorkSummary] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  // Update form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority);
      setStatus(task.status);
      setWorkSummary(task.work_summary || "");
      setDocumentUrl(task.document_url || "");
      setTags(task.tags.join(", "));
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!task) return;
    
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a task title",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Process tags
      const processedTags = tags
        .split(",")
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const { error } = await supabase
        .from("mc_tasks")
        .update({
          title: title.trim(),
          description: description.trim(),
          priority,
          status,
          work_summary: workSummary.trim() || null,
          document_url: documentUrl.trim() || null,
          tags: processedTags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      if (error) throw error;

      // Log activity
      await supabase.from("mc_activities").insert({
        type: "task_updated",
        agent_id: null,
        task_id: task.id,
        message: `Task "${title.trim()}" updated`,
        metadata: { 
          priority, 
          status,
          source: "mission-control-ui",
          changes: {
            title: task.title !== title.trim(),
            description: task.description !== description.trim(),
            priority: task.priority !== priority,
            status: task.status !== status,
          }
        },
        business_id: task.business_id,
        created_at: new Date().toISOString(),
      });

      toast({
        title: "Task updated",
        description: `"${title.trim()}" has been updated`,
      });

      onOpenChange(false);
      onTaskUpdated?.();
    } catch (err) {
      console.error("Failed to update task:", err);
      toast({
        title: "Failed to update task",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    
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
      onOpenChange(false);
      onTaskDeleted?.();
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

  if (!task) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[525px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>
                Update task details and properties.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="What needs to be done?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Additional details about the task..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(value) => setPriority(value as TaskPriority)}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <span>{option.emoji}</span>
                            <span>{option.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as TaskStatus)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {KANBAN_COLUMNS.map((column) => (
                        <SelectItem key={column.id} value={column.id}>
                          {column.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="workSummary">Work Summary</Label>
                <Textarea
                  id="workSummary"
                  placeholder="Summary of work done on this task..."
                  value={workSummary}
                  onChange={(e) => setWorkSummary(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="documentUrl">Document URL</Label>
                <Input
                  id="documentUrl"
                  placeholder="https://docs.example.com/..."
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  type="url"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  placeholder="tag1, tag2, tag3"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
                <p className="text-xs text-slate-500">Comma-separated tags</p>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting || isDeleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting || isDeleting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || isDeleting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              onClick={handleDelete}
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

export default EditTaskDialog;