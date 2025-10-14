import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Image as ImageIcon, Video, Check, Loader2 } from 'lucide-react';

interface MediaAsset {
  id: string;
  file_path: string;
  file_type: string;
  thumbnail_path: string | null;
  file_size: number;
  created_at: string;
}

interface MediaSelectorProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  stagedContentId: string;
  onMediaAttached: () => void;
}

export function MediaSelector({ open, onClose, businessId, stagedContentId, onMediaAttached }: MediaSelectorProps) {
  const { toast } = useToast();
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);

  useEffect(() => {
    if (open && businessId) {
      loadMedia();
      loadExistingSelections();
    }
  }, [open, businessId]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading media:', error);
        toast({
          title: 'Error',
          description: 'Failed to load media library',
          variant: 'destructive',
        });
        return;
      }

      setMedia(data || []);
    } catch (error) {
      console.error('Load media error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingSelections = async () => {
    try {
      const { data, error } = await supabase
        .from('staging_media')
        .select('media_id')
        .eq('staged_content_id', stagedContentId);

      if (error) {
        console.error('Error loading existing selections:', error);
        return;
      }

      if (data) {
        setSelectedMedia(data.map(item => item.media_id));
      }
    } catch (error) {
      console.error('Load selections error:', error);
    }
  };

  const toggleMediaSelection = (mediaId: string) => {
    setSelectedMedia(prev => {
      if (prev.includes(mediaId)) {
        return prev.filter(id => id !== mediaId);
      } else {
        return [...prev, mediaId];
      }
    });
  };

  const handleAttach = async () => {
    setSaving(true);
    try {
      // First, remove all existing media attachments
      const { error: deleteError } = await supabase
        .from('staging_media')
        .delete()
        .eq('staged_content_id', stagedContentId);

      if (deleteError) {
        console.error('Error removing old media:', deleteError);
        throw deleteError;
      }

      // Then add new selections
      if (selectedMedia.length > 0) {
        const insertData = selectedMedia.map((mediaId, index) => ({
          staged_content_id: stagedContentId,
          media_id: mediaId,
          display_order: index
        }));

        const { error: insertError } = await supabase
          .from('staging_media')
          .insert(insertData);

        if (insertError) {
          console.error('Error attaching media:', insertError);
          throw insertError;
        }
      }

      toast({
        title: 'Success',
        description: `${selectedMedia.length} media item(s) attached`,
      });

      onMediaAttached();
      onClose();
    } catch (error) {
      console.error('Attach media error:', error);
      toast({
        title: 'Error',
        description: 'Failed to attach media',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredMedia = media.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.file_path.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || 
      (filterType === 'image' && item.file_type.startsWith('image/')) ||
      (filterType === 'video' && item.file_type.startsWith('video/'));

    return matchesSearch && matchesType;
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Media</DialogTitle>
          <DialogDescription>
            Choose images or videos to attach to this content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search media..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                All
              </Button>
              <Button
                variant={filterType === 'image' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('image')}
              >
                <ImageIcon className="h-4 w-4 mr-1" />
                Images
              </Button>
              <Button
                variant={filterType === 'video' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('video')}
              >
                <Video className="h-4 w-4 mr-1" />
                Videos
              </Button>
            </div>
          </div>

          {/* Media Grid */}
          <div className="overflow-y-auto max-h-96 border rounded-lg p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No media found</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {filteredMedia.map((item) => (
                  <div
                    key={item.id}
                    className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                      selectedMedia.includes(item.id)
                        ? 'border-primary ring-2 ring-primary'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => toggleMediaSelection(item.id)}
                  >
                    <img
                      src={item.thumbnail_path || item.file_path}
                      alt="Media"
                      className="w-full h-full object-cover"
                    />
                    {selectedMedia.includes(item.id) && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                    {item.file_type.startsWith('video/') && (
                      <Badge className="absolute bottom-2 left-2" variant="secondary">
                        <Video className="h-3 w-3 mr-1" />
                        Video
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selection Summary */}
          {selectedMedia.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">
                {selectedMedia.length} media item(s) selected
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMedia([])}
              >
                Clear Selection
              </Button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleAttach} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Attaching...
              </>
            ) : (
              <>Attach {selectedMedia.length > 0 ? `${selectedMedia.length} Media` : 'Media'}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
