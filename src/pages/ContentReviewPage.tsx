import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatToEasternCompact } from "@/lib/dateUtils";
import { 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Clock, 
  RefreshCw, 
  Twitter, 
  Linkedin, 
  Mail, 
  MessageSquare,
  Instagram,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { useBusinesses } from "@/hooks/useBusinesses";

interface AdvisorFeedback {
  hormozi?: { score: number; feedback: string };
  gary_vee?: { score: number; feedback: string };
  godin?: { score: number; feedback: string };
}

interface ContentQueueItem {
  id: string;
  content: string;
  brand: string;
  platform: string;
  account: string | null;
  status: string;
  scheduled_time: string | null;
  advisor_score: number | null;
  advisor_feedback: AdvisorFeedback | null;
  reviewer_notes: string | null;
  image_urls: string[] | null;
  pillar: string | null;
  style: string | null;
  created_by: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  posted_at: string | null;
  post_url: string | null;
}

type SortField = 'scheduled_time' | 'advisor_score' | 'created_at';
type SortDirection = 'asc' | 'desc';

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  twitter: Twitter,
  linkedin: Linkedin,
  email: Mail,
  sms: MessageSquare,
  instagram: Instagram,
};

const brandColors: Record<string, string> = {
  sparkwave: "bg-violet-100 text-violet-800 border-violet-300",
  charx: "bg-amber-100 text-amber-800 border-amber-300",
  personaai: "bg-cyan-100 text-cyan-800 border-cyan-300",
  fightflow: "bg-red-100 text-red-800 border-red-300",
  barnum: "bg-orange-100 text-orange-800 border-orange-300",
};

const priorityLabels: Record<number, { label: string; color: string }> = {
  1: { label: "Urgent", color: "bg-red-100 text-red-800 border-red-300" },
  5: { label: "Normal", color: "bg-gray-100 text-gray-800 border-gray-300" },
  10: { label: "Low", color: "bg-blue-100 text-blue-800 border-blue-300" },
};

function getScoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= 9) return "text-green-600";
  if (score >= 8) return "text-yellow-600";
  return "text-red-600";
}

