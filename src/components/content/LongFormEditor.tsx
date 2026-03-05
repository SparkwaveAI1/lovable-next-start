import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessContext } from "@/contexts/BusinessContext";
import {
  Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Quote, Code2, Undo, Redo, Type,
  Loader2, Save, FileText, PenLine, Info, Trash2, AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

const CONTENT_TYPES = [
  { value: "blog",             label: "Blog Post",        emoji: "📝" },
  { value: "linkedin_article", label: "LinkedIn Article", emoji: "💼" },
  { value: "twitter_thread",   label: "Twitter Thread",   emoji: "🧵" },
  { value: "substack",         label: "Substack",         emoji: "📮" },
  { value: "newsletter",       label: "Newsletter",        emoji: "📰" },
] as const;

type ContentType = typeof CONTENT_TYPES[number]["value"];

// Hard limits (null = no hard limit). Warn thresholds below.
const CONTENT_LIMITS: Record<
  ContentType,
  { warnAt: number; hardLimit: number | null; unit: "chars" | "words" }
> = {
  blog:             { warnAt: 3000,  hardLimit: null, unit: "chars" },
  linkedin_article: { warnAt: 2500,  hardLimit: 3000, unit: "chars" },
  twitter_thread:   { warnAt: 260,   hardLimit: 280,  unit: "chars" }, // per tweet
  substack:         { warnAt: 5000,  hardLimit: null, unit: "chars" },
  newsletter:       { warnAt: 2000,  hardLimit: null, unit: "chars" },
};

const FORMAT_PRESETS: Record<ContentType, { range: string; tip: string }> = {
  blog:             { range: "800–2000 words",   tip: "Mix headers, bullet points, code blocks. Include intro + conclusion." },
  linkedin_article: { range: "100–300 words",    tip: "Start with a hook. Keep professional but conversational. Max 3000 chars." },
  twitter_thread:   { range: "5–10 tweets",      tip: "Each tweet stands alone AND contributes to the thread narrative. 280 chars max per tweet." },
  substack:         { range: "1500–3000 words",  tip: "Personal perspective. Can be long-form narrative. Warn at 5000 chars." },
  newsletter:       { range: "500–1500 words",   tip: "Curated updates + brief commentary. Keep scannable. Warn at 2000 chars." },
};

interface Draft {
  id: string;
  topic: string | null;
  content: string;
  content_type: string;
  platform: string | null;
  created_at: string | null;
  status: string | null;
}

// ─── Schema check cache ────────────────────────────────────────────────────────

let schemaCheckCache: { ok: boolean; ts: number } | null = null;
const SCHEMA_CACHE_MS = 5 * 60 * 1000; // 5 minutes

// ─── Toolbar Button ───────────────────────────────────────────────────────────

function ToolbarButton({
  onClick, isActive, disabled, children, title,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant={isActive ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function contentTypeLabel(val: string): string {
  return CONTENT_TYPES.find((t) => t.value === val)?.label ?? val;
}

function contentTypeEmoji(val: string): string {
  return CONTENT_TYPES.find((t) => t.value === val)?.emoji ?? "";
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function friendlyError(err: unknown): string {
  if (!err) return "An unexpected error occurred. Please try again.";
  if (typeof err === "string") {
    if (err.includes("fetch") || err.includes("network") || err.toLowerCase().includes("failed to fetch")) {
      return "Couldn't save. Please check your connection and try again.";
    }
    return "An unexpected error occurred. Please try again.";
  }
  const e = err as { message?: string; code?: string };
  const msg = e.message ?? "";
  if (msg.includes("fetch") || msg.includes("network") || msg.toLowerCase().includes("failed to fetch")) {
    return "Couldn't save. Please check your connection and try again.";
  }
  if (msg.includes("violates") || msg.includes("constraint") || e.code === "23505") {
    return "This content already exists or violates a database rule. Please try editing instead.";
  }
  return "An unexpected error occurred. Please try again.";
}

// ─── TypeBadge ───────────────────────────────────────────────────────────────

function TypeBadge({ contentType }: { contentType: string }) {
  const colors: Record<string, string> = {
    blog:             "bg-purple-50 text-purple-700 border-purple-200",
    linkedin_article: "bg-blue-50 text-blue-700 border-blue-200",
    twitter_thread:   "bg-sky-50 text-sky-700 border-sky-200",
    substack:         "bg-orange-50 text-orange-700 border-orange-200",
    newsletter:       "bg-green-50 text-green-700 border-green-200",
  };
  const cls = colors[contentType] ?? "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>
      {contentTypeEmoji(contentType)} {contentTypeLabel(contentType)}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface LongFormEditorProps {
  /** Called after a draft is saved, so the parent can refresh the library tab */
  onSaved?: () => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LongFormEditor({ onSaved }: LongFormEditorProps) {
  const { toast } = useToast();
  const { selectedBusiness } = useBusinessContext();
  const [activeView, setActiveView] = useState<"editor" | "library">("editor");

  // Editor state
  const [title, setTitle]             = useState("");
  const [contentType, setContentType] = useState<ContentType>("blog");
  const [saving, setSaving]           = useState(false);
  const [titleError, setTitleError]   = useState("");

  // Twitter Thread state
  const [tweets, setTweets] = useState<string[]>([""]);

  // Library state
  const [drafts, setDrafts]                 = useState<Draft[]>([]);
  const [loadingDrafts, setLoadingDrafts]   = useState(false);
  const [filterType, setFilterType]         = useState<string>("All");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting]             = useState(false);

  // Schema check
  const [schemaOk, setSchemaOk]     = useState(true);
  const [schemaChecked, setSchemaChecked] = useState(false);

  // Preset info panel
  const [showPreset, setShowPreset] = useState(false);

  // ─── Runtime schema check ─────────────────────────────────────────────────

  useEffect(() => {
    const now = Date.now();
    if (schemaCheckCache && now - schemaCheckCache.ts < SCHEMA_CACHE_MS) {
      setSchemaOk(schemaCheckCache.ok);
      setSchemaChecked(true);
      return;
    }

    supabase
      .from("scheduled_content")
      .select("id")
      .limit(1)
      .then(({ error }) => {
        const ok = !error;
        schemaCheckCache = { ok, ts: Date.now() };
        setSchemaOk(ok);
        setSchemaChecked(true);
        if (!ok) {
          toast({
            title: "Content storage not configured",
            description: "Contact support to enable the content library.",
            variant: "destructive",
          });
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── TipTap editor ──────────────────────────────────────────────────────────

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-blue-600 underline cursor-pointer" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[400px] p-4 focus:outline-none",
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL", prev);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  // Reset tweets when switching TO twitter_thread
  useEffect(() => {
    if (contentType === "twitter_thread") {
      setTweets([""]);
    }
  }, [contentType]);

  // ─── Content metrics ──────────────────────────────────────────────────────

  const getEditorText = useCallback(() => {
    if (!editor) return "";
    return editor.getText();
  }, [editor]);

  const getCharCount = useCallback(() => {
    if (contentType === "twitter_thread") return 0; // per-tweet tracking
    return getEditorText().length;
  }, [contentType, getEditorText]);

  const limits = CONTENT_LIMITS[contentType];

  // Is the save button disabled due to hard limit?
  const hardLimitExceeded = (() => {
    if (contentType === "twitter_thread") {
      return tweets.some((t) => t.length > 280);
    }
    if (limits.hardLimit === null) return false;
    return getCharCount() > limits.hardLimit;
  })();

  // ─── Load draft into editor ───────────────────────────────────────────────

  const loadDraftIntoEditor = (draft: Draft) => {
    if (!editor) return;
    setTitle(draft.topic ?? "");
    setTitleError("");
    const ct = CONTENT_TYPES.find((t) => t.value === draft.content_type);
    setContentType(ct ? ct.value : "blog");
    if (draft.content_type === "twitter_thread") {
      try {
        const parsed = JSON.parse(draft.content ?? '[""]');
        setTweets(Array.isArray(parsed) ? parsed : [""]);
      } catch {
        setTweets([draft.content ?? ""]);
      }
    } else {
      editor.commands.setContent(draft.content ?? "");
    }
    setActiveView("editor");
    toast({
      title: "Draft loaded",
      description: `"${draft.topic}" loaded into editor.`,
    });
  };

  // ─── Save draft ───────────────────────────────────────────────────────────

  const saveDraft = async () => {
    if (!editor) return;

    // Validate title
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError("Title is required.");
      return;
    }
    if (trimmedTitle.length > 200) {
      setTitleError("Title exceeds 200 characters.");
      return;
    }
    setTitleError("");

    // BusinessContext validity check (at save time, not mount time)
    const currentBusiness = selectedBusiness;
    if (!currentBusiness?.id) {
      toast({
        title: "Unable to determine business context",
        description: "Please select a business before saving.",
        variant: "destructive",
      });
      return;
    }

    // Build body
    let body: string;

    if (contentType === "twitter_thread") {
      const nonEmpty = tweets.filter((t) => t.trim());
      if (nonEmpty.length === 0) {
        toast({
          title: "Content is required",
          description: "Add at least one tweet before saving.",
          variant: "destructive",
        });
        return;
      }
      const overIdx = tweets.findIndex((t) => t.length > 280);
      if (overIdx !== -1) {
        toast({
          title: `Tweet ${overIdx + 1} exceeds 280 characters`,
          description: "Shorten it before saving.",
          variant: "destructive",
        });
        return;
      }
      body = JSON.stringify(nonEmpty.map((t) => ({ text: t })));
    } else {
      const text = getEditorText();
      if (text.trim().length < 10) {
        toast({
          title: "Content is required",
          description: "Write at least a few words before saving.",
          variant: "destructive",
        });
        return;
      }
      if (limits.hardLimit !== null && text.length > limits.hardLimit) {
        toast({
          title: `Content exceeds ${limits.hardLimit.toLocaleString()} characters`,
          description: "Trim your content before saving.",
          variant: "destructive",
        });
        return;
      }
      body = editor.getHTML();
    }

    setSaving(true);

    // Optimistic: create a temp draft object before Supabase returns
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticDraft: Draft = {
      id: optimisticId,
      topic: trimmedTitle,
      content: body,
      content_type: contentType,
      platform: contentTypeLabel(contentType),
      created_at: new Date().toISOString(),
      status: "draft",
    };

    // Switch to library so user sees optimistic entry (only if already in library)
    const wasInLibrary = activeView === "library";
    if (wasInLibrary) {
      setDrafts((prev) => [optimisticDraft, ...prev]);
    }

    try {
      const { data, error } = await supabase
        .from("scheduled_content")
        .insert({
          topic:        trimmedTitle,
          content:      body,
          content_type: contentType,
          platform:     contentTypeLabel(contentType),
          business_id:  currentBusiness.id,
          status:       "draft",
        })
        .select("id, topic, content, content_type, platform, created_at, status")
        .single();

      if (error) throw error;

      toast({ title: "Draft saved!", description: `"${trimmedTitle}" saved to your library.` });

      // Replace optimistic draft with real one (or just prepend if not in library view)
      const realDraft: Draft = data as Draft;
      if (wasInLibrary) {
        setDrafts((prev) =>
          prev.map((d) => (d.id === optimisticId ? realDraft : d))
        );
      } else {
        setDrafts((prev) => [realDraft, ...prev]);
      }

      // Reset editor
      setTitle("");
      setTitleError("");
      if (contentType === "twitter_thread") {
        setTweets([""]);
      } else {
        editor.commands.clearContent();
      }

      // Notify parent to refresh its library tab
      onSaved?.();
    } catch (err) {
      // Rollback optimistic update
      if (wasInLibrary) {
        setDrafts((prev) => prev.filter((d) => d.id !== optimisticId));
      }
      toast({
        title: "Save failed",
        description: friendlyError(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ─── Load drafts ──────────────────────────────────────────────────────────

  const loadDrafts = useCallback(async () => {
    setLoadingDrafts(true);
    try {
      let query = supabase
        .from("scheduled_content")
        .select("id, topic, content, content_type, platform, created_at, status")
        .eq("status", "draft")
        .order("created_at", { ascending: false })
        .limit(50);

      if (filterType !== "All") {
        query = query.eq("content_type", filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDrafts((data as Draft[]) ?? []);
    } catch (err) {
      toast({
        title: "Failed to load drafts",
        description: friendlyError(err),
        variant: "destructive",
      });
    } finally {
      setLoadingDrafts(false);
    }
  }, [filterType, toast]);

  useEffect(() => {
    if (activeView === "library") {
      loadDrafts();
    }
  }, [activeView, loadDrafts]);

  // ─── Delete draft ──────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);

    // Optimistic remove
    setDrafts((prev) => prev.filter((d) => d.id !== deleteTargetId));

    try {
      const { error } = await supabase
        .from("scheduled_content")
        .delete()
        .eq("id", deleteTargetId);
      if (error) throw error;
      toast({ title: "Draft deleted." });
    } catch (err) {
      // Rollback: reload
      toast({
        title: "Delete failed",
        description: friendlyError(err),
        variant: "destructive",
      });
      loadDrafts();
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  };

  // ─── Twitter thread helpers ────────────────────────────────────────────────

  const twitterPreview = (content: string): string => {
    try {
      const arr = JSON.parse(content);
      if (Array.isArray(arr)) return `${arr.length} tweet${arr.length !== 1 ? "s" : ""}`;
    } catch { /* ignore */ }
    return content.slice(0, 60);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* View switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveView("editor")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeView === "editor"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <PenLine className="h-4 w-4" />
          Write
        </button>
        <button
          onClick={() => setActiveView("library")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeView === "library"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileText className="h-4 w-4" />
          Draft Library
        </button>
      </div>

      {/* Schema error banner */}
      {schemaChecked && !schemaOk && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Content storage not configured. Contact support.
        </div>
      )}

      {/* ── Editor View ────────────────────────────────────────────────────── */}
      {activeView === "editor" && (
        <div className="flex flex-col gap-4">
          {/* Controls row */}
          <div className="flex flex-wrap items-end gap-4">
            {/* Content type */}
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <Label className="text-xs text-slate-500">Content Type</Label>
              <Select
                value={contentType}
                onValueChange={(v) => setContentType(v as ContentType)}
              >
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.emoji} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[240px]">
              <Label className="text-xs text-slate-500">Title</Label>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (e.target.value.trim()) setTitleError("");
                }}
                placeholder="Enter a title for your draft…"
                className={`h-9 bg-white ${titleError ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                maxLength={201}
              />
              {titleError && (
                <p className="text-xs text-red-600">{titleError}</p>
              )}
            </div>

            {/* Info toggle */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreset((p) => !p)}
              className="h-9 shrink-0"
              title="Format guidelines"
            >
              <Info className="h-4 w-4" />
            </Button>

            {/* Business context display */}
            {selectedBusiness && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 h-9">
                <span className="font-medium">{selectedBusiness.name}</span>
              </div>
            )}

            {/* Save */}
            <Button
              onClick={saveDraft}
              disabled={saving || !editor || !schemaOk || hardLimitExceeded}
              className="bg-indigo-600 hover:bg-indigo-700 h-9 shrink-0"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Draft
            </Button>
          </div>

          {/* Format preset panel */}
          {showPreset && (
            <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 text-indigo-800 text-sm rounded-lg px-4 py-3">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-indigo-500" />
              <div>
                <span className="font-semibold">{contentTypeEmoji(contentType)} {contentTypeLabel(contentType)}:</span>{" "}
                <span className="text-indigo-700 font-medium">{FORMAT_PRESETS[contentType].range}</span>
                {" — "}
                {FORMAT_PRESETS[contentType].tip}
              </div>
            </div>
          )}

          {/* Twitter Thread mode */}
          {contentType === "twitter_thread" ? (
            <div className="border border-slate-200 rounded-lg bg-white shadow-sm p-4">
              <div className="flex flex-col gap-3">
                {tweets.map((tweet, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">
                        Tweet {i + 1}
                      </span>
                      {tweets.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setTweets(tweets.filter((_, idx) => idx !== i))
                          }
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <textarea
                      className={`w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        tweet.length > 280
                          ? "border-red-400"
                          : tweet.length >= 260
                          ? "border-amber-400"
                          : "border-slate-200"
                      }`}
                      rows={3}
                      value={tweet}
                      onChange={(e) => {
                        const updated = [...tweets];
                        updated[i] = e.target.value;
                        setTweets(updated);
                      }}
                      placeholder={
                        i === 0 ? "Start your thread here…" : `Tweet ${i + 1}…`
                      }
                    />
                    <div
                      className={`text-xs text-right ${
                        tweet.length > 280
                          ? "text-red-600 font-semibold"
                          : tweet.length >= 260
                          ? "text-amber-600"
                          : "text-slate-400"
                      }`}
                    >
                      {tweet.length} / 280
                      {tweet.length > 280 && (
                        <span className="ml-2">⚠ Exceeds limit</span>
                      )}
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTweets([...tweets, ""])}
                  className="self-start"
                >
                  + Add Tweet
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Rich text editor */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                {/* Toolbar */}
                {editor && (
                  <div className="bg-slate-50 border-b border-slate-200 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {/* Undo / Redo */}
                      <ToolbarButton
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        title="Undo"
                      >
                        <Undo className="h-4 w-4" />
                      </ToolbarButton>
                      <ToolbarButton
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        title="Redo"
                      >
                        <Redo className="h-4 w-4" />
                      </ToolbarButton>

                      <Separator orientation="vertical" className="h-6 mx-1" />

                      {/* Bold / Italic / Underline */}
                      <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        isActive={editor.isActive("bold")}
                        title="Bold"
                      >
                        <Bold className="h-4 w-4" />
                      </ToolbarButton>
                      <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        isActive={editor.isActive("italic")}
                        title="Italic"
                      >
                        <Italic className="h-4 w-4" />
                      </ToolbarButton>
                      <ToolbarButton
                        onClick={() =>
                          editor.chain().focus().toggleUnderline().run()
                        }
                        isActive={editor.isActive("underline")}
                        title="Underline"
                      >
                        <UnderlineIcon className="h-4 w-4" />
                      </ToolbarButton>

                      <Separator orientation="vertical" className="h-6 mx-1" />

                      {/* Headings dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 px-2">
                            <Type className="h-4 w-4 mr-1" />
                            {editor.isActive("heading", { level: 1 })
                              ? "H1"
                              : editor.isActive("heading", { level: 2 })
                              ? "H2"
                              : editor.isActive("heading", { level: 3 })
                              ? "H3"
                              : "P"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem
                            onClick={() =>
                              editor.chain().focus().setParagraph().run()
                            }
                          >
                            Normal
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              editor
                                .chain()
                                .focus()
                                .toggleHeading({ level: 1 })
                                .run()
                            }
                          >
                            Heading 1
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              editor
                                .chain()
                                .focus()
                                .toggleHeading({ level: 2 })
                                .run()
                            }
                          >
                            Heading 2
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              editor
                                .chain()
                                .focus()
                                .toggleHeading({ level: 3 })
                                .run()
                            }
                          >
                            Heading 3
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Separator orientation="vertical" className="h-6 mx-1" />

                      {/* Lists */}
                      <ToolbarButton
                        onClick={() =>
                          editor.chain().focus().toggleBulletList().run()
                        }
                        isActive={editor.isActive("bulletList")}
                        title="Bullet List"
                      >
                        <List className="h-4 w-4" />
                      </ToolbarButton>
                      <ToolbarButton
                        onClick={() =>
                          editor.chain().focus().toggleOrderedList().run()
                        }
                        isActive={editor.isActive("orderedList")}
                        title="Numbered List"
                      >
                        <ListOrdered className="h-4 w-4" />
                      </ToolbarButton>

                      <Separator orientation="vertical" className="h-6 mx-1" />

                      {/* Alignment */}
                      <ToolbarButton
                        onClick={() =>
                          editor.chain().focus().setTextAlign("left").run()
                        }
                        isActive={editor.isActive({ textAlign: "left" })}
                        title="Align Left"
                      >
                        <AlignLeft className="h-4 w-4" />
                      </ToolbarButton>
                      <ToolbarButton
                        onClick={() =>
                          editor.chain().focus().setTextAlign("center").run()
                        }
                        isActive={editor.isActive({ textAlign: "center" })}
                        title="Align Center"
                      >
                        <AlignCenter className="h-4 w-4" />
                      </ToolbarButton>
                      <ToolbarButton
                        onClick={() =>
                          editor.chain().focus().setTextAlign("right").run()
                        }
                        isActive={editor.isActive({ textAlign: "right" })}
                        title="Align Right"
                      >
                        <AlignRight className="h-4 w-4" />
                      </ToolbarButton>

                      <Separator orientation="vertical" className="h-6 mx-1" />

                      {/* Link / Blockquote / Code */}
                      <ToolbarButton
                        onClick={setLink}
                        isActive={editor.isActive("link")}
                        title="Insert Link"
                      >
                        <LinkIcon className="h-4 w-4" />
                      </ToolbarButton>
                      <ToolbarButton
                        onClick={() =>
                          editor.chain().focus().toggleBlockquote().run()
                        }
                        isActive={editor.isActive("blockquote")}
                        title="Blockquote"
                      >
                        <Quote className="h-4 w-4" />
                      </ToolbarButton>
                      <ToolbarButton
                        onClick={() =>
                          editor.chain().focus().toggleCode().run()
                        }
                        isActive={editor.isActive("code")}
                        title="Inline Code"
                      >
                        <Code2 className="h-4 w-4" />
                      </ToolbarButton>
                    </div>
                  </div>
                )}

                {/* Editor area */}
                <EditorContent editor={editor} />
              </div>

              {/* Char counter */}
              {editor && (() => {
                const text = getEditorText();
                const count = text.length;
                const isHardOver =
                  limits.hardLimit !== null && count > limits.hardLimit;
                const isWarning = count >= limits.warnAt;
                const colorClass = isHardOver
                  ? "text-red-600 font-semibold"
                  : isWarning
                  ? "text-amber-600"
                  : "text-slate-400";
                const limitStr = limits.hardLimit
                  ? `${count.toLocaleString()} / ${limits.hardLimit.toLocaleString()} chars`
                  : `${count.toLocaleString()} chars ${isWarning ? `(warn at ${limits.warnAt.toLocaleString()})` : ""}`;
                return (
                  <div className={`text-xs text-right mt-1 ${colorClass}`}>
                    {limitStr}
                    {isHardOver && <span className="ml-2">⚠ Hard limit exceeded — trim before saving</span>}
                    {!isHardOver && isWarning && limits.hardLimit === null && (
                      <span className="ml-2">⚠ Getting long</span>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* ── Library View ─────────────────────────────────────────────────── */}
      {activeView === "library" && (
        <div className="flex flex-col gap-3">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-52 bg-white">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All types</SelectItem>
                {CONTENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.emoji} {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="text-sm text-slate-500 ml-auto">
              {loadingDrafts
                ? "Loading…"
                : `${drafts.length} draft${drafts.length !== 1 ? "s" : ""}`}
            </p>

            <Button
              variant="outline"
              size="sm"
              onClick={loadDrafts}
              disabled={loadingDrafts}
            >
              {loadingDrafts && (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              )}
              Refresh
            </Button>
          </div>

          {loadingDrafts ? (
            <div className="flex items-center justify-center h-40 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
              <FileText className="h-8 w-8" />
              <p className="text-sm">No drafts yet — write something!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className={`flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm transition-colors ${
                    draft.id.startsWith("optimistic-")
                      ? "opacity-60 cursor-default"
                      : "cursor-pointer hover:bg-indigo-50 hover:border-indigo-300"
                  }`}
                  onClick={() => {
                    if (!draft.id.startsWith("optimistic-")) loadDraftIntoEditor(draft);
                  }}
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-medium text-slate-800 truncate">
                      {draft.topic || "(Untitled)"}
                    </span>
                    <div className="flex items-center gap-2">
                      <TypeBadge contentType={draft.content_type} />
                      {draft.content_type === "twitter_thread" && (
                        <span className="text-xs text-slate-400">
                          {twitterPreview(draft.content)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {formatDate(draft.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="secondary"
                      className="text-xs capitalize bg-amber-50 text-amber-700 border-amber-200"
                    >
                      {draft.status}
                    </Badge>
                    {!draft.id.startsWith("optimistic-") && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetId(draft.id);
                        }}
                        className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete draft"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={() => !deleting && setDeleteTargetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The draft will be permanently removed
              from your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
