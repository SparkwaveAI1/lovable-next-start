import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ImagePlus, Trash2, Download, Send, Loader2, Package } from 'lucide-react';
import { MediaSelector } from './MediaSelector';

interface StagedContent {
  id: string;
  business_id: string;
  content: string;
  platform: string;
  content_type: string;
  topic: string | null;
  created_at: string;
  staging_media?: Array<{
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

export function StagingContent() {
  const { selectedBusiness } = useBusinessContext();
  const { toast } = useToast();
  const [content, setContent] = useState<StagedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedBusiness) {
      loadStagedContent();
    }
  }, [selectedBusiness]);

  const loadStagedContent = async () => {
    if (!selectedBusiness) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staged_content')
        .select(`
          *,
          staging_media (
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
        .eq('business_id', selectedBusiness.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading staged content:', error);
        toast({
          title: 'Error',
          description: 'Failed to load staged content',
          variant: 'destructive',
        });
        return;
      }

      setContent(data || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
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
    loadStagedContent(); // Reload to show new media
  };

  const handleSaveToLibrary = async (item: StagedContent) => {
    try {
      // 1. Insert into scheduled_content (Library)
      const { data: savedContent, error: saveError } = await supabase
        .from('scheduled_content')
        .insert({
          business_id: item.business_id,
          content: item.content,
          platform: item.platform,
          content_type: item.content_type,
          topic: item.topic,
          status: 'draft',
          approval_status: 'approved',
          approved_at: new Date().toISOString()
        })
        .select()
        .single();

      if (saveError) throw saveError;

      // 2. Copy media attachments from staging_media to content_media
      if (item.staging_media && item.staging_media.length > 0) {
        const mediaLinks = item.staging_media.map(media => ({
          content_id: savedContent.id,
          media_id: media.media_id,
          display_order: media.display_order
        }));

        const { error: mediaError } = await supabase
          .from('content_media')
          .insert(mediaLinks);

        if (mediaError) {
          console.error('Error copying media:', mediaError);
          // Don't fail the whole operation if media copy fails
        }
      }

      // 3. Delete from staging
      const { error: deleteError } = await supabase
        .from('staged_content')
        .delete()
        .eq('id', item.id);

      if (deleteError) {
        console.error('Error removing from staging:', deleteError);
        // Don't fail - content is already saved
      }

      toast({
        title: 'Saved to Library',
        description: 'Content and media moved to Library',
      });

      loadStagedContent();
    } catch (error) {
      console.error('Save to library error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save to library',
        variant: 'destructive',
      });
    }
  };

  const handlePost = async (item: StagedContent) => {
    try {
      // Get media URLs for posting
      const imageUrls = item.staging_media
        ?.filter(m => m.media_assets.file_type.startsWith('image/'))
        .sort((a, b) => a.display_order - b.display_order)
        .map(m => m.media_assets.file_path) || [];

      const videoUrl = item.staging_media
        ?.find(m => m.media_assets.file_type.startsWith('video/'))
        ?.media_assets.file_path;

      // Call post-via-late edge function
      const { data, error } = await supabase.functions.invoke('post-via-late', {
        body: {
          businessId: item.business_id,
          content: item.content,
          platforms: [item.platform],
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          videoUrl: videoUrl || undefined
        }
      });

      if (error) throw error;

      // Save to Library as posted
      await handleSaveToLibrary(item);

      toast({
        title: 'Posted Successfully',
        description: `Content posted to ${item.platform}`,
      });
    } catch (error) {
      console.error('Post error:', error);
      toast({
        title: 'Error',
        description: 'Failed to post content',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('staged_content')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'Content removed from staging',
      });

      loadStagedContent();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete content',
        variant: 'destructive',
      });
    }
  };

  if (!selectedBusiness) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please select a business to view staging content</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (content.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-2">No content in staging</p>
          <p className="text-sm text-muted-foreground">
            Move content from Library to add media and prepare for posting
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {content.map((item) => (
        <Card key={item.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{item.platform}</Badge>
                  <Badge variant="secondary">{item.content_type}</Badge>
                  {item.topic && (
                    <Badge variant="outline" className="text-xs">
                      {item.topic}
                    </Badge>
                  )}
                </div>

                <p className="text-sm whitespace-pre-wrap">{item.content}</p>

                {item.staging_media && item.staging_media.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {item.staging_media
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((media) => (
                        <div
                          key={media.media_id}
                          className="w-20 h-20 rounded border overflow-hidden"
                        >
                          <img
                            src={media.media_assets.thumbnail_path || media.media_assets.file_path}
                            alt="Attached media"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Added {new Date(item.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleOpenMediaSelector(item.id)}
                >
                  <ImagePlus className="h-4 w-4" />
                  {item.staging_media && item.staging_media.length > 0 ? 'Edit Media' : 'Add Media'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleSaveToLibrary(item)}
                >
                  <Download className="h-4 w-4" />
                  Save to Library
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handlePost(item)}
                >
                  <Send className="h-4 w-4" />
                  Post Now
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {selectedBusiness && selectedContentId && (
        <MediaSelector
          open={mediaSelectorOpen}
          onClose={handleCloseMediaSelector}
          businessId={selectedBusiness.id}
          contentId={selectedContentId}
          onMediaAttached={handleMediaAttached}
          tableName="staging_media"
        />
      )}
    </div>
  );
}
