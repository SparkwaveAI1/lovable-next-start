import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageContent, PageHeader } from '@/components/layout/PageLayout';
import {
  ArrowLeft, Save, Send, Linkedin, Clock, CalendarClock,
  ImageIcon, Link as LinkIcon, FileText, X, Upload, Building2, User
} from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { scheduleContent } from '@/lib/schedulingService';


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LinkedInAccount {
  id: string;
  account_name: string;
  account_type: 'personal' | 'company';
  profile_url: string | null;
  logo_url: string | null;
  linkedin_urn: string;
  is_active: boolean;
}

interface OgPreview {
  title: string | null;
  description: string | null;
  image: string | null;
  loading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DRAFT_KEY = 'linkedin_post_draft';
const MAX_CHARS = 3000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const MIN_SCHEDULE_OFFSET_MS = 5 * 60 * 1000;

type PostType = 'text' | 'image' | 'article';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return a datetime-local string rounded up to next 15-min slot, ≥5 min from now */
function defaultScheduledAt(): string {
  const now = Date.now() + MIN_SCHEDULE_OFFSET_MS;
  const slot = Math.ceil(now / (15 * 60 * 1000)) * (15 * 60 * 1000);
  const d = new Date(slot);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LinkedInComposer() {
  const navigate = useNavigate();
  const { selectedBusiness } = useBusinessContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accounts
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [loading, setLoading] = useState(true);

  // Post type
  const [postType, setPostType] = useState<PostType>('text');

  // Content
  const [content, setContent] = useState('');

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [mediaAssetId, setMediaAssetId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Article state
  const [articleUrl, setArticleUrl] = useState('');
  const [ogPreview, setOgPreview] = useState<OgPreview>({
    title: null, description: null, image: null, loading: false, error: null,
  });

  // Publishing state
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  // Scheduling state
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduledAt, setScheduledAt] = useState<string>(defaultScheduledAt);
  const [scheduleError, setScheduleError] = useState('');

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    loadAccounts();
    loadDraft();
    // Revoke preview URL on unmount
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [selectedBusiness]);

  // Auto-save draft (text + account)
  useEffect(() => {
    if (content || selectedAccount) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ content, selectedAccount }));
    }
  }, [content, selectedAccount]);

  useEffect(() => {
    if (scheduleMode === 'later') {
      validateScheduleTime(scheduledAt);
    } else {
      setScheduleError('');
    }
  }, [scheduleMode, scheduledAt]);

  // ---------------------------------------------------------------------------
  // Account loading
  // ---------------------------------------------------------------------------

  async function loadAccounts() {
    if (!selectedBusiness) { setLoading(false); return; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Please sign in to post to LinkedIn'); setLoading(false); return; }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/linkedin-accounts?business_id=${selectedBusiness.id}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) throw new Error('Failed to load accounts');
      const data = await response.json();

      // Phase 2C: show ALL active accounts (personal + company)
      const allAccounts: LinkedInAccount[] = (data.accounts ?? []).filter(
        (a: LinkedInAccount) => a.is_active
      );
      setAccounts(allAccounts);
      if (allAccounts.length > 0) {
        setSelectedAccount(prev => prev || allAccounts[0].id);
      }
    } catch (err) {
      console.error('Failed to load LinkedIn accounts:', err);
      setError('Failed to load LinkedIn accounts');
    } finally {
      setLoading(false);
    }
  }

  function loadDraft() {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      if (draft.content) setContent(draft.content);
      if (draft.selectedAccount) setSelectedAccount(draft.selectedAccount);
    } catch { /* ignore */ }
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setContent('');
    toast.success('Draft cleared');
  }

  // ---------------------------------------------------------------------------
  // Schedule validation
  // ---------------------------------------------------------------------------

  function validateScheduleTime(value: string): boolean {
    if (!value) { setScheduleError('Please select a date and time'); return false; }
    if (new Date(value).getTime() < Date.now() + MIN_SCHEDULE_OFFSET_MS) {
      setScheduleError('Scheduled time must be at least 5 minutes in the future');
      return false;
    }
    setScheduleError('');
    return true;
  }

  // ---------------------------------------------------------------------------
  // Image upload
  // ---------------------------------------------------------------------------

  function validateImageFile(file: File): string | null {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return `Unsupported file type: ${file.type}. Use JPEG, PNG, or GIF.`;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return `File too large: ${formatBytes(file.size)}. Maximum is 5 MB.`;
    }
    return null;
  }

  async function uploadImageToStorage(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const uuid = crypto.randomUUID();
    const path = `linkedin/images/${uuid}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('media')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadErr) {
      toast.error(`Upload failed: ${uploadErr.message}`);
      return null;
    }

    // Create media_assets row
    const { data: asset, error: assetErr } = await supabase
      .from('media_assets')
      .insert({
        // business_id is required — selectedBusiness captured from outer scope
        business_id: selectedBusiness?.id,
        file_path: path,
        file_name: file.name,
        file_type: file.type.split('/')[0], // e.g. 'image'
        mime_type: file.type,
        file_size: file.size,
      })
      .select('id')
      .single();

    if (assetErr || !asset) {
      console.error('Failed to create media_assets row:', assetErr);
      // Remove uploaded file since we can't track it
      await supabase.storage.from('media').remove([path]);
      toast.error('Failed to register media asset');
      return null;
    }

    return asset.id as string;
  }

  async function handleImageSelect(file: File) {
    const validationErr = validateImageFile(file);
    if (validationErr) { toast.error(validationErr); return; }

    // Clear previous
    clearImage(false);

    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);

    setUploadingImage(true);
    try {
      const assetId = await uploadImageToStorage(file);
      if (assetId) {
        setMediaAssetId(assetId);
        toast.success('Image uploaded');
      } else {
        clearImage(false);
      }
    } finally {
      setUploadingImage(false);
    }
  }

  function clearImage(showToast = true) {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
    setMediaAssetId(null);
    if (showToast) toast.success('Image removed');
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageSelect(file);
  }

  // ---------------------------------------------------------------------------
  // OG preview fetch
  // ---------------------------------------------------------------------------

  const fetchOgPreview = useCallback(async (url: string) => {
    if (!url.trim()) return;
    try { new URL(url); } catch { return; } // skip invalid URLs

    setOgPreview(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('linkedin-og-preview', {
        body: { url },
      });
      if (fnErr) throw fnErr;
      setOgPreview({
        title: data?.title ?? null,
        description: data?.description ?? null,
        image: data?.image ?? null,
        loading: false,
        error: data?.error ?? null,
      });
    } catch (err: any) {
      setOgPreview(prev => ({
        ...prev,
        loading: false,
        error: err?.message ?? 'Preview unavailable',
      }));
    }
  }, []);

  function onArticleUrlBlur() {
    fetchOgPreview(articleUrl);
  }

  function clearArticle() {
    setArticleUrl('');
    setOgPreview({ title: null, description: null, image: null, loading: false, error: null });
  }

  // ---------------------------------------------------------------------------
  // Publish / Schedule
  // ---------------------------------------------------------------------------

  async function publishPost() {
    if (!selectedAccount) { toast.error('Please select an account'); return; }
    if (content.length > MAX_CHARS) { toast.error(`Content exceeds ${MAX_CHARS} character limit`); return; }
    if (postType === 'text' && !content.trim()) { toast.error('Please enter some content'); return; }
    if (postType === 'image' && !mediaAssetId) { toast.error('Please upload an image'); return; }
    if (postType === 'article' && !articleUrl.trim()) { toast.error('Please enter an article URL'); return; }

    setPublishing(true);
    setError('');
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('linkedin-publish', {
        body: {
          account_id: selectedAccount,
          post_type: postType,
          content: content.trim(),
          ...(postType === 'image' ? { media_asset_id: mediaAssetId } : {}),
          ...(postType === 'article' ? {
            article_url: articleUrl.trim(),
            article_title: ogPreview.title ?? undefined,
            article_desc: ogPreview.description ?? undefined,
          } : {}),
        },
      });

      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      toast.success('Post published successfully!');
      localStorage.removeItem(DRAFT_KEY);
      navigate('/linkedin');
    } catch (err: any) {
      const msg = err?.message || err?.context?.responseText || 'Failed to publish post';
      setError(msg);
      toast.error(msg);
      console.error('Publish error:', err);
    } finally {
      setPublishing(false);
    }
  }

  async function schedulePost() {
    if (!selectedBusiness) return;
    if (!selectedAccount || !content.trim()) {
      toast.error('Please select an account and enter some content');
      return;
    }
    if (content.length > MAX_CHARS) { toast.error(`Content exceeds ${MAX_CHARS} character limit`); return; }
    if (postType === 'image' && !mediaAssetId) { toast.error('Please upload an image'); return; }
    if (postType === 'article' && !articleUrl.trim()) { toast.error('Please enter an article URL'); return; }
    if (!validateScheduleTime(scheduledAt)) return;

    setPublishing(true);
    setError('');
    try {
      const result = await scheduleContent({
        businessId: selectedBusiness.id,
        content: content.trim(),
        contentType: 'linkedin_post',
        scheduledFor: new Date(scheduledAt),
        metadata: {
          account_id: selectedAccount,
          post_type: postType,
          ...(mediaAssetId ? { media_asset_id: mediaAssetId } : {}),
          ...(articleUrl ? { article_url: articleUrl } : {}),
        },
      });

      if (!result.success) throw new Error(result.message);
      toast.success(`Post scheduled for ${new Date(scheduledAt).toLocaleString()}`);
      localStorage.removeItem(DRAFT_KEY);
      navigate('/linkedin');
    } catch (err: any) {
      const msg = err?.message || 'Failed to schedule post';
      setError(msg);
      toast.error(msg);
    } finally {
      setPublishing(false);
    }
  }

  function handleSubmit() {
    if (scheduleMode === 'later') schedulePost();
    else publishPost();
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const charCount = content.length;
  const charLimitExceeded = charCount > MAX_CHARS;
  const selectedAccountObj = accounts.find(a => a.id === selectedAccount);

  const isReadyToSubmit = (() => {
    if (publishing || charLimitExceeded || !selectedAccount) return false;
    if (scheduleMode === 'later' && scheduleError) return false;
    if (postType === 'text') return content.trim().length > 0;
    if (postType === 'image') return !!mediaAssetId && !uploadingImage;
    if (postType === 'article') return articleUrl.trim().length > 0;
    return false;
  })();

  // ---------------------------------------------------------------------------
  // Loading / empty states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <DashboardLayout>
        <PageHeader title="Create LinkedIn Post" />
        <PageContent>
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading LinkedIn accounts...
            </CardContent>
          </Card>
        </PageContent>
      </DashboardLayout>
    );
  }

  if (!selectedBusiness) {
    return (
      <DashboardLayout>
        <PageHeader title="Create LinkedIn Post" />
        <PageContent>
          <Card>
            <CardContent className="py-12 text-center">
              <Linkedin className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground mb-4">Select a business to post to LinkedIn.</p>
              <Button onClick={() => navigate('/linkedin')}>Back to LinkedIn</Button>
            </CardContent>
          </Card>
        </PageContent>
      </DashboardLayout>
    );
  }

  if (accounts.length === 0) {
    return (
      <DashboardLayout>
        <PageHeader title="Create LinkedIn Post" />
        <PageContent>
          <Card>
            <CardContent className="py-12 text-center">
              <Linkedin className="w-10 h-10 mx-auto mb-3 text-blue-200" />
              <p className="text-muted-foreground mb-4">No LinkedIn accounts connected yet.</p>
              <Button onClick={() => navigate('/linkedin')}>Connect LinkedIn Account</Button>
            </CardContent>
          </Card>
        </PageContent>
      </DashboardLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout>
      <PageHeader
        title="Create LinkedIn Post"
        description="Share an update with your LinkedIn network"
      />
      <PageContent>
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link
              to="/linkedin"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to LinkedIn Accounts
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Linkedin className="w-5 h-5 text-blue-600" />
                New Post
              </CardTitle>
              <CardDescription>
                {scheduleMode === 'later'
                  ? 'Post will be added to the schedule queue'
                  : 'Post will publish immediately to LinkedIn'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* ---- Account selector ---- */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Account</label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          {account.account_type === 'company'
                            ? <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            : <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          }
                          <span>{account.account_name}</span>
                          <Badge
                            variant="outline"
                            className={`text-xs px-1.5 py-0 ${
                              account.account_type === 'company'
                                ? 'border-blue-300 text-blue-600'
                                : 'border-muted text-muted-foreground'
                            }`}
                          >
                            {account.account_type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAccountObj?.account_type === 'company' && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Posting as company page — will use organization URN
                  </p>
                )}
              </div>

              {/* ---- Post type selector ---- */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Post Type</label>
                <div className="flex rounded-md border overflow-hidden text-sm">
                  {(
                    [
                      { type: 'text' as PostType, icon: <FileText className="w-3.5 h-3.5" />, label: 'Text' },
                      { type: 'image' as PostType, icon: <ImageIcon className="w-3.5 h-3.5" />, label: 'Image' },
                      { type: 'article' as PostType, icon: <LinkIcon className="w-3.5 h-3.5" />, label: 'Article' },
                    ] as const
                  ).map(({ type, icon, label }, i) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setPostType(type);
                        // Clear type-specific state when switching
                        if (type !== 'image') clearImage(false);
                        if (type !== 'article') clearArticle();
                      }}
                      className={`flex-1 px-3 py-2 flex items-center justify-center gap-1.5 transition-colors ${
                        i > 0 ? 'border-l' : ''
                      } ${
                        postType === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ---- Image upload (only when postType === 'image') ---- */}
              {postType === 'image' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Image</label>
                  {imagePreviewUrl ? (
                    <div className="relative rounded-lg border overflow-hidden bg-muted/30">
                      <img
                        src={imagePreviewUrl}
                        alt="Upload preview"
                        className="w-full max-h-64 object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => clearImage()}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                        aria-label="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-white text-sm">Uploading…</span>
                        </div>
                      )}
                      {!uploadingImage && mediaAssetId && (
                        <div className="absolute bottom-2 left-2 bg-green-600/90 text-white text-xs px-2 py-0.5 rounded">
                          ✓ Uploaded
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                        dragOver ? 'border-blue-500 bg-blue-50/30' : 'border-muted-foreground/30 hover:border-blue-400 hover:bg-muted/20'
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={onDrop}
                    >
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Drag &amp; drop an image or <span className="text-blue-600 underline underline-offset-2">browse</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPEG, PNG, GIF — max 5 MB
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    className="hidden"
                    onChange={onFileInputChange}
                  />
                </div>
              )}

              {/* ---- Article URL (only when postType === 'article') ---- */}
              {postType === 'article' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Article URL</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={articleUrl}
                      onChange={(e) => {
                        setArticleUrl(e.target.value);
                        // Clear preview when URL changes
                        setOgPreview({ title: null, description: null, image: null, loading: false, error: null });
                      }}
                      onBlur={onArticleUrlBlur}
                      placeholder="https://example.com/article"
                      className="pl-9"
                    />
                  </div>

                  {/* OG Preview card */}
                  {articleUrl && (ogPreview.loading || ogPreview.title || ogPreview.description || ogPreview.image || ogPreview.error) && (
                    <div className="rounded-lg border overflow-hidden bg-muted/20">
                      {ogPreview.loading ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          Fetching preview…
                        </div>
                      ) : ogPreview.error && !ogPreview.title ? (
                        <div className="p-3 text-xs text-muted-foreground">
                          Preview unavailable: {ogPreview.error}
                        </div>
                      ) : (
                        <>
                          {ogPreview.image && (
                            <img
                              src={ogPreview.image}
                              alt="Article preview"
                              className="w-full h-32 object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                          <div className="p-3 space-y-0.5">
                            {ogPreview.title && (
                              <p className="text-sm font-medium line-clamp-2">{ogPreview.title}</p>
                            )}
                            {ogPreview.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{ogPreview.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground/70">{new URL(articleUrl).hostname}</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ---- Content / caption ---- */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {postType === 'text' ? "What's on your mind?" : 'Caption (optional)'}
                </label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    postType === 'text'
                      ? 'Share your thoughts, ideas, or updates…'
                      : 'Add a caption for your post…'
                  }
                  rows={postType === 'text' ? 8 : 4}
                  className={charLimitExceeded ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                <div className="flex justify-between items-center text-sm">
                  <span
                    className={
                      charLimitExceeded
                        ? 'text-red-500 font-medium'
                        : charCount > MAX_CHARS * 0.9
                        ? 'text-amber-500'
                        : 'text-muted-foreground'
                    }
                  >
                    {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
                    {charLimitExceeded && ' (exceeds limit)'}
                  </span>
                  {postType === 'text' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearDraft}
                      disabled={!content}
                      className="text-muted-foreground"
                    >
                      <Save className="mr-2 h-3 w-3" />
                      Clear Draft
                    </Button>
                  )}
                </div>
              </div>

              {/* ---- Schedule / Publish toggle ---- */}
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">Timing</label>
                  <div className="flex rounded-md border overflow-hidden text-sm">
                    <button
                      type="button"
                      onClick={() => setScheduleMode('now')}
                      className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
                        scheduleMode === 'now'
                          ? 'bg-blue-600 text-white'
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <Send className="w-3 h-3" />
                      Publish Now
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleMode('later')}
                      className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors border-l ${
                        scheduleMode === 'later'
                          ? 'bg-blue-600 text-white'
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <CalendarClock className="w-3 h-3" />
                      Schedule
                    </button>
                  </div>
                </div>

                {scheduleMode === 'later' && (
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Scheduled date &amp; time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className={`w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        scheduleError ? 'border-red-500' : 'border-input'
                      }`}
                    />
                    {scheduleError && (
                      <p className="text-xs text-red-500">{scheduleError}</p>
                    )}
                    {!scheduleError && scheduledAt && (
                      <p className="text-xs text-muted-foreground">
                        Will post at {new Date(scheduledAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* ---- Action buttons ---- */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => navigate('/linkedin')}
                  disabled={publishing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!isReadyToSubmit}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {publishing ? (
                    <>Processing…</>
                  ) : scheduleMode === 'later' ? (
                    <>
                      <CalendarClock className="mr-2 h-4 w-4" />
                      Schedule Post
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Publish Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </DashboardLayout>
  );
}
