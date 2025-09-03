import { useState } from "react";
import { Sparkles, FileText, Send, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DashboardHeader } from "@/components/DashboardHeader";
import { generateContent } from "@/lib/contentService";
import { businessConfigs } from "@/lib/game/business-configs";

const ContentCenter = () => {
  const [selectedBusiness, setSelectedBusiness] = useState("");
  const [contentType, setContentType] = useState("");
  const [topic, setTopic] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastRequestId, setLastRequestId] = useState("");
  const { toast } = useToast();

  const handleGenerateContent = async () => {
    if (!selectedBusiness || !contentType || !topic) {
      toast({
        title: "Missing Information",
        description: "Please select business, content type, and enter a topic.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateContent(selectedBusiness, contentType, topic);
      
      if (result.success) {
        setGeneratedContent(result.content || "Content generated successfully!");
        setLastRequestId(result.requestId || "");
        toast({
          title: "Content Generated",
          description: "Your content has been created successfully.",
        });
      } else {
        throw new Error(result.message || "Generation failed");
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

  const businessConfig = selectedBusiness ? businessConfigs[selectedBusiness as keyof typeof businessConfigs] : null;

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
                      {Object.entries(businessConfigs).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Content Type Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content Type</label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select content type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twitter_post">Twitter Post</SelectItem>
                      <SelectItem value="discord_message">Discord Message</SelectItem>
                      <SelectItem value="telegram_post">Telegram Post</SelectItem>
                      <SelectItem value="linkedin_post">LinkedIn Post</SelectItem>
                    </SelectContent>
                  </Select>
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
                {businessConfig && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Focus Areas</label>
                    <div className="flex flex-wrap gap-1">
                      {businessConfig.focus.map((area) => (
                        <Badge key={area} variant="secondary" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Voice: {businessConfig.voice}
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
            <Tabs defaultValue="preview" className="space-y-4">
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
                    {lastRequestId && (
                      <CardDescription>
                        Request ID: {lastRequestId}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {generatedContent ? (
                      <div className="space-y-4">
                        <Textarea
                          value={generatedContent}
                          onChange={(e) => setGeneratedContent(e.target.value)}
                          rows={8}
                          className="resize-none"
                        />
                        <div className="flex gap-2">
                          <Button size="sm">
                            <Send className="h-4 w-4 mr-2" />
                            Approve & Post
                          </Button>
                          <Button variant="outline" size="sm">
                            <Calendar className="h-4 w-4 mr-2" />
                            Schedule
                          </Button>
                          <Button variant="outline" size="sm">
                            Regenerate
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
                      Content Scheduling
                    </CardTitle>
                    <CardDescription>
                      Schedule your content for optimal engagement
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Scheduling features coming soon</p>
                    <p className="text-sm">Set optimal posting times for each platform</p>
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
    </div>
  );
};

export default ContentCenter;