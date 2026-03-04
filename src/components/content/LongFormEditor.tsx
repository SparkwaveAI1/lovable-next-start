import { useState, useEffect, useCallback } from "react";
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
import {
  Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Quote, Code2, Undo, Redo, Type,
  Loader2, Save, FileText, PenLine,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ────────────────────────────────────────────────────────────────────

const CONTENT_TYPES = [
  { value: "blog",              label: "Blog Post" },
  { value: "linkedin_article",  label: "LinkedIn Article" },
  { value: "twitter_thread",    label: "Twitter Thread" },
  { value: "substack",          label: "Substack" },
  { value: "medium",            label: "Medium" },
  { value: "newsletter",        label: "Newsletter" },
] as const;

type ContentType = typeof CONTENT_TYPES[number]["value"];

interface Draft {
  id: string;
  title: string;
  content_type: ContentType;
  created_at: string;
  status: string;
}

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

// ─── Main Component ───────────────────────────────────────────────────────────

export function LongFormEditor() {
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<"editor" | "library">("editor");

  // Editor state
  const [title, setTitle]             = useState("");
  const [contentType, setContentType] = useState<ContentType>("blog");
  const [saving, setSaving]           = useState(false);

  // Library state
  const [drafts, setDrafts]           = useState<Draft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);

  // ─── TipTap editor ──────────────────────────────────────────────────────────

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
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
        class:
          "prose prose-sm max-w-none min-h-[400px] p-4 focus:outline-none",
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

  // ─── Save draft ─────────────────────────────────────────────────────────────

  const saveDraft = async () => {
    if (!editor) return;
    const body = editor.getHTML();
    if (!title.trim()) {
      toast({ title: "Title required", description: "Please add a title before saving.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("content_drafts").insert({
        title: title.trim(),
        body,
        content_type: contentType,
        status: "draft",
      });
      if (error) throw error;
      toast({ title: "Draft saved", description: `"${title.trim()}" saved to your library.` });
      // Reset
      setTitle("");
      editor.commands.clearContent();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ─── Load drafts ─────────────────────────────────────────────────────────────

  const loadDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const { data, error } = await supabase
        .from("content_drafts")
        .select("id, title, content_type, created_at, status")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setDrafts((data as Draft[]) ?? []);
    } catch (err: any) {
      toast({ title: "Failed to load drafts", description: err.message, variant: "destructive" });
    } finally {
      setLoadingDrafts(false);
    }
  };

  useEffect(() => {
    if (activeView === "library") loadDrafts();
  }, [activeView]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const contentTypeLabel = (val: string) =>
    CONTENT_TYPES.find((t) => t.value === val)?.label ?? val;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // ─── Render ──────────────────────────────────────────────────────────────────

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

      {/* ── Editor View ─────────────────────────────────────────────────────── */}
      {activeView === "editor" && (
        <div className="flex flex-col gap-4">
          {/* Controls row */}
          <div className="flex flex-wrap items-end gap-4">
            {/* Content type */}
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <Label className="text-xs text-slate-500">Content Type</Label>
              <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
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
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your draft…"
                className="h-9 bg-white"
              />
            </div>

            {/* Save */}
            <Button
              onClick={saveDraft}
              disabled={saving || !editor}
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
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
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
                      <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
                        Normal
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                        Heading 1
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                        Heading 2
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                        Heading 3
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Separator orientation="vertical" className="h-6 mx-1" />

                  {/* Lists */}
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive("bulletList")}
                    title="Bullet List"
                  >
                    <List className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive("orderedList")}
                    title="Numbered List"
                  >
                    <ListOrdered className="h-4 w-4" />
                  </ToolbarButton>

                  <Separator orientation="vertical" className="h-6 mx-1" />

                  {/* Alignment */}
                  <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign("left").run()}
                    isActive={editor.isActive({ textAlign: "left" })}
                    title="Align Left"
                  >
                    <AlignLeft className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign("center").run()}
                    isActive={editor.isActive({ textAlign: "center" })}
                    title="Align Center"
                  >
                    <AlignCenter className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign("right").run()}
                    isActive={editor.isActive({ textAlign: "right" })}
                    title="Align Right"
                  >
                    <AlignRight className="h-4 w-4" />
                  </ToolbarButton>

                  <Separator orientation="vertical" className="h-6 mx-1" />

                  {/* Link / Blockquote / Code */}
                  <ToolbarButton onClick={setLink} isActive={editor.isActive("link")} title="Insert Link">
                    <LinkIcon className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive("blockquote")}
                    title="Blockquote"
                  >
                    <Quote className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCode().run()}
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
        </div>
      )}

      {/* ── Library View ────────────────────────────────────────────────────── */}
      {activeView === "library" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {loadingDrafts ? "Loading…" : `${drafts.length} draft${drafts.length !== 1 ? "s" : ""}`}
            </p>
            <Button variant="outline" size="sm" onClick={loadDrafts} disabled={loadingDrafts}>
              {loadingDrafts && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
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
                  className="flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-medium text-slate-800 truncate">{draft.title || "(Untitled)"}</span>
                    <span className="text-xs text-slate-400">{formatDate(draft.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs capitalize">
                      {contentTypeLabel(draft.content_type)}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="text-xs capitalize bg-amber-50 text-amber-700 border-amber-200"
                    >
                      {draft.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
