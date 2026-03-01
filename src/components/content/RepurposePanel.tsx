import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ContentItem {
  id: string;
  content: string;
  platform: string;
  style: string | null;
  status: string | null;
}

const REPURPOSE_OPTIONS = [
  { label: "Blog → Tweet Thread", sourceFormat: "Article", targetFormat: "Tweet Thread" },
  { label: "Tweet → Article", sourceFormat: "Short Post", targetFormat: "Article" },
  { label: "Any → Slide Deck", sourceFormat: "Any", targetFormat: "Slide Deck" },
  { label: "Thread → Article", sourceFormat: "Thread", targetFormat: "Article" },
  { label: "Article → Summary Tweet", sourceFormat: "Article", targetFormat: "Summary Tweet" },
];

interface RepurposePanelProps {
  brand: string;
}

export function RepurposePanel({ brand }: RepurposePanelProps) {
  const { toast } = useToast();
  const [libraryItems, setLibraryItems] = useState<ContentItem[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [repurposeOption, setRepurposeOption] = useState<string>("");
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rateLimitHit, setRateLimitHit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load library items filtered by brand
  useEffect(() => {
    async function load() {
      if (!brand) {
        setLibraryItems([]);
        setLoadingLibrary(false);
        return;
      }
      setLoadingLibrary(true);
      try {
        const { data, error } = await supabase
          .from("content_queue")
          .select("id, content, platform, style, status")
          .eq("brand", brand)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        setLibraryItems((data ?? []) as ContentItem[]);
      } catch (e) {
        toast({ title: "Error loading library", description: String(e), variant: "destructive" });
      } finally {
        setLoadingLibrary(false);
      }
    }
    load();
  }, [brand, toast]);

  const selectedItem = libraryItems.find(i => i.id === selectedItemId);
  const selectedOption = REPURPOSE_OPTIONS.find(o => o.label === repurposeOption);

  const handleRepurpose = async () => {
    if (!selectedItem || !selectedOption) {
      toast({ title: "Missing selection", description: "Select source content and a repurpose format.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setError(null);
    setRateLimitHit(false);
    setOutput("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/repurpose-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            sourceContent: selectedItem.content,
            sourceFormat: selectedOption.sourceFormat === "Any" ? (selectedItem.style ?? "Content") : selectedOption.sourceFormat,
            targetFormat: selectedOption.targetFormat,
          }),
        }
      );

      if (response.status === 429) {
        setRateLimitHit(true);
        return;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(err.error ?? `Server error ${response.status}`);
      }

      const { result } = await response.json();
      setOutput(result ?? "");
    } catch (e) {
      const msg = String(e);
      setError(msg);
      toast({ title: "Repurpose failed", description: msg, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!output.trim()) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const platform = selectedItem?.platform ?? "twitter";

      const { error } = await supabase.from("content_queue").insert({
        content: output.trim(),
        platform,
        style: selectedOption?.targetFormat ?? "Short Post",
        brand,
        status: "draft",
        created_by: user.id,
      });
      if (error) throw error;
      toast({ title: "Saved!", description: "Repurposed content saved to your library as a draft." });
      setOutput("");
    } catch (e) {
      toast({ title: "Error saving", description: String(e), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Repurpose Content</h2>
        <p className="text-sm text-slate-500">Transform existing content into a new format. Review and save when ready.</p>
      </div>

      {/* Source content */}
      <div className="space-y-2">
        <Label>Source Content</Label>
        {loadingLibrary ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading library...
          </div>
        ) : (
          <Select value={selectedItemId} onValueChange={setSelectedItemId}>
            <SelectTrigger>
              <SelectValue placeholder="Pick content from your library..." />
            </SelectTrigger>
            <SelectContent>
              {libraryItems.map(item => (
                <SelectItem key={item.id} value={item.id}>
                  <span className="truncate block max-w-sm">
                    {item.style ? `[${item.style}] ` : ""}{item.content.slice(0, 80)}{item.content.length > 80 ? "…" : ""}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {selectedItem && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600 max-h-28 overflow-y-auto">
            {selectedItem.content}
          </div>
        )}
      </div>

      {/* Repurpose option */}
      <div className="space-y-2">
        <Label>Transform To</Label>
        <Select value={repurposeOption} onValueChange={setRepurposeOption}>
          <SelectTrigger>
            <SelectValue placeholder="Select transformation..." />
          </SelectTrigger>
          <SelectContent>
            {REPURPOSE_OPTIONS.map(o => (
              <SelectItem key={o.label} value={o.label}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Generate button */}
      <Button
        onClick={handleRepurpose}
        disabled={isGenerating || !selectedItemId || !repurposeOption}
        className="w-full bg-indigo-600 hover:bg-indigo-700"
      >
        {isGenerating ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Repurposing...</>
        ) : (
          <><RefreshCw className="h-4 w-4 mr-2" />Repurpose</>
        )}
      </Button>

      {/* Rate limit */}
      {rateLimitHit && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-700">
            Daily repurpose limit reached. You can repurpose again in 24 hours.
          </AlertDescription>
        </Alert>
      )}

      {/* Error */}
      {error && !rateLimitHit && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Output */}
      {output && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Repurposed Output</Label>
            <span className="text-xs text-slate-400">Edit as needed, then save</span>
          </div>
          <Textarea
            value={output}
            onChange={e => setOutput(e.target.value)}
            className="min-h-[200px] resize-none"
            placeholder="Output will appear here..."
          />
          <Button
            onClick={handleSave}
            disabled={isSaving || !output.trim()}
            className="w-full"
            variant="outline"
          >
            {isSaving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Save to Library</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
