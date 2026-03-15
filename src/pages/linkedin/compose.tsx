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
import { ArrowLeft, Save, Send, Linkedin } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessContext } from '@/contexts/BusinessContext';

interface LinkedInAccount {
  id: string;
  account_name: string;
  account_type: string;
  profile_url: string | null;
  is_active: boolean;
}

const DRAFT_KEY = 'linkedin_post_draft';
const MAX_CHARS = 3000;

export default function LinkedInComposer() {
  const navigate = useNavigate();
  const { selectedBusiness } = useBusinessContext();
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

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

  const charCount = content.length;
  const charLimitExceeded = charCount > MAX_CHARS;

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
                Post will publish immediately to LinkedIn
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

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => navigate('/linkedin')}
                  disabled={publishing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={publishPost}
                  disabled={publishing || !content.trim() || charLimitExceeded || !selectedAccount}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {publishing ? (
                    <>Publishing...</>
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
