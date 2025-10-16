import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CheckCircle, Image as ImageIcon, Video } from "lucide-react";
import { toast } from "sonner";
import { usePublicBusinesses } from "@/hooks/useBusinesses";

interface UploadedFile {
  name: string;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  preview?: string;
}

export default function EmployeeUpload() {
  const { data: businesses = [], isLoading } = usePublicBusinesses();
  const [selectedBusiness, setSelectedBusiness] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // Create a synthetic event to reuse handleFileSelect
      const syntheticEvent = {
        target: { files, value: '' }
      } as React.ChangeEvent<HTMLInputElement>;
      
      await handleFileSelect(syntheticEvent);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!selectedBusiness) {
      toast.error('Please select a business first');
      return;
    }

    setUploading(true);

    // Initialize upload status for all files
    const fileStatuses: UploadedFile[] = Array.from(files).map(file => ({
      name: file.name,
      status: 'uploading',
      preview: URL.createObjectURL(file)
    }));
    setUploadedFiles(prev => [...prev, ...fileStatuses]);

    try {
      const businessSlug = businesses.find(b => b.id === selectedBusiness)?.slug;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileIndex = uploadedFiles.length + i;

        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        
        if (!isImage && !isVideo) {
          toast.error(`${file.name}: Only images and videos are supported`);
          updateFileStatus(fileIndex, 'error');
          continue;
        }

        // Upload to storage
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `${businessSlug}/${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          updateFileStatus(fileIndex, 'error');
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);

        // Get dimensions and thumbnail
        let width, height, thumbnailUrl;
        if (isImage) {
          const dimensions = await getImageDimensions(file);
          width = dimensions.width;
          height = dimensions.height;
        } else if (isVideo) {
          try {
            const { blob, width: vWidth, height: vHeight } = await generateVideoThumbnail(file);
            width = vWidth;
            height = vHeight;
            
            // Upload thumbnail
            const thumbnailFileName = `${businessSlug}/thumbnails/${timestamp}_${Math.random().toString(36).substring(7)}.jpg`;
            const { error: thumbError } = await supabase.storage
              .from('media')
              .upload(thumbnailFileName, blob);
            
            if (!thumbError) {
              const { data: { publicUrl: thumbUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(thumbnailFileName);
              thumbnailUrl = thumbUrl;
            }
          } catch (error) {
            console.error('Error generating video thumbnail:', error);
          }
        }

        // Save to database
        const { data: insertedMedia, error: dbError } = await supabase
          .from('media_assets')
          .insert({
            business_id: selectedBusiness,
            file_name: file.name,
            file_path: publicUrl,
            file_type: isImage ? 'image' : 'video',
            file_size: file.size,
            mime_type: file.type,
            width,
            height,
            thumbnail_path: thumbnailUrl
          })
          .select()
          .single();

        if (dbError) {
          console.error('Database error:', dbError);
          updateFileStatus(fileIndex, 'error');
          continue;
        }

        // Mark as complete immediately
        updateFileStatus(fileIndex, 'complete');

        // Trigger AI analysis in background (fire-and-forget)
        supabase.functions.invoke('analyze-media', {
          body: {
            mediaId: insertedMedia.id,
            fileType: isImage ? 'image' : 'video',
            filePath: publicUrl,
            businessId: selectedBusiness
          }
        }).catch(error => {
          console.error('AI analysis error:', error);
        });
      }

      toast.success(`Successfully uploaded ${files.length} file(s)`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const updateFileStatus = (index: number, status: UploadedFile['status']) => {
    setUploadedFiles(prev => 
      prev.map((file, i) => i === index ? { ...file, status } : file)
    );
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
        video.currentTime = 1; // Capture frame at 1 second
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

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>;
      case 'processing':
        return <div className="animate-pulse text-yellow-500">🤖</div>;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <span className="text-red-500">❌</span>;
    }
  };

  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'AI analyzing...';
      case 'complete':
        return 'Complete!';
      case 'error':
        return 'Failed';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Employee Media Upload</h1>
        <p className="text-muted-foreground">
          Upload images and videos for social media content
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Media</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Business</Label>
            <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a business..." />
              </SelectTrigger>
              <SelectContent>
                {businesses.map(business => (
                  <SelectItem key={business.id} value={business.id}>
                    {business.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 hover:border-primary'
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              disabled={uploading || !selectedBusiness}
              className="hidden"
              id="employee-upload"
            />
            <label
              htmlFor="employee-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                {isDragging ? '📂 Drop files here' : 'Drag files here or click to browse'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Images and videos (up to 5GB each)
              </p>
              <Button 
                type="button" 
                disabled={uploading || !selectedBusiness}
                onClick={() => document.getElementById('employee-upload')?.click()}
                className="gap-2"
              >
                <Upload className="h-5 w-5" />
                {uploading ? 'Uploading...' : 'Select Files'}
              </Button>
            </label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>📝 Tips:</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4 list-disc">
              <li>Use high-quality images (1080p or better)</li>
              <li>Action shots work best for social media</li>
              <li>Photos will be automatically analyzed and tagged by AI</li>
              <li>You can upload multiple files at once</li>
              <li><strong>💡 Pro tip:</strong> Drag files directly from your file manager for instant upload (no waiting for file picker!)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 border rounded-lg"
                >
                  {file.preview ? (
                    file.name.match(/\.(mp4|mov|avi|webm)$/i) ? (
                      <video
                        src={file.preview}
                        className="w-16 h-16 object-cover rounded"
                        preload="metadata"
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )
                  ) : (
                    <div className="w-16 h-16 bg-gray-900 rounded flex items-center justify-center">
                      <Video className="w-8 h-8 text-white" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {getStatusText(file.status)}
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    {getStatusIcon(file.status)}
                  </div>
                </div>
              ))}
            </div>

            {uploadedFiles.every(f => f.status === 'complete') && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-medium">
                  All files uploaded successfully!
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Your media is now available in the Media Library
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
