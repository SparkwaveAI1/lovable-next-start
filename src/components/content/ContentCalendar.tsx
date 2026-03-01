import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { ComposePanel } from "./ComposePanel";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";

interface ScheduledItem {
  id: string;
  content: string;
  platform: string;
  content_type: string | null;
  scheduled_for: string | null;
  status: string | null;
}

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "bg-sky-500",
  linkedin: "bg-blue-600",
  instagram: "bg-pink-500",
  tiktok: "bg-slate-700",
  facebook: "bg-indigo-600",
};

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

interface DraggableChipProps {
  item: ScheduledItem;
  onClick: () => void;
}

function DraggableChip({ item, onClick }: DraggableChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  const platform = item.platform?.split(",")[0] ?? "twitter";
  const colorClass = PLATFORM_COLORS[platform] ?? "bg-slate-500";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={`${colorClass} text-white text-xs px-1.5 py-0.5 rounded truncate cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? "opacity-30" : ""}`}
      title={item.content}
    >
      {item.content.slice(0, 20)}{item.content.length > 20 ? "…" : ""}
    </div>
  );
}

interface DroppableDayProps {
  dateKey: string;
  date: Date;
  items: ScheduledItem[];
  isToday: boolean;
  isCurrentMonth: boolean;
  onDayClick: (date: Date) => void;
  onChipClick: (item: ScheduledItem) => void;
}

function DroppableDay({ dateKey, date, items, isToday, isCurrentMonth, onDayClick, onChipClick }: DroppableDayProps) {
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onDayClick(date)}
      className={`min-h-[80px] p-1.5 border-b border-r border-slate-100 cursor-pointer transition-colors
        ${isOver ? "bg-indigo-50" : "hover:bg-slate-50"}
        ${!isCurrentMonth ? "opacity-40" : ""}
      `}
    >
      <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
        isToday ? "bg-indigo-600 text-white" : "text-slate-600"
      }`}>
        {date.getDate()}
      </div>
      <div className="space-y-0.5">
        {items.slice(0, 3).map(item => (
          <DraggableChip key={item.id} item={item} onClick={() => onChipClick(item)} />
        ))}
        {items.length > 3 && (
          <div className="text-xs text-slate-400 pl-1">+{items.length - 3} more</div>
        )}
      </div>
    </div>
  );
}

export function ContentCalendar() {
  const { toast } = useToast();
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);
  const [editItem, setEditItem] = useState<ScheduledItem | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);

      const { data, error } = await supabase
        .from("scheduled_content")
        .select("id, content, platform, content_type, scheduled_for, status")
        .gte("scheduled_for", start.toISOString())
        .lte("scheduled_for", end.toISOString())
        .order("scheduled_for", { ascending: true });

      if (error) throw error;
      setItems((data ?? []) as ScheduledItem[]);
    } catch (e) {
      toast({ title: "Error loading calendar", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [currentDate, toast]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const getItemsForDate = (date: Date) =>
    items.filter(item => item.scheduled_for && isSameDay(new Date(item.scheduled_for), date));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);

  // Build calendar grid
  const calendarDays: { date: Date; isCurrentMonth: boolean }[] = [];

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  // Next month leading days
  const remaining = 42 - calendarDays.length;
  for (let d = 1; d <= remaining; d++) {
    calendarDays.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDayClick = (date: Date) => {
    setDefaultDate(date);
    setEditItem(null);
    setComposeOpen(true);
  };

  const handleChipClick = (item: ScheduledItem) => {
    // Open compose with edit
    setEditItem(item);
    setDefaultDate(null);
    setComposeOpen(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const itemId = String(active.id);
    const dateKey = String(over.id); // format: "YYYY-MM-DD"
    const newDate = new Date(dateKey + "T12:00:00");

    // Optimistic update
    const previousItems = [...items];
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, scheduled_for: newDate.toISOString() } : item
    ));

    try {
      const { error } = await supabase
        .from("scheduled_content")
        .update({ scheduled_for: newDate.toISOString() })
        .eq("id", itemId);

      if (error) throw error;
    } catch (e) {
      // Revert on error
      setItems(previousItems);
      toast({ title: "Failed to reschedule", description: String(e), variant: "destructive" });
    }
  };

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">{monthName}</h2>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <DndContext sensors={sensors} onDragStart={e => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd}>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map(({ date, isCurrentMonth }) => {
              const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
              const dayItems = getItemsForDate(date);
              const isToday = isSameDay(date, today);

              return (
                <DroppableDay
                  key={dateKey}
                  dateKey={dateKey}
                  date={date}
                  items={dayItems}
                  isToday={isToday}
                  isCurrentMonth={isCurrentMonth}
                  onDayClick={handleDayClick}
                  onChipClick={handleChipClick}
                />
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="bg-indigo-600 text-white text-xs px-2 py-1 rounded shadow-lg opacity-90">
              {items.find(i => i.id === activeId)?.content.slice(0, 30)}…
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Compose slide-over */}
      <ComposePanel
        open={composeOpen}
        onClose={() => { setComposeOpen(false); setEditItem(null); setDefaultDate(null); }}
        onSaved={fetchItems}
        defaultDate={defaultDate}
      />
    </div>
  );
}
