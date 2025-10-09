import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Trash2, Image as ImageIcon, Video, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface PostedContent {
  id: string;
  business_id: string;
  platform: string;
  content: string;
  content_type: string;
  topic?: string;
  keywords?: string[];
  tags?: string[];
  posted_at?: string;
  created_at: string;
  media?: Array<{
    id: string;
    file_path: string;
    file_type: string;
    thumbnail_path?: string;
  }>;
}

interface PostedContentLibraryProps {
  businessId: string;
}

export function PostedContentLibrary({ businessId }: PostedContentLibraryProps) {
  const [content, setContent] = useState<PostedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    loadContent();
  }, [businessId]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_content')
        .select(`
          *,
          content_media (
            media_id,
            display_order,
            media_assets (
              id,
              file_path,
              file_type,
              thumbnail_path
            )
          )
        `)
        .eq('business_id', businessId)
        .eq('status', 'posted')
        .order('posted_at', { ascending: false });

      if (error) throw error;

      // Extract all unique tags
      const tags = new Set<string>();
      data?.forEach(item => {
        item.tags?.forEach((tag: string) => tags.add(tag));
      });
      setAllTags(Array.from(tags).sort());

      setContent(data || []);
    } catch (error) {
      console.error('Error loading posted content:', error);
      toast.error('Failed to load posted content');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this posted content from history?')) return;

    try {
      const { error } = await supabase
        .from('scheduled_content')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Content deleted');
      loadContent();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete content');
    }
  };

  // Filter content
  const filteredContent = content.filter(item => {
    const matchesSearch = !searchTerm || 
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.keywords?.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPlatform = platformFilter === 'all' || item.platform === platformFilter;
    
    const matchesTag = tagFilter === 'all' || item.tags?.includes(tagFilter);

    return matchesSearch && matchesPlatform && matchesTag;
  });

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      twitter: '𝕏',
      instagram: '📷',
      tiktok: '🎵',
      linkedin: '💼',
      facebook: '👥',
      reddit: '🤖',
      nextdoor: '🏘️',
      email: '📧',
      blog: '📝'
    };
    return icons[platform] || '📱';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading posted content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search content, topics, keywords..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="twitter">𝕏 Twitter</SelectItem>
            <SelectItem value="instagram">📷 Instagram</SelectItem>
            <SelectItem value="tiktok">🎵 TikTok</SelectItem>
            <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
            <SelectItem value="facebook">👥 Facebook</SelectItem>
            <SelectItem value="blog">📝 Blog</SelectItem>
            <SelectItem value="email">📧 Email</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {allTags.map(tag => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <Badge variant="secondary">
          Total Posted: {filteredContent.length}
        </Badge>
        {platformFilter !== 'all' && (
          <Badge variant="outline">
            {getPlatformIcon(platformFilter)} {platformFilter}: {filteredContent.length}
          </Badge>
        )}
      </div>

      {/* Content Grid */}
      {filteredContent.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-lg font-semibold mb-2">No posted content</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm || platformFilter !== 'all' || tagFilter !== 'all'
                ? "No posted content matches your filters"
                : "Posted content will appear here"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
            {filteredContent.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getPlatformIcon(item.platform)}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.platform}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.media && item.media.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {item.media[0].file_type === 'image' ? (
                            <><ImageIcon className="w-3 h-3 mr-1" /> {item.media.length}</>
                          ) : (
                            <><Video className="w-3 h-3 mr-1" /> {item.media.length}</>
                          )}
                        </Badge>
                      )}
                      <Badge variant="default" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" /> Posted
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <p className="text-sm mb-3 line-clamp-4">{item.content}</p>
                  
                  {item.topic && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Topic: {item.topic}
                    </p>
                  )}

                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
                    <Clock className="w-3 h-3" />
                    Posted: {item.posted_at ? new Date(item.posted_at).toLocaleDateString() : 'Unknown'}
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
