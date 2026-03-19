import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase';

type AgentOutput = Database['public']['Tables']['agent_outputs']['Row'];
type LinkedInPost = Database['public']['Tables']['linkedin_posts']['Row'];

export function LinkedInActivityPanel() {
  const [agentOutputs, setAgentOutputs] = useState<AgentOutput[]>([]);
  const [linkedinPosts, setLinkedInPosts] = useState<LinkedInPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setLoading(true);
        const fortyEightHoursAgo = new Date();
        fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

        // Fetch agent outputs for Iris's LinkedIn activity
        const { data: outputs } = await supabase
          .from('agent_outputs')
          .select('*')
          .or(
            `agent_name.ilike.%iris%,output_type.in.(linkedin,outreach)`
          )
          .gte('created_at', fortyEightHoursAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(20);

        setAgentOutputs(outputs || []);

        // Fetch recent LinkedIn posts
        const { data: posts } = await supabase
          .from('linkedin_posts')
          .select('*')
          .gte('created_at', fortyEightHoursAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(10);

        setLinkedInPosts(posts || []);
      } catch (error) {
        console.error('Failed to fetch LinkedIn activity:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading activity...
        </div>
      </Card>
    );
  }

  const hasAgentOutputs = agentOutputs.length > 0;
  const hasLinkedInPosts = linkedinPosts.length > 0;

  if (!hasAgentOutputs && !hasLinkedInPosts) {
    return (
      <Card className="p-6">
        <div>
          <p className="text-sm text-slate-500 mb-2">No recent LinkedIn activity from Iris</p>
          <p className="text-sm text-slate-500">No LinkedIn posts in the last 48 hours</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">LinkedIn Activity (48h)</h3>

      <div className="space-y-4">
        {/* Agent outputs section */}
        {hasAgentOutputs && (
          <div>
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
              Iris Activity
            </h4>
            <div className="space-y-2">
              {agentOutputs.map(output => (
                <div key={output.id} className="border border-slate-200 rounded p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-600 line-clamp-2">{output.content}</p>
                      {output.metadata && (
                        <p className="text-xs text-slate-500 mt-1">
                          {typeof output.metadata === 'string'
                            ? output.metadata
                            : JSON.stringify(output.metadata).slice(0, 50) + '...'}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(output.created_at).toLocaleString('en-US', {
                      timeZone: 'America/New_York',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    ET
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LinkedIn posts section */}
        {hasLinkedInPosts && (
          <div>
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
              Recent LinkedIn Posts
            </h4>
            <div className="space-y-2">
              {linkedinPosts.map(post => (
                <div key={post.id} className="border border-blue-200 rounded p-3 text-sm bg-blue-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 line-clamp-2">{post.content}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge
                          variant={
                            post.status === 'published'
                              ? 'default'
                              : post.status === 'scheduled'
                                ? 'secondary'
                                : 'outline'
                          }
                          className="text-xs"
                        >
                          {post.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {new Date(post.created_at).toLocaleString('en-US', {
                      timeZone: 'America/New_York',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    ET
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
