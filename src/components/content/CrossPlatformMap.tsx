import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { format, subDays, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import {
  Twitter,
  Mail,
  MessageSquare,
  Linkedin,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  ArrowRight,
  ChevronRight,
  Edit3,
  ExternalLink,
  Filter,
  RefreshCw,
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
  Workflow,
  Zap,
  Eye,
  X,
  Search,
} from "lucide-react";
import type { DateRange } from "react-day-picker";

// ============================================================================
// Types
// ============================================================================

export type ContentPlatform = "twitter" | "email" | "sms" | "linkedin";
export type ContentStatus = "draft" | "pending" | "scheduled" | "sent" | "published" | "failed";

export interface UnifiedContentItem {
  id: string;
  platform: ContentPlatform;
  content: string;
  subject?: string; // For email
  status: ContentStatus;
  scheduledFor?: Date | string | null;
  sentAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
  sourceTable: "scheduled_content" | "email_campaigns" | "sms_campaigns" | "content_library";
  recipientCount?: number;
  qualityScore?: number;
  metrics?: {
    sent?: number;
    delivered?: number;
    opened?: number;
    clicked?: number;
    replied?: number;
    failed?: number;
  };
}

export interface CrossPlatformMapProps {
  className?: string;
  onEditItem?: (item: UnifiedContentItem) => void;
  onViewItem?: (item: UnifiedContentItem) => void;
}

type ViewMode = "flow" | "grid" | "list";
type DatePreset = "7d" | "14d" | "30d" | "90d" | "custom";

// ============================================================================
// Platform Configuration
// ============================================================================

const platformConfig: Record<
  ContentPlatform,
  {
    name: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
    description: string;
  }
> = {
  twitter: {
    name: "Twitter",
    icon: <Twitter className="h-4 w-4" />,
    color: "text-sky-600",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
    description: "Social posts",
  },
  email: {
    name: "Email",
    icon: <Mail className="h-4 w-4" />,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    description: "Campaigns & newsletters",
  },
  sms: {
    name: "SMS",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    description: "Text messages",
  },
  linkedin: {
    name: "LinkedIn",
    icon: <Linkedin className="h-4 w-4" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "Professional posts",
  },
};

const statusConfig: Record<
  ContentStatus,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  draft: {
    label: "Draft",
    icon: <FileText className="h-3.5 w-3.5" />,
    color: "text-slate-600",
    bgColor: "bg-slate-100",
    borderColor: "border-slate-300",
  },
  pending: {
    label: "Pending",
    icon: <Clock className="h-3.5 w-3.5" />,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-300",
  },
  scheduled: {
    label: "Scheduled",
    icon: <CalendarIcon className="h-3.5 w-3.5" />,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-300",
  },
  sent: {
    label: "Sent",
    icon: <Send className="h-3.5 w-3.5" />,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    borderColor: "border-indigo-300",
  },
  published: {
    label: "Published",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    borderColor: "border-emerald-300",
  },
  failed: {
    label: "Failed",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    color: "text-red-600",
    bgColor: "bg-red-100",
    borderColor: "border-red-300",
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

function truncateContent(text: string, maxLength: number = 80): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, h:mm a");
}

function formatShortDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d");
}

function getDateRangeFromPreset(preset: DatePreset): { from: Date; to: Date } {
  const to = endOfDay(new Date());
  let from: Date;
  
  switch (preset) {
    case "7d":
      from = startOfDay(subDays(new Date(), 7));
      break;
    case "14d":
      from = startOfDay(subDays(new Date(), 14));
      break;
    case "30d":
      from = startOfDay(subDays(new Date(), 30));
      break;
    case "90d":
      from = startOfDay(subDays(new Date(), 90));
      break;
    default:
      from = startOfDay(subDays(new Date(), 30));
  }
  
  return { from, to };
}

// ============================================================================
// Subcomponents
// ============================================================================

