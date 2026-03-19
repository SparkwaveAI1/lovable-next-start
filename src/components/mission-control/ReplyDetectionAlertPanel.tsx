import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase';

type Prospect = Database['public']['Tables']['prospects']['Row'];
type OutreachLog = Database['public']['Tables']['outreach_log']['Row'];

interface ProspectWithReply extends Prospect {
  latestReply?: {
    subject: string;
    repliedAt: string;
  };
}

export function ReplyDetectionAlertPanel() {
  const [prospects, setProspects] = useState<ProspectWithReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);

  useEffect(() => {
    const fetchReplies = async () => {
      try {
        setLoading(true);
        // Fetch prospects with replied stage
        const { data: repliedProspects } = await supabase
          .from('prospects')
          .select('*')
          .eq('pipeline_stage', 'replied')
          .order('updated_at', { ascending: false });

        if (!repliedProspects) {
          setProspects([]);
          return;
        }

        // For each prospect, get the most recent reply
        const prospectWithReplies: ProspectWithReply[] = await Promise.all(
          repliedProspects.map(async (p) => {
            const { data: replies } = await supabase
              .from('outreach_log')
              .select('subject, replied_at')
              .eq('prospect_email', p.email)
              .not('replied_at', 'is', null)
              .order('replied_at', { ascending: false })
              .limit(1);

            const latestReply = replies?.[0]
              ? {
                  subject: replies[0].subject,
                  repliedAt: replies[0].replied_at,
                }
              : undefined;

            return { ...p, latestReply };
          })
        );

        setProspects(prospectWithReplies);
      } catch (error) {
        console.error('Failed to fetch replies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReplies();

    // Subscribe to real-time updates on prospects table
    const channel = supabase
      .channel('replied-prospects')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prospects',
          filter: `pipeline_stage=eq.replied`,
        },
        () => {
          // Refetch on any change
          fetchReplies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markReviewed = async (prospect: ProspectWithReply) => {
    try {
      setMarking(prospect.id);
      // Optimistic UI update
      setProspects(p => p.filter(pr => pr.id !== prospect.id));

      // Update database
      await supabase
        .from('prospects')
        .update({ pipeline_stage: 'follow_up' })
        .eq('id', prospect.id);
    } catch (error) {
      console.error('Failed to mark reviewed:', error);
      // Rollback on error - refetch
      window.location.reload();
    } finally {
      setMarking(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-sm text-slate-500">Loading replies...</div>
      </Card>
    );
  }

  if (prospects.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <AlertCircle className="w-4 h-4 text-slate-400" />
          No replies detected yet — Iris is working on outreach
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">
        Reply Detection ({prospects.length})
      </h3>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {prospects.map(prospect => (
          <div
            key={prospect.id}
            className="border-l-4 border-emerald-500 bg-emerald-50 p-4 rounded-lg hover:shadow-sm transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-slate-900">
                  {prospect.company || prospect.name}
                </h4>
                <p className="text-xs text-slate-600">{prospect.email}</p>
                {prospect.latestReply && (
                  <>
                    <p className="text-xs text-emerald-700 font-medium mt-2">
                      {prospect.latestReply.subject}
                    </p>
                    <p className="text-xs text-slate-500">
                      Replied:{' '}
                      {new Date(prospect.latestReply.repliedAt).toLocaleString('en-US', {
                        timeZone: 'America/New_York',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      ET
                    </p>
                  </>
                )}
              </div>
              <Button
                onClick={() => markReviewed(prospect)}
                disabled={marking !== null}
                size="sm"
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap flex-shrink-0"
              >
                {marking === prospect.id && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                Mark Reviewed
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
