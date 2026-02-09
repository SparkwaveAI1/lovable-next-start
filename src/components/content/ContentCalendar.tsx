import * as React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isToday,
  parseISO,
} from "date-fns";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Twitter,
  Mail,
  MessageSquare,
  Linkedin,
  Star,
  Clock,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================================================
// Types
// ============================================================================

export type ContentPlatform = "twitter" | "email" | "sms" | "linkedin";
export type ContentStatus = "draft" | "scheduled" | "published" | "failed";

export interface ContentItem {
  id: string;
  title: string;
  content: string;
  platform: ContentPlatform;
  scheduledFor: Date | string;
  status: ContentStatus;
  qualityScore?: number;
  createdBy?: string;
  createdAt?: Date | string;
  mediaUrl?: string;
}

export interface ContentCalendarProps {
  items: ContentItem[];
  onItemClick?: (item: ContentItem) => void;
  onItemReschedule?: (item: ContentItem, newDate: Date) => void;
  onDateClick?: (date: Date) => void;
  className?: string;
}

type ViewMode = "month" | "week";

// ============================================================================
// Platform Configuration
// ============================================================================

const platformConfig: Record<
  ContentPlatform,
  {
    color: string;
    bgColor: string;
    borderColor: string;
    hoverColor: string;
    icon: React.ElementType;
    label: string;
  }
> = {
  twitter: {
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    hoverColor: "hover:bg-blue-100",
    icon: Twitter,
    label: "Twitter",
  },
  email: {
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    hoverColor: "hover:bg-green-100",
    icon: Mail,
    label: "Email",
  },
  sms: {
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    hoverColor: "hover:bg-yellow-100",
    icon: MessageSquare,
    label: "SMS",
  },
  linkedin: {
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    hoverColor: "hover:bg-purple-100",
    icon: Linkedin,
    label: "LinkedIn",
  },
};

const statusConfig: Record<
  ContentStatus,
  { color: string; label: string }
> = {
  draft: { color: "bg-gray-100 text-gray-600", label: "Draft" },
  scheduled: { color: "bg-blue-100 text-blue-600", label: "Scheduled" },
  published: { color: "bg-green-100 text-green-600", label: "Published" },
  failed: { color: "bg-red-100 text-red-600", label: "Failed" },
};

// ============================================================================
// Quality Score Badge
// ============================================================================

function QualityScoreBadge({ score }: { score: number }) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600 bg-green-50";
    if (score >= 6) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
        getScoreColor(score)
      )}
    >
      <Star className="h-3 w-3" />
      {score.toFixed(1)}
    </div>
  );
}

// ============================================================================
// Draggable Content Item
// ============================================================================

interface DraggableContentItemProps {
  item: ContentItem;
  onClick: () => void;
  isCompact?: boolean;
}