interface PlatformIconProps {
  platform: ContentPlatform;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

function PlatformIcon({ platform, size = "md", showLabel = false }: PlatformIconProps) {
  const config = platformConfig[platform];
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "rounded-lg flex items-center justify-center",
              sizeClasses[size],
              config.bgColor,
              config.color
            )}
          >
            {config.icon}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{config.name}</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface StatusBadgeProps {
  status: ContentStatus;
  size?: "sm" | "md";
}

function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        config.bgColor,
        config.color,
        config.borderColor,
        size === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"
      )}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}

interface ContentCardProps {
  item: UnifiedContentItem;
  onEdit?: () => void;
  onView?: () => void;
  compact?: boolean;
}

function ContentCard({ item, onEdit, onView, compact = false }: ContentCardProps) {
  const platform = platformConfig[item.platform];
  const status = statusConfig[item.status];
  
  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md cursor-pointer group",
        compact ? "p-3" : "p-4",
        platform.borderColor,
        "border-l-4"
      )}
      onClick={onView}
    >
      <div className="flex items-start gap-3">
        <PlatformIcon platform={item.platform} size={compact ? "sm" : "md"} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={item.status} size="sm" />
            {item.qualityScore && (
              <Badge variant="secondary" className="text-xs">
                Score: {item.qualityScore.toFixed(1)}
              </Badge>
            )}
          </div>
          
          <p className={cn(
            "text-sm text-slate-700 line-clamp-2",
            compact && "text-xs line-clamp-1"
          )}>
            {item.subject || truncateContent(item.content, compact ? 50 : 100)}
          </p>
          
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {item.scheduledFor && (
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {formatDate(item.scheduledFor)}
              </span>
            )}
            {item.recipientCount && (
              <span>{item.recipientCount.toLocaleString()} recipients</span>
            )}
            {item.metrics?.sent && (
              <span>{item.metrics.sent.toLocaleString()} sent</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
          )}
          {onView && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// Flow View - Visual Pipeline
// ============================================================================

interface FlowViewProps {
  items: UnifiedContentItem[];
  onEdit?: (item: UnifiedContentItem) => void;
  onView?: (item: UnifiedContentItem) => void;
}

function FlowView({ items, onEdit, onView }: FlowViewProps) {
  const groupedByPlatform = useMemo(() => {
    const groups: Record<ContentPlatform, Record<ContentStatus, UnifiedContentItem[]>> = {
      twitter: { draft: [], pending: [], scheduled: [], sent: [], published: [], failed: [] },
      email: { draft: [], pending: [], scheduled: [], sent: [], published: [], failed: [] },
      sms: { draft: [], pending: [], scheduled: [], sent: [], published: [], failed: [] },
      linkedin: { draft: [], pending: [], scheduled: [], sent: [], published: [], failed: [] },
    };
    
    items.forEach((item) => {
      if (groups[item.platform]?.[item.status]) {
        groups[item.platform][item.status].push(item);
      }
    });
    
    return groups;
  }, [items]);
  
  const platforms: ContentPlatform[] = ["twitter", "email", "sms", "linkedin"];
  const stages: ContentStatus[] = ["draft", "pending", "scheduled", "sent", "published"];
  
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        {/* Header row with stages */}
        <div className="grid grid-cols-6 gap-4 mb-4">
          <div className="font-medium text-sm text-slate-500">Platform</div>
          {stages.map((stage) => (
            <div
              key={stage}
              className="flex items-center gap-2 font-medium text-sm"
            >
              <span className={statusConfig[stage].color}>
                {statusConfig[stage].icon}
              </span>
              <span>{statusConfig[stage].label}</span>
            </div>
          ))}
        </div>
        
        {/* Platform rows */}
        {platforms.map((platform) => {
          const config = platformConfig[platform];
          const platformItems = groupedByPlatform[platform];
          const totalCount = Object.values(platformItems).flat().length;
          
          if (totalCount === 0) return null;
          
          return (
            <div
              key={platform}
              className={cn(
                "grid grid-cols-6 gap-4 py-4 border-t items-start",
                config.borderColor
              )}
            >
              {/* Platform label */}
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center",
                    config.bgColor,
                    config.color
                  )}
                >
                  {config.icon}
                </div>
                <div>
                  <p className="font-medium text-sm">{config.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {totalCount} item{totalCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              
              {/* Stage columns */}
              {stages.map((stage) => {
                const stageItems = platformItems[stage];
                return (
                  <div key={stage} className="space-y-2">
                    {stageItems.length > 0 ? (
                      <>
                        {stageItems.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              "p-2 rounded-lg border text-xs cursor-pointer hover:shadow-sm transition-shadow",
                              config.bgColor,
                              config.borderColor
                            )}
                            onClick={() => onView?.(item)}
                          >
                            <p className="line-clamp-2 text-slate-700">
                              {truncateContent(item.subject || item.content, 40)}
                            </p>
                            {item.scheduledFor && (
                              <p className="text-muted-foreground mt-1">
                                {formatShortDate(item.scheduledFor)}
                              </p>
                            )}
                          </div>
                        ))}
                        {stageItems.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{stageItems.length - 3} more
                          </Badge>
                        )}
                      </>
                    ) : (
                      <div className="h-16 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">—</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        
        {/* Flow arrows decoration */}
        <div className="grid grid-cols-6 gap-4 mt-4 px-2">
          <div />
          {stages.slice(0, -1).map((_, i) => (
            <div key={i} className="flex items-center justify-end pr-8">
              <ArrowRight className="h-4 w-4 text-slate-300" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Grid View
// ============================================================================

interface GridViewProps {
  items: UnifiedContentItem[];
  onEdit?: (item: UnifiedContentItem) => void;
  onView?: (item: UnifiedContentItem) => void;
}

function GridView({ items, onEdit, onView }: GridViewProps) {
  const groupedByPlatform = useMemo(() => {
    const groups: Record<ContentPlatform, UnifiedContentItem[]> = {
      twitter: [],
      email: [],
      sms: [],
      linkedin: [],
    };
    
    items.forEach((item) => {
      groups[item.platform]?.push(item);
    });
    
    return groups;
  }, [items]);
  
  const platforms: ContentPlatform[] = ["twitter", "email", "sms", "linkedin"];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {platforms.map((platform) => {
        const config = platformConfig[platform];
        const platformItems = groupedByPlatform[platform];
        
        return (
          <Card key={platform} className={cn("border-t-4", config.borderColor)}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center",
                    config.bgColor,
                    config.color
                  )}
                >
                  {config.icon}
                </div>
                <div>
                  <CardTitle className="text-base">{config.name}</CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {platformItems.length > 0 ? (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-3">
                    {platformItems.map((item) => (
                      <ContentCard
                        key={item.id}
                        item={item}
                        compact
                        onEdit={onEdit ? () => onEdit(item) : undefined}
                        onView={onView ? () => onView(item) : undefined}
                      />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-[100px] flex items-center justify-center text-muted-foreground text-sm">
                  No content for this platform
                </div>
              )}
              
              {/* Platform summary */}
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-semibold">
                      {platformItems.filter((i) => i.status === "scheduled").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Scheduled</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">
                      {platformItems.filter((i) => ["sent", "published"].includes(i.status)).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Sent</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">
                      {platformItems.filter((i) => i.status === "draft").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Drafts</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================================
// List View
// ============================================================================

interface ListViewProps {
  items: UnifiedContentItem[];
  onEdit?: (item: UnifiedContentItem) => void;
  onView?: (item: UnifiedContentItem) => void;
}

function ListView({ items, onEdit, onView }: ListViewProps) {
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const dateA = a.scheduledFor ? new Date(a.scheduledFor).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.scheduledFor ? new Date(b.scheduledFor).getTime() : new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [items]);
  
  return (
    <div className="space-y-3">
      {sortedItems.map((item) => (
        <ContentCard
          key={item.id}
          item={item}
          onEdit={onEdit ? () => onEdit(item) : undefined}
          onView={onView ? () => onView(item) : undefined}
        />
      ))}
      
      {sortedItems.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No content found for the selected filters
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Content Detail Dialog
// ============================================================================

interface ContentDetailDialogProps {
  item: UnifiedContentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (item: UnifiedContentItem) => void;
}

function ContentDetailDialog({ item, open, onOpenChange, onEdit }: ContentDetailDialogProps) {
  if (!item) return null;
  
  const platform = platformConfig[item.platform];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center",
                platform.bgColor,
                platform.color
              )}
            >
              {platform.icon}
            </div>
            <div>
              <DialogTitle>{platform.name} Content</DialogTitle>
              <DialogDescription>
                {item.sourceTable.replace("_", " ")} • Created{" "}
                {formatDate(item.createdAt)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={item.status} />
            {item.qualityScore && (
              <Badge variant="secondary">
                Quality Score: {item.qualityScore.toFixed(1)}/10
              </Badge>
            )}
          </div>
          
          {item.subject && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Subject
              </label>
              <p className="mt-1 text-sm">{item.subject}</p>
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Content
            </label>
            <div className="mt-1 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{item.content}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {item.scheduledFor && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Scheduled For
                </label>
                <p className="mt-1 text-sm flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  {formatDate(item.scheduledFor)}
                </p>
              </div>
            )}
            
            {item.sentAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Sent At
                </label>
                <p className="mt-1 text-sm flex items-center gap-2">
                  <Send className="h-4 w-4 text-muted-foreground" />
                  {formatDate(item.sentAt)}
                </p>
              </div>
            )}
            
            {item.recipientCount && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Recipients
                </label>
                <p className="mt-1 text-sm">
                  {item.recipientCount.toLocaleString()}
                </p>
              </div>
            )}
          </div>
          
          {item.metrics && Object.keys(item.metrics).length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Metrics
              </label>
              <div className="mt-2 grid grid-cols-3 gap-4">
                {item.metrics.sent !== undefined && (
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-lg font-semibold">{item.metrics.sent}</p>
                    <p className="text-xs text-muted-foreground">Sent</p>
                  </div>
                )}
                {item.metrics.delivered !== undefined && (
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <p className="text-lg font-semibold text-emerald-700">
                      {item.metrics.delivered}
                    </p>
                    <p className="text-xs text-muted-foreground">Delivered</p>
                  </div>
                )}
                {item.metrics.opened !== undefined && (
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-lg font-semibold text-blue-700">
                      {item.metrics.opened}
                    </p>
                    <p className="text-xs text-muted-foreground">Opened</p>
                  </div>
                )}
                {item.metrics.clicked !== undefined && (
                  <div className="text-center p-3 bg-violet-50 rounded-lg">
                    <p className="text-lg font-semibold text-violet-700">
                      {item.metrics.clicked}
                    </p>
                    <p className="text-xs text-muted-foreground">Clicked</p>
                  </div>
                )}
                {item.metrics.replied !== undefined && (
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <p className="text-lg font-semibold text-amber-700">
                      {item.metrics.replied}
                    </p>
                    <p className="text-xs text-muted-foreground">Replied</p>
                  </div>
                )}
                {item.metrics.failed !== undefined && item.metrics.failed > 0 && (
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-lg font-semibold text-red-700">
                      {item.metrics.failed}
                    </p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onEdit && (
            <Button
              onClick={() => {
                onEdit(item);
                onOpenChange(false);
              }}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Content
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CrossPlatformMap({ className, onEditItem, onViewItem }: CrossPlatformMapProps) {
  const { selectedBusiness } = useBusinessContext();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UnifiedContentItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("flow");
  const [datePreset, setDatePreset] = useState<DatePreset>("30d");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [platformFilter, setPlatformFilter] = useState<ContentPlatform | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<UnifiedContentItem | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // Fetch content from all sources
  useEffect(() => {
    async function fetchContent() {
      if (!selectedBusiness?.id) return;
      
      setLoading(true);
      const allItems: UnifiedContentItem[] = [];
      
      try {
        // 1. Fetch scheduled social content
        const { data: socialContent } = await supabase
          .from("scheduled_content")
          .select("*")
          .eq("business_id", selectedBusiness.id)
          .order("created_at", { ascending: false });
        
        socialContent?.forEach((item: any) => {
          const platform = (item.platform?.toLowerCase() || "twitter") as ContentPlatform;
          if (["twitter", "linkedin"].includes(platform)) {
            allItems.push({
              id: item.id,
              platform,
              content: item.content || "",
              status: mapStatus(item.status),
              scheduledFor: item.scheduled_for,
              createdAt: item.created_at,
              sourceTable: "scheduled_content",
              qualityScore: item.quality_score,
            });
          }
        });
        
        // 2. Fetch email campaigns
        const { data: emailCampaigns } = await supabase
          .from("email_campaigns")
          .select("*")
          .eq("business_id", selectedBusiness.id)
          .order("created_at", { ascending: false });
        
        emailCampaigns?.forEach((item: any) => {
          allItems.push({
            id: item.id,
            platform: "email",
            content: item.body || item.template_content || "",
            subject: item.subject,
            status: mapEmailStatus(item.status),
            scheduledFor: item.scheduled_for,
            sentAt: item.sent_at,
            createdAt: item.created_at,
            sourceTable: "email_campaigns",
            recipientCount: item.recipient_count,
            metrics: {
              sent: item.sent_count,
              delivered: item.delivered_count,
              opened: item.open_count,
              clicked: item.click_count,
            },
          });
        });
        
        // 3. Fetch SMS campaigns
        const { data: smsCampaigns } = await supabase
          .from("sms_campaigns")
          .select("*")
          .eq("business_id", selectedBusiness.id)
          .order("created_at", { ascending: false });
        
        smsCampaigns?.forEach((item: any) => {
          allItems.push({
            id: item.id,
            platform: "sms",
            content: item.message || "",
            status: mapSmsStatus(item.status),
            scheduledFor: item.scheduled_for,
            sentAt: item.sent_at,
            createdAt: item.created_at,
            sourceTable: "sms_campaigns",
            recipientCount: item.recipient_count,
            metrics: {
              sent: item.sent_count,
              delivered: item.delivered_count,
              replied: item.reply_count,
              failed: item.failed_count,
            },
          });
        });
        
        setItems(allItems);
      } catch (error) {
        console.error("Error fetching content:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchContent();
  }, [selectedBusiness?.id]);
  
  // Status mapping helpers
  function mapStatus(status: string | null): ContentStatus {
    switch (status?.toLowerCase()) {
      case "draft":
        return "draft";
      case "pending":
      case "pending_review":
        return "pending";
      case "scheduled":
        return "scheduled";
      case "sent":
      case "posted":
      case "published":
        return "published";
      case "failed":
      case "error":
        return "failed";
      default:
        return "draft";
    }
  }
  
  function mapEmailStatus(status: string | null): ContentStatus {
    switch (status?.toLowerCase()) {
      case "draft":
        return "draft";
      case "scheduled":
        return "scheduled";
      case "sending":
        return "pending";
      case "sent":
      case "completed":
        return "sent";
      case "failed":
        return "failed";
      default:
        return "draft";
    }
  }
  
  function mapSmsStatus(status: string | null): ContentStatus {
    switch (status?.toLowerCase()) {
      case "draft":
        return "draft";
      case "scheduled":
        return "scheduled";
      case "sending":
      case "in_progress":
        return "pending";
      case "sent":
      case "completed":
        return "sent";
      case "failed":
        return "failed";
      default:
        return "draft";
    }
  }
  
  // Filter items
  const filteredItems = useMemo(() => {
    let result = items;
    
    // Date filter
    const range = datePreset === "custom" && dateRange?.from && dateRange?.to
      ? { from: dateRange.from, to: dateRange.to }
      : getDateRangeFromPreset(datePreset);
    
    result = result.filter((item) => {
      const itemDate = item.scheduledFor
        ? new Date(item.scheduledFor)
        : new Date(item.createdAt);
      return isWithinInterval(itemDate, { start: range.from, end: range.to });
    });
    
    // Platform filter
    if (platformFilter !== "all") {
      result = result.filter((item) => item.platform === platformFilter);
    }
    
    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.content.toLowerCase().includes(query) ||
          item.subject?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [items, datePreset, dateRange, platformFilter, statusFilter, searchQuery]);
  
  // Summary stats
  const stats = useMemo(() => {
    const byPlatform: Record<ContentPlatform, number> = {
      twitter: 0,
      email: 0,
      sms: 0,
      linkedin: 0,
    };
    const byStatus: Record<ContentStatus, number> = {
      draft: 0,
      pending: 0,
      scheduled: 0,
      sent: 0,
      published: 0,
      failed: 0,
    };
    
    filteredItems.forEach((item) => {
      byPlatform[item.platform]++;
      byStatus[item.status]++;
    });
    
    return { byPlatform, byStatus, total: filteredItems.length };
  }, [filteredItems]);
  
  const handleView = (item: UnifiedContentItem) => {
    setSelectedItem(item);
    setDetailDialogOpen(true);
    onViewItem?.(item);
  };
  
  const handleEdit = (item: UnifiedContentItem) => {
    onEditItem?.(item);
  };
  
  const handleRefresh = async () => {
    // Re-trigger fetch by toggling loading
    setLoading(true);
    // The useEffect will re-run
    setTimeout(() => setLoading(false), 500);
  };
  
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cross-Platform Content Map</h2>
          <p className="text-muted-foreground">
            Unified view of all content across platforms
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Platform counts */}
        {(["twitter", "email", "sms", "linkedin"] as ContentPlatform[]).map(
          (platform) => {
            const config = platformConfig[platform];
            return (
              <Card
                key={platform}
                className={cn(
                  "p-3 cursor-pointer transition-all hover:shadow-md",
                  platformFilter === platform && "ring-2 ring-primary"
                )}
                onClick={() =>
                  setPlatformFilter(platformFilter === platform ? "all" : platform)
                }
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center",
                      config.bgColor,
                      config.color
                    )}
                  >
                    {config.icon}
                  </div>
                  <div>
                    <p className="text-lg font-bold">{stats.byPlatform[platform]}</p>
                    <p className="text-xs text-muted-foreground">{config.name}</p>
                  </div>
                </div>
              </Card>
            );
          }
        )}
        
        {/* Status counts */}
        {(["scheduled", "sent", "draft", "failed"] as ContentStatus[]).map((status) => {
          const config = statusConfig[status];
          return (
            <Card
              key={status}
              className={cn(
                "p-3 cursor-pointer transition-all hover:shadow-md",
                statusFilter === status && "ring-2 ring-primary"
              )}
              onClick={() =>
                setStatusFilter(statusFilter === status ? "all" : status)
              }
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center",
                    config.bgColor,
                    config.color
                  )}
                >
                  {config.icon}
                </div>
                <div>
                  <p className="text-lg font-bold">{stats.byStatus[status]}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      
      {/* Filters and View Toggle */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Date Range */}
          <Select
            value={datePreset}
            onValueChange={(v) => setDatePreset(v as DatePreset)}
          >
            <SelectTrigger className="w-[140px]">
              <CalendarIcon className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="14d">Last 14 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          
          {datePreset === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  {dateRange?.from && dateRange?.to
                    ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}`
                    : "Pick dates"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}
          
          {/* Clear filters */}
          {(platformFilter !== "all" || statusFilter !== "all" || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPlatformFilter("all");
                setStatusFilter("all");
                setSearchQuery("");
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Clear filters
            </Button>
          )}
          
          {/* View Toggle */}
          <div className="ml-auto flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "flow" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("flow")}
            >
              <Workflow className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Content Display */}
      {loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading content...</p>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          {viewMode === "flow" && (
            <FlowView items={filteredItems} onEdit={handleEdit} onView={handleView} />
          )}
          {viewMode === "grid" && (
            <GridView items={filteredItems} onEdit={handleEdit} onView={handleView} />
          )}
          {viewMode === "list" && (
            <ListView items={filteredItems} onEdit={handleEdit} onView={handleView} />
          )}
        </Card>
      )}
      
      {/* Detail Dialog */}
      <ContentDetailDialog
        item={selectedItem}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onEdit={handleEdit}
      />
    </div>
  );
}

export default CrossPlatformMap;
