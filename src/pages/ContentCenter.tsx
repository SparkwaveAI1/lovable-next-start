import { useState, useEffect } from "react";
import { Sparkles, FileText, Send, Calendar, TrendingUp, RefreshCw, Edit, Trash2, Rocket } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DashboardHeader } from "@/components/DashboardHeader";
import { supabase } from "@/integrations/supabase/client";

const ContentCenter = () => {
  const [selectedBusiness, setSelectedBusiness] = useState("");
  const [selectedContentType, setSelectedContentType] = useState("");
  const [topic, setTopic] = useState("");
  const [tweetQuantity, setTweetQuantity] = useState(3);
  const [generatedContent, setGeneratedContent] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
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

  const businesses = [
    { id: 'fight-flow-academy', name: 'Fight Flow Academy' },
    { id: 'sparkwave-ai', name: 'Sparkwave AI' },
    { id: 'persona-ai', name: 'PersonaAI' },
    { id: 'charx-world', name: 'CharX World' }
  ];

  const contentTypes = [
    { value: 'twitter-short', label: 'Twitter - Short (1 tweet)', count: 1 },
    { value: 'twitter-medium', label: 'Twitter - Medium (2-3 tweets)', count: 3 },
    { value: 'twitter-long', label: 'Twitter - Long (4-5 tweets)', count: 5 },
    { value: 'twitter-thread', label: 'Twitter - Thread (6+ tweets)', count: 8 }
  ];

  const getSystemPrompt = (businessId: string) => {
    const prompts = {
      'fight-flow-academy': 'You are creating Twitter content for Fight Flow Academy, a martial arts school and gym. Focus on fitness, training, martial arts, personal development, and community. Use hashtags like #MartialArts #Fitness #Training #PersonalGrowth. Keep each tweet under 280 characters.',
      'sparkwave-ai': 'You are creating Twitter content for Sparkwave AI, an AI services business. Focus on business automation, AI implementation, productivity, and enterprise solutions. Use hashtags like #AI #Automation #Business #Productivity. Keep each tweet under 280 characters.',
      'persona-ai': 'You are creating Twitter content for PersonaAI, an AI-powered qualitative research platform. Focus on market research, AI personas, psychology, and business insights. Use hashtags like #AIResearch #MarketResearch #Psychology #BusinessIntelligence. Keep each tweet under 280 characters.',
      'charx-world': 'You are creating Twitter content for CharX World, an AI character and world building platform. Focus on storytelling, character creation, world building, and creative AI. Use hashtags like #CharXWorld #AICharacters #Storytelling #WorldBuilding #AICreativity. Keep each tweet under 280 characters.'
    };
    return prompts[businessId as keyof typeof prompts] || '';
  };

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
    
    const systemPrompt = getSystemPrompt(selectedBusiness);
    const selectedType = contentTypes.find(t => t.value === selectedContentType);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-agent-content', {
        body: {
          businessId: selectedBusiness,
          platform: 'twitter',
          contentType: selectedContentType,
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
        // Store generated content - for now just the main content
        // Later can enhance to include hashtags and CTA
        setGeneratedContent([data.content]);
        toast({
          title: "Content Generated",
          description: "Content generated successfully!",
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

  const getBusinessId = (businessSlug: string) => {
    // Generate a consistent UUID for each business - in real app this would come from database
    const businessIds = {
      'fight-flow-academy': 'a1b2c3d4-e5f6-7890-abcd-123456789abc',
      'sparkwave-ai': 'b2c3d4e5-f6g7-8901-bcde-234567890def',
      'persona-ai': 'c3d4e5f6-g7h8-9012-cdef-345678901efg',
      'charx-world': 'd4e5f6g7-h8i9-0123-defg-456789012fgh'
    };
    return businessIds[businessSlug as keyof typeof businessIds] || businessSlug;
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

    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
    
    try {
      // Save to existing scheduled_content table
      const { error } = await supabase
        .from('scheduled_content')
        .insert({
          business_id: getBusinessId(selectedBusiness),
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
        body: { content }
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

  const selectedBusinessConfig = businesses.find(b => b.id === selectedBusiness);

  const EditModal = () => (
    <Dialog open={!!editingTweet} onOpenChange={() => setEditingTweet(null)}>
      <DialogContent>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Time</label>
              <Input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleUpdateScheduledTweet}>Update Tweet</Button>
            <Button variant="outline" onClick={() => setEditingTweet(null)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const ScheduleModal = () => (
    <Dialog open={!!schedulingTweet} onOpenChange={() => setSchedulingTweet(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Tweet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tweet Content</label>
            <Textarea value={schedulingTweet?.tweet || ''} readOnly rows={3} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input 
                type="date" 
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Time</label>
              <Input 
                type="time" 
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleScheduleTweet}>Schedule Tweet</Button>
            <Button variant="outline" onClick={() => setSchedulingTweet(null)}>Cancel</Button>
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
                      {businesses.find(b => getBusinessId(b.id) === item.business_id)?.name || 'Unknown Business'}
                    </Badge>
                    <Badge variant="secondary">{item.platform}</Badge>
                  </div>
                  <p className="text-sm mb-2">{item.content}</p>
                  <div className="text-xs text-muted-foreground">
                    Scheduled: {new Date(item.scheduled_for).toLocaleString()}
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
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Content Creation Center
          </h1>
          <p className="text-muted-foreground">
            Generate AI-powered content across all your businesses using GAME SDK
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
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
                {/* Business Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Business</label>
                  <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select business" />
                    </SelectTrigger>
                    <SelectContent>
                      {businesses.map((business) => (
                        <SelectItem key={business.id} value={business.id}>
                          {business.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Content Type Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content Type</label>
                  <Select value={selectedContentType} onValueChange={setSelectedContentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select content type" />
                    </SelectTrigger>
                    <SelectContent>
                      {contentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Number of Tweets</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={tweetQuantity}
                    onChange={(e) => setTweetQuantity(parseInt(e.target.value) || 1)}
                    className="w-full"
                  />
                </div>

                {/* Topic Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Topic</label>
                  <Input
                    placeholder="Enter content topic..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                {/* Business Info */}
                {selectedBusinessConfig && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Selected Business</label>
                    <Badge variant="secondary" className="text-xs">
                      {selectedBusinessConfig.name}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      AI will generate Twitter content optimized for this business
                    </p>
                  </div>
                )}

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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              
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
                        {generatedContent.map((tweet, index) => (
                          <div key={index} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">Tweet {index + 1}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {tweet.length}/280 characters
                              </span>
                            </div>
                            <Textarea
                              value={tweet}
                              onChange={(e) => {
                                const newContent = [...generatedContent];
                                newContent[index] = e.target.value;
                                setGeneratedContent(newContent);
                              }}
                              rows={3}
                              className="resize-none"
                            />
                            <div className="flex gap-2">
                              <Button 
                                size="sm"
                                onClick={() => handlePostNow(tweet, index)}
                                disabled={postingTweet === index}
                              >
                                {postingTweet === index ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Posting...
                                  </>
                                ) : (
                                  <>
                                    <Rocket className="h-4 w-4 mr-2" />
                                    Post Now
                                  </>
                                )}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSchedulingTweet({tweet: tweet, index: index})}
                                disabled={postingTweet === index}
                              >
                                <Calendar className="h-4 w-4 mr-2" />
                                Schedule
                              </Button>
                            </div>
                          </div>
                        ))}
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
            </Tabs>
          </div>
        </div>
      </main>
      
      {/* Schedule Modal */}
      <ScheduleModal />
      
      {/* Edit Modal */}
      <EditModal />
    </div>
  );
};

export default ContentCenter;