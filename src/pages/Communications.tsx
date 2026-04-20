import React, { useState, useEffect, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { HelpTooltip } from '@/components/ui/help-tooltip';
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
import { EmailSequencesList } from '@/components/email/EmailSequencesList';
import { EmailCampaignSequenceBuilder } from '@/components/email/EmailCampaignSequenceBuilder';
import { DripQueueTab } from '@/components/email/DripQueueTab';

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
  agent_name: string | null;
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
  contact_name?: string | null;
  agent_name: string | null;
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

interface EmailSend {
  id: string;
  to_email: string | null;
  subject: string | null;
  status: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  created_at: string | null;
  contact_id: string | null;
  contact?: {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  };
}

// Unified activity item for merged feed
interface ActivityItem {
  id: string;
  type: 'sms' | 'email';
  direction?: string;
  message?: string;
  subject?: string;
  to?: string;
  from?: string;  // Sender for inbound email replies
  status?: string;
  created_at: string;
  ai_response?: boolean;
  contact_id?: string | null;
  thread_id?: string;  // For SMS threads
  contact_name?: string | null;  // Contact name for SMS threads
  opened_at?: string | null;
  clicked_at?: string | null;
  agent_name?: string | null;
}

interface QualityMetrics {
  passRate: number;
  avgRevisions: number;
  totalResponses: number;
  reviewedCount: number;
  flaggedCount: number;
  failurePatterns: { pattern: string; count: number }[];
}

interface CommunicationsHealthMetrics {
  smsSentToday: number;
  smsReceivedToday: number;
  smsSentWeek: number;
  smsReceivedWeek: number;
  automationSuccessRate: number;
  automationSuccessCount: number;
  automationFailureCount: number;
  activeFollowUps: number;
  pausedFollowUps: number;
  completedFollowUps: number;
  respondedFollowUps: number;
}

// Audience selection types
type AudienceType = 'all' | 'by_tag' | 'by_status' | 'by_source' | 'manual';

interface AudienceCriteria {
  type: AudienceType;
  tags?: string[];
  statuses?: string[];
  sources?: string[];
  contactIds?: string[];
}

interface ContactForSelection {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  source: string | null;
  tags: string[] | null;
}

interface ContactTag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

const STATUS_OPTIONS = [
  { value: 'new_lead', label: 'New Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'active_member', label: 'Active Member' },
  { value: 'inactive', label: 'Inactive' },
];

const SOURCE_OPTIONS = [
  { value: 'wix_form', label: 'Wix Form' },
  { value: 'wix_booking', label: 'Wix Booking' },
  { value: 'wix_prechat', label: 'Wix Chat' },
  { value: 'sms_inbound', label: 'SMS Inbound' },
  { value: 'email_inbound', label: 'Email Inbound' },
  { value: 'manual', label: 'Manual Entry' },
];

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
  
  // Audience selection state
  const [audienceType, setAudienceType] = useState<AudienceType>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
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
  
  // Inbox expanded threads state
  const [expandedInboxThreads, setExpandedInboxThreads] = useState<Set<string>>(new Set());
  
  // Agent filter state
  const [agentFilter, setAgentFilter] = useState<'all' | 'Rico' | 'Iris'>('all');

  // Email campaign state
  const [isEmailCampaignOpen, setIsEmailCampaignOpen] = useState(false);
  const [emailSubTab, setEmailSubTab] = useState<'campaigns' | 'sequences' | 'drip'>('campaigns');
  const [isSequenceBuilderOpen, setIsSequenceBuilderOpen] = useState(false);
  const [editingSequenceId, setEditingSequenceId] = useState<string | null>(null);
  const [newEmailCampaign, setNewEmailCampaign] = useState({
    name: '',
    subject: '',
    content_html: '',
    from_name: '',
    from_email: '',
    target_type: 'all',
    schedule_type: 'now',
    scheduled_for: '',
  });
  const queryClient = useQueryClient();

  const handleBusinessChange = (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (business) setSelectedBusiness(business);
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.message_template) return;
    if (recipientCount === 0) {
      toast.error('Please select at least one recipient');
      return;
    }
    
    setIsCreatingCampaign(true);
    
    try {
      // Build audience criteria for storage
      const audienceCriteria: AudienceCriteria = {
        type: audienceType,
        ...(audienceType === 'by_tag' && { tags: selectedTags }),
        ...(audienceType === 'by_status' && { statuses: selectedStatuses }),
        ...(audienceType === 'by_source' && { sources: selectedSources }),
        ...(audienceType === 'manual' && { contactIds: selectedContactIds }),
      };

      // Create the campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          name: newCampaign.name,
          channel: newCampaign.channel,
          message_template: newCampaign.message_template,
          business_id: selectedBusiness?.id,
          status: 'draft',
          target_criteria: audienceCriteria,
        })
        .select('id')
        .single();
      
      if (campaignError) throw campaignError;
      
      // Populate campaign_recipients based on filtered contacts
      const recipientInserts = filteredContacts.map(contact => ({
        campaign_id: campaign.id,
        contact_id: contact.id,
        status: 'pending',
      }));

      if (recipientInserts.length > 0) {
        // Insert in batches of 500 to avoid hitting limits
        const batchSize = 500;
        for (let i = 0; i < recipientInserts.length; i += batchSize) {
          const batch = recipientInserts.slice(i, i + batchSize);
          const { error: recipientError } = await supabase
            .from('campaign_recipients')
            .insert(batch);
          
          if (recipientError) throw recipientError;
        }
      }
      
      toast.success(`Campaign created with ${recipientCount} recipients`);
      setIsNewCampaignOpen(false);
      resetCampaignForm();
      refetchCampaigns();
    } catch (err) {
      console.error('Failed to create campaign:', err);
      toast.error('Failed to create campaign');
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const resetCampaignForm = () => {
    setNewCampaign({ name: '', channel: 'sms', message_template: '' });
    setAudienceType('all');
    setSelectedTags([]);
    setSelectedStatuses([]);
    setSelectedSources([]);
    setSelectedContactIds([]);
  };

  const handleSendMessage = async () => {
    if (!composeMessage.phone || !composeMessage.message) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: composeMessage.phone,
          message: composeMessage.message,
          businessId: selectedBusiness?.id,
        },
      });

      if (error || !data?.success) {
        const errorMsg = data?.error || error?.message || 'Failed to send SMS';
        toast.error(errorMsg);
        return;
      }

      toast.success('SMS sent successfully');
      setIsComposeOpen(false);
      setComposeMessage({ phone: '', message: '' });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send SMS');
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

  // Fetch email campaigns
  const { data: emailCampaigns = [], isLoading: emailCampaignsLoading, refetch: refetchEmailCampaigns } = useQuery({
    queryKey: ['email-campaigns', selectedBusiness?.id, agentFilter],
    queryFn: async () => {
      let query = supabase
        .from('email_campaigns')
        .select('*')
        .eq('business_id', selectedBusiness?.id)
        .order('created_at', { ascending: false });
      if (agentFilter === 'Iris') {
        query = query.eq('agent_name', 'Iris');
      } else if (agentFilter === 'Rico') {
        query = query.or('agent_name.eq.Rico,agent_name.is.null');
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as EmailCampaign[];
    },
    enabled: !!selectedBusiness?.id,
    refetchInterval: 30000,
  });

  // Fetch verified senders for email from address
  const { data: verifiedSenders = [] } = useQuery({
    queryKey: ['verified-senders', selectedBusiness?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verified_senders')
        .select('*')
        .eq('business_id', selectedBusiness?.id)
        .eq('is_active', true);
      if (error) throw error;
      return data as VerifiedSender[];
    },
    enabled: !!selectedBusiness?.id,
  });

  // Get default sender
  const defaultSender = verifiedSenders.find(s => s.is_default) || verifiedSenders[0];

  // Fetch contact tags for audience selection
  const { data: availableTags = [] } = useQuery({
    queryKey: ['contact-tags', selectedBusiness?.id],
    queryFn: async () => {
      if (!selectedBusiness?.id) return [];
      const { data, error } = await supabase
        .from('contact_tags')
        .select('id, name, slug, color')
        .eq('business_id', selectedBusiness.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as ContactTag[];
    },
    enabled: !!selectedBusiness?.id,
  });

  // Fetch all contacts for audience selection
  const { data: allContacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['all-contacts-for-campaign', selectedBusiness?.id],
    queryFn: async () => {
      if (!selectedBusiness?.id) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, status, source, tags')
        .eq('business_id', selectedBusiness.id)
        .order('first_name');
      if (error) throw error;
      return data as ContactForSelection[];
    },
    enabled: !!selectedBusiness?.id && isNewCampaignOpen,
  });

  // Calculate filtered contacts based on audience selection
  const filteredContacts = useMemo(() => {
    if (!allContacts.length) return [];
    
    switch (audienceType) {
      case 'all':
        return allContacts;
      case 'by_tag':
        if (selectedTags.length === 0) return [];
        return allContacts.filter(c => 
          c.tags && c.tags.some(tag => selectedTags.includes(tag))
        );
      case 'by_status':
        if (selectedStatuses.length === 0) return [];
        return allContacts.filter(c => 
          c.status && selectedStatuses.includes(c.status)
        );
      case 'by_source':
        if (selectedSources.length === 0) return [];
        return allContacts.filter(c => 
          c.source && selectedSources.includes(c.source)
        );
      case 'manual':
        return allContacts.filter(c => selectedContactIds.includes(c.id));
      default:
        return [];
    }
  }, [allContacts, audienceType, selectedTags, selectedStatuses, selectedSources, selectedContactIds]);

  const recipientCount = filteredContacts.length;

  // Create email campaign mutation
  const createEmailCampaignMutation = useMutation({
    mutationFn: async (campaign: typeof newEmailCampaign) => {
      const insertData: any = {
        business_id: selectedBusiness?.id,
        name: campaign.name,
        subject: campaign.subject,
        content_html: campaign.content_html,
        from_name: campaign.from_name || defaultSender?.name || 'Your Business',
        from_email: campaign.from_email || defaultSender?.email || 'noreply@sparkwave-ai.com',
        target_type: campaign.target_type,
        status: campaign.schedule_type === 'scheduled' ? 'scheduled' : 'draft',
      };
      
      if (campaign.schedule_type === 'scheduled' && campaign.scheduled_for) {
        insertData.scheduled_for = campaign.scheduled_for;
      }
      
      const { data, error } = await supabase
        .from('email_campaigns')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Email campaign created!');
      setIsEmailCampaignOpen(false);
      setNewEmailCampaign({
        name: '',
        subject: '',
        content_html: '',
        from_name: '',
        from_email: '',
        target_type: 'all',
        schedule_type: 'now',
        scheduled_for: '',
      });
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to create campaign: ' + error.message);
    },
  });

  // Calculate email campaign stats
  const emailStats = {
    totalCampaigns: emailCampaigns.length,
    totalSent: emailCampaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0),
    totalOpened: emailCampaigns.reduce((sum, c) => sum + (c.total_opened || 0), 0),
    totalClicked: emailCampaigns.reduce((sum, c) => sum + (c.total_clicked || 0), 0),
    avgOpenRate: emailCampaigns.length > 0 && emailCampaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0) > 0
      ? ((emailCampaigns.reduce((sum, c) => sum + (c.total_opened || 0), 0) / 
          emailCampaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0)) * 100).toFixed(1)
      : '0',
    avgClickRate: emailCampaigns.length > 0 && emailCampaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0) > 0
      ? ((emailCampaigns.reduce((sum, c) => sum + (c.total_clicked || 0), 0) / 
          emailCampaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0)) * 100).toFixed(1)
      : '0',
  };

  const handleCreateEmailCampaign = () => {
    if (!newEmailCampaign.name || !newEmailCampaign.subject || !newEmailCampaign.content_html) {
      toast.error('Please fill in campaign name, subject, and content');
      return;
    }
    createEmailCampaignMutation.mutate(newEmailCampaign);
  };

  const getEmailStatusBadge = (status: string | null) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500">Sent</Badge>;
      case 'sending':
        return <Badge className="bg-blue-500">Sending</Badge>;
      case 'scheduled':
        return <Badge className="bg-purple-500">Scheduled</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  // Fetch recent SMS messages grouped by conversation thread
  const { data: recentMessages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['recent-messages', selectedBusiness?.id],
    queryFn: async () => {
      // First get conversation threads for this business
      const { data: threads, error: threadsError } = await supabase
        .from('conversation_threads')
        .select('id, contact_id, created_at, status')
        .eq('business_id', selectedBusiness!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (threadsError) throw threadsError;
      if (!threads || threads.length === 0) return [];

      // Get messages for these threads
      const threadIds = threads.map(t => t.id);
      const { data: messages, error } = await supabase
        .from('sms_messages')
        .select(`
          id,
          thread_id,
          direction,
          message,
          created_at,
          ai_response,
          contact_id,
          agent_name,
          contacts:contact_id (
            first_name,
            last_name,
            phone,
            email
          )
        `)
        .in('thread_id', threadIds)
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      // Group messages by thread and add contact info
      const threadMap = new Map<string, any>();
      for (const msg of messages || []) {
        const threadId = msg.thread_id;
        if (!threadId) continue;
        
        if (!threadMap.has(threadId)) {
          // Find the thread info
          const threadInfo = threads.find(t => t.id === threadId);
          threadMap.set(threadId, {
            thread_id: threadId,
            contact_id: msg.contact_id,
            contact_name: msg.contacts 
              ? [msg.contacts.first_name, msg.contacts.last_name].filter(Boolean).join(' ') || msg.contacts.phone || null
              : null,
            contact_phone: msg.contacts?.phone || null,
            contact_email: msg.contacts?.email || null,
            thread_created_at: threadInfo?.created_at || msg.created_at,
            messages: [],
          });
        }
        threadMap.get(threadId).messages.push({
          id: msg.id,
          direction: msg.direction,
          message: msg.message,
          created_at: msg.created_at,
          ai_response: msg.ai_response,
          agent_name: msg.agent_name,
        });
      }

      // Convert to array and sort by most recent message
      return Array.from(threadMap.values())
        .map(thread => ({
          ...thread,
          last_message: thread.messages[thread.messages.length - 1]?.message || '',
          last_message_time: thread.messages[thread.messages.length - 1]?.created_at || thread.thread_created_at,
          last_message_direction: thread.messages[thread.messages.length - 1]?.direction || 'outbound',
        }))
        .sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());
    },
    enabled: !!selectedBusiness?.id,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch recent email sends
  const { data: recentEmails = [], isLoading: emailsLoading } = useQuery({
    queryKey: ['recent-emails', selectedBusiness?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_sends')
        .select(`
          id,
          to_email,
          subject,
          status,
          sent_at,
          opened_at,
          clicked_at,
          created_at,
          contact_id,
          contact:contacts(email, first_name, last_name)
        `)
        .eq('business_id', selectedBusiness!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as EmailSend[];
    },
    enabled: !!selectedBusiness?.id,
    refetchInterval: 10000,
  });

  // Fetch inbound email replies (leads replying to outbound campaigns)
  const INBOUND_EMAIL_REFETCH_MS = 30000; // 30s — replies are infrequent
  const { data: inboundEmails = [], isLoading: inboundEmailsLoading } = useQuery({
    queryKey: ['inbound-emails', selectedBusiness?.id],
    queryFn: async () => {
      if (!selectedBusiness?.id) return [];
      const { data, error } = await supabase
        .from('email_replies')
        .select('id, from_email, from_name, subject, body_text, received_at, status, contact_id, business_id')
        .eq('business_id', selectedBusiness.id)
        .order('received_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedBusiness?.id,
    refetchInterval: INBOUND_EMAIL_REFETCH_MS,
  });

  // Merge and sort SMS + Email activity
  const mergedActivity = useMemo((): ActivityItem[] => {
    // Flatten threaded SMS messages - take the latest message from each thread for the inbox view
    const smsItems: ActivityItem[] = recentMessages.map(thread => ({
      id: thread.thread_id,
      type: 'sms' as const,
      direction: thread.last_message_direction,
      message: thread.last_message,
      created_at: thread.last_message_time,
      ai_response: thread.messages?.[thread.messages.length - 1]?.ai_response || false,
      contact_id: thread.contact_id,
      thread_id: thread.thread_id,
      contact_name: thread.contact_name,
    }));

    const emailItems: ActivityItem[] = recentEmails.map(email => ({
      id: email.id,
      type: 'email' as const,
      direction: 'outbound',
      subject: email.subject || 'No subject',
      to: email.to_email || email.contact?.email || 'Unknown',
      status: email.status || 'pending',
      created_at: email.created_at || email.sent_at || new Date().toISOString(),
      contact_id: email.contact_id,
      opened_at: email.opened_at,
      clicked_at: email.clicked_at,
    }));

    // Inbound email replies from leads
    const inboundEmailItems: ActivityItem[] = inboundEmails.map(reply => ({
      id: reply.id,
      type: 'email' as const,
      direction: 'inbound',
      subject: reply.subject || 'No subject',
      from: reply.from_name || reply.from_email || 'Unknown sender',
      status: reply.status,
      created_at: reply.received_at,
      contact_id: reply.contact_id,
    }));

    // Merge and sort by created_at descending
    return [...smsItems, ...emailItems, ...inboundEmailItems]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50);
  }, [recentMessages, recentEmails, inboundEmails]);

  // Group SMS messages by contact for the Overview panel
  interface ContactGroup {
    contact_id: string;
    contact_name: string;
    last_message: string;
    last_activity: string;
    message_count: number;
    has_inbound: boolean;
  }

  const contactGroups = useMemo((): ContactGroup[] => {
    // Only group SMS messages that have a contact_id
    const smsWithContact = recentMessages.filter(m => m.contact_id);
    const groupMap = new Map<string, ContactGroup>();

    for (const msg of smsWithContact) {
      const cid = msg.contact_id!;
      if (!groupMap.has(cid)) {
        const name = msg.contact_name
          ? msg.contact_name
          : cid.slice(0, 8) + '…';
        groupMap.set(cid, {
          contact_id: cid,
          contact_name: name,
          last_message: msg.message,
          last_activity: msg.created_at,
          message_count: 1,
          has_inbound: msg.direction === 'inbound',
        });
      } else {
        const group = groupMap.get(cid)!;
        group.message_count += 1;
        if (new Date(msg.created_at) > new Date(group.last_activity)) {
          group.last_message = msg.message;
          group.last_activity = msg.created_at;
        }
        if (msg.direction === 'inbound') group.has_inbound = true;
      }
    }

    return Array.from(groupMap.values())
      .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime())
      .slice(0, 15);
  }, [recentMessages]);

  // Fetch AI quality metrics
  const { data: qualityMetrics, isLoading: qualityLoading } = useQuery({
    queryKey: ['ai-quality-metrics', selectedBusiness?.id],
    queryFn: async (): Promise<QualityMetrics> => {
      // Try to fetch from ai_response_logs table
      const { data: logs, error } = await supabase
        .from('ai_response_logs')
        .select('id, confidence_score, patterns_flagged, required_review, reviewed_at, review_rating, created_at')
        .eq('business_id', selectedBusiness?.id)
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error || !logs || logs.length === 0) {
        return {
          passRate: 0,
          avgRevisions: 0,
          totalResponses: 0,
          reviewedCount: 0,
          flaggedCount: 0,
          failurePatterns: [],
        };
      }

      // Calculate metrics from real data
      const totalResponses = logs.length;
      const reviewedLogs = logs.filter(l => l.reviewed_at !== null);
      const reviewedCount = reviewedLogs.length;
      const flaggedCount = logs.filter(l => l.required_review).length;
      
      // Pass rate = responses that passed on first try (high confidence, not flagged)
      const passedFirst = logs.filter(l => 
        (l.confidence_score && l.confidence_score >= 0.8) && !l.required_review
      ).length;
      const passRate = totalResponses > 0 ? (passedFirst / totalResponses) * 100 : 0;
      
      // Average revisions (based on review cycles)
      const avgRevisions = flaggedCount > 0 ? 1 + (flaggedCount / totalResponses) : 1.0;
      
      // Count failure patterns
      const patternCounts: Record<string, number> = {};
      logs.forEach(log => {
        if (log.patterns_flagged && Array.isArray(log.patterns_flagged)) {
          log.patterns_flagged.forEach((pattern: string) => {
            patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
          });
        }
      });
      
      const failurePatterns = Object.entries(patternCounts)
        .map(([pattern, count]) => ({ pattern, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        passRate: Math.round(passRate * 10) / 10,
        avgRevisions: Math.round(avgRevisions * 10) / 10,
        totalResponses,
        reviewedCount,
        flaggedCount,
        failurePatterns: failurePatterns.length > 0 ? failurePatterns : [
          { pattern: 'No patterns detected yet', count: 0 },
        ],
      };
    },
    enabled: !!selectedBusiness?.id,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch communications health metrics (SMS counts, automation success, follow-ups)
  const { data: healthMetrics, isLoading: healthLoading } = useQuery({
    queryKey: ['communications-health-metrics', selectedBusiness?.id],
    queryFn: async (): Promise<CommunicationsHealthMetrics> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      const weekAgoISO = weekAgo.toISOString();

      // Parallel queries for better performance
      const [smsResult, automationResult, followUpResult] = await Promise.all([
        // SMS counts
        supabase
          .from('sms_messages')
          .select('id, direction, created_at')
          .gte('created_at', weekAgoISO),
        
        // Automation logs (last 30 days for success rate)
        supabase
          .from('automation_logs')
          .select('id, status, created_at')
          .eq('business_id', selectedBusiness?.id)
          .gte('created_at', weekAgoISO),
        
        // Follow-up status counts
        supabase
          .from('contact_follow_ups')
          .select('id, status')
          .eq('business_id', selectedBusiness?.id)
      ]);

      // Process SMS data
      const smsMessages = smsResult.data || [];
      const smsSentToday = smsMessages.filter(m => 
        m.direction === 'outbound' && new Date(m.created_at) >= today
      ).length;
      const smsReceivedToday = smsMessages.filter(m => 
        m.direction === 'inbound' && new Date(m.created_at) >= today
      ).length;
      const smsSentWeek = smsMessages.filter(m => m.direction === 'outbound').length;
      const smsReceivedWeek = smsMessages.filter(m => m.direction === 'inbound').length;

      // Process automation data
      const automationLogs = automationResult.data || [];
      const automationSuccessCount = automationLogs.filter(l => l.status === 'success').length;
      const automationFailureCount = automationLogs.filter(l => l.status === 'error' || l.status === 'failed').length;
      const totalAutomations = automationSuccessCount + automationFailureCount;
      const automationSuccessRate = totalAutomations > 0 
        ? Math.round((automationSuccessCount / totalAutomations) * 100 * 10) / 10
        : 100;

      // Process follow-up data
      const followUps = followUpResult.data || [];
      const activeFollowUps = followUps.filter(f => f.status === 'active').length;
      const pausedFollowUps = followUps.filter(f => f.status === 'paused').length;
      const completedFollowUps = followUps.filter(f => f.status === 'completed').length;
      const respondedFollowUps = followUps.filter(f => f.status === 'responded').length;

      return {
        smsSentToday,
        smsReceivedToday,
        smsSentWeek,
        smsReceivedWeek,
        automationSuccessRate,
        automationSuccessCount,
        automationFailureCount,
        activeFollowUps,
        pausedFollowUps,
        completedFollowUps,
        respondedFollowUps
      };
    },
    enabled: !!selectedBusiness?.id,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch recent flagged messages for review
  const { data: recentFlagged = [], isLoading: flaggedLoading } = useQuery({
    queryKey: ['recent-flagged', selectedBusiness?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_response_logs')
        .select('id, input_message, response_text, patterns_flagged, created_at, review_rating, input_channel')
        .eq('business_id', selectedBusiness?.id)
        .eq('required_review', true)
        .is('reviewed_at', null)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        return [] as AIResponseLog[];
      }
      
      return (data || []) as AIResponseLog[];
    },
    enabled: !!selectedBusiness?.id,
    refetchInterval: 30000,
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

  // Toggle inbox thread expansion
  const toggleInboxThread = (threadId: string) => {
    setExpandedInboxThreads(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
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

  const { data: websiteLeads = [], isLoading: websiteLeadsLoading } = useQuery({
    queryKey: ['website-leads', selectedBusiness?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sparkwave_contact_submissions')
        .select('*')
        .eq('business_id', selectedBusiness!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBusiness?.id,
  });

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
            <Dialog open={isNewCampaignOpen} onOpenChange={(open) => { setIsNewCampaignOpen(open); if (!open) resetCampaignForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  
                  {/* Audience Selector */}
                  <div className="space-y-3 pt-2 border-t">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Target Audience
                    </Label>
                    <RadioGroup
                      value={audienceType}
                      onValueChange={(value) => setAudienceType(value as AudienceType)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="audience-all" />
                        <Label htmlFor="audience-all" className="font-normal cursor-pointer">
                          All contacts ({allContacts.length})
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="by_tag" id="audience-tag" />
                        <Label htmlFor="audience-tag" className="font-normal cursor-pointer">
                          By tag
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="by_status" id="audience-status" />
                        <Label htmlFor="audience-status" className="font-normal cursor-pointer">
                          By status
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="by_source" id="audience-source" />
                        <Label htmlFor="audience-source" className="font-normal cursor-pointer">
                          By source
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="manual" id="audience-manual" />
                        <Label htmlFor="audience-manual" className="font-normal cursor-pointer">
                          Select manually
                        </Label>
                      </div>
                    </RadioGroup>

                    {/* Tag Selection */}
                    {audienceType === 'by_tag' && (
                      <div className="space-y-2 pl-6">
                        <Label className="text-sm text-muted-foreground">Select tags:</Label>
                        {availableTags.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No tags available</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {availableTags.map(tag => (
                              <Badge
                                key={tag.id}
                                variant={selectedTags.includes(tag.slug) ? "default" : "outline"}
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                style={selectedTags.includes(tag.slug) && tag.color ? { backgroundColor: tag.color } : undefined}
                                onClick={() => {
                                  setSelectedTags(prev =>
                                    prev.includes(tag.slug)
                                      ? prev.filter(t => t !== tag.slug)
                                      : [...prev, tag.slug]
                                  );
                                }}
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status Selection */}
                    {audienceType === 'by_status' && (
                      <div className="space-y-2 pl-6">
                        <Label className="text-sm text-muted-foreground">Select statuses:</Label>
                        <div className="space-y-2">
                          {STATUS_OPTIONS.map(status => (
                            <div key={status.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`status-${status.value}`}
                                checked={selectedStatuses.includes(status.value)}
                                onCheckedChange={(checked) => {
                                  setSelectedStatuses(prev =>
                                    checked
                                      ? [...prev, status.value]
                                      : prev.filter(s => s !== status.value)
                                  );
                                }}
                              />
                              <Label htmlFor={`status-${status.value}`} className="font-normal cursor-pointer">
                                {status.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Source Selection */}
                    {audienceType === 'by_source' && (
                      <div className="space-y-2 pl-6">
                        <Label className="text-sm text-muted-foreground">Select sources:</Label>
                        <div className="space-y-2">
                          {SOURCE_OPTIONS.map(source => (
                            <div key={source.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`source-${source.value}`}
                                checked={selectedSources.includes(source.value)}
                                onCheckedChange={(checked) => {
                                  setSelectedSources(prev =>
                                    checked
                                      ? [...prev, source.value]
                                      : prev.filter(s => s !== source.value)
                                  );
                                }}
                              />
                              <Label htmlFor={`source-${source.value}`} className="font-normal cursor-pointer">
                                {source.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Manual Contact Selection */}
                    {audienceType === 'manual' && (
                      <div className="space-y-2 pl-6">
                        <Label className="text-sm text-muted-foreground">Select contacts:</Label>
                        {contactsLoading ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading contacts...
                          </div>
                        ) : (
                          <ScrollArea className="h-48 border rounded-md p-2">
                            <div className="space-y-2">
                              {allContacts.map(contact => (
                                <div key={contact.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`contact-${contact.id}`}
                                    checked={selectedContactIds.includes(contact.id)}
                                    onCheckedChange={(checked) => {
                                      setSelectedContactIds(prev =>
                                        checked
                                          ? [...prev, contact.id]
                                          : prev.filter(id => id !== contact.id)
                                      );
                                    }}
                                  />
                                  <Label htmlFor={`contact-${contact.id}`} className="font-normal cursor-pointer text-sm">
                                    {contact.first_name || contact.last_name
                                      ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                                      : contact.email || contact.phone || 'Unknown'}
                                    {contact.status && (
                                      <span className="text-muted-foreground ml-2">({contact.status})</span>
                                    )}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </div>
                    )}

                    {/* Recipient Count Preview */}
                    <div className="flex items-center gap-2 pt-2 text-sm">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Recipients:</span>
                      <Badge variant={recipientCount > 0 ? "default" : "secondary"}>
                        {contactsLoading ? '...' : recipientCount}
                      </Badge>
                      {recipientCount === 0 && audienceType !== 'all' && (
                        <span className="text-amber-600 text-xs">Select at least one filter option</span>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsNewCampaignOpen(false); resetCampaignForm(); }}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateCampaign} 
                    disabled={!newCampaign.name || !newCampaign.message_template || recipientCount === 0 || isCreatingCampaign}
                  >
                    {isCreatingCampaign ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      `Create Campaign (${recipientCount})`
                    )}
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
            <TabsTrigger value="website-leads">Website Leads</TabsTrigger>
            <TabsTrigger value="quality">
              <Sparkles className="h-4 w-4 mr-1" />
              Quality
            </TabsTrigger>
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
                    <HelpTooltip 
                      text="Campaigns are automated outreach sequences. Track sent messages, replies, and engagement rates in real-time."
                      docsLink="/docs/campaigns"
                      size="sm"
                    />
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

              {/* Recent Activity — grouped by contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Recent Conversations
                  </CardTitle>
                  <CardDescription>Contacts with recent SMS activity — click to view thread</CardDescription>
                </CardHeader>
                <CardContent>
                  {messagesLoading ? (
                    <p className="text-center py-4">Loading...</p>
                  ) : contactGroups.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No recent SMS activity</p>
                  ) : (
                    <div className="space-y-1 max-h-80 overflow-y-auto">
                      {contactGroups.map(group => (
                        <div
                          key={group.contact_id}
                          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-100"
                          onClick={() => openThread(group.contact_id)}
                        >
                          {/* Avatar */}
                          <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold ${group.has_inbound ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                            {group.contact_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-slate-900 truncate">{group.contact_name}</p>
                              <span className="text-xs text-slate-400 shrink-0">
                                {formatDistanceToNow(new Date(group.last_activity), { addSuffix: true })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <p className="text-xs text-slate-500 truncate">{group.last_message}</p>
                              <span className="text-xs text-slate-400 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                {group.message_count}
                              </span>
                            </div>
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
          <TabsContent value="email" className="space-y-6">
            {/* Email Sub-Tabs */}
            <div className="flex items-center gap-4 border-b pb-2">
              <Button 
                variant={emailSubTab === 'campaigns' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setEmailSubTab('campaigns')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Single Campaigns
              </Button>
              <Button 
                variant={emailSubTab === 'sequences' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setEmailSubTab('sequences')}
              >
                <Clock className="h-4 w-4 mr-2" />
                Email Sequences
              </Button>
              <Button
                variant={emailSubTab === 'drip' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setEmailSubTab('drip')}
              >
                <Send className="h-4 w-4 mr-2" />
                Drip Queue
              </Button>
            </div>

            {/* Sequence Builder View */}
            {emailSubTab === 'sequences' && isSequenceBuilderOpen && selectedBusiness && (
              <EmailCampaignSequenceBuilder
                businessId={selectedBusiness.id}
                sequenceId={editingSequenceId || undefined}
                onSave={(id) => {
                  setIsSequenceBuilderOpen(false);
                  setEditingSequenceId(null);
                }}
                onCancel={() => {
                  setIsSequenceBuilderOpen(false);
                  setEditingSequenceId(null);
                }}
              />
            )}

            {/* Sequences List View */}
            {emailSubTab === 'sequences' && !isSequenceBuilderOpen && selectedBusiness && (
              <EmailSequencesList
                businessId={selectedBusiness.id}
                onCreateNew={() => {
                  setEditingSequenceId(null);
                  setIsSequenceBuilderOpen(true);
                }}
                onEdit={(id) => {
                  setEditingSequenceId(id);
                  setIsSequenceBuilderOpen(true);
                }}
              />
            )}

            {/* Drip Queue View */}
            {emailSubTab === 'drip' && selectedBusiness && (
              <DripQueueTab businessId={selectedBusiness.id} />
            )}

            {/* Single Campaigns View */}
            {emailSubTab === 'campaigns' && (
              <>
            {/* Email Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <span className="text-2xl font-bold">{emailStats.totalCampaigns}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Emails Sent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold">{emailStats.totalSent}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Opened</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-purple-500" />
                    <span className="text-2xl font-bold">{emailStats.totalOpened}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Open Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    <span className="text-2xl font-bold">{emailStats.avgOpenRate}%</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Click Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-orange-500" />
                    <span className="text-2xl font-bold">{emailStats.avgClickRate}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Email Campaigns List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Campaigns
                  </CardTitle>
                  <CardDescription>
                    Create and manage email campaigns
                  </CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <Select value={agentFilter} onValueChange={(v) => setAgentFilter(v as 'all' | 'Rico' | 'Iris')}>
                    <SelectTrigger className="w-[120px] h-8 text-sm">
                      <SelectValue placeholder="All agents" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      <SelectItem value="Rico">Rico</SelectItem>
                      <SelectItem value="Iris">Iris</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => refetchEmailCampaigns()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Dialog open={isEmailCampaignOpen} onOpenChange={setIsEmailCampaignOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        New Email Campaign
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create Email Campaign</DialogTitle>
                        <DialogDescription>
                          Set up a new email campaign to reach your contacts
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="email-name">Campaign Name</Label>
                          <Input
                            id="email-name"
                            placeholder="e.g., February Newsletter"
                            value={newEmailCampaign.name}
                            onChange={(e) => setNewEmailCampaign(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email-subject">Subject Line</Label>
                          <Input
                            id="email-subject"
                            placeholder="e.g., Check out our latest updates!"
                            value={newEmailCampaign.subject}
                            onChange={(e) => setNewEmailCampaign(prev => ({ ...prev, subject: e.target.value }))}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="from-name">From Name</Label>
                            <Input
                              id="from-name"
                              placeholder={defaultSender?.name || 'Your Business'}
                              value={newEmailCampaign.from_name}
                              onChange={(e) => setNewEmailCampaign(prev => ({ ...prev, from_name: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="from-email">From Email</Label>
                            <Select
                              value={newEmailCampaign.from_email || defaultSender?.email || ''}
                              onValueChange={(value) => setNewEmailCampaign(prev => ({ ...prev, from_email: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select verified sender" />
                              </SelectTrigger>
                              <SelectContent>
                                {verifiedSenders.length === 0 ? (
                                  <SelectItem value="noreply@sparkwave-ai.com">noreply@sparkwave-ai.com</SelectItem>
                                ) : (
                                  verifiedSenders.map((sender) => (
                                    <SelectItem key={sender.id} value={sender.email}>
                                      {sender.email} {sender.is_default && '(default)'}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email-body">Email Content (HTML)</Label>
                          <Textarea
                            id="email-body"
                            placeholder="<html><body><h1>Hello {{first_name}}!</h1><p>Your content here...</p></body></html>"
                            value={newEmailCampaign.content_html}
                            onChange={(e) => setNewEmailCampaign(prev => ({ ...prev, content_html: e.target.value }))}
                            rows={8}
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Use {"{{first_name}}"}, {"{{last_name}}"}, {"{{email}}"} for personalization
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="target-type">Audience</Label>
                          <Select
                            value={newEmailCampaign.target_type}
                            onValueChange={(value) => setNewEmailCampaign(prev => ({ ...prev, target_type: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select audience" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All contacts with email</SelectItem>
                              <SelectItem value="tags">Contacts with specific tags</SelectItem>
                              <SelectItem value="segment">Custom segment</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Schedule</Label>
                          <Select
                            value={newEmailCampaign.schedule_type}
                            onValueChange={(value) => setNewEmailCampaign(prev => ({ ...prev, schedule_type: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="When to send" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="now">Save as draft</SelectItem>
                              <SelectItem value="scheduled">Schedule for later</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {newEmailCampaign.schedule_type === 'scheduled' && (
                          <div className="space-y-2">
                            <Label htmlFor="scheduled-for">Send Date & Time</Label>
                            <Input
                              id="scheduled-for"
                              type="datetime-local"
                              value={newEmailCampaign.scheduled_for}
                              onChange={(e) => setNewEmailCampaign(prev => ({ ...prev, scheduled_for: e.target.value }))}
                            />
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEmailCampaignOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateEmailCampaign} 
                          disabled={createEmailCampaignMutation.isPending || !newEmailCampaign.name || !newEmailCampaign.subject || !newEmailCampaign.content_html}
                        >
                          {createEmailCampaignMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create Campaign'
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {emailCampaignsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading campaigns...</span>
                  </div>
                ) : emailCampaigns.length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <Mail className="h-16 w-16 mx-auto text-muted-foreground/50" />
                    <div>
                      <h3 className="font-semibold text-lg">No email campaigns yet</h3>
                      <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                        Create your first email campaign to start reaching your contacts
                      </p>
                    </div>
                    <Button onClick={() => setIsEmailCampaignOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Campaign
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Sent</TableHead>
                        <TableHead className="text-right">Delivered</TableHead>
                        <TableHead className="text-right">Opened</TableHead>
                        <TableHead className="text-right">Open Rate</TableHead>
                        <TableHead className="text-right">Clicked</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailCampaigns.map(campaign => {
                        const openRate = campaign.total_sent && campaign.total_sent > 0 
                          ? ((campaign.total_opened || 0) / campaign.total_sent * 100).toFixed(1) 
                          : '0';
                        const clickRate = campaign.total_sent && campaign.total_sent > 0 
                          ? ((campaign.total_clicked || 0) / campaign.total_sent * 100).toFixed(1) 
                          : '0';
                        const agentName = campaign.agent_name || 'Rico';
                        return (
                          <TableRow key={campaign.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell className="font-medium">{campaign.name}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{campaign.subject}</TableCell>
                            <TableCell>
                              <Badge variant={agentName === 'Iris' ? 'default' : 'secondary'} className={agentName === 'Iris' ? 'bg-purple-500 text-white' : ''}>
                                {agentName}
                              </Badge>
                            </TableCell>
                            <TableCell>{getEmailStatusBadge(campaign.status)}</TableCell>
                            <TableCell className="text-right">{campaign.total_sent || 0}</TableCell>
                            <TableCell className="text-right">{campaign.total_delivered || 0}</TableCell>
                            <TableCell className="text-right">{campaign.total_opened || 0}</TableCell>
                            <TableCell className="text-right">
                              <span className={Number(openRate) > 20 ? 'text-green-600 font-medium' : ''}>
                                {openRate}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{campaign.total_clicked || 0}</TableCell>
                            <TableCell>
                              {campaign.created_at 
                                ? format(new Date(campaign.created_at), 'MMM d, yyyy')
                                : '-'
                              }
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
              </>
            )}
          </TabsContent>

          {/* Inbox Tab */}
          <TabsContent value="inbox">
            <Card>
              <CardHeader>
                <CardTitle>Communications Inbox</CardTitle>
                <CardDescription>All SMS and email communications</CardDescription>
              </CardHeader>
              <CardContent>
                {messagesLoading && emailsLoading && inboundEmailsLoading ? (
                  <p className="text-center py-8">Loading communications...</p>
                ) : mergedActivity.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No communications yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mergedActivity.map(item => {
                        const isExpanded = item.thread_id && expandedInboxThreads.has(item.thread_id);
                        const threadMessages = item.thread_id ? recentMessages.find(t => t.thread_id === item.thread_id)?.messages || [] : [];
                        
                        return (
                          <>
                            <TableRow key={`${item.type}-${item.id}`}>
                              <TableCell>
                                <Badge variant="outline" className="gap-1">
                                  {item.type === 'sms' ? (
                                    <>
                                      <MessageSquare className="h-3 w-3" />
                                      SMS
                                    </>
                                  ) : (
                                    <>
                                      <Mail className="h-3 w-3" />
                                      Email
                                    </>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {item.type === 'sms' && item.contact_name ? (
                                  <span className="font-medium">{item.contact_name}</span>
                                ) : item.type === 'email' ? (
                                  <span className="text-muted-foreground text-xs">{item.to || item.from}</span>
                                ) : null}
                              </TableCell>
                              <TableCell>
                                <Badge variant={item.direction === 'inbound' ? 'default' : 'secondary'}>
                                  {item.direction === 'inbound' ? '📥 In' : '📤 Out'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {item.ai_response ? (
                                  <Badge variant="default" className="bg-purple-500 text-white">AI</Badge>
                                ) : item.type === 'sms' && item.direction === 'outbound' ? (
                                  <Badge variant="outline">Manual</Badge>
                                ) : null}
                              </TableCell>
                              <TableCell className="max-w-md">
                                {item.type === 'sms' ? (
                                  <span className="truncate block">{item.message}</span>
                                ) : (
                                  <div>
                                    <span className="font-medium truncate block">{item.subject}</span>
                                    <span className="text-xs text-muted-foreground">To: {item.to}</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {item.type === 'sms' ? (
                                  item.ai_response ? (
                                    <Badge variant="outline">AI Response</Badge>
                                  ) : item.direction === 'outbound' ? (
                                    <Badge variant="outline">Manual</Badge>
                                  ) : null
                                ) : (
                                  <div className="flex gap-1 flex-wrap">
                                    <Badge 
                                      variant="outline" 
                                      className={
                                        item.clicked_at ? 'bg-emerald-50 text-emerald-700' :
                                        item.opened_at ? 'bg-purple-50 text-purple-700' :
                                        item.status === 'delivered' ? 'bg-blue-50 text-blue-700' :
                                        item.status === 'sent' ? 'bg-green-50 text-green-700' :
                                        ''
                                      }
                                    >
                                      {item.clicked_at ? 'Clicked' :
                                       item.opened_at ? 'Opened' :
                                       item.status === 'delivered' ? 'Delivered' :
                                       item.status === 'sent' ? 'Sent' :
                                       item.status || 'Pending'}
                                    </Badge>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {item.type === 'sms' && item.thread_id ? (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => toggleInboxThread(item.thread_id!)}
                                    className="h-6 px-2 text-xs"
                                  >
                                    {isExpanded ? 'Hide' : `View (${threadMessages.length})`}
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground">
                                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                            {isExpanded && threadMessages.length > 0 && (
                              <TableRow key={`${item.type}-${item.id}-expanded`}>
                                <TableCell colSpan={7} className="bg-slate-50 p-3">
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {threadMessages.map((msg: any) => (
                                      <div 
                                        key={msg.id}
                                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                                      >
                                        <div className={`max-w-[70%] p-2 rounded-lg text-xs ${
                                          msg.direction === 'outbound' 
                                            ? 'bg-blue-100 text-blue-900' 
                                            : 'bg-gray-200 text-gray-900'
                                        }`}>
                                          <div className="flex items-center gap-1 mb-1">
                                            <span className="font-medium text-[10px]">
                                              {msg.direction === 'outbound' ? (msg.ai_response ? 'AI' : 'You') : item.contact_name}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                            </span>
                                          </div>
                                          <p className="text-xs">{msg.message}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Website Leads Tab */}
          <TabsContent value="website-leads" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Website Contact Form Submissions</CardTitle>
                <CardDescription>Leads from sparkwave-ai.com contact form</CardDescription>
              </CardHeader>
              <CardContent>
                {websiteLeadsLoading ? (
                  <p className="text-center py-8">Loading leads...</p>
                ) : websiteLeads.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No website submissions yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Interest</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {websiteLeads.map((lead: any) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">{lead.name}</TableCell>
                          <TableCell>
                            <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">{lead.email}</a>
                          </TableCell>
                          <TableCell>{lead.company || '-'}</TableCell>
                          <TableCell>{lead.interest || '-'}</TableCell>
                          <TableCell className="max-w-xs truncate">{lead.message}</TableCell>
                          <TableCell>
                            <Badge variant={lead.status === 'new' ? 'default' : 'secondary'}>
                              {lead.status || 'new'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(lead.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quality Metrics Tab */}
          <TabsContent value="quality" className="space-y-6">
            {/* SMS Volume Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                SMS Volume
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Sent Today
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Send className="h-5 w-5 text-green-500" />
                      <span className="text-2xl font-bold">
                        {healthLoading ? '...' : healthMetrics?.smsSentToday || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Received Today
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Reply className="h-5 w-5 text-blue-500" />
                      <span className="text-2xl font-bold">
                        {healthLoading ? '...' : healthMetrics?.smsReceivedToday || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Sent This Week
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Send className="h-5 w-5 text-emerald-500" />
                      <span className="text-2xl font-bold">
                        {healthLoading ? '...' : healthMetrics?.smsSentWeek || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Received This Week
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Reply className="h-5 w-5 text-indigo-500" />
                      <span className="text-2xl font-bold">
                        {healthLoading ? '...' : healthMetrics?.smsReceivedWeek || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Automation & Follow-ups Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Automation Success Rate */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Automation Success Rate
                  </CardTitle>
                  <CardDescription>Last 7 days performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-4xl font-bold text-green-600">
                        {healthLoading ? '...' : `${healthMetrics?.automationSuccessRate || 100}%`}
                      </span>
                      <div className="text-right text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          {healthMetrics?.automationSuccessCount || 0} success
                        </div>
                        <div className="flex items-center gap-1">
                          <XCircle className="h-4 w-4 text-red-500" />
                          {healthMetrics?.automationFailureCount || 0} failed
                        </div>
                      </div>
                    </div>
                    <Progress 
                      value={healthMetrics?.automationSuccessRate || 100} 
                      className="h-3"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Follow-up Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    Follow-up Sequences
                  </CardTitle>
                  <CardDescription>Current enrollment status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-500">Active</Badge>
                        <span className="text-sm text-muted-foreground">In progress</span>
                      </div>
                      <span className="text-2xl font-bold">
                        {healthLoading ? '...' : healthMetrics?.activeFollowUps || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-500">Paused</Badge>
                        <span className="text-sm text-muted-foreground">On hold</span>
                      </div>
                      <span className="text-2xl font-bold">
                        {healthLoading ? '...' : healthMetrics?.pausedFollowUps || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500">Responded</Badge>
                        <span className="text-sm text-muted-foreground">Got a reply</span>
                      </div>
                      <span className="text-2xl font-bold">
                        {healthLoading ? '...' : healthMetrics?.respondedFollowUps || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Completed</Badge>
                        <span className="text-sm text-muted-foreground">Finished sequence</span>
                      </div>
                      <span className="text-2xl font-bold text-muted-foreground">
                        {healthLoading ? '...' : healthMetrics?.completedFollowUps || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Response Quality Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                AI Response Quality
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Pass Rate Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      First-Pass Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-green-600">
                          {qualityLoading ? '...' : `${qualityMetrics?.passRate || 0}%`}
                        </span>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                      <Progress 
                        value={qualityMetrics?.passRate || 0} 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        AI responses passing quality check on first try
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Average Revisions Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Avg Revisions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">
                          {qualityLoading ? '...' : qualityMetrics?.avgRevisions || 0}
                        </span>
                        <BarChart3 className="h-5 w-5 text-blue-500" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Average revisions needed per flagged response
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Total Responses Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Total AI Responses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">
                          {qualityLoading ? '...' : qualityMetrics?.totalResponses || 0}
                        </span>
                        <Bot className="h-5 w-5 text-purple-500" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {qualityMetrics?.reviewedCount || 0} reviewed
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Flagged for Review Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Needs Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-2xl font-bold ${(qualityMetrics?.flaggedCount || 0) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {qualityLoading ? '...' : qualityMetrics?.flaggedCount || 0}
                        </span>
                        <Eye className="h-5 w-5 text-amber-500" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Responses flagged for human review
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Bottom Section: Failure Patterns + Recent Flagged */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Failure Patterns */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Top Failure Patterns
                  </CardTitle>
                  <CardDescription>
                    Most common issues flagged in AI responses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {qualityLoading ? (
                    <p className="text-center py-4">Loading...</p>
                  ) : !qualityMetrics?.failurePatterns?.length ? (
                    <p className="text-muted-foreground text-center py-4">No patterns detected yet</p>
                  ) : (
                    <div className="space-y-3">
                      {qualityMetrics.failurePatterns.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {item.pattern.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={Math.min((item.count / (qualityMetrics.totalResponses || 1)) * 100 * 10, 100)} 
                              className="w-20 h-2"
                            />
                            <span className="text-sm font-medium w-8 text-right">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Flagged Messages */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-blue-500" />
                    Recent Flagged Messages
                  </CardTitle>
                  <CardDescription>
                    Last 5 AI responses needing human review
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {flaggedLoading ? (
                    <p className="text-center py-4">Loading...</p>
                  ) : recentFlagged.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                      <p className="text-muted-foreground">All clear! No messages need review.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentFlagged.map(msg => (
                        <div key={msg.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-muted-foreground mb-1">User asked:</p>
                              <p className="text-sm truncate">{msg.input_message}</p>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {msg.input_channel || 'sms'}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">AI responded:</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">{msg.response_text}</p>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex gap-1 flex-wrap">
                              {msg.patterns_flagged?.map((pattern, idx) => (
                                <Badge key={idx} variant="destructive" className="text-xs">
                                  {pattern.replace(/_/g, ' ')}
                                </Badge>
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

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
