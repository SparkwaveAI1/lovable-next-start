import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessContext } from "@/contexts/BusinessContext";
import {
  FileText,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Twitter,
  Mail,
  MessageSquare,
  Linkedin,
  RefreshCw,
  TrendingUp,
  User,
  Calendar,
  BarChart3,
} from "lucide-react";

// Types
interface ContentStatusCounts {
  draft: number;
  review: number;
  scheduled: number;
  published: number;
  failed: number;
}

interface PlatformCounts {
  twitter: number;
  email: number;
  sms: number;
  linkedin: number;
  instagram: number;
  other: number;
}

interface RecentActivity {
  id: string;
  type: 'created' | 'scheduled' | 'published' | 'approved' | 'rejected';
  platform: string;
  content: string;
  created_at: string;
  created_by?: string;
}

interface CreatorStats {
  name: string;
  avatar?: string;
  count: number;
  type: 'ai' | 'manual';
}

// Color schemes
const statusColors = {
  draft: { bg: 'bg-slate-50', icon: 'text-slate-600', accent: 'text-slate-700', border: 'border-slate-200' },
  review: { bg: 'bg-amber-50', icon: 'text-amber-600', accent: 'text-amber-700', border: 'border-amber-200' },
  scheduled: { bg: 'bg-blue-50', icon: 'text-blue-600', accent: 'text-blue-700', border: 'border-blue-200' },
  published: { bg: 'bg-emerald-50', icon: 'text-emerald-600', accent: 'text-emerald-700', border: 'border-emerald-200' },
  failed: { bg: 'bg-red-50', icon: 'text-red-600', accent: 'text-red-700', border: 'border-red-200' },
};

const platformColors = {
  twitter: { bg: 'bg-sky-50', icon: 'text-sky-600', accent: 'text-sky-700' },
  email: { bg: 'bg-violet-50', icon: 'text-violet-600', accent: 'text-violet-700' },
  sms: { bg: 'bg-green-50', icon: 'text-green-600', accent: 'text-green-700' },
  linkedin: { bg: 'bg-blue-50', icon: 'text-blue-600', accent: 'text-blue-700' },
  instagram: { bg: 'bg-pink-50', icon: 'text-pink-600', accent: 'text-pink-700' },
  other: { bg: 'bg-slate-50', icon: 'text-slate-600', accent: 'text-slate-700' },
};

const platformIcons: Record<string, React.ReactNode> = {
  twitter: <Twitter className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
  linkedin: <Linkedin className="h-4 w-4" />,
  instagram: <BarChart3 className="h-4 w-4" />,
  other: <FileText className="h-4 w-4" />,
};

const statusIcons: Record<string, React.ReactNode> = {
  draft: <FileText className="h-5 w-5" />,
  review: <Clock className="h-5 w-5" />,
  scheduled: <Calendar className="h-5 w-5" />,
  published: <CheckCircle2 className="h-5 w-5" />,
  failed: <AlertCircle className="h-5 w-5" />,
};

// Helper functions
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function truncateContent(content: string, maxLength: number = 60): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + "...";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Status Card Component
interface StatusCardProps {
  status: keyof typeof statusColors;
  label: string;
  count: number;
  subLabel?: string;
}

function StatusCard({ status, label, count, subLabel }: StatusCardProps) {
  const colors = statusColors[status];
  
  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer",
      colors.bg,
      colors.border
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            {label}
          </p>
          <p className={cn("text-3xl font-bold", colors.accent)}>
            {count}
          </p>
          {subLabel && (
            <p className="text-xs text-slate-400 mt-1">{subLabel}</p>
          )}
        </div>
        <div className={cn("p-2 rounded-lg", colors.bg)}>
          <div className={colors.icon}>
            {statusIcons[status]}
          </div>
        </div>
      </div>
    </div>
  );
}

// Platform Distribution Component
interface PlatformBarProps {
  platform: keyof typeof platformColors;
  count: number;
  total: number;
  label: string;
}

function PlatformBar({ platform, count, total, label }: PlatformBarProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const colors = platformColors[platform];
  
  return (
    <div className="flex items-center gap-3 group">
      <div className={cn("p-1.5 rounded-lg", colors.bg)}>
        <div className={colors.icon}>
          {platformIcons[platform]}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          <span className={cn("text-sm font-semibold", colors.accent)}>{count}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all duration-500", colors.bg.replace('50', '400'))}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-slate-400 w-10 text-right">
        {percentage.toFixed(0)}%
      </span>
    </div>
  );
}

// Activity Item Component
interface ActivityItemProps {
  activity: RecentActivity;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const activityLabels: Record<string, string> = {
    created: 'created',
    scheduled: 'scheduled',
    published: 'published',
    approved: 'approved',
    rejected: 'rejected',
  };
  
