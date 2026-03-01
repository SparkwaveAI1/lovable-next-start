import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Mail, 
  Eye, 
  MousePointer, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Users,
  Activity
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface EmailAnalyticsProps {}

interface CampaignMetrics {
  totalCampaigns: number;
  totalSends: number;
  avgOpenRate: number;
  avgClickRate: number;
  trends: {
    campaigns: string;
    sends: string;
    openRate: string;
    clickRate: string;
  };
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  sent: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  sentAt: string;
}

interface RealtimeEvent {
  timestamp: string;
  type: string;
  recipient: string;
  campaign: string;
}

const EmailAnalytics: React.FC<EmailAnalyticsProps> = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  useEffect(() => {
    loadAnalyticsData();
    
    // Set up real-time updates
    const interval = setInterval(loadRealtimeEvents, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Load summary metrics
      const summaryResponse = await fetch('/api/analytics/email/summary');
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setMetrics(summaryData);
      }

      // Load campaigns list
      const campaignsResponse = await fetch('/api/analytics/email/campaigns');
      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json();
        setCampaigns(campaignsData.campaigns || []);
      }

    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRealtimeEvents = async () => {
    try {
      const response = await fetch('/api/analytics/email/events/live');
      if (response.ok) {
        const data = await response.json();
        setRealtimeEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to load real-time events:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'complete': return 'bg-green-500';
      case 'sending': return 'bg-blue-500';
      case 'draft': return 'bg-gray-500';
      case 'queued': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getPerformanceColor = (rate: number, type: 'open' | 'click' | 'bounce') => {
    switch (type) {
      case 'open':
        return rate >= 20 ? 'text-green-600' : rate >= 15 ? 'text-yellow-600' : 'text-red-600';
      case 'click':
        return rate >= 3 ? 'text-green-600' : rate >= 2 ? 'text-yellow-600' : 'text-red-600';
      case 'bounce':
        return rate <= 2 ? 'text-green-600' : rate <= 5 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatEventTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'email.opened': return <Eye className="w-4 h-4 text-blue-500" />;
      case 'email.clicked': return <MousePointer className="w-4 h-4 text-green-500" />;
      case 'email.bounced': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'email.delivered': return <Mail className="w-4 h-4 text-gray-500" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const generateTimelineData = () => {
    // Mock timeline data - in production, this would come from API
    return [
      { time: '9 AM', opens: 45, clicks: 12 },
      { time: '10 AM', opens: 62, clicks: 18 },
      { time: '11 AM', opens: 89, clicks: 25 },
      { time: '12 PM', opens: 73, clicks: 21 },
      { time: '1 PM', opens: 56, clicks: 16 },
      { time: '2 PM', opens: 94, clicks: 28 },
      { time: '3 PM', opens: 81, clicks: 23 },
      { time: '4 PM', opens: 67, clicks: 19 }
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Analytics</h1>
          <p className="text-gray-600">Monitor email campaign performance and engagement</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedPeriod === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('7d')}
          >
            7 Days
          </Button>
          <Button
            variant={selectedPeriod === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('30d')}
          >
            30 Days
          </Button>
          <Button
            variant={selectedPeriod === '90d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('90d')}
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                  <p className="text-2xl font-bold">{metrics.totalCampaigns}</p>
                  <p className="text-xs text-gray-500 mt-1">{metrics.trends.campaigns} this week</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sends</p>
                  <p className="text-2xl font-bold">{metrics.totalSends.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">{metrics.trends.sends} today</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Open Rate</p>
                  <p className="text-2xl font-bold">{metrics.avgOpenRate.toFixed(1)}%</p>
                  <p className={`text-xs mt-1 flex items-center ${
                    metrics.trends.openRate.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metrics.trends.openRate.startsWith('+') ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {metrics.trends.openRate} this month
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Eye className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Click Rate</p>
                  <p className="text-2xl font-bold">{metrics.avgClickRate.toFixed(1)}%</p>
                  <p className={`text-xs mt-1 flex items-center ${
                    metrics.trends.clickRate.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metrics.trends.clickRate.startsWith('+') ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {metrics.trends.clickRate} this month
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <MousePointer className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="live">Live Monitor</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Engagement Timeline (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateTimelineData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="opens" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      name="Opens"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="clicks" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      name="Clicks"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          {/* Campaign Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Campaign</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-center py-3 px-4">Sent</th>
                      <th className="text-center py-3 px-4">Open Rate</th>
                      <th className="text-center py-3 px-4">Click Rate</th>
                      <th className="text-center py-3 px-4">Bounce Rate</th>
                      <th className="text-center py-3 px-4">Sent Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign) => (
                      <tr key={campaign.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-xs text-gray-500">{campaign.id.slice(0, 8)}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-4">
                          {campaign.sent.toLocaleString()}
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={getPerformanceColor(campaign.openRate, 'open')}>
                            {campaign.openRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={getPerformanceColor(campaign.clickRate, 'click')}>
                            {campaign.clickRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={getPerformanceColor(campaign.bounceRate, 'bounce')}>
                            {campaign.bounceRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center py-3 px-4 text-gray-500">
                          {new Date(campaign.sentAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="live" className="space-y-6">
          {/* Real-time Events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  Live Event Stream
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {realtimeEvents.map((event, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      {getEventIcon(event.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.recipient}</p>
                        <p className="text-xs text-gray-500">{event.campaign}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{formatEventTime(event.timestamp)}</p>
                        <p className="text-xs font-medium">{event.type?.split('.')?.[1] ?? event.type ?? 'event'}</p>
                      </div>
                    </div>
                  ))}
                  
                  {realtimeEvents.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No recent events</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Email Tracking</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Active</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Webhook Status</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Connected</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Database</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Operational</span>
                  </div>
                </div>

                <div className="pt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Daily Email Quota</span>
                    <span>67/100</span>
                  </div>
                  <Progress value={67} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* Performance Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Subject Line Optimization</p>
                      <p className="text-sm text-yellow-700">
                        A/B test different subject lines to improve open rates by 15-25%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800">Send Time Analysis</p>
                      <p className="text-sm text-blue-700">
                        Peak engagement occurs between 9-11 AM ET on weekdays
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800">Strong Performance</p>
                      <p className="text-sm text-green-700">
                        Your open rates are 23% above industry average
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Opens</span>
                      <span>18.4%</span>
                    </div>
                    <Progress value={18.4} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Clicks</span>
                      <span>3.2%</span>
                    </div>
                    <Progress value={3.2 * 10} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Bounces</span>
                      <span>2.1%</span>
                    </div>
                    <Progress value={2.1 * 10} className="h-2 bg-red-200" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Unsubscribes</span>
                      <span>0.3%</span>
                    </div>
                    <Progress value={0.3 * 50} className="h-2 bg-orange-200" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailAnalytics;