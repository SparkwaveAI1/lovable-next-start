import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, ImageIcon, X, Loader2 } from "lucide-react";
import { MediaPicker } from "./MediaPicker";

type ContentFormat = "Short Post" | "Thread" | "Article" | "Slide Deck";
type Platform = "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook";

interface MediaAsset {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  thumbnail_path: string | null;
}

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

interface ComposePanelProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editItem?: ContentItem | null;
  defaultDate?: Date | null;
  brand?: string;
}

const FORMATS: ContentFormat[] = ["Short Post", "Thread", "Article", "Slide Deck"];
const PLATFORMS: { value: Platform; label: string; color: string }[] = [
  { value: "twitter", label: "Twitter/X", color: "bg-sky-100 text-sky-700 border-sky-200" },
  { value: "linkedin", label: "LinkedIn", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "instagram", label: "Instagram", color: "bg-pink-100 text-pink-700 border-pink-200" },
  { value: "tiktok", label: "TikTok", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "facebook", label: "Facebook", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
];

export function ComposePanel({ open, onClose, onSaved, editItem, defaultDate, brand = "" }: ComposePanelProps) {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [format, setFormat] = useState<ContentFormat | "">("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleDateOpen, setScheduleDateOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(defaultDate ?? undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (editItem) {
      setContent(editItem.content ?? "");
      setFormat((editItem.style as ContentFormat) ?? "");
      // platforms stored as comma-separated
      const platforms = (editItem.platform ?? "").split(",").filter(Boolean) as Platform[];
      setSelectedPlatforms(platforms);
      setScheduleDate(editItem.scheduled_time ? new Date(editItem.scheduled_time) : undefined);
    } else {
      setContent("");
      setFormat("");
      setSelectedPlatforms([]);
      setSelectedMedia(null);
      setScheduleDate(defaultDate ?? undefined);
    }
    setErrors({});
  }, [editItem, open, defaultDate]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!content.trim()) errs.content = "Content is required";
    if (content.length > 10000) errs.content = "Content must be 10,000 characters or fewer";
    if (!format) errs.format = "Format is required";
    if (selectedPlatforms.length === 0) errs.platform = "At least one platform is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const buildPayload = async (status: string, scheduledTime?: Date) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    return {
      content: content.trim(),
      platform: selectedPlatforms.join(","),
      style: format,
      brand: brand || (editItem?.brand ?? ""),
      status,
      created_by: user.id,
      scheduled_time: scheduledTime ? scheduledTime.toISOString() : null,
      image_urls: selectedMedia ? [selectedMedia.file_path] : null,
    };
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = await buildPayload("draft");
      if (editItem) {
        const { error } = await supabase.from("content_queue").update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("content_queue").insert(payload);
        if (error) throw error;
      }
      toast({ title: "Saved!", description: "Content saved to your library." });
      onSaved();
      onClose();
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSchedule = async () => {
    if (!validate()) return;
    if (!scheduleDate) {
      setScheduleDateOpen(true);
      return;
    }
    setScheduling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const cqPayload = await buildPayload("scheduled", scheduleDate);

      let contentQueueId: string;
      if (editItem) {
        const { error } = await supabase.from("content_queue").update(cqPayload).eq("id", editItem.id);
        if (error) throw error;
        contentQueueId = editItem.id;
      } else {
        const { data, error } = await supabase.from("content_queue").insert(cqPayload).select("id").single();
        if (error) throw error;
        contentQueueId = data.id;
      }

      // Save to scheduled_content table
      const { error: scError } = await supabase.from("scheduled_content").insert({
        content: content.trim(),
        platform: selectedPlatforms.join(","),
        content_type: format,
        status: "scheduled",
        scheduled_for: scheduleDate.toISOString(),
      });
      if (scError) console.warn("scheduled_content insert warning:", scError);

      toast({ title: "Scheduled!", description: `Content scheduled for ${format_date(scheduleDate)}.` });
      onSaved();
      onClose();
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setScheduling(false);
    }
  };

  const format_date = (d: Date) => {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editItem ? "Edit Content" : "Compose Content"}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            {/* Content textarea */}
            <div className="space-y-1.5">
              <Label htmlFor="content-input">Content <span className="text-red-500">*</span></Label>
              <Textarea
                id="content-input"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write your content here..."
                className={`min-h-[180px] resize-none ${errors.content ? "border-red-400" : ""}`}
                maxLength={10000}
              />
              <div className="flex justify-between">
                {errors.content && <p className="text-xs text-red-500">{errors.content}</p>}
                <p className="text-xs text-slate-400 ml-auto">{content.length}/10,000</p>
              </div>
            </div>

            {/* Format selector */}
            <div className="space-y-1.5">
              <Label>Format <span className="text-red-500">*</span></Label>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map(f => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      format === f
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              {errors.format && <p className="text-xs text-red-500">{errors.format}</p>}
            </div>

            {/* Platform selector */}
            <div className="space-y-1.5">
              <Label>Platform <span className="text-red-500">*</span></Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => togglePlatform(p.value)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      selectedPlatforms.includes(p.value)
                        ? p.color + " font-medium"
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {errors.platform && <p className="text-xs text-red-500">{errors.platform}</p>}
            </div>

            {/* Media attach */}
            <div className="space-y-1.5">
              <Label>Media</Label>
              {selectedMedia ? (
                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
                  <ImageIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-700 flex-1 truncate">{selectedMedia.file_name}</span>
                  <button onClick={() => setSelectedMedia(null)} className="text-slate-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setMediaPickerOpen(true)}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Attach Media
                </Button>
              )}
            </div>

            {/* Schedule date picker */}
            <div className="space-y-1.5">
              <Label>Schedule (optional)</Label>
              <Popover open={scheduleDateOpen} onOpenChange={setScheduleDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <CalendarDays className="h-4 w-4 mr-2 text-slate-400" />
                    {scheduleDate ? format_date(scheduleDate) : "Pick a date & time"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduleDate}
                    onSelect={d => { setScheduleDate(d); setScheduleDateOpen(false); }}
                    initialFocus
                    disabled={d => d < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving || scheduling}
                className="flex-1"
                variant="outline"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save to Library
              </Button>
              <Button
                onClick={handleSchedule}
                disabled={saving || scheduling}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                {scheduling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CalendarDays className="h-4 w-4 mr-2" />
                Schedule
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={setSelectedMedia}
        selectedId={selectedMedia?.id}
      />
    </>
  );
}
