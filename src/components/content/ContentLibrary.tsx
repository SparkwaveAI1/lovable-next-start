import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, LayoutGrid, List, Plus, Edit2, CalendarDays, Copy, Trash2,
  FileText, Loader2, ImageIcon, Database,
} from "lucide-react";
import { ComposePanel, ComposableItem } from "./ComposePanel";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Unified content item (merged from both tables) ──────────────────────────

interface ContentItem {
  /** Prefixed: "cq-{uuid}" for content_queue, "sc-{uuid}" for scheduled_content */
  id: string;
  content: string;
  platform: string;
  /** content_queue.style OR scheduled_content.content_type */
  format: string | null;
  status: string | null;
  created_at: string | null;
  /** content_queue.scheduled_time OR scheduled_content.scheduled_for */
  scheduled_at: string | null;
  brand: string;
  image_urls: string[] | null;
  source: "queue" | "scheduled";
  topic: string | null;
}

// ─── Filter / display constants ──────────────────────────────────────────────

const FORMAT_OPTIONS  = ["All", "Short Post", "Thread", "Article", "Slide Deck"] as const;
const PLATFORM_OPTIONS = ["All", "twitter", "linkedin", "instagram", "tiktok", "facebook"] as const;
const STATUS_OPTIONS  = ["All", "draft", "scheduled", "posted"] as const;

const CONTENT_TYPE_OPTIONS = [
  { value: "All",             label: "All Types",         emoji: "" },
  { value: "blog",            label: "Blog Post",         emoji: "📝" },
  { value: "linkedin_article",label: "LinkedIn Article",  emoji: "💼" },
  { value: "twitter_thread",  label: "Twitter Thread",    emoji: "🧵" },
  { value: "substack",        label: "Substack",          emoji: "📮" },
  { value: "newsletter",      label: "Newsletter",        emoji: "📰" },
] as const;

const CONTENT_TYPE_COLORS: Record<string, string> = {
  blog:             "bg-purple-50 text-purple-700 border border-purple-200",
  linkedin_article: "bg-blue-50 text-blue-700 border border-blue-200",
  twitter_thread:   "bg-sky-50 text-sky-700 border border-sky-200",
  substack:         "bg-orange-50 text-orange-700 border border-orange-200",
  newsletter:       "bg-green-50 text-green-700 border border-green-200",
};

const PLATFORM_COLORS: Record<string, string> = {
  twitter:   "bg-sky-100 text-sky-700",
  linkedin:  "bg-blue-100 text-blue-700",
  instagram: "bg-pink-100 text-pink-700",
  tiktok:    "bg-slate-100 text-slate-700",
  facebook:  "bg-indigo-100 text-indigo-700",
};

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-yellow-100 text-yellow-700",
  scheduled: "bg-blue-100 text-blue-700",
  posted:    "bg-green-100 text-green-700",
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface ContentLibraryProps {
  /** Short brand name e.g. "charx", "sparkwave" — used for content_queue.brand filter */
  brand: string;
  /** Business UUID — used for scheduled_content.business_id filter */
  businessId: string;
}

// ─── Helper: convert ContentItem → ComposableItem for ComposePanel ───────────