function getScoreBadgeColor(score: number | null): string {
  if (score === null) return "bg-gray-100 text-gray-600";
  if (score >= 9) return "bg-green-100 text-green-800";
  if (score >= 8) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

export default function ContentReviewPage() {
  const [items, setItems] = useState<ContentQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending_review");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("scheduled_time");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedFeedback, setExpandedFeedback] = useState<Record<string, boolean>>({});
  const [revisionDialog, setRevisionDialog] = useState<{ open: boolean; item: ContentQueueItem | null }>({ open: false, item: null });
  const [revisionNotes, setRevisionNotes] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("content_queue")
        .select("*")
        .order(sortField, { ascending: sortDirection === "asc" });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (brandFilter !== "all") {
        query = query.eq("brand", brandFilter);
      }

      if (platformFilter !== "all") {
        query = query.eq("platform", platformFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setItems((data as ContentQueueItem[]) || []);
    } catch (error) {
      console.error("Error loading content queue:", error);
      toast({
        title: "Error",
        description: "Failed to load content queue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, brandFilter, platformFilter, sortField, sortDirection, toast]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("content_queue_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "content_queue" },
        () => {
          loadItems();
        }
      )
      .subscribe((status, err) => {
        if (err) console.warn('Realtime subscription error (content queue):', err.message);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadItems]);

  const updateStatus = async (
    itemId: string, 
    newStatus: "approved" | "rejected" | "revision_requested",
    notes?: string
  ) => {
    setProcessingId(itemId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: Record<string, unknown> = {
        status: newStatus,
        reviewed_by: user?.email || "scott",
        updated_at: new Date().toISOString(),
      };

      if (notes) {
        updateData.reviewer_notes = notes;
      }

      const { error } = await supabase
        .from("content_queue")
        .update(updateData)
        .eq("id", itemId);

      if (error) throw error;

      const messages = {
        approved: "Content approved and queued for posting",
        rejected: "Content rejected",
        revision_requested: "Revision request sent to agent",
      };

      toast({
        title: "Success",
        description: messages[newStatus],
      });

      setRevisionDialog({ open: false, item: null });
      setRevisionNotes("");
      loadItems();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update content status",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const toggleFeedback = (itemId: string) => {
    setExpandedFeedback(prev => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const getPlatformIcon = (platform: string) => {
    const Icon = platformIcons[platform.toLowerCase()] || MessageSquare;
    return <Icon className="h-4 w-4" />;
  };

  const formatScheduledTime = (time: string | null) => {
    if (!time) return "ASAP";
    const date = new Date(time);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 0) return "Overdue";
    if (diffHours === 0) return "Now";
    if (diffHours < 24) return `In ${diffHours}h`;
    return formatToEasternCompact(time);
  };

  const stats = {
    pending: items.filter(i => i.status === "pending_review").length,
    approved: items.filter(i => i.status === "approved").length,
    rejected: items.filter(i => i.status === "rejected").length,
    revision: items.filter(i => i.status === "revision_requested").length,
  };

  // Get unique brands and platforms for filters
  const brands = [...new Set(items.map(i => i.brand))];
  const platforms = [...new Set(items.map(i => i.platform))];

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={(id) => {
        const business = businesses.find(b => b.id === id);
        if (business) setSelectedBusiness(business);
      }}
      businessName={selectedBusiness?.name}
    >
      <main className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Content Review</h1>
            <p className="text-muted-foreground">
              {stats.pending} item{stats.pending !== 1 ? "s" : ""} awaiting review
            </p>
          </div>
          <Button onClick={loadItems} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className={stats.pending > 0 ? "border-orange-300 bg-orange-50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.pending > 0 ? "text-orange-600" : ""}`}>
                {stats.pending}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Needs Revision</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.revision}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="revision_requested">Needs Revision</SelectItem>
                </SelectContent>
              </Select>

              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map(brand => (
                    <SelectItem key={brand} value={brand}>
                      {brand.charAt(0).toUpperCase() + brand.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {platforms.map(platform => (
                    <SelectItem key={platform} value={platform}>
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground">Sort:</span>
                <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled_time">Scheduled Time</SelectItem>
                    <SelectItem value="advisor_score">Score</SelectItem>
                    <SelectItem value="created_at">Created</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSortDirection(d => d === "asc" ? "desc" : "asc")}
                >
                  {sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Content Cards */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading content queue...
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Content to Review</h3>
              <p className="text-muted-foreground">
                {statusFilter === "pending_review" 
                  ? "All caught up! No pending content needs your attention."
                  : "No content matches your current filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} variant="elevated" className="overflow-hidden">
                {/* Card Header */}
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        {getPlatformIcon(item.platform)}
                        <span className="font-medium">{item.account || item.platform}</span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={brandColors[item.brand] || "bg-gray-100 text-gray-800"}
                      >
                        {item.brand}
                      </Badge>
                      {5 !== 5 && (
                        <Badge 
                          variant="outline" 
                          className={priorityLabels[5]?.color || priorityLabels[5].color}
                        >
                          {priorityLabels[5]?.label || "Normal"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{formatScheduledTime(item.scheduled_time)}</span>
                      </div>
                      {item.advisor_score !== null && (
                        <Badge className={getScoreBadgeColor(item.advisor_score)}>
                          {item.advisor_score.toFixed(1)}/10
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Content Preview */}
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {item.content}
                    </p>
                    {item.image_urls && item.image_urls.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.image_urls.map((url, idx) => (
                          <a 
                            key={idx} 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="relative group"
                          >
                            <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                              <img 
                                src={url} 
                                alt={`Media ${idx + 1}`}
                                className="object-cover w-full h-full"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <ImageIcon className="h-8 w-8 text-gray-400 hidden" />
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    {item.style && (
                      <span>Style: <span className="font-medium text-foreground">{item.style}</span></span>
                    )}
                    {item.pillar && (
                      <span>Pillar: <span className="font-medium text-foreground">{item.pillar}</span></span>
                    )}
                    <span>Created by: <span className="font-medium text-foreground">{item.created_by || "unknown"}</span></span>
                    <span>{formatToEasternCompact(item.created_at)}</span>
                  </div>

                  {/* Expandable Advisor Feedback */}
                  {item.advisor_feedback && Object.keys(item.advisor_feedback).length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleFeedback(item.id)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {expandedFeedback[item.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        Show Advisor Feedback
                      </button>
                      {expandedFeedback[item.id] && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          {item.advisor_feedback.hormozi && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">🏋️ Hormozi</span>
                                <span className={`text-sm font-bold ${getScoreColor(item.advisor_feedback.hormozi.score)}`}>
                                  {item.advisor_feedback.hormozi.score}/10
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {item.advisor_feedback.hormozi.feedback}
                              </p>
                            </div>
                          )}
                          {item.advisor_feedback.gary_vee && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">📱 Gary Vee</span>
                                <span className={`text-sm font-bold ${getScoreColor(item.advisor_feedback.gary_vee.score)}`}>
                                  {item.advisor_feedback.gary_vee.score}/10
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {item.advisor_feedback.gary_vee.feedback}
                              </p>
                            </div>
                          )}
                          {item.advisor_feedback.godin && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">📚 Godin</span>
                                <span className={`text-sm font-bold ${getScoreColor(item.advisor_feedback.godin.score)}`}>
                                  {item.advisor_feedback.godin.score}/10
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {item.advisor_feedback.godin.feedback}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Review notes if rejected/revision */}
                  {item.reviewer_notes && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Review Notes</p>
                        <p className="text-sm text-yellow-700">{item.reviewer_notes}</p>
                      </div>
                    </div>
                  )}
                </CardContent>

                {/* Action Buttons */}
                {item.status === "pending_review" && (
                  <CardFooter className="bg-gray-50 border-t flex flex-wrap gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                      disabled={processingId === item.id}
                      onClick={() => setRevisionDialog({ open: true, item })}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Request Revision
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-red-700 border-red-300 hover:bg-red-50"
                      disabled={processingId === item.id}
                      onClick={() => updateStatus(item.id, "rejected")}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-green-600 hover:bg-green-700"
                      disabled={processingId === item.id}
                      onClick={() => updateStatus(item.id, "approved")}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Revision Dialog */}
        <Dialog 
          open={revisionDialog.open} 
          onOpenChange={(open) => {
            setRevisionDialog({ open, item: open ? revisionDialog.item : null });
            if (!open) setRevisionNotes("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Revision</DialogTitle>
              <DialogDescription>
                Provide feedback for the agent to improve this content.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {revisionDialog.item && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="line-clamp-3">{revisionDialog.item.content}</p>
                </div>
              )}
              <Textarea
                placeholder="What needs to be changed? Be specific..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setRevisionDialog({ open: false, item: null });
                  setRevisionNotes("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (revisionDialog.item && revisionNotes.trim()) {
                    updateStatus(revisionDialog.item.id, "revision_requested", revisionNotes);
                  }
                }}
                disabled={!revisionNotes.trim() || processingId === revisionDialog.item?.id}
              >
                Send Feedback
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </DashboardLayout>
  );
}
