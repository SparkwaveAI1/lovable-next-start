import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageContent, PageHeader } from '@/components/layout/PageLayout';
import { ArrowLeft, Save, Send, Linkedin, Clock, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { scheduleContent } from '@/lib/schedulingService';

interface LinkedInAccount {
  id: string;
  account_name: string;
  account_type: string;
  profile_url: string | null;
  is_active: boolean;
}

const DRAFT_KEY = 'linkedin_post_draft';
const MAX_CHARS = 3000;
// Minimum scheduling buffer: 5 minutes from now
const MIN_SCHEDULE_OFFSET_MS = 5 * 60 * 1000;

/** Return a datetime-local string (YYYY-MM-DDTHH:mm) rounded up to the next 15-minute slot,
 *  at least MIN_SCHEDULE_OFFSET_MS from now. */
function defaultScheduledAt(): string {
  const now = Date.now() + MIN_SCHEDULE_OFFSET_MS;
  const slot = Math.ceil(now / (15 * 60 * 1000)) * (15 * 60 * 1000);
  const d = new Date(slot);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function LinkedInComposer() {
  const navigate = useNavigate();
  const { selectedBusiness } = useBusinessContext();
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  // Scheduling state
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduledAt, setScheduledAt] = useState<string>(defaultScheduledAt);
  const [scheduleError, setScheduleError] = useState('');

  // Load accounts and draft on mount
  useEffect(() => {
    loadAccounts();
    loadDraft();
  }, [selectedBusiness]);

  // Auto-save draft whenever content or selected account changes
  useEffect(() => {
    if (content || selectedAccount) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ content, selectedAccount }));
    }
  }, [content, selectedAccount]);

  // Validate schedule time whenever it changes
  useEffect(() => {
    if (scheduleMode === 'later') {
      validateScheduleTime(scheduledAt);
    } else {
      setScheduleError('');
    }
  }, [scheduleMode, scheduledAt]);

  function validateScheduleTime(value: string): boolean {
    if (!value) {
      setScheduleError('Please select a date and time');
      return false;
    }
    const selected = new Date(value).getTime();
    const minTime = Date.now() + MIN_SCHEDULE_OFFSET_MS;
    if (selected < minTime) {
      setScheduleError('Scheduled time must be at least 5 minutes in the future');
      return false;
    }
    setScheduleError('');
    return true;
  }

  async function loadAccounts() {
    if (!selectedBusiness) {
      setLoading(false);
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please sign in to post to LinkedIn');
        setLoading(false);
        return;
      }

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

      if (!response.ok) {
        throw new Error('Failed to load accounts');
      }

      const data = await response.json();
      const personalAccounts = (data.accounts ?? []).filter(
        (a: LinkedInAccount) => a.account_type === 'personal' && a.is_active
      );

      setAccounts(personalAccounts);

      // Pre-select first account (but draft may override below)
      if (personalAccounts.length > 0) {
        setSelectedAccount(prev => prev || personalAccounts[0].id);
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
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.content) setContent(draft.content);
        if (draft.selectedAccount) setSelectedAccount(draft.selectedAccount);
      } catch (err) {
        console.error('Failed to load draft', err);
      }
    }
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setContent('');
    toast.success('Draft cleared');
  }

  async function schedulePost() {
    if (!selectedBusiness) return;
    if (!selectedAccount || !content.trim()) {
      toast.error('Please select an account and enter some content');
      return;
    }
    if (content.length > MAX_CHARS) {
      toast.error(`Content exceeds ${MAX_CHARS} character limit`);
      return;
    }
    if (!validateScheduleTime(scheduledAt)) return;

    setPublishing(true);
    setError('');
    try {
      const result = await scheduleContent({
        businessId: selectedBusiness.id,
        content: content.trim(),
        contentType: 'linkedin_post',
        scheduledFor: new Date(scheduledAt),
        metadata: { account_id: selectedAccount },
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

  async function publishPost() {
    if (!selectedAccount || !content.trim()) {
      toast.error('Please select an account and enter some content');
      return;
    }

    if (content.length > MAX_CHARS) {
      toast.error(`Content exceeds ${MAX_CHARS} character limit`);
      return;
    }

    setPublishing(true);
    setError('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('linkedin-publish-text', {
        body: {
          account_id: selectedAccount,
          content: content.trim(),
        },
      });

      if (fnError) throw fnError;
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

  function handleSubmit() {
    if (scheduleMode === 'later') {
      schedulePost();
    } else {
      publishPost();
    }
  }

  const charCount = content.length;
  const charLimitExceeded = charCount > MAX_CHARS;
  const canSubmit = !publishing && content.trim().length > 0 && !charLimitExceeded && !!selectedAccount
    && (scheduleMode === 'now' || (scheduleMode === 'later' && !scheduleError));

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
              <p className="text-muted-foreground mb-4">
                Select a business to post to LinkedIn.
              </p>
              <Button onClick={() => navigate('/linkedin')}>
                Back to LinkedIn
              </Button>
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
              <p className="text-muted-foreground mb-4">
                No personal LinkedIn accounts connected yet.
              </p>
              <Button onClick={() => navigate('/linkedin')}>
                Connect LinkedIn Account
              </Button>
            </CardContent>
          </Card>
        </PageContent>
      </DashboardLayout>
    );
  }

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

              <div className="space-y-2">
                <label className="text-sm font-medium">Account</label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">What's on your mind?</label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share your thoughts, ideas, or updates..."
                  rows={8}
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
                </div>
              </div>

              {/* Schedule / Publish toggle */}
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
                  disabled={!canSubmit}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {publishing ? (
                    <>Processing...</>
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
