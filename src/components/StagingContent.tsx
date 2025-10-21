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
        ?.filter(m => m.media_assets.file_type === 'image')
        .sort((a, b) => a.display_order - b.display_order)
        .map(m => m.media_assets.file_path) || [];

      const videoMedia = item.staging_media
        ?.find(m => m.media_assets.file_type === 'video');

      const videoUrl = videoMedia?.media_assets.file_path;

      // Combine all media into single array
      const mediaUrls = [
        ...imageUrls,
        ...(videoUrl ? [videoUrl] : [])
      ];

      // Check for large videos or .mov files
      if (videoUrl) {
        const isMovFile = videoUrl.toLowerCase().endsWith('.mov');
        
        // Warn about .mov files
        if (isMovFile) {
          toast({
            title: '⚠️ Video Format Warning',
            description: '.mov files often timeout during upload. Consider converting to MP4 for better reliability.',
            variant: 'default',
          });
        }
        
        // Check file size if we have the full media object
        // Note: file_path is a URL, we can't check size here without fetching
        // But we can warn about .mov files which are typically large
        if (isMovFile) {
          toast({
            title: '💡 Tip',
            description: 'Large video files may timeout. Try compressing to under 20MB for best results.',
            variant: 'default',
          });
        }
      }

      // Validate Instagram requires media
      if (item.platform === 'instagram' && mediaUrls.length === 0) {
        toast({
          title: 'Media Required',
          description: 'Instagram requires an image or video. Please attach media first.',
          variant: 'destructive',
        });
        return;
      }

      // Fetch the Late account ID for this platform
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('late_twitter_account_id, late_instagram_account_id, late_tiktok_account_id, late_linkedin_account_id, late_facebook_account_id')
        .eq('id', item.business_id)
        .single();

      if (businessError) throw businessError;

      const accountIdMap: Record<string, string | null> = {
        twitter: businessData.late_twitter_account_id,
        instagram: businessData.late_instagram_account_id,
        tiktok: businessData.late_tiktok_account_id,
        linkedin: businessData.late_linkedin_account_id,
        facebook: businessData.late_facebook_account_id,
      };

      const accountId = accountIdMap[item.platform];

      if (!accountId) {
        toast({
          title: 'Account Not Connected',
          description: `No ${item.platform} account connected for this business`,
          variant: 'destructive',
        });
        return;
      }

      // Call post-via-late edge function
      const { data, error } = await supabase.functions.invoke('post-via-late', {
        body: {
          businessId: item.business_id,
          platform: item.platform,
          content: item.content,
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
          accountId: accountId
        }
      });

      if (error) throw error;

      // Check if edge function returned an error
      if (data && !data.success) {
        toast({
          title: 'Post Failed',
          description: data.error || data.details || 'Failed to post content',
          variant: 'destructive',
        });
        return;
      }

      const latePostId = data?.postId;

      // Show initial success with Late post ID
      toast({
        title: 'Post Sent to Late',
        description: latePostId ? `Post ID: ${latePostId}. Checking status...` : 'Verifying publication...',
      });

      // Save to Library with Late metadata
      const { data: savedContent, error: saveError } = await supabase
        .from('scheduled_content')
        .insert({
          business_id: item.business_id,
          content: item.content,
          platform: item.platform,
          content_type: item.content_type,
          topic: item.topic,
          status: 'posted',
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          posted_at: new Date().toISOString(),
          metadata: {
            late_post_id: latePostId,
            late_status: 'queued',
            posted_from_staging: true
          }
        })
        .select()
        .single();

      if (saveError) throw saveError;

      // Copy media attachments
      if (item.staging_media && item.staging_media.length > 0) {
        const mediaLinks = item.staging_media.map(media => ({
          content_id: savedContent.id,
          media_id: media.media_id,
          display_order: media.display_order
        }));

        await supabase.from('content_media').insert(mediaLinks);
      }

      // Delete from staging
      await supabase.from('staged_content').delete().eq('id', item.id);

      // Poll Late status if we have a post ID
      if (latePostId) {
        let attempts = 0;
        const maxAttempts = 5;
        const pollInterval = 15000; // 15 seconds

        const checkStatus = async () => {
          attempts++;
          try {
            const { data: statusData, error: statusError } = await supabase.functions.invoke('late-post-status', {
              body: { postId: latePostId }
            });

            if (statusError) {
              console.error('Status check error:', statusError);
              return;
            }

            const state = statusData?.state || 'unknown';
            
            if (state === 'published') {
              // Update to published
              await supabase
                .from('scheduled_content')
                .update({
                  metadata: {
                    late_post_id: latePostId,
                    late_status: 'published',
                    verified_at: new Date().toISOString()
                  } as any
                })
                .eq('id', savedContent.id);

              toast({
                title: '✅ Published',
                description: `Successfully posted to ${item.platform}`,
              });
            } else if (state === 'failed') {
              const errorMsg = statusData?.errorMessage || 'Post failed';
              
              await supabase
                .from('scheduled_content')
                .update({
                  error_message: errorMsg,
                  metadata: {
                    late_post_id: latePostId,
                    late_status: 'failed'
                  } as any
                })
                .eq('id', savedContent.id);

              toast({
                title: 'Post Failed',
                description: errorMsg,
                variant: 'destructive',
              });
            } else if (attempts < maxAttempts) {
              // Still processing, check again
              setTimeout(checkStatus, pollInterval);
            } else {
              // Max attempts reached
              toast({
                title: 'Still Processing',
                description: 'Post is queued. Check Library for status updates.',
              });
            }
          } catch (err) {
            console.error('Status polling error:', err);
          }
        };

        // Start polling after a short delay
        setTimeout(checkStatus, 10000); // First check after 10s
      }

      loadStagedContent();
    } catch (error: any) {
      console.error('Post error:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Failed to post';
      
      if (error.message?.includes('timeout') || error.message?.includes('90s')) {
        errorMessage = '⏱️ Upload timed out. Video may be too large. Try converting to MP4 or reducing file size.';
      } else if (error.message?.includes('Late API')) {
        errorMessage = `❌ Late API Error: ${error.message}`;
      } else if (error.message?.includes('account')) {
        errorMessage = `🔗 Account Error: ${error.message}`;
      } else {
        errorMessage = error.message || 'Failed to post';
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Log detailed error for debugging
      console.error('Full error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
        details: error.details
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
                
                {item.staging_media && item.staging_media.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1 px-1">
                    📹 Videos: MP4 recommended, under 20MB
                  </p>
                )}

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
