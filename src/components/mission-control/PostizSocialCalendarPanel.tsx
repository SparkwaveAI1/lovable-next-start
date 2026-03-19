import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink } from 'lucide-react';

interface PostizPost {
  id: string;
  content: string;
  publishDate: string;
  state: string;
  integration: {
    name: string;
    providerIdentifier: string;
  };
}

export function PostizSocialCalendarPanel() {
  const [posts, setPosts] = useState<PostizPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Call the edge function
        const response = await supabase.functions.invoke('postiz-posts');

        if (response.error) {
          throw new Error(response.error.message || 'Failed to fetch posts');
        }

        const data = response.data as { posts: PostizPost[]; error?: string };

        if (data.error) {
          setError(data.error);
          setPosts([]);
        } else {
          setPosts(data.posts || []);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Failed to fetch Postiz posts:', err);
        setError(message);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const groupByDate = (posts: PostizPost[]) => {
    const grouped: { [key: string]: PostizPost[] } = {};
    posts.forEach(post => {
      const date = new Date(post.publishDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(post);
    });
    return grouped;
  };

  const getPlatformBadgeColor = (providerIdentifier: string) => {
    if (providerIdentifier.includes('tiktok')) return 'bg-black text-white';
    if (providerIdentifier.includes('linkedin')) return 'bg-blue-600 text-white';
    if (providerIdentifier.includes('twitter') || providerIdentifier.includes('x-')) return 'bg-slate-900 text-white';
    return 'bg-slate-200';
  };

  const getStateBadgeVariant = (state: string) => {
    switch (state.toUpperCase()) {
      case 'DRAFT':
        return 'secondary';
      case 'SCHEDULED':
        return 'default';
      case 'PUBLISHED':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading scheduled posts...
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 bg-red-50">
        <div className="text-sm text-red-700">Error loading posts: {error}</div>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-sm text-slate-500">No posts scheduled in next 30 days</div>
      </Card>
    );
  }

  const grouped = groupByDate(posts);
  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Postiz Social Calendar</h3>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="text-xs"
        >
          <a href="https://app.postiz.com" target="_blank" rel="noopener noreferrer">
            Open Postiz
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </Button>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {sortedDates.map(date => (
          <div key={date}>
            <h4 className="text-xs font-semibold text-slate-700 mb-2">{date}</h4>
            <div className="space-y-2 ml-2">
              {grouped[date].map(post => (
                <div key={post.id} className="border border-slate-200 rounded p-3 text-sm hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold text-white ${getPlatformBadgeColor(
                          post.integration.providerIdentifier
                        )}`}
                      >
                        {post.integration.providerIdentifier.includes('tiktok')
                          ? 'TikTok'
                          : post.integration.providerIdentifier.includes('linkedin')
                            ? 'LinkedIn'
                            : 'Twitter'}
                      </span>
                      <span className="text-xs font-medium text-slate-600">
                        {post.integration.name}
                      </span>
                    </div>
                    <Badge variant={getStateBadgeVariant(post.state)} className="text-xs">
                      {post.state}
                    </Badge>
                  </div>
                  <p className="text-slate-700 text-sm line-clamp-2 mb-2">{post.content}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(post.publishDate).toLocaleString('en-US', {
                      timeZone: 'America/New_York',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    ET
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
