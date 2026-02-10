import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Edit2, Trash2, Share2 } from "lucide-react";
import { useEffect, useRef, useCallback } from "react";
import { trackImageView, trackVideoPlay, trackVideoComplete, trackShare, trackDownload } from "@/lib/analyticsService";

interface MediaAsset {
  id: string;
  business_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  mime_type?: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail_path?: string;
  description?: string;
  tags?: string[];
  uploaded_at: string;
  created_at: string;
}

interface MediaViewerDialogProps {
  media: MediaAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare?: () => void;
}

export function MediaViewerDialog({
  media,
  open,
  onOpenChange,
  onDownload,
  onEdit,
  onDelete,
  onShare
}: MediaViewerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewTrackedRef = useRef<string | null>(null);
  const playTrackedRef = useRef<boolean>(false);

  // Track view when dialog opens
  useEffect(() => {
    if (open && media && viewTrackedRef.current !== media.id) {
      viewTrackedRef.current = media.id;
      playTrackedRef.current = false; // Reset play tracking for new media
      
      if (media.file_type === 'image') {
        trackImageView(media.business_id, media.id, { source: 'media_viewer' });
      }
    }
  }, [open, media?.id, media?.business_id, media?.file_type]);

  // Track video play and completion
  const handleVideoPlay = useCallback(() => {
    if (media && !playTrackedRef.current) {
      playTrackedRef.current = true;
      trackVideoPlay(media.business_id, media.id, { autoplay: false });
    }
  }, [media?.business_id, media?.id]);

  const handleVideoEnded = useCallback(() => {
    if (media && videoRef.current) {
      const duration = videoRef.current.duration;
      trackVideoComplete(media.business_id, media.id, {
        watchedDuration: duration,
        totalDuration: duration,
        percentWatched: 100,
      });
    }
  }, [media?.business_id, media?.id]);

  // Handle download with tracking
  const handleDownload = useCallback(() => {
    if (media) {
      trackDownload(
        media.business_id,
        media.id,
        media.file_type as 'image' | 'video',
        { fileName: media.file_name, fileSize: media.file_size }
      );
    }
    onDownload();
  }, [media, onDownload]);

  // Handle share with tracking
  const handleShare = useCallback(async () => {
    if (!media) return;

    // Try native share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: media.file_name,
          text: media.description || 'Check out this content',
          url: media.file_path,
        });
        trackShare(media.business_id, media.id, media.file_type as 'image' | 'video', 'web');
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(media.file_path);
        trackShare(media.business_id, media.id, media.file_type as 'image' | 'video', 'web', {
          shareUrl: media.file_path
        });
        // Could show a toast here
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
    
    if (onShare) onShare();
  }, [media, onShare]);

  if (!media) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0 gap-0">
        <div className="grid md:grid-cols-[1fr,350px] gap-0">
          {/* Media Display Section */}
          <div className="bg-black flex items-center justify-center p-6 min-h-[400px] md:min-h-[600px]">
            {media.file_type === 'image' ? (
              <img
                src={media.file_path}
                alt={media.file_name}
                className="max-w-full max-h-[70vh] object-contain"
              />
            ) : (
              <video
                ref={videoRef}
                src={media.file_path}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-[70vh] object-contain"
                onPlay={handleVideoPlay}
                onEnded={handleVideoEnded}
              />
            )}
          </div>

          {/* Metadata Panel */}
          <div className="p-6 space-y-4 bg-background">
            <DialogHeader>
              <DialogTitle className="text-base break-words pr-8">
                {media.file_name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Description */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                {!media.description ? (
                  <Badge variant="outline" className="text-xs">
                    🤖 AI analyzing...
                  </Badge>
                ) : (
                  <p className="text-sm">{media.description}</p>
                )}
              </div>

              {/* Tags */}
              {media.tags && media.tags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {media.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Details */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Details</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="capitalize">{media.file_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size:</span>
                    <span>{formatFileSize(media.file_size)}</span>
                  </div>
                  {media.width && media.height && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dimensions:</span>
                      <span>{media.width} × {media.height}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="flex-1"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDelete}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
