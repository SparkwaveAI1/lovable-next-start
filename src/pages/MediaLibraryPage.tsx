import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Image as ImageIcon, Video, Trash2, Edit2, Search, Download } from "lucide-react";
import { toast } from "sonner";
import { useBusinessContext } from "@/contexts/BusinessContext";

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

interface Business {
  id: string;
  name: string;
  slug: string;
}

export default function MediaLibraryPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const { selectedBusinessId: selectedBusiness, setSelectedBusinessId: setSelectedBusiness } = useBusinessContext();
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
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  useEffect(() => {
    loadBusinesses();
  }, []);

  useEffect(() => {
    if (selectedBusiness) {
      loadMedia();
    }
  }, [selectedBusiness]);

  const loadBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, slug')
        .order('name');

      if (error) throw error;
      setBusinesses(data || []);
      
      if (data && data.length > 0) {
        setSelectedBusiness(data[0].id);
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
      toast.error('Failed to load businesses');
    }
  };

  const loadMedia = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('business_id', selectedBusiness)
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

        const businessSlug = businesses.find(b => b.id === selectedBusiness)?.slug;
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `${businessSlug}/${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('content-media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('content-media')
          .getPublicUrl(fileName);

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
            const { error: thumbError } = await supabase.storage
              .from('content-media')
              .upload(thumbFileName, thumbnail.blob);
            
            if (thumbError) {
              console.error('Thumbnail upload error:', thumbError);
            } else {
              const { data: { publicUrl: thumbUrl } } = supabase.storage
                .from('content-media')
                .getPublicUrl(thumbFileName);
              thumbnailPath = thumbUrl;
            }
          } catch (thumbError) {
            console.error('Thumbnail generation error:', thumbError);
          }
        }

        const { data: insertedMedia, error: dbError } = await supabase
          .from('media_assets')
          .insert({
            business_id: selectedBusiness,
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
              businessId: selectedBusiness
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Media Library</h1>
          <p className="text-muted-foreground">Manage images and videos for your content</p>
        </div>
      </div>

      {/* Business Selector */}
      <Tabs value={selectedBusiness} onValueChange={setSelectedBusiness}>
        <TabsList>
          {businesses.map(business => (
            <TabsTrigger key={business.id} value={business.id}>
              {business.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {businesses.map(business => (
          <TabsContent key={business.id} value={business.id} className="space-y-4">
            {/* Upload and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
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
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Media'}
              </Button>

              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by filename, description, or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Button
                  variant={typeFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={typeFilter === 'image' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('image')}
                >
                  <ImageIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant={typeFilter === 'video' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('video')}
                >
                  <Video className="w-4 h-4" />
                </Button>
              </div>

              {allTags.length > 0 && (
                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger className="w-[180px] bg-background">
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
            <div className="flex gap-4 text-sm">
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
              <ScrollArea className="h-[600px]">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pr-4">
                  {filteredMedia.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="aspect-square relative">
                        {item.file_type === 'image' ? (
                          <img
                            src={item.file_path}
                            alt={item.file_name}
                            className="w-full h-full object-cover"
                          />
                        ) : item.file_type === 'video' && playingVideoId === item.id ? (
                          <video
                            src={item.file_path}
                            className="w-full h-full object-cover"
                            controls
                            autoPlay
                            playsInline
                            onEnded={() => setPlayingVideoId(null)}
                            onPause={() => setPlayingVideoId(null)}
                          />
                        ) : item.file_type === 'video' ? (
                          <div 
                            className="relative w-full h-full cursor-pointer"
                            onClick={() => setPlayingVideoId(item.id)}
                          >
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
                                <svg className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              </div>
                            </div>
                          </div>
                        ) : null}
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDownload(item)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0"
                            onClick={() => {
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
                            onClick={() => handleDelete(item.id)}
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
          </TabsContent>
        ))}
      </Tabs>

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