function toComposable(item: ContentItem): ComposableItem {
  return {
    id:          item.id.replace(/^(cq|sc)-/, ""),
    content:     item.content,
    platform:    item.platform,
    format:      item.format,
    status:      item.status,
    scheduled_at: item.scheduled_at,
    brand:       item.brand,
    image_urls:  item.image_urls,
    source:      item.source,
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ContentLibrary({ brand, businessId }: ContentLibraryProps) {
  const { toast } = useToast();
  const [items, setItems]           = useState<ContentItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterFormat, setFilterFormat]       = useState<string>("All");
  const [filterPlatform, setFilterPlatform]   = useState<string>("All");
  const [filterStatus, setFilterStatus]       = useState<string>("All");
  const [filterContentType, setFilterContentType] = useState<string>("All");
  const [viewMode, setViewMode]     = useState<"grid" | "list">("grid");
  const [composeOpen, setComposeOpen] = useState(false);
  const [editItem, setEditItem]     = useState<ComposableItem | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);

  // ─── Fetch from both tables in parallel ────────────────────────────────────
  const fetchItems = useCallback(async () => {
    if (!brand || !businessId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [queueRes, scheduledRes] = await Promise.allSettled([
      supabase
        .from("content_queue")
        .select("id, content, platform, style, status, created_at, scheduled_time, brand, image_urls")
        .eq("brand", brand)
        .order("created_at", { ascending: false })
        .limit(150),

      supabase
        .from("scheduled_content")
        .select("id, content, platform, content_type, status, created_at, scheduled_for, topic")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(150),
    ]);

    const normalized: ContentItem[] = [];
    let hadError = false;

    // Normalize content_queue rows
    if (queueRes.status === "fulfilled" && !queueRes.value.error) {
      for (const row of queueRes.value.data ?? []) {
        normalized.push({
          id:           `cq-${row.id}`,
          content:      row.content,
          platform:     row.platform,
          format:       row.style,
          status:       row.status,
          created_at:   row.created_at,
          scheduled_at: row.scheduled_time,
          brand:        row.brand,
          image_urls:   row.image_urls,
          source:       "queue",
          topic:        null,
        });
      }
    } else {
      hadError = true;
      console.error("content_queue fetch error:", queueRes);
    }

    // Normalize scheduled_content rows
    if (scheduledRes.status === "fulfilled" && !scheduledRes.value.error) {
      for (const row of scheduledRes.value.data ?? []) {
        normalized.push({
          id:           `sc-${row.id}`,
          content:      row.content,
          platform:     row.platform,
          format:       row.content_type,
          status:       row.status,
          created_at:   row.created_at,
          scheduled_at: row.scheduled_for,
          brand:        brand,
          image_urls:   null,
          source:       "scheduled",
          topic:        row.topic,
        });
      }
    } else {
      hadError = true;
      console.error("scheduled_content fetch error:", scheduledRes);
    }

    if (hadError) {
      toast({
        title: "Partial load",
        description: "One content source failed to load — showing available results.",
        variant: "destructive",
      });
    }

    // Sort merged list by created_at desc, limit to 200
    normalized.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

    setItems(normalized.slice(0, 200));
    setLoading(false);
  }, [brand, businessId, toast]);

  useEffect(() => {
    const t = setTimeout(fetchItems, 200);
    return () => clearTimeout(t);
  }, [fetchItems]);

  // ─── Client-side filtering ─────────────────────────────────────────────────
  const filtered = items.filter(item => {
    if (filterFormat !== "All" && item.format !== filterFormat) return false;
    if (filterPlatform !== "All" && !item.platform.toLowerCase().includes(filterPlatform)) return false;
    if (filterStatus !== "All" && item.status !== filterStatus) return false;
    if (filterContentType !== "All" && item.source === "scheduled" && item.format !== filterContentType) return false;
    if (filterContentType !== "All" && item.source === "queue") return false; // queue items don't have content_type
    if (search.trim() && !item.content.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  // ─── Actions ──────────────────────────────────────────────────────────────
  const handleEdit = (item: ContentItem) => {
    setEditItem(toComposable(item));
    setComposeOpen(true);
  };

  const handleAddNew = () => {
    setEditItem(null);
    setComposeOpen(true);
  };

  const handleDuplicate = async (item: ContentItem) => {
    if (item.source !== "queue") {
      toast({ title: "Cannot duplicate", description: "Duplicating scheduled content is not supported." });
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const realId = item.id.replace(/^cq-/, "");
      const { error } = await supabase.from("content_queue").insert({
        content:  item.content,
        platform: item.platform,
        style:    item.format,
        brand:    item.brand,
        status:   "draft",
        created_by: user?.id,
      });
      if (error) throw error;
      toast({ title: "Duplicated!", description: "Content duplicated as draft." });
      fetchItems();
      // suppress unused variable warning
      void realId;
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    }
  };

  const handleDelete = async (prefixedId: string) => {
    const item = items.find(i => i.id === prefixedId);
    if (!item) return;

    const realId = prefixedId.replace(/^(cq|sc)-/, "");
    const table  = item.source === "queue" ? "content_queue" : "scheduled_content";

    try {
      const { error } = await supabase.from(table).delete().eq("id", realId);
      if (error) throw error;
      toast({ title: "Deleted", description: "Content removed." });
      fetchItems();
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  const getPlatforms = (platform: string) => platform.split(",").filter(Boolean);

  const formatDate = (dt: string | null) => {
    if (!dt) return null;
    return new Date(dt).toLocaleDateString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search content..."
            className="pl-9"
          />
        </div>

        <Select value={filterContentType} onValueChange={setFilterContentType}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Content Type" /></SelectTrigger>
          <SelectContent>
            {CONTENT_TYPE_OPTIONS.map(t => (
              <SelectItem key={t.value} value={t.value}>
                {t.emoji ? `${t.emoji} ${t.label}` : t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterFormat} onValueChange={setFilterFormat}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Format" /></SelectTrigger>
          <SelectContent>
            {FORMAT_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            {PLATFORM_OPTIONS.map(p => (
              <SelectItem key={p} value={p}>
                {p === "All" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>
                {s === "All" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="flex rounded-md border border-slate-200 overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 transition-colors ${viewMode === "grid" ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 transition-colors ${viewMode === "list" ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        <Button onClick={handleAddNew} className="bg-indigo-600 hover:bg-indigo-700 ml-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Content
        </Button>
      </div>

      {/* Item count */}
      {!loading && (
        <p className="text-xs text-slate-400">
          {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          {filtered.length !== items.length ? ` (filtered from ${items.length})` : ""}
        </p>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-16 w-16 text-slate-200 mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">No content yet</h3>
          <p className="text-slate-400 text-sm mb-6">
            {items.length > 0
              ? "No items match the current filters."
              : "Add your first piece of content to get started."}
          </p>
          {items.length === 0 && (
            <Button onClick={handleAddNew} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Content
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <ContentCard
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={id => setDeleteId(id)}
              getPlatforms={getPlatforms}
              formatDate={formatDate}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <ContentRow
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={id => setDeleteId(id)}
              getPlatforms={getPlatforms}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* Compose slide-over */}
      <ComposePanel
        open={composeOpen}
        onClose={() => { setComposeOpen(false); setEditItem(null); }}
        onSaved={fetchItems}
        editItem={editItem}
        brand={brand}
        businessId={businessId}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete content?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Card / Row sub-components ────────────────────────────────────────────────

interface CardProps {
  item: ContentItem;
  onEdit: (item: ContentItem) => void;
  onDuplicate: (item: ContentItem) => void;
  onDelete: (id: string) => void;
  getPlatforms: (p: string) => string[];
  formatDate: (d: string | null) => string | null;
}

function ContentCard({ item, onEdit, onDuplicate, onDelete, getPlatforms, formatDate }: CardProps) {
  const platforms = getPlatforms(item.platform);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow flex flex-col gap-3">
      {/* Media thumbnail (queue items only) */}
      {item.image_urls?.[0] && (
        <div className="w-full h-28 rounded-lg overflow-hidden bg-slate-100">
          <img src={item.image_urls[0]} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Content preview */}
      <p className="text-sm text-slate-700 line-clamp-3 flex-1">{item.content}</p>

      {/* Topic (scheduled_content items) */}
      {item.topic && (
        <p className="text-xs text-slate-400 italic truncate">Topic: {item.topic}</p>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {/* Source badge */}
        <Badge
          variant="outline"
          className={`text-xs ${item.source === "scheduled" ? "border-purple-200 text-purple-600" : "border-slate-200 text-slate-500"}`}
        >
          <Database className="h-2.5 w-2.5 mr-1" />
          {item.source === "scheduled" ? "authored" : "queue"}
        </Badge>

        {/* Content type badge for scheduled_content items */}
        {item.source === "scheduled" && item.format && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONTENT_TYPE_COLORS[item.format] ?? "bg-slate-100 text-slate-600"}`}>
            {CONTENT_TYPE_OPTIONS.find(t => t.value === item.format)?.emoji}{" "}
            {CONTENT_TYPE_OPTIONS.find(t => t.value === item.format)?.label ?? item.format}
          </span>
        )}

        {item.source === "queue" && item.format && (
          <Badge variant="outline" className="text-xs">{item.format}</Badge>
        )}
        {platforms.map(p => (
          <span
            key={p}
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_COLORS[p] ?? "bg-slate-100 text-slate-600"}`}
          >
            {p}
          </span>
        ))}
        {item.status && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] ?? "bg-slate-100 text-slate-600"}`}>
            {item.status}
          </span>
        )}
      </div>

      {/* Scheduled date */}
      {item.scheduled_at && (
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <CalendarDays className="h-3 w-3" />
          {formatDate(item.scheduled_at)}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-slate-100">
        <button
          onClick={() => onEdit(item)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <Edit2 className="h-3.5 w-3.5" /> Edit
        </button>
        {item.source === "queue" && (
          <button
            onClick={() => onDuplicate(item)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" /> Duplicate
          </button>
        )}
        <button
          onClick={() => onDelete(item.id)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 transition-colors ml-auto"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    </div>
  );
}

function ContentRow({ item, onEdit, onDuplicate, onDelete, getPlatforms, formatDate }: CardProps) {
  const platforms = getPlatforms(item.platform);

  return (
    <div className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex items-center gap-4 hover:shadow-sm transition-shadow">
      {/* Thumbnail / icon */}
      {item.image_urls?.[0] ? (
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
          <img src={item.image_urls[0]} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
          <ImageIcon className="h-5 w-5 text-slate-300" />
        </div>
      )}

      {/* Content */}
      <p className="text-sm text-slate-700 line-clamp-1 flex-1">{item.content}</p>

      {/* Meta */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Source badge */}
        <Badge
          variant="outline"
          className={`text-xs hidden md:flex ${item.source === "scheduled" ? "border-purple-200 text-purple-600" : "border-slate-200 text-slate-500"}`}
        >
          {item.source === "scheduled" ? "authored" : "queue"}
        </Badge>

        {/* Content type badge for scheduled items */}
        {item.source === "scheduled" && item.format && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium hidden md:inline ${CONTENT_TYPE_COLORS[item.format] ?? "bg-slate-100 text-slate-600"}`}>
            {CONTENT_TYPE_OPTIONS.find(t => t.value === item.format)?.emoji}{" "}
            {CONTENT_TYPE_OPTIONS.find(t => t.value === item.format)?.label ?? item.format}
          </span>
        )}

        {item.source === "queue" && item.format && (
          <Badge variant="outline" className="text-xs hidden md:flex">{item.format}</Badge>
        )}
        {platforms.slice(0, 2).map(p => (
          <span
            key={p}
            className={`text-xs px-2 py-0.5 rounded-full font-medium hidden md:inline ${PLATFORM_COLORS[p] ?? "bg-slate-100"}`}
          >
            {p}
          </span>
        ))}
        {item.status && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] ?? "bg-slate-100"}`}>
            {item.status}
          </span>
        )}
        {item.scheduled_at && (
          <span className="text-xs text-slate-400 hidden lg:flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {formatDate(item.scheduled_at)}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(item)}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
          title="Edit"
        >
          <Edit2 className="h-4 w-4" />
        </button>
        {item.source === "queue" && (
          <button
            onClick={() => onDuplicate(item)}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
            title="Duplicate"
          >
            <Copy className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => onDelete(item.id)}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
