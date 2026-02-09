import { useState, useEffect, useCallback } from "react";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Clock,
  Edit2,
  Trash2,
  GripVertical,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  Send,
  Eye,
  Image as ImageIcon,
  Video,
  Star,
  Filter,
  RefreshCw,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";

// ============ Types ============

type ContentStatus = "draft" | "review" | "scheduled" | "published";

interface ContentItem {
  id: string;
  business_id: string;
  platform: string;
  content: string;
  content_type: string;
  status: ContentStatus;
  approval_status: string;
  scheduled_for: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
  topic?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  error_message?: string | null;
  // Quality scores (from quality_scores or inline)
  quality_score?: number | null;
  brand_voice_score?: number | null;
  engagement_score?: number | null;
  clarity_score?: number | null;
  platform_fit_score?: number | null;
  // Media
  content_media?: Array<{
    media_id: string;
    display_order: number;
    media_assets: {
      id: string;
      file_path: string;
      file_type: string;
      thumbnail_path: string | null;
    };
  }>;
}

interface ContentPipelineProps {
  businessId: string;
  onEditContent?: (content: ContentItem) => void;
  onScheduleContent?: (content: ContentItem) => void;
}

// ============ Column Configuration ============

const PIPELINE_COLUMNS: { id: ContentStatus; label: string; icon: React.ReactNode }[] = [
  { id: "draft", label: "Draft", icon: <Edit2 className="h-4 w-4" /> },
  { id: "review", label: "Review", icon: <Eye className="h-4 w-4" /> },
  { id: "scheduled", label: "Scheduled", icon: <CalendarClock className="h-4 w-4" /> },
  { id: "published", label: "Published", icon: <CheckCircle className="h-4 w-4" /> },
];

const columnStyles: Record<ContentStatus, { headerBg: string; countBg: string; dropBg: string }> = {
  draft: { headerBg: "bg-slate-50", countBg: "bg-slate-200 text-slate-700", dropBg: "bg-slate-100" },
  review: { headerBg: "bg-amber-50", countBg: "bg-amber-100 text-amber-700", dropBg: "bg-amber-50" },
  scheduled: { headerBg: "bg-blue-50", countBg: "bg-blue-100 text-blue-700", dropBg: "bg-blue-50" },
  published: { headerBg: "bg-emerald-50", countBg: "bg-emerald-100 text-emerald-700", dropBg: "bg-emerald-50" },
};

const platformConfig: Record<string, { icon: string; label: string; color: string }> = {
  twitter: { icon: "𝕏", label: "Twitter", color: "bg-black text-white" },
  instagram: { icon: "📷", label: "Instagram", color: "bg-gradient-to-r from-purple-500 to-pink-500 text-white" },
  tiktok: { icon: "🎵", label: "TikTok", color: "bg-black text-white" },
  linkedin: { icon: "💼", label: "LinkedIn", color: "bg-blue-600 text-white" },
  facebook: { icon: "👥", label: "Facebook", color: "bg-blue-500 text-white" },
  reddit: { icon: "🤖", label: "Reddit", color: "bg-orange-500 text-white" },
  email: { icon: "📧", label: "Email", color: "bg-violet-500 text-white" },
  blog: { icon: "📝", label: "Blog", color: "bg-green-500 text-white" },
};

// ============ Helper Functions ============

function getColumnCounts(items: ContentItem[]): Record<ContentStatus, number> {
  return items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<ContentStatus, number>);
}

function getQualityColor(score: number | null | undefined): string {
  if (!score) return "text-slate-400";
  if (score >= 8) return "text-emerald-600";
  if (score >= 6) return "text-amber-600";
  return "text-red-600";
}

