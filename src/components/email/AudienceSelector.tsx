import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Users, Tag, Filter, X, Eye, UserCheck, UserPlus, Settings2, MousePointer, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AudienceType = 'all' | 'leads' | 'customers' | 'tags' | 'segment' | 'manual' | 'import';

export interface AudienceSelection {
  type: AudienceType;
  tags: string[];
  tagsMatch: 'all' | 'any';
  segmentId: string | null;
  manualContactIds: string[];
  importedContacts: Array<{
    email: string;
    first_name?: string;
    last_name?: string;
  }>;
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
  {
    value: 'manual' as const,
    label: 'Manual Select',
    description: 'Pick individual contacts',
    icon: MousePointer,
  },
  {
    value: 'import' as const,
    label: 'Import List',
    description: 'Upload a contact list',
    icon: Upload,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);

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

  // Fetch all contacts for manual selection
  const { data: allContacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ['all-contacts', businessId, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select('id, email, first_name, last_name, status')
        .eq('business_id', businessId)
        .eq('email_status', 'subscribed')
        .not('email', 'is', null)
        .order('first_name');
      
      if (searchQuery) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        );
      }
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as PreviewContact[];
    },
    enabled: !!businessId && value.type === 'manual',
  });

  // Preview recipients when targeting changes
  useEffect(() => {
    if (businessId) {
      previewRecipients();
    }
  }, [businessId, value.type, value.tags, value.tagsMatch, value.segmentId, value.manualContactIds, value.importedContacts]);

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
      } else if (value.type === 'manual') {
        // For manual selection, get the selected contacts
        if (value.manualContactIds.length > 0) {
          const { data, error } = await supabase
            .from('contacts')
            .select('id, email, first_name, last_name')
            .eq('business_id', businessId)
            .in('id', value.manualContactIds);
          
          if (!error) {
            setRecipientCount(data.length);
            setPreviewContacts(data as PreviewContact[]);
          }
        } else {
          setRecipientCount(0);
          setPreviewContacts([]);
        }
        setIsLoadingPreview(false);
        return;
      } else if (value.type === 'import') {
        // For imported contacts, use the imported list
        setRecipientCount(value.importedContacts.length);
        setPreviewContacts(value.importedContacts.map((contact, index) => ({
          id: `import-${index}`,
          email: contact.email,
          first_name: contact.first_name || null,
          last_name: contact.last_name || null,
        })));
        setIsLoadingPreview(false);
        return;
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
      // Clear manual selection if switching away from manual mode
      manualContactIds: type === 'manual' ? value.manualContactIds : [],
      // Clear imported contacts if switching away from import mode
      importedContacts: type === 'import' ? value.importedContacts : [],
    });
  };

  const toggleContactSelection = (contactId: string) => {
    const newSelection = value.manualContactIds.includes(contactId)
      ? value.manualContactIds.filter(id => id !== contactId)
      : [...value.manualContactIds, contactId];
    onChange({ ...value, manualContactIds: newSelection });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Find column indices
        const emailIdx = headers.findIndex(h => h.includes('email'));
        const firstNameIdx = headers.findIndex(h => h.includes('first') && h.includes('name'));
        const lastNameIdx = headers.findIndex(h => h.includes('last') && h.includes('name'));
        
        if (emailIdx === -1) {
          alert('CSV must have an email column');
          setIsUploading(false);
          return;
        }

        const contacts = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''));
          return {
            email: values[emailIdx],
            first_name: firstNameIdx >= 0 ? values[firstNameIdx] : undefined,
            last_name: lastNameIdx >= 0 ? values[lastNameIdx] : undefined,
          };
        }).filter(contact => contact.email && contact.email.includes('@'));

        onChange({ ...value, importedContacts: contacts });
      } catch (err) {
        alert('Error parsing CSV file');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsText(file);
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

      {/* Manual Contact Selection */}
      {value.type === 'manual' && (
        <div className="space-y-3">
          <div>
            <Label>Search Contacts</Label>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="mt-1"
            />
          </div>

          {loadingContacts ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading contacts...</span>
            </div>
          ) : allContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No contacts found.
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
              {allContacts.map(contact => {
                const isSelected = value.manualContactIds.includes(contact.id);
                return (
                  <div
                    key={contact.id}
                    className={cn(
                      'flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted',
                      isSelected && 'bg-muted'
                    )}
                    onClick={() => toggleContactSelection(contact.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox checked={isSelected} readOnly />
                      <div>
                        <span className="text-sm font-medium">
                          {contact.first_name || ''} {contact.last_name || ''}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {contact.email}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {value.manualContactIds.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {value.manualContactIds.length} contact{value.manualContactIds.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      )}

      {/* Import List */}
      {value.type === 'import' && (
        <div className="space-y-3">
          <div>
            <Label htmlFor="csv-upload">Upload Contact List (CSV)</Label>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              CSV should have columns: email (required), first_name, last_name
            </p>
          </div>

          {isUploading && (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Processing file...</span>
            </div>
          )}

          {value.importedContacts.length > 0 && (
            <div className="border rounded-md p-3 bg-muted/30">
              <p className="text-sm font-medium mb-2">
                {value.importedContacts.length} contact{value.importedContacts.length !== 1 ? 's' : ''} imported
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {value.importedContacts.slice(0, 5).map((contact, index) => (
                  <div key={index} className="text-xs text-muted-foreground">
                    {contact.first_name || ''} {contact.last_name || ''} ({contact.email})
                  </div>
                ))}
                {value.importedContacts.length > 5 && (
                  <div className="text-xs text-muted-foreground font-medium">
                    ...and {value.importedContacts.length - 5} more
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => onChange({ ...value, importedContacts: [] })}
              >
                Clear List
              </Button>
            </div>
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
              : value.type === 'manual' && value.manualContactIds.length === 0
              ? 'Select contacts to see preview'
              : value.type === 'import' && value.importedContacts.length === 0
              ? 'Upload a CSV file to see contacts'
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
    manualContactIds: initial?.manualContactIds || [],
    importedContacts: initial?.importedContacts || [],
  });

  return [selection, setSelection];
}

// Export default audience selection
export const DEFAULT_AUDIENCE_SELECTION: AudienceSelection = {
  type: 'all',
  tags: [],
  tagsMatch: 'any',
  segmentId: null,
  manualContactIds: [],
  importedContacts: [],
};
