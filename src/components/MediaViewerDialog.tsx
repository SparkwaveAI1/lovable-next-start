import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Edit2, Trash2 } from "lucide-react";

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
}

export function MediaViewerDialog({
  media,
  open,
  onOpenChange,
  onDownload,
  onEdit,
  onDelete
}: MediaViewerDialogProps) {
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
                src={media.file_path}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-[70vh] object-contain"
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
                  onClick={onDownload}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  className="flex-1"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
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
