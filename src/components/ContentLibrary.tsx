import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Edit2, Trash2, Image as ImageIcon, Video, CheckCircle, Copy, ArrowRight, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { markAsPosted } from "@/lib/schedulingService";
import { MediaSelector } from './MediaSelector';

interface LibraryContent {
  id: string;
  business_id: string;
  platform: string;
  content: string;
  content_type: string;
  topic?: string;
  keywords?: string[];
  tags?: string[];
  approved_at?: string;
  created_at: string;
  content_media?: Array<{
    media_id: string;
    display_order: number;
    media_assets: {
      id: string;
      file_path: string;
      file_type: string;
      thumbnail_path: string | null;
    };
  }>;
}

interface ContentLibraryProps {
  businessId: string;
  onSchedule: (content: LibraryContent) => void;
  onEdit: (content: LibraryContent) => void;
}

export function ContentLibrary({ businessId, onSchedule, onEdit }: ContentLibraryProps) {
  const [content, setContent] = useState<LibraryContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState<LibraryContent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  useEffect(() => {
    loadContent();
  }, [businessId]);

  const loadContent = async () => {
    setLoading(true);
    try {
      // Use businessId directly as UUID
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
        .eq('approval_status', 'approved')
        .eq('status', 'draft')
        .order('approved_at', { ascending: false });

      if (error) throw error;

      console.log('Content library loaded:', data);
      console.log('First item media:', data?.[0]?.content_media);

      // Extract all unique tags
      const tags = new Set<string>();
      data?.forEach(item => {
        item.tags?.forEach((tag: string) => tags.add(tag));
      });
      setAllTags(Array.from(tags).sort());

      setContent(data || []);
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Failed to load content library');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this content from your library?')) return;

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

  const handleMarkAsPosted = async (id: string) => {
    if (!confirm('Mark this content as posted?')) return;

    try {
      const result = await markAsPosted(id);
      
      if (result.success) {
        toast.success('Content marked as posted');
        loadContent();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error marking as posted:', error);
      toast.error('Failed to mark as posted');
    }
  };

  const handleCardClick = (item: LibraryContent) => {
    setSelectedContent(item);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setTimeout(() => setSelectedContent(null), 200);
  };

  const handleCopyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Content copied to clipboard");
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error("Failed to copy content");
    }
  };

  const handleMoveToStaging = async (content: LibraryContent) => {
    try {
      console.log('Moving content to staging:', {
        business_id: content.business_id,
        content: content.content?.substring(0, 50),
        platform: content.platform,
        content_type: content.content_type,
        topic: content.topic
      });

      // Copy content to staging
      const { data, error } = await supabase
        .from('staged_content')
        .insert({
          business_id: content.business_id,
          content: content.content,
          platform: content.platform,
          content_type: content.content_type,
          topic: content.topic || null
        })
        .select();

      if (error) {
        console.error('Supabase error details:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        toast.error(`Failed to move content to staging: ${error.message}`);
        return;
      }

      console.log('Successfully inserted into staging:', data);

      toast.success('Moved to Staging', {
        description: 'Content ready for media attachment',
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Failed to move content to staging');
    }
  };

  const handleOpenMediaSelector = (contentId: string) => {
    setSelectedContentId(contentId);
    setMediaSelectorOpen(true);
  };

  const handleCloseMediaSelector = () => {
    setMediaSelectorOpen(false);
    setSelectedContentId(null);
  };

  const handleMediaAttached = () => {
    loadContent(); // Reload library to show new media
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
          <p className="text-sm text-muted-foreground">Loading your content library...</p>
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
          Total: {filteredContent.length}
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
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-lg font-semibold mb-2">No content in library</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm || platformFilter !== 'all' || tagFilter !== 'all'
                ? "No content matches your filters"
                : "Generate and approve content to build your library"}
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
                    {item.content_media && item.content_media.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {item.content_media[0].media_assets.file_type === 'image' ? (
                          <><ImageIcon className="w-3 h-3 mr-1" /> {item.content_media.length}</>
                        ) : (
                          <><Video className="w-3 h-3 mr-1" /> {item.content_media.length}</>
                        )}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <div 
                    className="cursor-pointer hover:bg-accent/5 -m-2 p-2 rounded transition-colors"
                    onClick={() => handleCardClick(item)}
                  >
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {item.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <p className="text-sm mb-3 line-clamp-3">{item.content}</p>
                    
                    <p className="text-xs text-primary font-medium">Click to view full content →</p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
                    <Clock className="w-3 h-3" />
                    {new Date(item.approved_at || item.created_at).toLocaleDateString()}
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenMediaSelector(item.id)}
                    className="gap-2"
                  >
                    <ImagePlus className="h-4 w-4" />
                    {item.content_media && item.content_media.length > 0 ? 'Edit Media' : 'Add Media'}
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1"
                    onClick={() => onSchedule(item)}
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Schedule
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleMarkAsPosted(item.id)}
                    title="Mark as Posted"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(item)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Full Content Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          {selectedContent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getPlatformIcon(selectedContent.platform)}</span>
                  <Badge variant="outline">{selectedContent.platform}</Badge>
                  {selectedContent.content_media && selectedContent.content_media.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedContent.content_media[0].media_assets.file_type === 'image' ? (
                        <><ImageIcon className="w-3 h-3 mr-1" /> {selectedContent.content_media.length}</>
                      ) : (
                        <><Video className="w-3 h-3 mr-1" /> {selectedContent.content_media.length}</>
                      )}
                    </Badge>
                  )}
                </div>
                
                <DialogTitle className="sr-only">Content Details</DialogTitle>
                <DialogDescription className="sr-only">
                  View full content for {selectedContent.platform}
                </DialogDescription>
              </DialogHeader>

              {/* Tags */}
              {selectedContent.tags && selectedContent.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {selectedContent.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Media Preview */}
              {selectedContent.content_media && selectedContent.content_media.length > 0 && (
                <div className="mb-4 flex gap-2 flex-wrap">
                  {selectedContent.content_media.map((media, idx) => (
                    <div key={idx} className="relative w-24 h-24 rounded border overflow-hidden">
                      {media.media_assets.file_type === 'image' ? (
                        <img 
                          src={media.media_assets.thumbnail_path || media.media_assets.file_path} 
                          alt="Media" 
                          className="w-full h-full object-cover"
                          onError={(e) => { 
                            const target = e.currentTarget as HTMLImageElement;
                            if (target.src !== media.media_assets.file_path) {
                              target.src = media.media_assets.file_path;
                            }
                          }}
                        />
                      ) : media.media_assets.thumbnail_path ? (
                        <img 
                          src={media.media_assets.thumbnail_path} 
                          alt="Video thumbnail" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Video className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Scrollable Content */}
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Content</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyContent(selectedContent.content)}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedContent.content}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Approved: {new Date(selectedContent.approved_at || selectedContent.created_at).toLocaleDateString()}
                    </div>
                    
                    {selectedContent.keywords && selectedContent.keywords.length > 0 && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Keywords: </span>
                        <span>{selectedContent.keywords.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* Action Buttons */}
              <div className="pt-4 border-t flex flex-col sm:flex-row gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1"
                  onClick={() => {
                    handleCloseDialog();
                    onSchedule(selectedContent);
                  }}
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Schedule
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    handleCloseDialog();
                    handleMarkAsPosted(selectedContent.id);
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Mark Posted
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    handleCloseDialog();
                    onEdit(selectedContent);
                  }}
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    handleCloseDialog();
                    handleDelete(selectedContent.id);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {selectedContentId && (
        <MediaSelector
          open={mediaSelectorOpen}
          onClose={handleCloseMediaSelector}
          businessId={businessId}
          contentId={selectedContentId}
          onMediaAttached={handleMediaAttached}
          tableName="content_media"
        />
      )}
    </div>
  );
}
