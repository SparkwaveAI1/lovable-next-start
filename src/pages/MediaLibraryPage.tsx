import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Image as ImageIcon, Video, Trash2, Edit2, Search, Download, Play } from "lucide-react";
import { MediaViewerDialog } from "@/components/MediaViewerDialog";
import { toast } from "sonner";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { DashboardHeader } from "@/components/DashboardHeader";

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

export default function MediaLibraryPage() {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [editingMedia, setEditingMedia] = useState<MediaAsset | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset | null>(null);

  useEffect(() => {
    if (selectedBusiness) {
      loadMedia();
    }
  }, [selectedBusiness]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('business_id', selectedBusiness?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Extract all unique tags
      const tags = new Set<string>();
      data?.forEach(item => {
        item.tags?.forEach((tag: string) => tags.add(tag));
      });
      setAllTags(Array.from(tags).sort());

      setMedia(data || []);
    } catch (error) {
      console.error('Error loading media:', error);
      toast.error('Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      // Get business slug for file organization
      const { data: businessData } = await supabase
        .from('businesses')
        .select('slug')
        .eq('id', selectedBusiness?.id)
        .single();
      
      const businessSlug = businessData?.slug || 'default';

      for (const file of Array.from(files)) {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        
        if (!isImage && !isVideo) {
          toast.error(`${file.name}: Only images and videos are supported`);
          continue;
        }

        if (file.size > 50 * 1024 * 1024) {
          toast.error(`${file.name}: File too large (max 50MB)`);
          continue;
        }

        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `${businessSlug}/${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload to R2 via edge function
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', fileName);

        const { data: uploadResult, error: uploadError } = await supabase.functions.invoke('upload-to-r2', {
          body: formData
        });

        if (uploadError || !uploadResult?.success) {
          throw new Error(uploadError?.message || 'Upload failed');
        }

        const publicUrl = uploadResult.publicUrl;

        let width, height, thumbnailPath;

        if (isImage) {
          const dimensions = await getImageDimensions(file);
          width = dimensions.width;
          height = dimensions.height;
        } else if (isVideo) {
          try {
            const thumbnail = await generateVideoThumbnail(file);
            width = thumbnail.width;
            height = thumbnail.height;
            
            const thumbFileName = `${businessSlug}/${timestamp}_thumb_${Math.random().toString(36).substring(7)}.jpg`;
            
            // Upload thumbnail to R2
            const thumbFormData = new FormData();
            thumbFormData.append('file', thumbnail.blob, thumbFileName);
            thumbFormData.append('fileName', thumbFileName);

            const { data: thumbResult, error: thumbError } = await supabase.functions.invoke('upload-to-r2', {
              body: thumbFormData
            });
            
            if (thumbError) {
              console.error('Thumbnail upload error:', thumbError);
            } else if (thumbResult?.success) {
              thumbnailPath = thumbResult.publicUrl;
            }
          } catch (thumbError) {
            console.error('Thumbnail generation error:', thumbError);
          }
        }

        const { data: insertedMedia, error: dbError } = await supabase
          .from('media_assets')
          .insert({
            business_id: selectedBusiness?.id,
            file_name: file.name,
            file_path: publicUrl,
            file_type: isImage ? 'image' : 'video',
            file_size: file.size,
            mime_type: file.type,
            thumbnail_path: thumbnailPath,
            width,
            height
          })
          .select()
          .single();

        if (dbError) throw dbError;

        // Trigger AI analysis asynchronously (don't wait for it)
        if (insertedMedia) {
          supabase.functions.invoke('analyze-media', {
            body: {
              mediaId: insertedMedia.id,
              fileType: isImage ? 'image' : 'video',
              filePath: publicUrl,
              businessId: selectedBusiness?.id
            }
          }).then(({ data, error }) => {
            if (error) {
              console.error('AI analysis error:', error);
            } else {
              console.log('AI analysis triggered for:', file.name);
              // Reload media to show updated descriptions/tags
              setTimeout(() => loadMedia(), 2000);
            }
          });
        }
      }

      toast.success(`Uploaded ${files.length} file(s)`);
      loadMedia();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload media');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const generateVideoThumbnail = (file: File): Promise<{ blob: Blob; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      
      video.onloadedmetadata = () => {
        video.currentTime = 1;
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve({ 
              blob, 
              width: video.videoWidth, 
              height: video.videoHeight 
            });
          } else {
            reject(new Error('Failed to create thumbnail'));
          }
        }, 'image/jpeg', 0.8);
        
        URL.revokeObjectURL(video.src);
      };
      
      video.onerror = () => {
        reject(new Error('Failed to load video'));
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const handleDelete = async (mediaId: string) => {
    if (!confirm('Delete this media file? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('media_assets')
        .delete()
        .eq('id', mediaId);

      if (error) throw error;

      toast.success('Media deleted');
      loadMedia();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete media');
    }
  };

  const handleEditSave = async () => {
    if (!editingMedia) return;

    try {
      const tagsArray = editTags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const { error } = await supabase
        .from('media_assets')
        .update({
          description: editDescription,
          tags: tagsArray
        })
        .eq('id', editingMedia.id);

      if (error) throw error;

      toast.success('Media updated');
      setEditingMedia(null);
      loadMedia();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update media');
    }
  };

  const handleDownload = async (item: MediaAsset) => {
    try {
      const response = await fetch(item.file_path);
      const blob = await response.blob();
      
      // Try Web Share API first (works on mobile and some desktop browsers)
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], item.file_name, { type: blob.type });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: item.file_name,
            files: [file]
          });
          toast.success('Shared successfully');
          return;
        }
      }
      
      // Fallback: traditional blob download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const filteredMedia = media.filter(item => {
    const matchesSearch = !searchTerm || 
      item.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || item.file_type === typeFilter;
    const matchesTag = tagFilter === 'all' || item.tags?.includes(tagFilter);

    return matchesSearch && matchesType && matchesTag;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full">
      <DashboardHeader 
        selectedBusinessId={selectedBusiness?.id}
        onBusinessChange={(id) => {
          const businesses = [
            { id: '456dc53b-d9d9-41b0-bc33-4f4c4a791eff', slug: 'fight-flow-academy', name: 'Fight Flow Academy' },
            { id: '5a9bbfcf-fae5-4063-9780-bcbe366bae88', slug: 'sparkwave-ai', name: 'Sparkwave AI' },
            { id: '18d0dbb1-a82d-4477-a9f8-816a1fa2ee08', slug: 'persona-ai', name: 'PersonaAI' },
            { id: '350b8fcb-9bfe-4b53-9548-c6ffdb1d3cb5', slug: 'charx-world', name: 'CharX World' }
          ];
          const business = businesses.find(b => b.id === id);
          if (business) setSelectedBusiness(business);
        }}
      />
      
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 pt-2 sm:pt-4 md:pt-28">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Media Library</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage images and videos for your content</p>
        </div>

        {selectedBusiness ? (
          <div className="space-y-3 sm:space-y-4">
            {/* Upload Button */}
            <div>
              <Input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                id="media-upload"
              />
              <Button
                onClick={() => document.getElementById('media-upload')?.click()}
                disabled={uploading}
                className="w-full sm:w-auto"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Media'}
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by filename, description, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2">
                <Button
                  variant={typeFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('all')}
                  className="flex-1 sm:flex-none"
                >
                  All
                </Button>
                <Button
                  variant={typeFilter === 'image' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('image')}
                  className="flex-1 sm:flex-none"
                >
                  <ImageIcon className="w-4 h-4 sm:mr-0" />
                  <span className="sm:hidden ml-2">Images</span>
                </Button>
                <Button
                  variant={typeFilter === 'video' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('video')}
                  className="flex-1 sm:flex-none"
                >
                  <Video className="w-4 h-4 sm:mr-0" />
                  <span className="sm:hidden ml-2">Videos</span>
                </Button>
              </div>

              {allTags.length > 0 && (
                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-background">
                    <SelectValue placeholder="All Tags" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="all">All Tags</SelectItem>
                    {allTags.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">
                Total: {filteredMedia.length}
              </Badge>
              <Badge variant="outline">
                Images: {filteredMedia.filter(m => m.file_type === 'image').length}
              </Badge>
              <Badge variant="outline">
                Videos: {filteredMedia.filter(m => m.file_type === 'video').length}
              </Badge>
            </div>

            {/* Media Grid */}
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">Loading media...</p>
                </div>
              </div>
            ) : filteredMedia.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No media files</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchTerm || typeFilter !== 'all' || tagFilter !== 'all'
                      ? "No media matches your filters"
                      : "Upload images and videos to get started"}
                  </p>
                  <Button onClick={() => document.getElementById('media-upload')?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Media
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[calc(100vh-400px)] sm:h-[600px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 pr-2 sm:pr-4">
                  {filteredMedia.map((item) => (
                    <Card key={item.id} className="overflow-hidden cursor-pointer" onClick={() => setSelectedMedia(item)}>
                      <div className="aspect-square relative">
                        {item.file_type === 'image' ? (
                          <img
                            src={item.file_path}
                            alt={item.file_name}
                            className="w-full h-full object-cover"
                          />
                        ) : item.file_type === 'video' ? (
                          <div className="relative w-full h-full">
                            {item.thumbnail_path ? (
                              <img
                                src={item.thumbnail_path}
                                alt={item.file_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <video
                                src={item.file_path}
                                className="w-full h-full object-cover"
                                preload="metadata"
                                muted
                                playsInline
                              />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                <Play className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" />
                              </div>
                            </div>
                          </div>
                        ) : null}
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(item);
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingMedia(item);
                              setEditDescription(item.description || '');
                              setEditTags(item.tags?.join(', ') || '');
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-3 space-y-2">
                        <p className="text-xs font-medium truncate">{item.file_name}</p>
                        {!item.description ? (
                          <Badge variant="outline" className="text-xs">
                            🤖 AI analyzing...
                          </Badge>
                        ) : (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>{formatFileSize(item.file_size)}</span>
                          {item.width && item.height && (
                            <span>{item.width}×{item.height}</span>
                          )}
                        </div>
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.slice(0, 3).map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {item.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{item.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <p className="text-lg text-muted-foreground">
                Select a business from the dropdown above to view media
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Media Viewer Dialog */}
      <MediaViewerDialog
        media={selectedMedia}
        open={!!selectedMedia}
        onOpenChange={(open) => !open && setSelectedMedia(null)}
        onDownload={() => selectedMedia && handleDownload(selectedMedia)}
        onDelete={() => {
          if (selectedMedia) {
            setSelectedMedia(null);
            handleDelete(selectedMedia.id);
          }
        }}
        onEdit={() => {
          if (selectedMedia) {
            setEditingMedia(selectedMedia);
            setEditDescription(selectedMedia.description || '');
            setEditTags(selectedMedia.tags?.join(', ') || '');
            setSelectedMedia(null);
          }
        }}
      />

      {/* Edit Media Dialog */}
      <Dialog open={editingMedia !== null} onOpenChange={(open) => !open && setEditingMedia(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Media Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Describe what's in this image/video..."
                rows={3}
              />
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="boxing, training, technique, outdoor"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingMedia(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditSave}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
