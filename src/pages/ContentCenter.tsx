import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, FileText, Send, Calendar, TrendingUp, RefreshCw, Edit, Trash2, Rocket, CheckCircle, Copy, ImageIcon, Settings, Package } from "lucide-react";
import { AgentPromptEditor } from '@/components/AgentPromptEditor';
import { StagingContent } from '@/components/StagingContent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import SimpleTimeInput from "@/components/SimpleTimeInput";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DashboardHeader } from "@/components/DashboardHeader";
import { supabase } from "@/integrations/supabase/client";
import { ContentReviewDialog } from "@/components/ContentReviewDialog";
import { ContentLibrary } from "@/components/ContentLibrary";
import { PostedContentLibrary } from "@/components/PostedContentLibrary";
import { formatToEasternDateTime } from "@/lib/dateUtils";
import { useBusinessContext } from "@/contexts/BusinessContext";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const ContentCenter = () => {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const [selectedPlatform, setSelectedPlatform] = useState("twitter");
  const [selectedContentType, setSelectedContentType] = useState("medium");
  const [topic, setTopic] = useState("");
  const [quantity, setQuantity] = useState<number | ''>(10);
  const [generatedContent, setGeneratedContent] = useState<Array<{content: string, hashtags?: string[]}>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewingContent, setReviewingContent] = useState<Array<{content: string, hashtags?: string[]}>>([]);
  const [schedulingTweet, setSchedulingTweet] = useState<{tweet: string, index: number} | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [activeTab, setActiveTab] = useState('preview');
  const [scheduledContent, setScheduledContent] = useState<any[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [editingTweet, setEditingTweet] = useState<{id: string, content: string, scheduled_for: string} | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [postingTweet, setPostingTweet] = useState<number | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const businesses = [
    { id: '456dc53b-d9d9-41b0-bc33-4f4c4a791eff', slug: 'fight-flow-academy', name: 'Fight Flow Academy' },
    { id: '5a9bbfcf-fae5-4063-9780-bcbe366bae88', slug: 'sparkwave-ai', name: 'Sparkwave AI' },
    { id: '18d0dbb1-a82d-4477-a9f8-816a1fa2ee08', slug: 'persona-ai', name: 'PersonaAI' },
    { id: '350b8fcb-9bfe-4b53-9548-c6ffdb1d3cb5', slug: 'charx-world', name: 'CharX World' }
  ];

  const platforms = [
    {
      id: 'twitter',
      name: 'Twitter/X',
      icon: '𝕏',
      contentTypes: [
        { value: 'short', label: 'Short Tweet (80-120 chars)' },
        { value: 'medium', label: 'Standard Tweet (140-200 chars)' },
        { value: 'long', label: 'Long Tweet (220-280 chars)' },
        { value: 'thread', label: 'Thread (multiple tweets)' }
      ],
      quantityLabel: 'Number of Tweets',
      maxQuantity: 10
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: '📷',
      contentTypes: [
        { value: 'caption', label: 'Post Caption (with hashtags)' },
        { value: 'story', label: 'Story Text (short & punchy)' },
        { value: 'reel', label: 'Reel Caption (hook + CTA)' },
        { value: 'carousel', label: 'Carousel Post (multiple slides)' }
      ],
      quantityLabel: 'Number of Posts',
      maxQuantity: 7
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: '🎵',
      contentTypes: [
        { value: 'caption', label: 'Video Caption (short & catchy)' },
        { value: 'script', label: 'Video Script (with hooks)' },
        { value: 'hooks', label: 'Scroll-Stopping Hooks' }
      ],
      quantityLabel: 'Number of Captions/Scripts',
      maxQuantity: 10
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: '💼',
      contentTypes: [
        { value: 'post', label: 'Standard Post (professional)' },
        { value: 'long', label: 'Long-Form Post (thought leadership)' },
        { value: 'article', label: 'Article (1000+ words)' },
        { value: 'carousel', label: 'Carousel Post' }
      ],
      quantityLabel: 'Number of Posts',
      maxQuantity: 5
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: '👥',
      contentTypes: [
        { value: 'post', label: 'Standard Post' },
        { value: 'story', label: 'Story Text' },
        { value: 'community', label: 'Community Post (engaging)' }
      ],
      quantityLabel: 'Number of Posts',
      maxQuantity: 7
    },
    {
      id: 'reddit',
      name: 'Reddit',
      icon: '🤖',
      contentTypes: [
        { value: 'post', label: 'Post (title + body)' },
        { value: 'comment', label: 'Comment Response' }
      ],
      quantityLabel: 'Number of Posts',
      maxQuantity: 5
    },
    {
      id: 'nextdoor',
      name: 'Nextdoor',
      icon: '🏘️',
      contentTypes: [
        { value: 'post', label: 'Community Post' },
        { value: 'announcement', label: 'Local Announcement' },
        { value: 'recommendation', label: 'Recommendation Request' }
      ],
      quantityLabel: 'Number of Posts',
      maxQuantity: 3
    },
    {
      id: 'email',
      name: 'Email',
      icon: '📧',
      contentTypes: [
        { value: 'newsletter', label: 'Newsletter' },
        { value: 'promotional', label: 'Promotional Email' },
        { value: 'welcome', label: 'Welcome Email' },
        { value: 'nurture', label: 'Nurture Sequence Email' }
      ],
      quantityLabel: 'Number of Emails',
      maxQuantity: 5
    },
    {
      id: 'blog',
      name: 'Blog',
      icon: '📝',
      contentTypes: [
        { value: 'short', label: 'Short Article (500-800 words)' },
        { value: 'medium', label: 'Medium Article (1000-1500 words)' },
        { value: 'long', label: 'Long Article (2000+ words)' },
        { value: 'listicle', label: 'Listicle' },
        { value: 'howto', label: 'How-To Guide' }
      ],
      quantityLabel: 'Number of Articles',
      maxQuantity: 3
    }
  ];


  const handleGenerateContent = async () => {
    if (!selectedBusiness || !selectedContentType || !topic.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-agent-content', {
        body: {
          businessId: selectedBusiness.id,
          platform: selectedPlatform,
          contentType: selectedContentType,
          quantity: quantity || 1,
          topic: topic || undefined,
          keywords: [],
          tone: undefined
        }
      });

      if (error) {
        toast({
          title: "Generation Failed",
          description: "Failed to generate content",
          variant: "destructive"
        });
        return;
      }

      if (data && data.success) {
        // Support both old and new format
        const contentItems = data.content || data.tweets.map((t: string) => ({ content: t, hashtags: [] }));
        setGeneratedContent(contentItems);
        setReviewingContent(contentItems);
        setReviewMode(true);
        toast({
          title: "Content Generated",
          description: `Generated ${contentItems.length} tweet(s) - Review to approve or reject`,
        });
      } else {
        toast({
          title: "Generation Failed",
          description: data?.error || "Content generation failed",
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error("Content generation error:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };


  const handleScheduleTweet = async () => {
    if (!schedulingTweet || !scheduleDate || !scheduleTime) {
      toast({
        title: "Missing Information",
        description: "Please select date and time",
        variant: "destructive"
      });
      return;
    }

    if (!TIME_RE.test(scheduleTime)) {
      toast({
        title: "Invalid Time",
        description: "Enter a valid time (HH:MM).",
        variant: "destructive",
      });
      return;
    }

    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
    
    try {
      // Save to existing scheduled_content table
      const { error } = await supabase
        .from('scheduled_content')
        .insert({
          business_id: selectedBusiness.id,
          content: schedulingTweet.tweet,
          content_type: selectedContentType,
          topic: topic,
          platform: 'twitter',
          scheduled_for: scheduledDateTime.toISOString(),
          status: 'scheduled'
        });

      if (error) throw error;

      toast({
        title: "Tweet Scheduled",
        description: `Tweet scheduled for ${scheduledDateTime.toLocaleString()}`
      });

      setSchedulingTweet(null);
      setScheduleDate('');
      setScheduleTime('');
      
    } catch (error) {
      console.error("Scheduling error:", error);
      toast({
        title: "Scheduling Failed", 
        description: "Failed to schedule tweet",
        variant: "destructive"
      });
    }
  };

  const loadScheduledContent = async () => {
    setLoadingScheduled(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_content')
        .select('*')
        .eq('status', 'scheduled')
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      setScheduledContent(data || []);
    } catch (error) {
      toast({
        title: "Loading Failed",
        description: "Failed to load scheduled content",
        variant: "destructive"
      });
    } finally {
      setLoadingScheduled(false);
    }
  };

  const handleDeleteScheduledTweet = async (tweetId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_content')
        .delete()
        .eq('id', tweetId);

      if (error) throw error;

      toast({
        title: "Tweet Deleted",
        description: "Scheduled tweet has been removed"
      });

      // Reload scheduled content
      loadScheduledContent();
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete scheduled tweet",
        variant: "destructive"
      });
    }
  };

  const startEditingTweet = (tweet: any) => {
    const scheduledDate = new Date(tweet.scheduled_for);
    setEditingTweet({
      id: tweet.id,
      content: tweet.content,
      scheduled_for: tweet.scheduled_for
    });
    setEditContent(tweet.content);
    setEditDate(scheduledDate.toISOString().split('T')[0]);
    setEditTime(scheduledDate.toTimeString().slice(0, 5));
  };

  const handleUpdateScheduledTweet = async () => {
    if (!editingTweet || !editContent.trim() || !editDate || !editTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    if (!TIME_RE.test(editTime)) {
      toast({
        title: "Invalid Time",
        description: "Enter a valid time (HH:MM).",
        variant: "destructive",
      });
      return;
    }

    const updatedDateTime = new Date(`${editDate}T${editTime}`);

    try {
      const { error } = await supabase
        .from('scheduled_content')
        .update({
          content: editContent,
          scheduled_for: updatedDateTime.toISOString()
        })
        .eq('id', editingTweet.id);

      if (error) throw error;

      toast({
        title: "Tweet Updated",
        description: "Scheduled tweet has been updated"
      });

      setEditingTweet(null);
      setEditContent('');
      setEditDate('');
      setEditTime('');
      loadScheduledContent();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update scheduled tweet",
        variant: "destructive"
      });
    }
  };

  const handlePostNow = async (content: string, index: number) => {
    setPostingTweet(index);

    try {
      const { data, error } = await supabase.functions.invoke('post-tweet', {
        body: { content, businessId: selectedBusiness.id }
      });

      if (error) throw error;

      if (data && data.success) {
        toast({
          title: "Tweet Posted!",
          description: "Your tweet has been posted via GAME"
        });
      } else {
        throw new Error(data?.error || 'Failed to post tweet');
      }
    } catch (error) {
      console.error('Post error:', error);
      toast({
        title: "Post Failed",
        description: error instanceof Error ? error.message : "Failed to post tweet",
        variant: "destructive"
      });
    } finally {
      setPostingTweet(null);
    }
  };

  // Load scheduled content when Schedule tab is opened
  useEffect(() => {
    if (activeTab === 'schedule') {
      loadScheduledContent();
    }
  }, [activeTab]);

  const selectedBusinessConfig = selectedBusiness;
  const currentPlatform = platforms.find(p => p.id === selectedPlatform);
  const availableContentTypes = currentPlatform?.contentTypes || [];

  const EditModal = () => (
    <Dialog open={!!editingTweet} onOpenChange={(open) => { if (!open) setEditingTweet(null); }}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()} onFocusOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Edit Scheduled Tweet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tweet Content</label>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
              className="mt-1"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {editContent.length}/280 characters
            </div>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Time (Eastern)</label>
                <SimpleTimeInput
                  value={editTime}
                  onChange={setEditTime}
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">All times are in Eastern Time (ET)</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={handleUpdateScheduledTweet}>Update Tweet</Button>
            <Button type="button" variant="outline" onClick={() => setEditingTweet(null)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const ScheduleModal = () => (
    <Dialog open={!!schedulingTweet} onOpenChange={(open) => { if (!open) setSchedulingTweet(null); }}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()} onFocusOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Schedule Tweet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tweet Content</label>
            <Textarea value={schedulingTweet?.tweet || ''} readOnly rows={3} className="mt-1" />
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input 
                  type="date" 
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Time (Eastern)</label>
                <SimpleTimeInput
                  value={scheduleTime}
                  onChange={setScheduleTime}
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">All times are in Eastern Time (ET)</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={handleScheduleTweet}>Schedule Tweet</Button>
            <Button type="button" variant="outline" onClick={() => setSchedulingTweet(null)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const ScheduleTabContent = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Scheduled Content</h3>
        <Button onClick={loadScheduledContent} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      {loadingScheduled ? (
        <div className="text-center py-8">Loading scheduled content...</div>
      ) : scheduledContent.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No scheduled content found. Create and schedule some tweets to see them here.
        </div>
      ) : (
        <div className="space-y-3">
          {scheduledContent.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">
                      {businesses.find(b => b.id === item.business_id)?.name || 'Unknown Business'}
                    </Badge>
                    <Badge variant="secondary">{item.platform}</Badge>
                  </div>
                  <p className="text-sm mb-2">{item.content}</p>
                  <div className="text-xs text-muted-foreground">
                    Scheduled: {formatToEasternDateTime(item.scheduled_for)}
                    {item.topic && ` • Topic: ${item.topic}`}
                  </div>
                </div>
                 <div className="flex gap-2 ml-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => startEditingTweet(item)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeleteScheduledTweet(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full">
      <DashboardHeader 
        selectedBusinessId={selectedBusiness?.id}
        onBusinessChange={(id) => {
          const business = businesses.find(b => b.id === id);
          if (business) setSelectedBusiness(business);
        }}
      />
      
      <main className="container mx-auto px-4 md:px-6 py-4 md:py-8 pt-2 md:pt-28 max-w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Content Creation Center
          </h1>
          <p className="text-muted-foreground">
            Generate AI-powered content across all your businesses using GAME SDK
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Content Configuration
                </CardTitle>
                <CardDescription>
                  Set up your content generation parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Platform Selection */}
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={selectedPlatform} onValueChange={(value) => {
                    setSelectedPlatform(value);
                    // Reset content type to first option when platform changes
                    const platform = platforms.find(p => p.id === value);
                    setSelectedContentType(platform?.contentTypes[0].value || 'short');
                    setQuantity(Math.min(quantity || 1, platform?.maxQuantity || 10));
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms.map(platform => (
                        <SelectItem key={platform.id} value={platform.id}>
                          {platform.icon} {platform.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Content Type (filtered by selected platform) */}
                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <Select value={selectedContentType} onValueChange={setSelectedContentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms.find(p => p.id === selectedPlatform)?.contentTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity (with dynamic label) */}
                <div className="space-y-2">
              <Label>{platforms.find(p => p.id === selectedPlatform)?.quantityLabel || 'Number of Posts'} to generate</Label>
              <Input
                type="number"
                min="1"
                max={platforms.find(p => p.id === selectedPlatform)?.maxQuantity || 10}
                value={quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setQuantity(''); // Allow empty during typing
                  } else {
                    const num = parseInt(val, 10);
                    if (!isNaN(num) && num >= 1) {
                      const max = platforms.find(p => p.id === selectedPlatform)?.maxQuantity || 10;
                      setQuantity(Math.min(num, max));
                    }
                  }
                }}
                onBlur={(e) => {
                  if (!e.target.value || parseInt(e.target.value) < 1) {
                    setQuantity(1);
                  }
                }}
              />
                  <p className="text-xs text-muted-foreground">
                    Generate multiple options to review and select
                  </p>
                </div>

                {/* Topic Input */}
                <div className="space-y-2">
                  <Label>Topic</Label>
                  <Input
                    placeholder="Enter content topic..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                {/* Generate Button */}
                <Button 
                  onClick={handleGenerateContent} 
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Content Preview and Management */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              {/* Mobile: Wrapped multi-row tabs */}
              <div className="md:hidden mb-2">
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2">
                  <TabsTrigger value="preview" className="h-9 shrink-0">Preview</TabsTrigger>
                  <TabsTrigger value="library" className="h-9 shrink-0">Library</TabsTrigger>
                  <TabsTrigger value="staging" className="h-9 shrink-0">
                    <Package className="h-4 w-4 mr-2" />
                    Staging
                  </TabsTrigger>
                  <TabsTrigger value="schedule" className="h-9 shrink-0">Schedule</TabsTrigger>
                  <TabsTrigger value="posted" className="h-9 shrink-0">Posted</TabsTrigger>
                  <TabsTrigger value="history" className="h-9 shrink-0">History</TabsTrigger>
                  <TabsTrigger value="agent-settings" className="h-9 shrink-0">
                    <Settings className="h-4 w-4 mr-2" />
                    Agent Settings
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Desktop: Grid layout */}
              <div className="hidden md:block mb-2">
                <TabsList className="grid grid-cols-7">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="library">Library</TabsTrigger>
                  <TabsTrigger value="staging">
                    <Package className="h-4 w-4 mr-2" />
                    Staging
                  </TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  <TabsTrigger value="posted">Posted</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                  <TabsTrigger value="agent-settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Agent Settings
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="preview">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Generated Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {generatedContent.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium">
                              {generatedContent.length} tweets generated
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Review and approve your content to add it to your library
                            </p>
                          </div>
                          <Button onClick={() => {
                            setReviewingContent(generatedContent);
                            setReviewMode(true);
                          }}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Review & Approve All
                          </Button>
                        </div>

                        {generatedContent.map((item, index) => {
                          const hasHashtags = item.hashtags && item.hashtags.length > 0;
                          return (
                            <div key={index} className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <Badge variant="outline">Tweet {index + 1}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {item.content.length}/280 characters
                                </span>
                              </div>
                              
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <Label className="text-xs font-medium">Post Content</Label>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyToClipboard(item.content, 'Post')}
                                    className="h-7 text-xs"
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy Post
                                  </Button>
                                </div>
                                <div className="p-3 bg-muted/50 rounded border">
                                  <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                                </div>
                              </div>

                              {hasHashtags && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <Label className="text-xs font-medium">Suggested Hashtags</Label>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => copyToClipboard(
                                        item.hashtags!.map(tag => `#${tag}`).join(' '),
                                        'Hashtags'
                                      )}
                                      className="h-7 text-xs"
                                    >
                                      <Copy className="h-3 w-3 mr-1" />
                                      Copy Hashtags
                                    </Button>
                                  </div>
                                  <div className="p-3 bg-background rounded border border-muted">
                                    <p className="text-sm text-muted-foreground">
                                      {item.hashtags!.map(tag => `#${tag}`).join(' ')}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <div className="flex gap-2 pt-4 border-t">
                          <Button variant="outline" onClick={handleGenerateContent} disabled={isGenerating}>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Regenerate All
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Generated content will appear here</p>
                        <p className="text-sm">Configure and generate to see AI-created content</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="library">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Content Library
                    </CardTitle>
                    <CardDescription>
                      Browse and manage your approved content
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ContentLibrary
                      businessId={selectedBusiness?.id}
                      onSchedule={(content) => {
                        setSchedulingTweet({ tweet: content.content, index: 0 });
                        setActiveTab('schedule');
                      }}
                      onEdit={(content) => {
                        setEditingTweet({
                          id: content.id,
                          content: content.content,
                          scheduled_for: ''
                        });
                        setEditContent(content.content);
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="staging">
                <StagingContent />
              </TabsContent>

              <TabsContent value="schedule">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Scheduled Content
                    </CardTitle>
                    <CardDescription>
                      View and manage your scheduled content
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScheduleTabContent />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="posted">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Posted Content
                    </CardTitle>
                    <CardDescription>
                      View content that has been posted
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedBusiness ? (
                      <PostedContentLibrary 
                        businessId={selectedBusiness.id}
                      />
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Select a business to view posted content</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Content History
                    </CardTitle>
                    <CardDescription>
                      View and manage your generated content
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Content history coming soon</p>
                    <p className="text-sm">Track performance and reuse successful content</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="agent-settings">
                <AgentPromptEditor />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      
      {/* Schedule Modal */}
      <ScheduleModal />
      
      {/* Edit Modal */}
      <EditModal />
      
      {/* Review Dialog */}
      <ContentReviewDialog
        open={reviewMode}
        onOpenChange={setReviewMode}
        content={reviewingContent}
        businessId={selectedBusiness?.id || ''}
        platform={selectedPlatform}
        contentType={selectedContentType}
        topic={topic}
        keywords={topic ? topic.split(',').map(k => k.trim()) : []}
        onSuccess={() => {
          // Clear both content states after successful review
          setGeneratedContent([]);
          setReviewingContent([]);
        }}
      />
    </div>
  );
};

export default ContentCenter;