function DraggableContentItem({
  item,
  onClick,
  isCompact = false,
}: DraggableContentItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: item,
  });

  const platform = platformConfig[item.platform];
  const Icon = platform.icon;

  const scheduledDate =
    typeof item.scheduledFor === "string"
      ? parseISO(item.scheduledFor)
      : item.scheduledFor;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className={cn(
              "group cursor-grab active:cursor-grabbing rounded-md border px-2 py-1.5 text-xs transition-all",
              platform.bgColor,
              platform.borderColor,
              platform.hoverColor,
              isDragging && "opacity-50 shadow-lg scale-105",
              isCompact && "px-1.5 py-1"
            )}
          >
            <div className="flex items-center gap-1.5">
              <Icon className={cn("h-3 w-3 shrink-0", platform.color)} />
              <span className="truncate font-medium text-gray-900">
                {item.title || item.content.slice(0, 30)}
              </span>
            </div>
            {!isCompact && (
              <div className="flex items-center gap-2 mt-1 text-gray-500">
                <Clock className="h-2.5 w-2.5" />
                <span>{format(scheduledDate, "h:mm a")}</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4", platform.color)} />
                <span className="font-medium">{platform.label}</span>
              </div>
              {item.qualityScore !== undefined && (
                <QualityScoreBadge score={item.qualityScore} />
              )}
            </div>
            <p className="text-sm text-gray-600 line-clamp-3">
              {item.content}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{format(scheduledDate, "MMM d, yyyy 'at' h:mm a")}</span>
              <Badge
                variant="secondary"
                className={cn("text-xs", statusConfig[item.status].color)}
              >
                {statusConfig[item.status].label}
              </Badge>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Drag Overlay Content Item (shown while dragging)
// ============================================================================

function DragOverlayItem({ item }: { item: ContentItem }) {
  const platform = platformConfig[item.platform];
  const Icon = platform.icon;

  return (
    <div
      className={cn(
        "rounded-md border px-2 py-1.5 text-xs shadow-lg",
        platform.bgColor,
        platform.borderColor
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3 w-3 shrink-0", platform.color)} />
        <span className="truncate font-medium text-gray-900">
          {item.title || item.content.slice(0, 30)}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Droppable Day Cell
// ============================================================================

interface DroppableDayCellProps {
  date: Date;
  items: ContentItem[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onItemClick: (item: ContentItem) => void;
  onDateClick: () => void;
  isWeekView?: boolean;
}

function DroppableDayCell({
  date,
  items,
  isCurrentMonth,
  isToday: isTodayDate,
  onItemClick,
  onDateClick,
  isWeekView = false,
}: DroppableDayCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: format(date, "yyyy-MM-dd"),
    data: { date },
  });

  const maxVisible = isWeekView ? 8 : 3;
  const visibleItems = items.slice(0, maxVisible);
  const hiddenCount = items.length - maxVisible;

  // Group by platform for summary
  const platformCounts = items.reduce((acc, item) => {
    acc[item.platform] = (acc[item.platform] || 0) + 1;
    return acc;
  }, {} as Record<ContentPlatform, number>);

  return (
    <div
      ref={setNodeRef}
      onClick={onDateClick}
      className={cn(
        "min-h-[100px] border-r border-b p-1.5 transition-colors cursor-pointer",
        isCurrentMonth ? "bg-white" : "bg-gray-50",
        isOver && "bg-blue-50 ring-2 ring-blue-400 ring-inset",
        isTodayDate && "bg-blue-50/50",
        isWeekView && "min-h-[200px]"
      )}
    >
      {/* Date header */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            "inline-flex items-center justify-center w-6 h-6 text-sm rounded-full",
            isTodayDate && "bg-blue-600 text-white font-semibold",
            !isCurrentMonth && "text-gray-400"
          )}
        >
          {format(date, "d")}
        </span>
        {/* Platform summary badges */}
        {items.length > 0 && !isWeekView && (
          <div className="flex gap-0.5">
            {Object.entries(platformCounts).map(([platform, count]) => {
              const config = platformConfig[platform as ContentPlatform];
              const Icon = config.icon;
              return (
                <div
                  key={platform}
                  className={cn(
                    "flex items-center gap-0.5 px-1 py-0.5 rounded text-xs",
                    config.bgColor,
                    config.color
                  )}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {count > 1 && <span>{count}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Content items */}
      <div className="space-y-1">
        {visibleItems.map((item) => (
          <DraggableContentItem
            key={item.id}
            item={item}
            onClick={() => onItemClick(item)}
            isCompact={!isWeekView && items.length > 2}
          />
        ))}
        {hiddenCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDateClick();
            }}
            className="w-full text-xs text-gray-500 hover:text-gray-700 py-0.5"
          >
            +{hiddenCount} more
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Content Detail Dialog
// ============================================================================

interface ContentDetailDialogProps {
  item: ContentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ContentDetailDialog({
  item,
  open,
  onOpenChange,
}: ContentDetailDialogProps) {
  if (!item) return null;

  const platform = platformConfig[item.platform];
  const Icon = platform.icon;
  const scheduledDate =
    typeof item.scheduledFor === "string"
      ? parseISO(item.scheduledFor)
      : item.scheduledFor;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "p-2 rounded-lg",
                platform.bgColor,
                platform.borderColor,
                "border"
              )}
            >
              <Icon className={cn("h-5 w-5", platform.color)} />
            </div>
            <div>
              <DialogTitle>{item.title || "Content Item"}</DialogTitle>
              <DialogDescription>
                {platform.label} • {format(scheduledDate, "MMMM d, yyyy 'at' h:mm a")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status and Quality */}
          <div className="flex items-center gap-3">
            <Badge
              variant="secondary"
              className={statusConfig[item.status].color}
            >
              {statusConfig[item.status].label}
            </Badge>
            {item.qualityScore !== undefined && (
              <QualityScoreBadge score={item.qualityScore} />
            )}
          </div>

          {/* Content preview */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {item.content}
            </p>
          </div>

          {/* Media preview */}
          {item.mediaUrl && (
            <div className="rounded-lg border overflow-hidden">
              <img
                src={item.mediaUrl}
                alt="Content media"
                className="w-full h-48 object-cover"
              />
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Scheduled For</p>
              <p className="font-medium">
                {format(scheduledDate, "MMM d, yyyy")}
              </p>
              <p className="text-gray-600">{format(scheduledDate, "h:mm a")}</p>
            </div>
            {item.createdBy && (
              <div>
                <p className="text-gray-500">Created By</p>
                <p className="font-medium">{item.createdBy}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button>
            <Eye className="h-4 w-4 mr-2" />
            View Full Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Platform Legend
// ============================================================================

function PlatformLegend() {
  return (
    <div className="flex items-center gap-4 text-sm text-gray-600">
      {Object.entries(platformConfig).map(([key, config]) => {
        const Icon = config.icon;
        return (
          <div key={key} className="flex items-center gap-1.5">
            <div
              className={cn(
                "p-1 rounded",
                config.bgColor,
                config.borderColor,
                "border"
              )}
            >
              <Icon className={cn("h-3 w-3", config.color)} />
            </div>
            <span>{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Content Calendar Component
// ============================================================================

export function ContentCalendar({
  items,
  onItemClick,
  onItemReschedule,
  onDateClick,
  className,
}: ContentCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [viewMode, setViewMode] = React.useState<ViewMode>("month");
  const [selectedItem, setSelectedItem] = React.useState<ContentItem | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [activeItem, setActiveItem] = React.useState<ContentItem | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Navigation
  const goToPrevious = () => {
    if (viewMode === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const goToNext = () => {
    if (viewMode === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar days
  const calendarDays = React.useMemo(() => {
    if (viewMode === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart);
      const calendarEnd = endOfWeek(monthEnd);
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  }, [currentDate, viewMode]);

  // Group items by date
  const itemsByDate = React.useMemo(() => {
    const grouped: Record<string, ContentItem[]> = {};
    items.forEach((item) => {
      const date =
        typeof item.scheduledFor === "string"
          ? parseISO(item.scheduledFor)
          : item.scheduledFor;
      const key = format(date, "yyyy-MM-dd");
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });
    // Sort items within each day by time
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        const dateA =
          typeof a.scheduledFor === "string"
            ? parseISO(a.scheduledFor)
            : a.scheduledFor;
        const dateB =
          typeof b.scheduledFor === "string"
            ? parseISO(b.scheduledFor)
            : b.scheduledFor;
        return dateA.getTime() - dateB.getTime();
      });
    });
    return grouped;
  }, [items]);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const item = event.active.data.current as ContentItem;
    setActiveItem(item);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const item = active.data.current as ContentItem;
    const targetDate = (over.data.current as { date: Date })?.date;

    if (!targetDate) return;

    // Check if the date actually changed
    const currentDate =
      typeof item.scheduledFor === "string"
        ? parseISO(item.scheduledFor)
        : item.scheduledFor;

    if (!isSameDay(currentDate, targetDate)) {
      // Keep the same time, just change the date
      const newScheduledFor = new Date(targetDate);
      newScheduledFor.setHours(currentDate.getHours());
      newScheduledFor.setMinutes(currentDate.getMinutes());
      newScheduledFor.setSeconds(currentDate.getSeconds());

      onItemReschedule?.(item, newScheduledFor);
    }
  };

  const handleItemClick = (item: ContentItem) => {
    setSelectedItem(item);
    setDialogOpen(true);
    onItemClick?.(item);
  };

  const handleDateClick = (date: Date) => {
    onDateClick?.(date);
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        {/* Header controls */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-gray-500" />
            <CardTitle className="text-xl">
              {viewMode === "month"
                ? format(currentDate, "MMMM yyyy")
                : `Week of ${format(startOfWeek(currentDate), "MMM d, yyyy")}`}
            </CardTitle>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <Select
              value={viewMode}
              onValueChange={(v) => setViewMode(v as ViewMode)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
              </SelectContent>
            </Select>

            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={goToPrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4">
          <PlatformLegend />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="border-t border-l">
            {/* Day headers */}
            <div className="grid grid-cols-7">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="border-r border-b px-2 py-2 text-center text-sm font-medium text-gray-500 bg-gray-50"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const dayItems = itemsByDate[dateKey] || [];

                return (
                  <DroppableDayCell
                    key={dateKey}
                    date={day}
                    items={dayItems}
                    isCurrentMonth={isSameMonth(day, currentDate)}
                    isToday={isToday(day)}
                    onItemClick={handleItemClick}
                    onDateClick={() => handleDateClick(day)}
                    isWeekView={viewMode === "week"}
                  />
                );
              })}
            </div>
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeItem && <DragOverlayItem item={activeItem} />}
          </DragOverlay>
        </DndContext>
      </CardContent>

      {/* Content detail dialog */}
      <ContentDetailDialog
        item={selectedItem}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Card>
  );
}

// ============================================================================
// Export Types
// ============================================================================

export type { ContentCalendarProps };