  const activityColors: Record<string, string> = {
    created: 'bg-slate-100 text-slate-600',
    scheduled: 'bg-blue-100 text-blue-700',
    published: 'bg-emerald-100 text-emerald-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };
  
  const platformColor = platformColors[activity.platform as keyof typeof platformColors] || platformColors.other;
  
  return (
    <div className="flex gap-3 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 px-2 -mx-2 rounded-lg transition-colors">
      <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", platformColor.bg)}>
        <div className={platformColor.icon}>
          {platformIcons[activity.platform] || platformIcons.other}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn("text-[10px] px-1.5 py-0", activityColors[activity.type])}>
            {activityLabels[activity.type]}
          </Badge>
          <span className="text-xs text-slate-400 capitalize">{activity.platform}</span>
        </div>
        <p className="text-sm text-slate-700 mt-1 line-clamp-1">
          {truncateContent(activity.content)}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-slate-400">
            {formatRelativeTime(activity.created_at)}
          </span>
          {activity.created_by && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-[10px] text-slate-400">
                by {activity.created_by}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Creator Stats Component
interface CreatorCardProps {
  creator: CreatorStats;
  totalContent: number;
}

function CreatorCard({ creator, totalContent }: CreatorCardProps) {
  const percentage = totalContent > 0 ? (creator.count / totalContent) * 100 : 0;
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
      <Avatar className="h-9 w-9">
        <AvatarImage src={creator.avatar} alt={creator.name} />
        <AvatarFallback className={cn(
          "text-xs font-medium",
          creator.type === 'ai' 
            ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
            : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
        )}>
          {creator.type === 'ai' ? 'AI' : getInitials(creator.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900 truncate">{creator.name}</span>
          {creator.type === 'ai' && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 border-violet-200 text-violet-600">
              AI
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-500">{creator.count} items</span>
          <span className="text-xs text-slate-400">({percentage.toFixed(0)}%)</span>
        </div>
      </div>
    </div>
  );
}

// Main Dashboard Component
interface ContentDashboardProps {
  className?: string;
}

export function ContentDashboard({ className }: ContentDashboardProps) {
  const { selectedBusiness } = useBusinessContext();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data state
  const [statusCounts, setStatusCounts] = useState<ContentStatusCounts>({
    draft: 0,
    review: 0,
    scheduled: 0,
    published: 0,
    failed: 0,
  });
  
  const [platformCounts, setPlatformCounts] = useState<PlatformCounts>({
    twitter: 0,
    email: 0,
    sms: 0,
    linkedin: 0,
    instagram: 0,
    other: 0,
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [creatorStats, setCreatorStats] = useState<CreatorStats[]>([]);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!selectedBusiness) return;
    
    try {
      setRefreshing(true);
      
      // Calculate date range
      const now = new Date();
      let startDate: Date | null = null;
      
      if (timeRange === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeRange === 'month') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      // Fetch scheduled content for status and platform counts
      let query = supabase
        .from('scheduled_content')
        .select('*')
        .eq('business_id', selectedBusiness);
      
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      
      const { data: contentData, error: contentError } = await query;
      
      if (contentError) throw contentError;
      
      // Calculate status counts
      const newStatusCounts: ContentStatusCounts = {
        draft: 0,
        review: 0,
        scheduled: 0,
        published: 0,
        failed: 0,
      };
      
      const newPlatformCounts: PlatformCounts = {
        twitter: 0,
        email: 0,
        sms: 0,
        linkedin: 0,
        instagram: 0,
        other: 0,
      };
      
      const activityList: RecentActivity[] = [];
      
      (contentData || []).forEach((item) => {
        // Status counts
        const status = item.status?.toLowerCase() || 'draft';
        const approvalStatus = item.approval_status?.toLowerCase();
        
        if (status === 'posted' || status === 'published') {
          newStatusCounts.published++;
        } else if (status === 'failed') {
          newStatusCounts.failed++;
        } else if (status === 'scheduled') {
          newStatusCounts.scheduled++;
        } else if (approvalStatus === 'pending') {
          newStatusCounts.review++;
        } else {
          newStatusCounts.draft++;
        }
        
        // Platform counts
        const platform = item.platform?.toLowerCase() || 'other';
        if (platform in newPlatformCounts) {
          newPlatformCounts[platform as keyof PlatformCounts]++;
        } else {
          newPlatformCounts.other++;
        }
        
        // Build activity feed
        let activityType: RecentActivity['type'] = 'created';
        if (status === 'posted' || status === 'published') {
          activityType = 'published';
        } else if (status === 'scheduled') {
          activityType = 'scheduled';
        } else if (approvalStatus === 'approved') {
          activityType = 'approved';
        } else if (approvalStatus === 'rejected') {
          activityType = 'rejected';
        }
        
        activityList.push({
          id: item.id,
          type: activityType,
          platform: item.platform || 'other',
          content: item.content || '',
          created_at: item.created_at || new Date().toISOString(),
          created_by: item.approved_by ? 'Human' : 'AI Generated',
        });
      });
      
      // Sort activity by date (most recent first) and take top 10
      activityList.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setStatusCounts(newStatusCounts);
      setPlatformCounts(newPlatformCounts);
      setRecentActivity(activityList.slice(0, 10));
      
      // Calculate creator stats
      const totalContent = contentData?.length || 0;
      const aiGenerated = contentData?.filter(c => !c.approved_by).length || 0;
      const manualCreated = totalContent - aiGenerated;
      
      const newCreatorStats: CreatorStats[] = [
        {
          name: 'AI Generated',
          type: 'ai',
          count: aiGenerated,
        },
        {
          name: 'Manual/Human',
          type: 'manual',
          count: manualCreated,
        },
      ];
      
      setCreatorStats(newCreatorStats);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedBusiness, timeRange]);
  
  // Calculate totals
  const totalContent = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const totalByPlatform = Object.values(platformCounts).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Content Production</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Overview of your content pipeline
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <TabsList className="h-8">
              <TabsTrigger value="week" className="text-xs px-3 h-7">This Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-3 h-7">This Month</TabsTrigger>
              <TabsTrigger value="all" className="text-xs px-3 h-7">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchDashboardData}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatusCard 
          status="draft" 
          label="Drafts" 
          count={statusCounts.draft}
          subLabel="Awaiting action"
        />
        <StatusCard 
          status="review" 
          label="In Review" 
          count={statusCounts.review}
          subLabel="Pending approval"
        />
        <StatusCard 
          status="scheduled" 
          label="Scheduled" 
          count={statusCounts.scheduled}
          subLabel="Ready to post"
        />
        <StatusCard 
          status="published" 
          label="Published" 
          count={statusCounts.published}
          subLabel="Live content"
        />
        <StatusCard 
          status="failed" 
          label="Failed" 
          count={statusCounts.failed}
          subLabel="Needs attention"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform Distribution */}
        <Card variant="elevated" className="lg:col-span-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              By Platform
            </CardTitle>
            <CardDescription className="text-xs">
              Content distribution across channels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PlatformBar 
              platform="twitter" 
              count={platformCounts.twitter}
              total={totalByPlatform}
              label="Twitter/X"
            />
            <PlatformBar 
              platform="linkedin" 
              count={platformCounts.linkedin}
              total={totalByPlatform}
              label="LinkedIn"
            />
            <PlatformBar 
              platform="email" 
              count={platformCounts.email}
              total={totalByPlatform}
              label="Email"
            />
            <PlatformBar 
              platform="sms" 
              count={platformCounts.sms}
              total={totalByPlatform}
              label="SMS"
            />
            <PlatformBar 
              platform="instagram" 
              count={platformCounts.instagram}
              total={totalByPlatform}
              label="Instagram"
            />
            {platformCounts.other > 0 && (
              <PlatformBar 
                platform="other" 
                count={platformCounts.other}
                total={totalByPlatform}
                label="Other"
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card variant="elevated" className="lg:col-span-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-xs">
              Latest content updates
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[360px] overflow-y-auto">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No recent activity</p>
                <p className="text-xs text-slate-400 mt-1">
                  Content updates will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentActivity.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Creator Attribution */}
        <Card variant="elevated" className="lg:col-span-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              Creator Attribution
            </CardTitle>
            <CardDescription className="text-xs">
              Who created what ({totalContent} total)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {creatorStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <User className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No creator data</p>
              </div>
            ) : (
              <>
                {creatorStats.map((creator, idx) => (
                  <CreatorCard 
                    key={idx}
                    creator={creator}
                    totalContent={totalContent}
                  />
                ))}
                
                {/* Quick Stats */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-violet-50 rounded-lg">
                      <p className="text-2xl font-bold text-violet-700">
                        {totalContent > 0 
                          ? Math.round((creatorStats[0]?.count || 0) / totalContent * 100)
                          : 0}%
                      </p>
                      <p className="text-[10px] text-violet-600 uppercase tracking-wide">AI Generated</p>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-lg">
                      <p className="text-2xl font-bold text-emerald-700">
                        {totalContent > 0 
                          ? Math.round((creatorStats[1]?.count || 0) / totalContent * 100)
                          : 0}%
                      </p>
                      <p className="text-[10px] text-emerald-600 uppercase tracking-wide">Human Created</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Production Velocity (Optional Summary) */}
      {totalContent > 0 && (
        <Card variant="elevated">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Production Velocity
                  </p>
                  <p className="text-xs text-slate-500">
                    {totalContent} pieces of content {timeRange === 'week' ? 'this week' : timeRange === 'month' ? 'this month' : 'total'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-lg font-semibold text-emerald-600">
                    {statusCounts.published}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase">Published</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-blue-600">
                    {statusCounts.scheduled}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase">In Queue</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-amber-600">
                    {statusCounts.review + statusCounts.draft}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase">In Progress</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ContentDashboard;
