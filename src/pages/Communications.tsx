import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { useBusinesses } from '@/hooks/useBusinesses';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageContent } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  MessageSquare, 
  Mail, 
  Send, 
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Reply,
  Plus,
  RefreshCw,
  Phone,
  Bot,
  User,
  Loader2,
  AlertTriangle,
  BarChart3,
  Target,
  Eye,
  Sparkles
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  from_name: string;
  from_email: string;
  content_html: string;
  status: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string | null;
  total_recipients: number | null;
  total_sent: number | null;
  total_delivered: number | null;
  total_opened: number | null;
  total_clicked: number | null;
  total_bounced: number | null;
}

interface VerifiedSender {
  id: string;
  name: string;
  email: string;
  is_default: boolean | null;
}

interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  message_template: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  replied_count: number;
  failed_count: number;
  opted_out_count: number;
  reply_rate: number;
  delivery_rate: number;
}

interface RecentMessage {
  id: string;
  direction: string;
  message: string;
  created_at: string;
  ai_response: boolean;
  contact_id: string;
  contact_name?: string;
}

interface AIResponseLog {
  id: string;
  input_message: string;
  response_text: string;
  confidence_score: number | null;
  patterns_flagged: string[] | null;
  required_review: boolean;
  reviewed_at: string | null;
  review_rating: string | null;
  created_at: string;
  input_channel: string;
}

interface QualityMetrics {
  passRate: number;
  avgRevisions: number;
  totalResponses: number;
  reviewedCount: number;
  flaggedCount: number;
  failurePatterns: { pattern: string; count: number }[];
}

