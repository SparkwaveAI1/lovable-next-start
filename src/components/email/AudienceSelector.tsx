import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Users, Tag, Filter, X, Eye, UserCheck, UserPlus, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AudienceType = 'all' | 'leads' | 'customers' | 'tags' | 'segment';

export interface AudienceSelection {
  type: AudienceType;
  tags: string[];
  tagsMatch: 'all' | 'any';
  segmentId: string | null;
}

interface ContactTag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

interface ContactSegment {
  id: string;
  name: string;
  description: string | null;
  last_computed_count: number | null;
}

interface PreviewContact {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface AudienceSelectorProps {
  businessId: string;
  value: AudienceSelection;
  onChange: (selection: AudienceSelection) => void;
  showCard?: boolean;
  className?: string;
}

const AUDIENCE_TYPES = [
  {
    value: 'all' as const,
    label: 'All Contacts',
    description: 'All subscribed contacts',
    icon: Users,
  },
  {
    value: 'leads' as const,
    label: 'Leads',
    description: 'New leads & qualified prospects',
    icon: UserPlus,
  },
  {
    value: 'customers' as const,
    label: 'Customers',
    description: 'Active members & paying customers',
    icon: UserCheck,
  },
  {
    value: 'tags' as const,
    label: 'By Tags',
    description: 'Filter by contact tags',
    icon: Tag,
  },
  {
    value: 'segment' as const,
    label: 'Custom Segment',
    description: 'Use a saved segment',
    icon: Settings2,
  },
];

// Map audience types to contact status filters
const AUDIENCE_STATUS_FILTERS: Record<string, string[]> = {
  leads: ['new_lead', 'qualified', 'contacted'],
  customers: ['active_member', 'customer', 'active'],
};

export function AudienceSelector({
  businessId,
  value,
  onChange,
  showCard = true,
  className,
}: AudienceSelectorProps) {
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [previewContacts, setPreviewContacts] = useState<PreviewContact[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Fetch available tags for this business
  const { data: tags = [], isLoading: loadingTags } = useQuery({
    queryKey: ['contact-tags', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_tags')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as ContactTag[];
    },
    enabled: !!businessId,
  });

  // Fetch available segments for this business
  const { data: segments = [], isLoading: loadingSegments } = useQuery({
    queryKey: ['contact-segments', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_segments')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as ContactSegment[];
    },
    enabled: !!businessId,
  });

  // Preview recipients when targeting changes
  useEffect(() => {
    if (businessId) {
      previewRecipients();
    }
  }, [businessId, value.type, value.tags, value.tagsMatch, value.segmentId]);

  const previewRecipients = async () => {
    setIsLoadingPreview(true);
    try {
      let query = supabase
        .from('contacts')
        .select('id, email, first_name, last_name', { count: 'exact' })
        .eq('business_id', businessId)
        .eq('email_status', 'subscribed')
        .not('email', 'is', null);

      // Apply status filters for leads/customers
      if (value.type === 'leads') {
        query = query.in('status', AUDIENCE_STATUS_FILTERS.leads);
      } else if (value.type === 'customers') {
        query = query.in('status', AUDIENCE_STATUS_FILTERS.customers);
      } else if (value.type === 'tags' && value.tags.length > 0) {
        if (value.tagsMatch === 'all') {
          query = query.contains('tags', value.tags);
        } else {
          query = query.overlaps('tags', value.tags);
        }
      } else if (value.type === 'segment' && value.segmentId) {
        // For segments, we need to look up the segment filters and apply them
        // For now, just show the last computed count
        const segment = segments.find(s => s.id === value.segmentId);
        if (segment) {
          setRecipientCount(segment.last_computed_count);
          setPreviewContacts([]);
          setIsLoadingPreview(false);
          return;
        }
      }

      const { data, count, error } = await query.limit(5);

      if (!error) {
        setRecipientCount(count || 0);
        setPreviewContacts((data || []) as PreviewContact[]);
      }
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const toggleTag = (tagSlug: string) => {
    const newTags = value.tags.includes(tagSlug)
      ? value.tags.filter(t => t !== tagSlug)
      : [...value.tags, tagSlug];
    onChange({ ...value, tags: newTags });
  };

  const handleTypeChange = (type: AudienceType) => {
    onChange({
      ...value,
      type,
      // Clear tags if switching away from tags mode
      tags: type === 'tags' ? value.tags : [],
      // Clear segment if switching away from segment mode
      segmentId: type === 'segment' ? value.segmentId : null,
    });
  };

  const getTagColor = (color: string | null) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
      cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200',
      gray: 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
      red: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
    };
    return colors[color || 'gray'] || colors.gray;
  };

  const selectedTypeInfo = AUDIENCE_TYPES.find(t => t.value === value.type);

  const content = (
    <div className={cn('space-y-4', className)}>
      {/* Audience Type Selection */}
      <div className="space-y-2">
        <Label>Target Audience</Label>
        <Select value={value.type} onValueChange={handleTypeChange}>
          <SelectTrigger>
            <SelectValue>
              {selectedTypeInfo && (
                <div className="flex items-center gap-2">
                  <selectedTypeInfo.icon className="h-4 w-4" />
                  <span>{selectedTypeInfo.label}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {AUDIENCE_TYPES.map(type => {
              const Icon = type.icon;
              return (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <div>
                      <span className="font-medium">{type.label}</span>
                      <span className="text-muted-foreground text-xs ml-2">
                        {type.description}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Tag Selection */}
      {value.type === 'tags' && (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Label>Match</Label>
            <Select
              value={value.tagsMatch}
              onValueChange={(v: 'all' | 'any') => onChange({ ...value, tagsMatch: v })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any tag (OR)</SelectItem>
                <SelectItem value="all">All tags (AND)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingTags ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading tags...</span>
            </div>
          ) : tags.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No tags created yet. Add tags to contacts to use tag-based targeting.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => {
                const isSelected = value.tags.includes(tag.slug);
                return (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className={cn(
                      'cursor-pointer transition-all',
                      isSelected
                        ? getTagColor(tag.color)
                        : 'bg-transparent hover:bg-muted'
                    )}
                    onClick={() => toggleTag(tag.slug)}
                  >
                    {tag.name}
                    {isSelected && <X className="h-3 w-3 ml-1" />}
                  </Badge>
                );
              })}
            </div>
          )}

          {value.tags.length === 0 && tags.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Select at least one tag to target
            </p>
          )}
        </div>
      )}

      {/* Segment Selection */}
      {value.type === 'segment' && (
        <div className="space-y-2">
          <Label>Select Segment</Label>
          {loadingSegments ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading segments...</span>
            </div>
          ) : segments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No segments created yet. Create segments in Settings → Contacts.
            </p>
          ) : (
            <Select
              value={value.segmentId || ''}
              onValueChange={v => onChange({ ...value, segmentId: v || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a segment..." />
              </SelectTrigger>
              <SelectContent>
                {segments.map(segment => (
                  <SelectItem key={segment.id} value={segment.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{segment.name}</span>
                      {segment.last_computed_count !== null && (
                        <Badge variant="secondary" className="ml-2">
                          {segment.last_computed_count.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Recipient Preview */}
      <div className="border rounded-lg p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Recipient Preview</span>
          </div>
          {isLoadingPreview ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Badge variant="secondary">
              {recipientCount?.toLocaleString() || 0} contact{recipientCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {previewContacts.length > 0 ? (
          <div className="space-y-1 text-sm">
            {previewContacts.map(contact => (
              <div key={contact.id} className="text-muted-foreground">
                {contact.first_name || ''} {contact.last_name || ''}{' '}
                {contact.email && <span className="text-xs">({contact.email})</span>}
              </div>
            ))}
            {(recipientCount || 0) > 5 && (
              <div className="text-muted-foreground font-medium">
                ...and {((recipientCount || 0) - 5).toLocaleString()} more
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {value.type === 'tags' && value.tags.length === 0
              ? 'Select tags to see matching contacts'
              : value.type === 'segment' && !value.segmentId
              ? 'Select a segment to see contacts'
              : recipientCount === 0
              ? 'No contacts match this targeting'
              : 'Loading preview...'}
          </p>
        )}
      </div>
    </div>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Recipients
        </CardTitle>
        <CardDescription>
          Choose who will receive this email campaign
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

// Helper hook to use the audience selector values
export function useAudienceSelection(initial?: Partial<AudienceSelection>): [
  AudienceSelection,
  (selection: AudienceSelection) => void
] {
  const [selection, setSelection] = useState<AudienceSelection>({
    type: initial?.type || 'all',
    tags: initial?.tags || [],
    tagsMatch: initial?.tagsMatch || 'any',
    segmentId: initial?.segmentId || null,
  });

  return [selection, setSelection];
}

// Export default audience selection
export const DEFAULT_AUDIENCE_SELECTION: AudienceSelection = {
  type: 'all',
  tags: [],
  tagsMatch: 'any',
  segmentId: null,
};
