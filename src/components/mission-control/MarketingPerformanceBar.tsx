import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Mail, Eye, MessageSquare, Users } from 'lucide-react';

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color: 'emerald' | 'amber' | 'blue' | 'violet';
}

const colorClasses = {
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', accent: 'text-emerald-700' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', accent: 'text-amber-700' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', accent: 'text-blue-700' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-600', accent: 'text-violet-700' },
};

function StatItem({ icon, label, value, subValue, color }: StatItemProps) {
  const colors = colorClasses[color];
  return (
    <div className="flex items-center gap-3">
      <div className={cn('p-2 rounded-lg', colors.bg)}>
        <div className={colors.icon}>{icon}</div>
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className={cn('text-xl font-bold', colors.accent)}>{value}</span>
          {subValue && <span className="text-xs text-slate-400">{subValue}</span>}
        </div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}

export function MarketingPerformanceBar() {
  const [stats, setStats] = useState({
    emailsSent: 0,
    openRate: '—',
    replies: 0,
    activeProspects: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const startDate = sevenDaysAgo.toISOString();

        // Fetch outreach_log stats for 7d window
        const { data: outreachData } = await supabase
          .from('outreach_log')
          .select('opened_at, replied_at, sent_at')
          .gte('sent_at', startDate);

        const emailsSent = outreachData?.length || 0;
        const opened = outreachData?.filter(o => o.opened_at !== null).length || 0;
        const openRate = emailsSent > 0 ? Math.round((opened / emailsSent) * 100) : 0;
        const replies = outreachData?.filter(o => o.replied_at !== null).length || 0;

        // Fetch active prospects
        const { data: prospectData } = await supabase
          .from('prospects')
          .select('id')
          .in('pipeline_stage', ['prospect', 'contacted', 'replied', 'approved']);

        const activeProspects = prospectData?.length || 0;

        setStats({
          emailsSent,
          openRate: emailsSent > 0 ? `${openRate}%` : '—',
          replies,
          activeProspects,
        });
      } catch (error) {
        console.error('Failed to fetch marketing stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5 * 60 * 1000); // Refresh every 5 min

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="text-sm text-slate-500">Loading marketing metrics...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Marketing Performance (7d)</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatItem
          icon={<Mail className="w-5 h-5" />}
          label="Emails Sent"
          value={stats.emailsSent}
          color="blue"
        />
        <StatItem
          icon={<Eye className="w-5 h-5" />}
          label="Open Rate"
          value={stats.openRate}
          color="amber"
        />
        <StatItem
          icon={<MessageSquare className="w-5 h-5" />}
          label="Replies (7d)"
          value={stats.replies}
          color="emerald"
        />
        <StatItem
          icon={<Users className="w-5 h-5" />}
          label="Active Prospects"
          value={stats.activeProspects}
          color="violet"
        />
      </div>
    </div>
  );
}
