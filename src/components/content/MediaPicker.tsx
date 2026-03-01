import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Image as ImageIcon, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessContext } from "@/contexts/BusinessContext";

interface MediaAsset {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  thumbnail_path: string | null;
  description: string | null;
}

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
  selectedId?: string | null;
}

const PAGE_SIZE = 20;

/**
 * Returns a displayable URL for a media asset.
 *
 * The `media_assets` table stores `file_path` as FULL public URLs
 * (e.g. "https://wrsoacujxcskydlzgopa.supabase.co/storage/v1/object/...").
 * `thumbnail_path` is null for all current records.
 *
 * We must NOT call supabase.storage.getPublicUrl() on a value that is already
 * a full URL — that would double-wrap it and break the image link.
 */
function getAssetUrl(asset: MediaAsset): string {
  const src = asset.thumbnail_path ?? asset.file_path;
  // Already a full URL — return it directly
  if (src.startsWith("http")) return src;
  // Storage path (relative) — generate public URL
  const { data } = supabase.storage.from("media").getPublicUrl(src);
  return data.publicUrl;
}

export function MediaPicker({ open, onClose, onSelect, selectedId }: MediaPickerProps) {
  const { selectedBusiness } = useBusinessContext();
  const [query, setQuery]           = useState("");
  const [assets, setAssets]         = useState<MediaAsset[]>([]);
  const [loading, setLoading]       = useState(false);
  const [page, setPage]             = useState(0);
  const [hasMore, setHasMore]       = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const observerRef  = useRef<IntersectionObserver | null>(null);
  const loadMoreRef  = useRef<HTMLDivElement | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchAssets = useCallback(
    async (searchQuery: string, pageNum: number, reset = false) => {
      if (!selectedBusiness?.id) return;
      setLoading(true);
      try {
        let q = supabase
          .from("media_assets")
          .select("id, file_name, file_path, file_type, thumbnail_path, description")
          .eq("business_id", selectedBusiness.id)
          .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

        if (searchQuery.trim()) {
          q = q.ilike("file_name", `%${searchQuery.trim()}%`);
        }

        const { data, error } = await q;
        if (error) throw error;

        const results = (data ?? []) as MediaAsset[];
        setAssets(prev => reset ? results : [...prev, ...results]);
        setHasMore(results.length === PAGE_SIZE);
      } catch (e) {
        console.error("MediaPicker fetch error:", e);
      } finally {
        setLoading(false);
      }
    },
    [selectedBusiness?.id]
  );

  // Reset and reload whenever the dialog opens OR the debounced query changes
  useEffect(() => {
    if (!open) return;
    setPage(0);
    setAssets([]);
    fetchAssets(debouncedQuery, 0, true);
  }, [debouncedQuery, open, fetchAssets]);

  // Clear search when dialog closes
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!loadMoreRef.current || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchAssets(debouncedQuery, nextPage, false);
        }
      },
      { threshold: 0.5 }
    );

    observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, page, debouncedQuery, fetchAssets]);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Media</DialogTitle>
        </DialogHeader>

        {/* Search bar */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search media files..."
              className="pl-9"
              autoFocus
            />
          </div>
          {query && (
            <Button variant="ghost" size="icon" onClick={() => setQuery("")}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Loading spinner (initial load only — no assets yet) */}
          {loading && assets.length === 0 && (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Empty state — only shown when NOT loading and truly no results */}
          {!loading && assets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <ImageIcon className="h-12 w-12 mb-3 text-slate-300" />
              <p className="text-sm">
                {debouncedQuery ? "No media found matching your search" : "No media assets yet"}
              </p>
            </div>
          )}

          {/* Asset grid */}
          {assets.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {assets.map(asset => {
                const isSelected = asset.id === selectedId;
                const isImage    =
                  asset.file_type?.startsWith("image/") ||
                  ["jpg", "jpeg", "png", "gif", "webp", "svg"].some(ext =>
                    asset.file_name.toLowerCase().endsWith(ext)
                  ) ||
                  asset.file_type === "image";

                return (
                  <button
                    key={asset.id}
                    onClick={() => { onSelect(asset); onClose(); }}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-square bg-slate-100 hover:border-indigo-400 ${
                      isSelected
                        ? "border-indigo-600 ring-2 ring-indigo-300"
                        : "border-slate-200"
                    }`}
                  >
                    {isImage ? (
                      <img
                        src={getAssetUrl(asset)}
                        alt={asset.file_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-slate-400" />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                        <Check className="h-6 w-6 text-indigo-600" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                      <p className="text-white text-xs truncate">{asset.file_name}</p>
                    </div>
                  </button>
                );
              })}

              {/* Infinite scroll trigger */}
              <div ref={loadMoreRef} className="col-span-4" />
            </div>
          )}

          {/* Pagination spinner */}
          {loading && assets.length > 0 && (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