export default function Communications() {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const [isNewCampaignOpen, setIsNewCampaignOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    channel: 'sms',
    message_template: '',
  });
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeMessage, setComposeMessage] = useState({
    phone: '',
    message: '',
  });
  
  // Conversation thread state
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const handleBusinessChange = (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (business) setSelectedBusiness(business);
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.message_template) return;
    
    try {
      const { error } = await supabase
        .from('campaigns')
        .insert({
          name: newCampaign.name,
          channel: newCampaign.channel,
          message_template: newCampaign.message_template,
          business_id: selectedBusiness?.id,
          status: 'draft',
        });
      
      if (error) throw error;
      
      setIsNewCampaignOpen(false);
      setNewCampaign({ name: '', channel: 'sms', message_template: '' });
      refetchCampaigns();
    } catch (err) {
      console.error('Failed to create campaign:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!composeMessage.phone || !composeMessage.message) return;
    
    try {
      const { error } = await supabase
        .from('sms_messages')
        .insert({
          phone_number: composeMessage.phone,
          message: composeMessage.message,
          direction: 'outbound',
          status: 'pending',
          business_id: selectedBusiness?.id,
        });
      
      if (error) throw error;
      
      setIsComposeOpen(false);
      setComposeMessage({ phone: '', message: '' });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading, refetch: refetchCampaigns } = useQuery({
    queryKey: ['campaigns', selectedBusiness?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_summary')
        .select('*')
        .eq('business_id', selectedBusiness?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!selectedBusiness?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent messages
  const { data: recentMessages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['recent-messages', selectedBusiness?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_messages')
        .select(`
          id,
          direction,
          message,
          created_at,
          ai_response,
          contact_id
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as RecentMessage[];
    },
    enabled: !!selectedBusiness?.id,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch selected contact details
  const { data: selectedContact } = useQuery({
    queryKey: ['contact', selectedContactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, phone, email')
        .eq('id', selectedContactId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedContactId,
  });

  // Fetch conversation thread for selected contact
  const { data: threadMessages = [], refetch: refetchThread } = useQuery({
    queryKey: ['thread-messages', selectedContactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_messages')
        .select('id, direction, message, created_at, ai_response')
        .eq('contact_id', selectedContactId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedContactId && isThreadOpen,
    refetchInterval: 5000, // Refresh every 5 seconds when open
  });

  // Open conversation thread
  const openThread = (contactId: string) => {
    setSelectedContactId(contactId);
    setIsThreadOpen(true);
  };

  // Send reply in thread
  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedContactId || !selectedContact?.phone) return;
    
    setIsSendingReply(true);
    try {
      const { error } = await supabase
        .from('sms_messages')
        .insert({
          contact_id: selectedContactId,
          message: replyMessage,
          direction: 'outbound',
          ai_response: false,
        });
      
      if (error) throw error;
      
      setReplyMessage('');
      refetchThread();
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Calculate stats
  const stats = {
    totalSent: campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0),
    totalReplied: campaigns.reduce((sum, c) => sum + (c.replied_count || 0), 0),
    totalFailed: campaigns.reduce((sum, c) => sum + (c.failed_count || 0), 0),
    activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    avgReplyRate: campaigns.length > 0 
      ? (campaigns.reduce((sum, c) => sum + (c.reply_rate || 0), 0) / campaigns.length).toFixed(1)
      : '0',
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Completed</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500">Paused</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      default:
        return <Send className="h-4 w-4" />;
    }
  };

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={(id) => {
        const business = businesses.find((b) => b.id === id);
        if (business) setSelectedBusiness(business);
      }}
      businessName={selectedBusiness?.name}
    >
      <PageContent className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Communication Center</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Manage campaigns, track messages, and monitor engagement</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchCampaigns()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={isNewCampaignOpen} onOpenChange={setIsNewCampaignOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Campaign</DialogTitle>
                  <DialogDescription>
                    Set up a new outreach campaign to engage your contacts.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Campaign Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Welcome Series"
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="channel">Channel</Label>
                    <Select
                      value={newCampaign.channel}
                      onValueChange={(value) => setNewCampaign(prev => ({ ...prev, channel: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message Template</Label>
                    <Textarea
                      id="message"
                      placeholder="Your message here... Use {{name}} for personalization"
                      value={newCampaign.message_template}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, message_template: e.target.value }))}
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewCampaignOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCampaign} disabled={!newCampaign.name || !newCampaign.message_template}>
                    Create Campaign
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Send className="h-4 w-4 mr-2" />
                  Compose
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Compose Message</DialogTitle>
                  <DialogDescription>
                    Send a quick SMS to any phone number.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      placeholder="+1 555 123 4567"
                      value={composeMessage.phone}
                      onChange={(e) => setComposeMessage(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sms-message">Message</Label>
                    <Textarea
                      id="sms-message"
                      placeholder="Type your message..."
                      value={composeMessage.message}
                      onChange={(e) => setComposeMessage(prev => ({ ...prev, message: e.target.value }))}
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendMessage} disabled={!composeMessage.phone || !composeMessage.message}>
                    Send Message
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{stats.totalSent}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Replies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Reply className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{stats.totalReplied}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold">{stats.totalFailed}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <span className="text-2xl font-bold">{stats.activeCampaigns}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Reply Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <span className="text-2xl font-bold">{stats.avgReplyRate}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">SMS Campaigns</TabsTrigger>
            <TabsTrigger value="email">Email Marketing</TabsTrigger>
            <TabsTrigger value="inbox">Inbox</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Campaigns */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Active Campaigns
                  </CardTitle>
                  <CardDescription>Currently running outreach</CardDescription>
                </CardHeader>
                <CardContent>
                  {campaigns.filter(c => c.status === 'active').length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No active campaigns</p>
                  ) : (
                    <div className="space-y-4">
                      {campaigns.filter(c => c.status === 'active').map(campaign => (
                        <div key={campaign.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getChannelIcon(campaign.channel)}
                              <span className="font-medium">{campaign.name}</span>
                            </div>
                            {getStatusBadge(campaign.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Sent: {campaign.sent_count}</span>
                            <span>Replied: {campaign.replied_count}</span>
                            <span>Rate: {campaign.reply_rate}%</span>
                          </div>
                          <Progress value={campaign.reply_rate} className="h-2" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest messages</CardDescription>
                </CardHeader>
                <CardContent>
                  {messagesLoading ? (
                    <p className="text-center py-4">Loading...</p>
                  ) : recentMessages.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No recent messages</p>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {recentMessages.slice(0, 10).map(msg => (
                        <div 
                          key={msg.id} 
                          className="flex items-start gap-3 text-sm p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                          onClick={() => msg.contact_id && openThread(msg.contact_id)}
                        >
                          <div className={`p-1 rounded ${msg.direction === 'inbound' ? 'bg-blue-100' : 'bg-green-100'}`}>
                            {msg.direction === 'inbound' ? (
                              <Reply className="h-3 w-3 text-blue-600" />
                            ) : (
                              <Send className="h-3 w-3 text-green-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate">{msg.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              {msg.ai_response && <Badge variant="outline" className="ml-2 text-xs">AI</Badge>}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns">
            <Card>
              <CardHeader>
                <CardTitle>All Campaigns</CardTitle>
                <CardDescription>View and manage your outreach campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                {campaignsLoading ? (
                  <p className="text-center py-8">Loading campaigns...</p>
                ) : campaigns.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No campaigns yet</p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Campaign
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Sent</TableHead>
                        <TableHead className="text-right">Delivered</TableHead>
                        <TableHead className="text-right">Replied</TableHead>
                        <TableHead className="text-right">Reply Rate</TableHead>
                        <TableHead>Started</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map(campaign => (
                        <TableRow key={campaign.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium">{campaign.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getChannelIcon(campaign.channel)}
                              <span className="capitalize">{campaign.channel}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                          <TableCell className="text-right">{campaign.sent_count}</TableCell>
                          <TableCell className="text-right">{campaign.delivered_count}</TableCell>
                          <TableCell className="text-right">{campaign.replied_count}</TableCell>
                          <TableCell className="text-right">
                            <span className={campaign.reply_rate > 10 ? 'text-green-600 font-medium' : ''}>
                              {campaign.reply_rate}%
                            </span>
                          </TableCell>
                          <TableCell>
                            {campaign.started_at 
                              ? format(new Date(campaign.started_at), 'MMM d, yyyy')
                              : '-'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Marketing Tab */}
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Marketing
                </CardTitle>
                <CardDescription>
                  Create and manage email campaigns, newsletters, and automated sequences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 space-y-4">
                  <Mail className="h-16 w-16 mx-auto text-muted-foreground/50" />
                  <div>
                    <h3 className="font-semibold text-lg">Email Marketing Coming Soon</h3>
                    <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                      We're integrating email marketing directly into the Communications Center. 
                      You'll be able to create email campaigns, newsletters, and automated drip sequences.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => window.location.href = '/email-marketing'}>
                    Use Legacy Email Marketing
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inbox Tab */}
          <TabsContent value="inbox">
            <Card>
              <CardHeader>
                <CardTitle>Message Inbox</CardTitle>
                <CardDescription>All inbound and outbound messages</CardDescription>
              </CardHeader>
              <CardContent>
                {messagesLoading ? (
                  <p className="text-center py-8">Loading messages...</p>
                ) : recentMessages.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No messages yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Direction</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentMessages.map(msg => (
                        <TableRow key={msg.id}>
                          <TableCell>
                            <Badge variant={msg.direction === 'inbound' ? 'default' : 'secondary'}>
                              {msg.direction === 'inbound' ? '📥 In' : '📤 Out'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md truncate">{msg.message}</TableCell>
                          <TableCell>
                            {msg.ai_response ? (
                              <Badge variant="outline">AI Response</Badge>
                            ) : msg.direction === 'outbound' ? (
                              <Badge variant="outline">Manual</Badge>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageContent>

      {/* Conversation Thread Sheet */}
      <Sheet open={isThreadOpen} onOpenChange={setIsThreadOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedContact 
                ? `${selectedContact.first_name || ''} ${selectedContact.last_name || ''}`.trim() || 'Unknown Contact'
                : 'Loading...'}
            </SheetTitle>
            <SheetDescription className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {selectedContact?.phone || 'No phone number'}
            </SheetDescription>
          </SheetHeader>

          {/* Messages area */}
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-4">
              {threadMessages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No messages yet</p>
              ) : (
                threadMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.direction === 'outbound'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs opacity-70">
                          {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                        </span>
                        {msg.ai_response && (
                          <Badge variant="outline" className="text-xs py-0 h-5 gap-1">
                            <Bot className="h-3 w-3" />
                            AI
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Reply input */}
          <div className="border-t px-4 py-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="Type your message..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="min-h-[80px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-muted-foreground">
                Press Enter to send, Shift+Enter for new line
              </span>
              <Button 
                onClick={handleSendReply} 
                disabled={!replyMessage.trim() || isSendingReply}
                size="sm"
              >
                {isSendingReply ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
