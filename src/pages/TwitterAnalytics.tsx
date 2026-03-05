import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent, PageHeader } from "@/components/layout/PageLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Twitter, BarChart3, CheckCircle2, XCircle, TrendingUp, Eye, Heart, Repeat2, MessageCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface TwitterPost {
  id: string;
  account: string;
  content: string;
  criteria_scores: Record<string, number> | null;
  passed_first_time: boolean;
  revision_count: number;
  posted_at: string;
  created_at: string;
}

interface TwitterEngagement {
  id: string;
  post_id: string;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  polled_at: string;
}

interface PostWithEngagement extends TwitterPost {
  engagement?: TwitterEngagement;
}

interface AccountStats {
  account: string;
  totalPosts: number;
  passedFirstTime: number;
  avgRevisions: number;
  totalLikes: number;
  totalRetweets: number;
  totalImpressions: number;
}

const CHART_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
];

export default function TwitterAnalytics() {
  const [posts, setPosts] = useState<PostWithEngagement[]>([]);
  const [accountStats, setAccountStats] = useState<AccountStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from("twitter_posts")
        .select("*")
        .order("posted_at", { ascending: false })
        .limit(100);

      if (postsError) throw postsError;

      // Fetch engagement data
      const { data: engagementData, error: engagementError } = await supabase
        .from("twitter_engagement")
        .select("*")
        .order("polled_at", { ascending: false });

      if (engagementError) throw engagementError;

      // Map engagement to posts (get latest engagement per post)
      const engagementByPost = new Map<string, TwitterEngagement>();
      (engagementData || []).forEach((e: TwitterEngagement) => {
        if (!engagementByPost.has(e.post_id)) {
          engagementByPost.set(e.post_id, e);
        }
      });

      const postsWithEngagement: PostWithEngagement[] = (postsData || []).map((post: TwitterPost) => ({
        ...post,
        engagement: engagementByPost.get(post.id),
      }));

      setPosts(postsWithEngagement);

      // Calculate account stats
      const statsMap = new Map<string, AccountStats>();
      
      postsWithEngagement.forEach((post) => {
        const account = post.account || "unknown";
        const existing = statsMap.get(account) || {
          account,
          totalPosts: 0,
          passedFirstTime: 0,
          avgRevisions: 0,
          totalLikes: 0,
          totalRetweets: 0,
          totalImpressions: 0,
        };

        existing.totalPosts += 1;
        if (post.passed_first_time) existing.passedFirstTime += 1;
        existing.avgRevisions += post.revision_count || 0;
        
        if (post.engagement) {
          existing.totalLikes += post.engagement.likes || 0;
          existing.totalRetweets += post.engagement.retweets || 0;
          existing.totalImpressions += post.engagement.impressions || 0;
        }

        statsMap.set(account, existing);
      });

      // Calculate averages
      const stats = Array.from(statsMap.values()).map((s) => ({
        ...s,
        avgRevisions: s.totalPosts > 0 ? s.avgRevisions / s.totalPosts : 0,
      }));

      setAccountStats(stats);
      setRefreshedAt(new Date());
    } catch (err) {
      console.error("Error fetching Twitter analytics:", err);
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate overall metrics
  const totalPosts = posts.length;
  const firstTimePassRate = totalPosts > 0 
    ? (posts.filter(p => p.passed_first_time).length / totalPosts) * 100 
    : 0;
  const avgRevisions = totalPosts > 0
    ? posts.reduce((sum, p) => sum + (p.revision_count || 0), 0) / totalPosts
    : 0;
  const totalEngagement = posts.reduce((sum, p) => {
    if (!p.engagement) return sum;
    return sum + (p.engagement.likes || 0) + (p.engagement.retweets || 0) + (p.engagement.replies || 0);
  }, 0);
  const totalImpressions = posts.reduce((sum, p) => sum + (p.engagement?.impressions || 0), 0);

  // Chart data for posts by account
  const postsChartData = accountStats.map((s) => ({
    name: s.account,
    posts: s.totalPosts,
  }));

  return (
    <DashboardLayout>
      <PageContent>
        <PageHeader
          title="Twitter Analytics"
          description="Track posting quality, engagement, and account performance"
          actions={
            <div className="flex items-center gap-3">
              {!isLoading && refreshedAt && (
                <span className="text-xs text-slate-400">
                  Last refreshed {format(refreshedAt, 'h:mm a')}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          }
        />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Top-level empty state */}
        {!isLoading && !error && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Twitter className="h-12 w-12 text-slate-200 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No Twitter data yet</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-xs">
              Posts will appear here once Twitter accounts start publishing.
              Check back after the next scheduled post.
            </p>
          </div>
        )}

        {/* Summary Cards + Charts (hidden when empty and not loading) */}
        {(isLoading || posts.length > 0) && (<>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Twitter className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Posts</p>
                  <p className="text-2xl font-bold text-gray-900">{totalPosts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">First-Time Pass</p>
                  <p className="text-2xl font-bold text-gray-900">{firstTimePassRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg Revisions</p>
                  <p className="text-2xl font-bold text-gray-900">{avgRevisions.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Engagement</p>
                  <p className="text-2xl font-bold text-gray-900">{totalEngagement.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Posts by Account Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
                Posts by Account
              </CardTitle>
              <CardDescription>Distribution of posts across Twitter accounts</CardDescription>
            </CardHeader>
            <CardContent>
              {postsChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={postsChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 12 }} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={100}
                        tick={{ fill: "#6b7280", fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e1b4b",
                          border: "none",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                      />
                      <Bar dataKey="posts" radius={[0, 4, 4, 0]}>
                        {postsChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Account Performance
              </CardTitle>
              <CardDescription>Quality metrics and engagement by account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-1 font-medium text-gray-600">Account</th>
                      <th className="text-right py-2 px-1 font-medium text-gray-600">Posts</th>
                      <th className="text-right py-2 px-1 font-medium text-gray-600">Pass Rate</th>
                      <th className="text-right py-2 px-1 font-medium text-gray-600">Engagement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountStats.map((stat) => (
                      <tr key={stat.account} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-1">
                          <span className="font-medium text-gray-900">@{stat.account}</span>
                        </td>
                        <td className="text-right py-2 px-1 text-gray-600">{stat.totalPosts}</td>
                        <td className="text-right py-2 px-1">
                          <Badge 
                            className={
                              stat.totalPosts > 0 && (stat.passedFirstTime / stat.totalPosts) >= 0.8
                                ? "bg-emerald-100 text-emerald-700 border-0"
                                : stat.totalPosts > 0 && (stat.passedFirstTime / stat.totalPosts) >= 0.5
                                ? "bg-amber-100 text-amber-700 border-0"
                                : "bg-red-100 text-red-700 border-0"
                            }
                          >
                            {stat.totalPosts > 0 
                              ? `${((stat.passedFirstTime / stat.totalPosts) * 100).toFixed(0)}%`
                              : "N/A"}
                          </Badge>
                        </td>
                        <td className="text-right py-2 px-1 text-gray-600">
                          {stat.totalLikes + stat.totalRetweets > 0
                            ? (stat.totalLikes + stat.totalRetweets).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                    {accountStats.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400">
                          No account data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        </>)}

        {/* Recent Posts */}
        {(isLoading || posts.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Twitter className="h-5 w-5 text-sky-500" />
              Recent Posts
            </CardTitle>
            <CardDescription>Latest posts with quality scores and engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8 text-gray-400">Loading posts...</div>
              ) : posts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No posts found</div>
              ) : (
                posts.slice(0, 20).map((post) => (
                  <div
                    key={post.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-0">
                          @{post.account}
                        </Badge>
                        {post.passed_first_time ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            First-time pass
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 border-0 gap-1">
                            <XCircle className="h-3 w-3" />
                            {post.revision_count} revision{post.revision_count !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {post.posted_at
                          ? formatDistanceToNow(new Date(post.posted_at), { addSuffix: true })
                          : "Not posted"}
                      </span>
                    </div>

                    <p className="text-gray-700 text-sm mb-3 line-clamp-2">{post.content}</p>

                    {/* Engagement metrics */}
                    {post.engagement && (
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {(post.engagement.impressions || 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4 text-pink-500" />
                          {post.engagement.likes || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Repeat2 className="h-4 w-4 text-emerald-500" />
                          {post.engagement.retweets || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4 text-sky-500" />
                          {post.engagement.replies || 0}
                        </span>
                      </div>
                    )}

                    {/* Criteria scores if available */}
                    {post.criteria_scores && Object.keys(post.criteria_scores).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">Quality Scores:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(post.criteria_scores).map(([criterion, score]) => (
                            <Badge
                              key={criterion}
                              variant="outline"
                              className="text-xs"
                            >
                              {criterion}: {typeof score === 'number' ? score.toFixed(1) : score}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        )}
      </PageContent>
    </DashboardLayout>
  );
}
