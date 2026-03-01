import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, LayoutGrid, List, Plus, Edit2, CalendarDays, Copy, Trash2,
  FileText, Loader2, ImageIcon
} from "lucide-react";
import { ComposePanel } from "./ComposePanel";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface ContentItem {
  id: string;
  content: string;
  platform: string;
  style: string | null;
  status: string | null;
  created_at: string | null;
  scheduled_time: string | null;
  brand: string;
  image_urls: string[] | null;
}

const FORMAT_OPTIONS = ["All", "Short Post", "Thread", "Article", "Slide Deck"] as const;
const PLATFORM_OPTIONS = ["All", "twitter", "linkedin", "instagram", "tiktok", "facebook"] as const;
const STATUS_OPTIONS = ["All", "draft", "scheduled", "posted"] as const;

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "bg-sky-100 text-sky-700",
  linkedin: "bg-blue-100 text-blue-700",
  instagram: "bg-pink-100 text-pink-700",
  tiktok: "bg-slate-100 text-slate-700",
  facebook: "bg-indigo-100 text-indigo-700",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-700",
  scheduled: "bg-blue-100 text-blue-700",
  posted: "bg-green-100 text-green-700",
};

interface ContentLibraryProps {
  brand: string;
}

export function ContentLibrary({ brand }: ContentLibraryProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterFormat, setFilterFormat] = useState<string>("All");
  const [filterPlatform, setFilterPlatform] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [composeOpen, setComposeOpen] = useState(false);
  const [editItem, setEditItem] = useState<ContentItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!brand) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let q = supabase
        .from("content_queue")
        .select("id, content, platform, style, status, created_at, scheduled_time, brand, image_urls")
        .eq("brand", brand)
        .order("created_at", { ascending: false });

      if (filterFormat !== "All") q = q.eq("style", filterFormat);
      if (filterPlatform !== "All") q = q.ilike("platform", `%${filterPlatform}%`);
      if (filterStatus !== "All") q = q.eq("status", filterStatus);
      if (search.trim()) q = q.ilike("content", `%${search.trim()}%`);

      const { data, error } = await q.limit(100);
      if (error) throw error;
      setItems((data ?? []) as ContentItem[]);
    } catch (e) {
      toast({ title: "Error loading content", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [brand, filterFormat, filterPlatform, filterStatus, search, toast]);

  useEffect(() => {
    const timer = setTimeout(() => fetchItems(), 300);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  const handleDuplicate = async (item: ContentItem) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("content_queue").insert({
        content: item.content,
        platform: item.platform,
        style: item.style,
        brand: item.brand,
        status: "draft",
        created_by: user?.id,
      });
      if (error) throw error;
      toast({ title: "Duplicated!", description: "Content duplicated as draft." });
      fetchItems();
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("content_queue").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Deleted", description: "Content removed." });
      fetchItems();
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  const handleEdit = (item: ContentItem) => {
    setEditItem(item);
    setComposeOpen(true);
  };

  const handleAddNew = () => {
    setEditItem(null);
    setComposeOpen(true);
  };

  const getPlatforms = (platform: string) =>
    platform.split(",").filter(Boolean);

  const formatDate = (dt: string | null) => {
    if (!dt) return null;
    return new Date(dt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

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

        <Select value={filterFormat} onValueChange={setFilterFormat}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            {FORMAT_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            {PLATFORM_OPTIONS.map(p => <SelectItem key={p} value={p}>{p === "All" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s === "All" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
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

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-16 w-16 text-slate-200 mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">No content yet</h3>
          <p className="text-slate-400 text-sm mb-6">Add your first piece of content to get started.</p>
          <Button onClick={handleAddNew} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Content
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
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
          {items.map(item => (
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
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && handleDelete(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

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
      {/* Media thumbnail */}
      {item.image_urls?.[0] && (
        <div className="w-full h-28 rounded-lg overflow-hidden bg-slate-100">
          <img src={item.image_urls[0]} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Content preview */}
      <p className="text-sm text-slate-700 line-clamp-3 flex-1">{item.content}</p>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {item.style && (
          <Badge variant="outline" className="text-xs">{item.style}</Badge>
        )}
        {platforms.map(p => (
          <span key={p} className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_COLORS[p] ?? "bg-slate-100 text-slate-600"}`}>
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
      {item.scheduled_time && (
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <CalendarDays className="h-3 w-3" />
          {formatDate(item.scheduled_time)}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-slate-100">
        <button onClick={() => onEdit(item)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors">
          <Edit2 className="h-3.5 w-3.5" /> Edit
        </button>
        <button onClick={() => onDuplicate(item)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors">
          <Copy className="h-3.5 w-3.5" /> Duplicate
        </button>
        <button onClick={() => onDelete(item.id)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 transition-colors ml-auto">
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
      {/* Thumbnail */}
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
        {item.style && (
          <Badge variant="outline" className="text-xs hidden md:flex">{item.style}</Badge>
        )}
        {platforms.slice(0, 2).map(p => (
          <span key={p} className={`text-xs px-2 py-0.5 rounded-full font-medium hidden md:inline ${PLATFORM_COLORS[p] ?? "bg-slate-100"}`}>
            {p}
          </span>
        ))}
        {item.status && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] ?? "bg-slate-100"}`}>
            {item.status}
          </span>
        )}
        {item.scheduled_time && (
          <span className="text-xs text-slate-400 hidden lg:flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />{formatDate(item.scheduled_time)}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={() => onEdit(item)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors">
          <Edit2 className="h-4 w-4" />
        </button>
        <button onClick={() => onDuplicate(item)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors">
          <Copy className="h-4 w-4" />
        </button>
        <button onClick={() => onDelete(item.id)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
