import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { SortableTaskCard, TaskCard } from "./TaskCard";
import type { Task, TaskStatus, Agent } from "@/types/mission-control";
import { KANBAN_COLUMNS } from "@/types/mission-control";
import { Plus } from "lucide-react";

interface KanbanBoardProps {
  tasks: Task[];
  agents: Agent[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: (status: TaskStatus) => void;
  onTaskStatusChange?: (taskId: string, newStatus: TaskStatus) => Promise<void>;
}

function getColumnCounts(tasks: Task[]): Record<TaskStatus, number> {
  return tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<TaskStatus, number>);
}

const columnStyles: Record<TaskStatus, { headerBg: string; countBg: string; dropBg: string }> = {
  inbox: { headerBg: 'bg-slate-50', countBg: 'bg-slate-200 text-slate-700', dropBg: 'bg-slate-100' },
  assigned: { headerBg: 'bg-blue-50', countBg: 'bg-blue-100 text-blue-700', dropBg: 'bg-blue-50' },
  in_progress: { headerBg: 'bg-amber-50', countBg: 'bg-amber-100 text-amber-700', dropBg: 'bg-amber-50' },
  review: { headerBg: 'bg-violet-50', countBg: 'bg-violet-100 text-violet-700', dropBg: 'bg-violet-50' },
  done: { headerBg: 'bg-emerald-50', countBg: 'bg-emerald-100 text-emerald-700', dropBg: 'bg-emerald-50' },
};

export function KanbanBoard({ tasks, agents, onTaskClick, onAddTask, onTaskStatusChange }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const counts = getColumnCounts(tasks);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id?.toString() || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setOverId(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determine target column
    let targetStatus: TaskStatus | null = null;

    // Check if dropped on a column
    if (KANBAN_COLUMNS.some((col) => col.id === over.id)) {
      targetStatus = over.id as TaskStatus;
    } else {
      // Dropped on another task - find which column it's in
      const targetTask = tasks.find((t) => t.id === over.id);
      if (targetTask) {
        targetStatus = targetTask.status;
      }
    }

    // If status changed, call the callback
    if (targetStatus && targetStatus !== task.status && onTaskStatusChange) {
      await onTaskStatusChange(taskId, targetStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 max-h-[600px]">
        {KANBAN_COLUMNS.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.id);
          const style = columnStyles[column.id];
          const isOver = overId === column.id;

          return (
            <div
              key={column.id}
              data-column-id={column.id}
              className={cn(
                "flex-shrink-0 w-72 h-full flex flex-col rounded-xl transition-all duration-200 overflow-hidden",
                isOver ? style.dropBg : "bg-slate-50/50",
                isOver && "ring-2 ring-offset-2 ring-violet-400"
              )}
            >
              {/* Column Header */}
              <div className={cn("px-3 py-2.5 rounded-t-xl", style.headerBg)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-xs tracking-wide text-slate-700">
                      {column.label}
                    </h3>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                        style.countBg
                      )}
                    >
                      {counts[column.id] || 0}
                    </span>
                  </div>
                  {onAddTask && column.id === 'inbox' && (
                    <button
                      onClick={() => onAddTask(column.id)}
                      className="p-1 hover:bg-white/50 rounded transition-colors"
                    >
                      <Plus className="h-4 w-4 text-slate-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* Column Content - Droppable Zone */}
              <SortableContext
                items={columnTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
                id={column.id}
              >
                <div
                  className={cn(
                    "flex-1 p-2 space-y-2 min-h-[120px] max-h-[600px] overflow-y-auto transition-colors",
                    isOver && "bg-opacity-80"
                  )}
                  data-droppable-id={column.id}
                >
                  {columnTasks.length === 0 ? (
                    <div
                      className={cn(
                        "flex items-center justify-center h-20 border-2 border-dashed rounded-lg transition-colors",
                        isOver ? "border-violet-400 bg-violet-50" : "border-slate-200"
                      )}
                    >
                      <span className="text-xs text-slate-400">
                        {isOver ? "Drop here" : "No tasks"}
                      </span>
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        agents={agents}
                        onClick={() => onTaskClick?.(task)}
                        isDragging={activeTask?.id === task.id}
                      />
                    ))
                  )}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask ? (
          <TaskCard
            task={activeTask}
            agents={agents}
            isDragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default KanbanBoard;