function getQualityBadge(score: number | null | undefined): { bg: string; text: string } {
  if (!score) return { bg: "bg-slate-100", text: "text-slate-500" };
  if (score >= 8) return { bg: "bg-emerald-100", text: "text-emerald-700" };
  if (score >= 6) return { bg: "bg-amber-100", text: "text-amber-700" };
  return { bg: "bg-red-100", text: "text-red-700" };
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Not set";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) {
    // Future date
    const futureMins = Math.abs(diffMins);
    const futureHours = Math.floor(futureMins / 60);
    const futureDays = Math.floor(futureHours / 24);
    if (futureDays > 0) return `in ${futureDays}d`;
    if (futureHours > 0) return `in ${futureHours}h`;
    return `in ${futureMins}m`;
  }

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function formatScheduledTime(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ============ Content Card Component ============

interface ContentCardProps {
  item: ContentItem;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReschedule?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  isDragging?: boolean;
}

function ContentCard({
  item,
  onClick,
  onEdit,
  onDelete,
  onReschedule,
  onApprove,
  onReject,
  isDragging,
}: ContentCardProps) {
  const platform = platformConfig[item.platform] || { icon: "📱", label: item.platform, color: "bg-slate-500 text-white" };
  const hasMedia = item.content_media && item.content_media.length > 0;
  const qualityBadge = getQualityBadge(item.quality_score);

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-3 cursor-pointer",
        "hover:shadow-md hover:border-slate-300 transition-all",
        isDragging && "shadow-xl ring-2 ring-violet-400 opacity-90 rotate-1"
      )}
    >
      {/* Header: Platform + Drag Handle */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm px-2 py-0.5 rounded-full", platform.color)}>
            {platform.icon}
          </span>
          <Badge variant="outline" className="text-xs">
            {platform.label}
          </Badge>
          {hasMedia && (
            <Badge variant="secondary" className="text-xs">
              {item.content_media![0].media_assets.file_type === "image" ? (
                <ImageIcon className="h-3 w-3 mr-1" />
              ) : (
                <Video className="h-3 w-3 mr-1" />
              )}
              {item.content_media!.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <GripVertical className="h-4 w-4 text-slate-300 cursor-grab" />
        </div>
      </div>

      {/* Content Preview */}
      <p className="text-sm text-slate-700 line-clamp-3 mb-2">{item.content}</p>

      {/* Quality Score (for review column) */}
      {item.status === "review" && item.quality_score !== undefined && (
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-full", qualityBadge.bg, qualityBadge.text)}>
            <Star className="h-3 w-3" />
            <span className="font-semibold">{item.quality_score?.toFixed(1)}</span>
          </div>
          {item.brand_voice_score && (
            <span className={cn("text-[10px]", getQualityColor(item.brand_voice_score))}>
              Voice: {item.brand_voice_score.toFixed(1)}
            </span>
          )}
          {item.engagement_score && (
            <span className={cn("text-[10px]", getQualityColor(item.engagement_score))}>
              Engage: {item.engagement_score.toFixed(1)}
            </span>
          )}
        </div>
      )}

      {/* Scheduled Time (for scheduled column) */}
      {item.status === "scheduled" && item.scheduled_for && (
        <div className="flex items-center gap-1 text-xs text-blue-600 mb-2">
          <Calendar className="h-3 w-3" />
          <span>{formatScheduledTime(item.scheduled_for)}</span>
        </div>
      )}

      {/* Posted Time (for published column) */}
      {item.status === "published" && item.posted_at && (
        <div className="flex items-center gap-1 text-xs text-emerald-600 mb-2">
          <CheckCircle className="h-3 w-3" />
          <span>Posted {formatRelativeTime(item.posted_at)}</span>
        </div>
      )}

      {/* Error Message */}
      {item.error_message && (
        <div className="flex items-center gap-1 text-xs text-red-600 mb-2 bg-red-50 px-2 py-1 rounded">
          <AlertCircle className="h-3 w-3" />
          <span className="line-clamp-1">{item.error_message}</span>
        </div>
      )}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {item.tags.slice(0, 2).map((tag, idx) => (
            <Badge key={idx} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
          {item.tags.length > 2 && (
            <span className="text-[10px] text-slate-400">+{item.tags.length - 2}</span>
          )}
        </div>
      )}

      {/* Footer: Timestamp + Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="flex items-center gap-1 text-[10px] text-slate-400">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(item.updated_at)}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {item.status === "review" && (
              <>
                <DropdownMenuItem onClick={onApprove}>
                  <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onReject}>
                  <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
                  Reject
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {item.status === "scheduled" && (
              <DropdownMenuItem onClick={onReschedule}>
                <CalendarClock className="h-4 w-4 mr-2" />
                Reschedule
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ============ Sortable Content Card ============

interface SortableContentCardProps extends ContentCardProps {
  item: ContentItem;
}

function SortableContentCard(props: SortableContentCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.item.id,
  });

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
      className={cn(isDragging && "opacity-50")}
    >
      <ContentCard {...props} isDragging={isDragging || props.isDragging} />
    </div>
  );
}

// ============ Main Component ============

export function ContentPipeline({ businessId, onEditContent, onScheduleContent }: ContentPipelineProps) {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<ContentItem | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  // Dialog states
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  // ============ Data Loading ============

  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("scheduled_content")
        .select(`
          *,
          content_media (
            media_id,
            display_order,
            media_assets (
              id,
              file_path,
              file_type,
              thumbnail_path
            )
          )
        `)
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map to our status model
      const mappedContent: ContentItem[] = (data || []).map((item) => {
        let status: ContentStatus = "draft";
        if (item.status === "posted") {
          status = "published";
        } else if (item.status === "scheduled") {
          status = "scheduled";
        } else if (item.approval_status === "pending") {
          status = "review";
        } else if (item.approval_status === "approved") {
          status = "scheduled";
        }

        return {
          ...item,
          status,
          quality_score: item.metadata?.quality_score ?? null,
          brand_voice_score: item.metadata?.brand_voice_score ?? null,
          engagement_score: item.metadata?.engagement_score ?? null,
          clarity_score: item.metadata?.clarity_score ?? null,
          platform_fit_score: item.metadata?.platform_fit_score ?? null,
        } as ContentItem;
      });

      setContent(mappedContent);
    } catch (error) {
      console.error("Error loading content:", error);
      toast.error("Failed to load content pipeline");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // ============ Filtering ============

  const filteredContent = content.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.topic?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = platformFilter === "all" || item.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  const counts = getColumnCounts(filteredContent);

  // ============ Drag and Drop ============

  const handleDragStart = (event: DragStartEvent) => {
    const item = content.find((c) => c.id === event.active.id);
    if (item) setActiveItem(item);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id?.toString() || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    setOverId(null);

    if (!over) return;

    const itemId = active.id as string;
    const item = content.find((c) => c.id === itemId);
    if (!item) return;

    // Determine target column
    let targetStatus: ContentStatus | null = null;
    if (PIPELINE_COLUMNS.some((col) => col.id === over.id)) {
      targetStatus = over.id as ContentStatus;
    } else {
      const targetItem = content.find((c) => c.id === over.id);
      if (targetItem) targetStatus = targetItem.status;
    }

    if (targetStatus && targetStatus !== item.status) {
      await updateContentStatus(itemId, targetStatus);
    }
  };

  // ============ Status Updates ============

  const updateContentStatus = async (itemId: string, newStatus: ContentStatus) => {
    try {
      let updateData: Record<string, unknown> = {};

      switch (newStatus) {
        case "draft":
          updateData = { status: "draft", approval_status: "rejected" };
          break;
        case "review":
          updateData = { status: "draft", approval_status: "pending" };
          break;
        case "scheduled":
          updateData = { status: "scheduled", approval_status: "approved" };
          break;
        case "published":
          updateData = { status: "posted", posted_at: new Date().toISOString() };
          break;
      }

      const { error } = await supabase.from("scheduled_content").update(updateData).eq("id", itemId);

      if (error) throw error;

      // Update local state
      setContent((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, status: newStatus, ...updateData } : item))
      );

      toast.success(`Content moved to ${newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update content status");
    }
  };

  // ============ Actions ============

  const handleDelete = async (item: ContentItem) => {
    if (!confirm("Delete this content? This cannot be undone.")) return;

    try {
      const { error } = await supabase.from("scheduled_content").delete().eq("id", item.id);
      if (error) throw error;

      setContent((prev) => prev.filter((c) => c.id !== item.id));
      toast.success("Content deleted");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete content");
    }
  };

  const handleApprove = async (item: ContentItem) => {
    await updateContentStatus(item.id, "scheduled");
  };

  const handleReject = async (item: ContentItem) => {
    await updateContentStatus(item.id, "draft");
  };

  const handleReschedule = (item: ContentItem) => {
    setSelectedItem(item);
    setRescheduleDate(item.scheduled_for || "");
    setRescheduleDialogOpen(true);
  };

  const confirmReschedule = async () => {
    if (!selectedItem || !rescheduleDate) return;

    try {
      const { error } = await supabase
        .from("scheduled_content")
        .update({ scheduled_for: rescheduleDate })
        .eq("id", selectedItem.id);

      if (error) throw error;

      setContent((prev) =>
        prev.map((item) => (item.id === selectedItem.id ? { ...item, scheduled_for: rescheduleDate } : item))
      );

      toast.success("Content rescheduled");
      setRescheduleDialogOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error("Error rescheduling:", error);
      toast.error("Failed to reschedule content");
    }
  };

  const handleCardClick = (item: ContentItem) => {
    setSelectedItem(item);
    setDetailDialogOpen(true);
  };

  // ============ Render ============

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading content pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-3 items-center">
          <div className="relative">
            <Input
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-8"
            />
            <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          </div>

          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {Object.entries(platformConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.icon} {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm" onClick={loadContent}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-2 flex-wrap">
        {PIPELINE_COLUMNS.map((col) => (
          <Badge key={col.id} variant="secondary" className="gap-1">
            {col.icon}
            {col.label}: {counts[col.id] || 0}
          </Badge>
        ))}
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
          {PIPELINE_COLUMNS.map((column) => {
            const columnItems = filteredContent.filter((c) => c.status === column.id);
            const style = columnStyles[column.id];
            const isOver = overId === column.id;

            return (
              <div
                key={column.id}
                data-column-id={column.id}
                className={cn(
                  "flex-shrink-0 w-72 sm:w-80 flex flex-col rounded-xl transition-all duration-200 overflow-hidden",
                  isOver ? style.dropBg : "bg-slate-50/50",
                  isOver && "ring-2 ring-offset-2 ring-violet-400"
                )}
              >
                {/* Column Header */}
                <div className={cn("px-3 py-2.5 rounded-t-xl", style.headerBg)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {column.icon}
                      <h3 className="font-semibold text-sm text-slate-700">{column.label}</h3>
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", style.countBg)}>
                        {counts[column.id] || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Column Content */}
                <SortableContext items={columnItems.map((c) => c.id)} strategy={verticalListSortingStrategy} id={column.id}>
                  <ScrollArea className="flex-1 max-h-[600px]">
                    <div
                      className={cn("p-2 space-y-2 min-h-[120px]", isOver && "bg-opacity-80")}
                      data-droppable-id={column.id}
                    >
                      {columnItems.length === 0 ? (
                        <div
                          className={cn(
                            "flex items-center justify-center h-24 border-2 border-dashed rounded-lg transition-colors",
                            isOver ? "border-violet-400 bg-violet-50" : "border-slate-200"
                          )}
                        >
                          <span className="text-xs text-slate-400">{isOver ? "Drop here" : "No content"}</span>
                        </div>
                      ) : (
                        columnItems.map((item) => (
                          <SortableContentCard
                            key={item.id}
                            item={item}
                            onClick={() => handleCardClick(item)}
                            onEdit={() => onEditContent?.(item)}
                            onDelete={() => handleDelete(item)}
                            onReschedule={() => handleReschedule(item)}
                            onApprove={() => handleApprove(item)}
                            onReject={() => handleReject(item)}
                            isDragging={activeItem?.id === item.id}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </SortableContext>
              </div>
            );
          })}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeItem ? (
            <ContentCard
              item={activeItem}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          {selectedItem && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">
                    {platformConfig[selectedItem.platform]?.icon || "📱"}
                  </span>
                  <Badge variant="outline">{selectedItem.platform}</Badge>
                  <Badge
                    variant={selectedItem.status === "published" ? "default" : "secondary"}
                  >
                    {selectedItem.status}
                  </Badge>
                </div>
                <DialogTitle className="sr-only">Content Details</DialogTitle>
                <DialogDescription className="sr-only">
                  View content details for {selectedItem.platform}
                </DialogDescription>
              </DialogHeader>

              {/* Quality Scores */}
              {selectedItem.quality_score && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    Quality Scores
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Overall:</span>
                      <span className={cn("font-semibold", getQualityColor(selectedItem.quality_score))}>
                        {selectedItem.quality_score?.toFixed(1)}/10
                      </span>
                    </div>
                    {selectedItem.brand_voice_score && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Brand Voice:</span>
                        <span className={getQualityColor(selectedItem.brand_voice_score)}>
                          {selectedItem.brand_voice_score.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {selectedItem.engagement_score && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Engagement:</span>
                        <span className={getQualityColor(selectedItem.engagement_score)}>
                          {selectedItem.engagement_score.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {selectedItem.clarity_score && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Clarity:</span>
                        <span className={getQualityColor(selectedItem.clarity_score)}>
                          {selectedItem.clarity_score.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Content</h4>
                <p className="text-sm whitespace-pre-wrap bg-white border rounded-lg p-3">
                  {selectedItem.content}
                </p>
              </div>

              {/* Media */}
              {selectedItem.content_media && selectedItem.content_media.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Attached Media</h4>
                  <div className="flex gap-2 flex-wrap">
                    {selectedItem.content_media.map((media, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded border overflow-hidden">
                        {media.media_assets.file_type === "image" ? (
                          <img
                            src={media.media_assets.thumbnail_path || media.media_assets.file_path}
                            alt="Media"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Video className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule Info */}
              {selectedItem.scheduled_for && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span>Scheduled for: {formatScheduledTime(selectedItem.scheduled_for)}</span>
                </div>
              )}

              <DialogFooter className="gap-2">
                {selectedItem.status === "review" && (
                  <>
                    <Button variant="outline" onClick={() => handleReject(selectedItem)}>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button onClick={() => handleApprove(selectedItem)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => onEditContent?.(selectedItem)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="destructive" onClick={() => handleDelete(selectedItem)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Content</DialogTitle>
            <DialogDescription>Choose a new date and time for this content to be published.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Input
              type="datetime-local"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmReschedule}>
              <CalendarClock className="h-4 w-4 mr-2" />
              Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ContentPipeline;
