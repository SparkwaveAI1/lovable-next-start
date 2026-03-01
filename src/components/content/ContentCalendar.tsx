import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Loader2, CalendarOff, Plus, Pencil } from "lucide-react";
import { ComposePanel, ComposableItem } from "./ComposePanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduledItem {
  id: string;
  content: string;
  platform: string;
  content_type: string | null;
  scheduled_for: string | null;
  status: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  twitter:   "bg-sky-500",
  linkedin:  "bg-blue-600",
  instagram: "bg-pink-500",
  tiktok:    "bg-slate-700",
  facebook:  "bg-indigo-600",
};

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Utilities ────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

/** Convert a raw scheduled_content row → ComposableItem for ComposePanel */
function toComposable(item: ScheduledItem, brand: string): ComposableItem {
  return {
    id:           item.id,
    content:      item.content,
    platform:     item.platform,
    format:       item.content_type,
    status:       item.status,
    scheduled_at: item.scheduled_for,
    brand,
    image_urls:   null,
    source:       "scheduled",
  };
}

// ─── DnD sub-components ───────────────────────────────────────────────────────

interface DraggableChipProps {
  item: ScheduledItem;
  onClick: () => void;
}

function DraggableChip({ item, onClick }: DraggableChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  const platform   = item.platform?.split(",")[0] ?? "twitter";
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

// ─── Main component ───────────────────────────────────────────────────────────

interface ContentCalendarProps {
  /** Short brand name (used for ComposePanel brand pass-through) */
  brand: string;
  /** Business UUID — used for scheduled_content.business_id filter */
  businessId: string;
}

export function ContentCalendar({ brand, businessId }: ContentCalendarProps) {
  const { toast } = useToast();
  const today     = new Date();

  const [currentDate, setCurrentDate]   = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [items, setItems]               = useState<ScheduledItem[]>([]);
  const [unscheduled, setUnscheduled]   = useState<ScheduledItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [composeOpen, setComposeOpen]       = useState(false);
  const [defaultDate, setDefaultDate]       = useState<Date | null>(null);
  const [editItem, setEditItem]             = useState<ComposableItem | null>(null);
  const [activeId, setActiveId]             = useState<string | null>(null);
  const [dayDetailOpen, setDayDetailOpen]   = useState(false);
  const [dayDetailDate, setDayDetailDate]   = useState<Date | null>(null);
  const [dayDetailItems, setDayDetailItems] = useState<ScheduledItem[]>([]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ─── Fetch scheduled + unscheduled items ─────────────────────────────────
  const fetchItems = useCallback(async () => {
    if (!businessId) {
      setItems([]);
      setUnscheduled([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const end   = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);

      const [scheduledRes, unscheduledRes] = await Promise.all([
        // Items with a scheduled date in the visible window
        supabase
          .from("scheduled_content")
          .select("id, content, platform, content_type, scheduled_for, status")
          .eq("business_id", businessId)
          .gte("scheduled_for", start.toISOString())
          .lte("scheduled_for", end.toISOString())
          .order("scheduled_for", { ascending: true }),

        // Items with NO scheduled date (need scheduling)
        supabase
          .from("scheduled_content")
          .select("id, content, platform, content_type, scheduled_for, status")
          .eq("business_id", businessId)
          .is("scheduled_for", null)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (scheduledRes.error)   throw scheduledRes.error;
      if (unscheduledRes.error) throw unscheduledRes.error;

      setItems((scheduledRes.data ?? []) as ScheduledItem[]);
      setUnscheduled((unscheduledRes.data ?? []) as ScheduledItem[]);
    } catch (e) {
      toast({ title: "Error loading calendar", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [businessId, currentDate, toast]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ─── Calendar grid helpers ────────────────────────────────────────────────
  const getItemsForDate = (date: Date) =>
    items.filter(item => item.scheduled_for && isSameDay(new Date(item.scheduled_for), date));

  const year         = currentDate.getFullYear();
  const month        = currentDate.getMonth();
  const daysInMonth  = getDaysInMonth(year, month);
  const firstDay     = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);

  const calendarDays: { date: Date; isCurrentMonth: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--)
    calendarDays.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false });
  for (let d = 1; d <= daysInMonth; d++)
    calendarDays.push({ date: new Date(year, month, d), isCurrentMonth: true });
  const remaining = 42 - calendarDays.length;
  for (let d = 1; d <= remaining; d++)
    calendarDays.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleDayClick = (date: Date) => {
    const dayItems = getItemsForDate(date);
    if (dayItems.length > 0) {
      // Show day detail panel so the user can see/edit existing content
      setDayDetailDate(date);
      setDayDetailItems(dayItems);
      setDayDetailOpen(true);
    } else {
      // Empty day — jump straight to Compose to create new content
      setDefaultDate(date);
      setEditItem(null);
      setComposeOpen(true);
    }
  };

  const handleChipClick = (item: ScheduledItem) => {
    setEditItem(toComposable(item, brand));
    setDefaultDate(null);
    setComposeOpen(true);
  };

  const handleUnscheduledClick = (item: ScheduledItem) => {
    setEditItem(toComposable(item, brand));
    setDefaultDate(null);
    setComposeOpen(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const itemId  = String(active.id);
    const dateKey = String(over.id);
    const newDate = new Date(dateKey + "T12:00:00");

    const previousItems     = [...items];
    const previousUnscheduled = [...unscheduled];

    // Optimistic update — move from unscheduled to scheduled if needed
    const wasUnscheduled = unscheduled.find(i => i.id === itemId);
    if (wasUnscheduled) {
      setUnscheduled(prev => prev.filter(i => i.id !== itemId));
      setItems(prev => [...prev, { ...wasUnscheduled, scheduled_for: newDate.toISOString() }]);
    } else {
      setItems(prev =>
        prev.map(item => item.id === itemId ? { ...item, scheduled_for: newDate.toISOString() } : item)
      );
    }

    try {
      const { error } = await supabase
        .from("scheduled_content")
        .update({ scheduled_for: newDate.toISOString() })
        .eq("id", itemId);

      if (error) throw error;
    } catch (e) {
      setItems(previousItems);
      setUnscheduled(previousUnscheduled);
      toast({ title: "Failed to reschedule", description: String(e), variant: "destructive" });
    }
  };

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">{monthName}</h2>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <DndContext
        sensors={sensors}
        onDragStart={e => setActiveId(String(e.active.id))}
        onDragEnd={handleDragEnd}
      >
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
              const isToday  = isSameDay(date, today);

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
              {[...items, ...unscheduled].find(i => i.id === activeId)?.content.slice(0, 30)}…
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ─── Unscheduled items section ──────────────────────────────────── */}
      {(unscheduled.length > 0 || (!loading && businessId)) && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
            <CalendarOff className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700">
              Unscheduled ({unscheduled.length})
            </h3>
            <p className="text-xs text-slate-400 ml-1">
              — click an item to schedule it
            </p>
          </div>

          {unscheduled.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              All content is scheduled ✓
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {unscheduled.map(item => {
                const platform  = item.platform?.split(",")[0] ?? "";
                const colorDot  = PLATFORM_COLORS[platform] ?? "bg-slate-400";
                return (
                  <button
                    key={item.id}
                    onClick={() => handleUnscheduledClick(item)}
                    className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors flex items-start gap-3 group"
                  >
                    <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${colorDot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 line-clamp-2 group-hover:text-indigo-700">
                        {item.content}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {platform && (
                          <span className="text-xs text-slate-400">{platform}</span>
                        )}
                        {item.content_type && (
                          <span className="text-xs text-slate-300">·</span>
                        )}
                        {item.content_type && (
                          <span className="text-xs text-slate-400">{item.content_type}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1">
                      Schedule →
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Day Detail Dialog — shows existing content for a day */}
      <Dialog open={dayDetailOpen} onOpenChange={setDayDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dayDetailDate
                ? dayDetailDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {dayDetailItems.map(item => {
              const platform = item.platform?.split(",")?.[0]?.trim() ?? "";
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setDayDetailOpen(false);
                    setEditItem(toComposable(item, brand));
                    setDefaultDate(null);
                    setComposeOpen(true);
                  }}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-slate-700 line-clamp-2 flex-1">{item.content}</p>
                    <Pencil className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-500 flex-shrink-0 mt-0.5 transition-colors" />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {platform && <span className="text-xs text-slate-400">{platform}</span>}
                    {item.status && <span className="text-xs text-slate-400 capitalize">{item.status}</span>}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="pt-2 border-t border-slate-100">
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                setDayDetailOpen(false);
                setDefaultDate(dayDetailDate);
                setEditItem(null);
                setComposeOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add content for this day
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Compose slide-over */}
      <ComposePanel
        open={composeOpen}
        onClose={() => { setComposeOpen(false); setEditItem(null); setDefaultDate(null); }}
        onSaved={fetchItems}
        defaultDate={defaultDate}
        editItem={editItem}
        brand={brand}
        businessId={businessId}
      />
    </div>
  );
}
