import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Tag, Filter, X, Eye, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';

interface CampaignBuilderProps {
  businessId: string;
  campaignId?: string;
  onSave?: (campaignId: string) => void;
  onCancel?: () => void;
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
  last_computed_count: number | null;
}

interface PreviewContact {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface VerifiedSender {
  id: string;
  email: string;
  name: string;
  is_default: boolean;
}

export function CampaignBuilder({ businessId, campaignId, onSave, onCancel }: CampaignBuilderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [selectedSenderId, setSelectedSenderId] = useState<string | null>(null);
  const [targetType, setTargetType] = useState<'all' | 'tags' | 'segment'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagsMatch, setTagsMatch] = useState<'all' | 'any'>('any');
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [previewContacts, setPreviewContacts] = useState<PreviewContact[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Fetch verified senders for this business
  const { data: senders = [], isLoading: loadingSenders } = useQuery({
    queryKey: ['verified-senders', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verified_senders')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name');
      if (error) throw error;
      return data as VerifiedSender[];
    },
    enabled: !!businessId
  });

  // Set default sender when senders load and no sender selected
  useEffect(() => {
    if (senders.length > 0 && !selectedSenderId && !campaignId) {
      const defaultSender = senders.find(s => s.is_default) || senders[0];
      if (defaultSender) {
        setSelectedSenderId(defaultSender.id);
      }
    }
  }, [senders, selectedSenderId, campaignId]);

  // Fetch available tags for this business
  const { data: tags } = useQuery({
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
    enabled: !!businessId
  });

  // Fetch available segments for this business
  const { data: segments } = useQuery({
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
    enabled: !!businessId
  });

  // Load existing campaign if editing
  useEffect(() => {
    if (campaignId) {
      loadCampaign(campaignId);
    }
  }, [campaignId]);

  const loadCampaign = async (id: string) => {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', id)
      .single();
    
    if (data && !error) {
      setName(data.name || '');
      setSubject(data.subject || '');
      setContentHtml(data.content_html || '');
      // Find sender by email match when editing existing campaign
      const matchingSender = senders.find(s => s.email === data.from_email);
      if (matchingSender) {
        setSelectedSenderId(matchingSender.id);
      }
      setTargetType((data.target_type as 'all' | 'tags' | 'segment') || 'all');
      setSelectedTags(data.target_tags || []);
      setTagsMatch((data.target_tags_match as 'all' | 'any') || 'any');
      setSelectedSegmentId(data.target_segment_id || null);
    }
  };

  // Preview recipients when targeting changes
  useEffect(() => {
    if (businessId) {
      previewRecipients();
    }
  }, [businessId, targetType, selectedTags, tagsMatch, selectedSegmentId]);

  const previewRecipients = async () => {
    setIsLoadingPreview(true);
    try {
      let query = supabase
        .from('contacts')
        .select('id, email, first_name, last_name', { count: 'exact' })
        .eq('business_id', businessId)
        .eq('email_status', 'subscribed')
        .not('email', 'is', null);

      if (targetType === 'tags' && selectedTags.length > 0) {
        if (tagsMatch === 'all') {
          query = query.contains('tags', selectedTags);
        } else {
          query = query.overlaps('tags', selectedTags);
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
    setSelectedTags(prev => 
      prev.includes(tagSlug) 
        ? prev.filter(t => t !== tagSlug)
        : [...prev, tagSlug]
    );
  };

  const selectedSender = senders.find(s => s.id === selectedSenderId);

  const saveCampaign = useMutation({
    mutationFn: async () => {
      if (!selectedSender) {
        throw new Error('Please select a verified sender');
      }
      
      const campaignData = {
        business_id: businessId,
        name,
        subject,
        content_html: contentHtml,
        from_name: selectedSender.name,
        from_email: selectedSender.email,
        target_type: targetType,
        target_tags: targetType === 'tags' ? selectedTags : [],
        target_tags_match: tagsMatch,
        target_segment_id: targetType === 'segment' ? selectedSegmentId : null,
        status: 'draft'
      };

      if (campaignId) {
        const { data, error } = await supabase
          .from('email_campaigns')
          .update(campaignData)
          .eq('id', campaignId)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('email_campaigns')
          .insert(campaignData)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      toast({ title: 'Campaign saved', description: 'Your campaign has been saved as a draft.' });
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      onSave?.(data.id);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const getTagColor = (color: string | null) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      gray: 'bg-muted text-muted-foreground border-border',
      red: 'bg-red-100 text-red-800 border-red-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[color || 'gray'] || colors.gray;
  };

  return (
    <div className="space-y-6">
      {/* Campaign Details */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="campaign-name">Campaign Name</Label>
            <Input
              id="campaign-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., January Newsletter"
            />
          </div>

          <div>
            <Label htmlFor="sender">Send From</Label>
            {loadingSenders ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading senders...</span>
              </div>
            ) : senders.length === 0 ? (
              <div className="flex items-center gap-2 p-3 border rounded-md bg-destructive/10 border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">
                  No verified senders configured. Contact admin to add sender addresses.
                </span>
              </div>
            ) : (
              <Select 
                value={selectedSenderId || ''} 
                onValueChange={(v) => setSelectedSenderId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a verified sender..." />
                </SelectTrigger>
                <SelectContent>
                  {senders.map((sender) => (
                    <SelectItem key={sender.id} value={sender.id}>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{sender.name}</span>
                        <span className="text-muted-foreground">({sender.email})</span>
                        {sender.is_default && (
                          <Badge variant="secondary" className="ml-1 text-xs">Default</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., New classes starting this month!"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use {'{first_name}'} for personalization
            </p>
          </div>

          <div>
            <Label htmlFor="content">Email Body</Label>
            <Textarea
              id="content"
              value={contentHtml}
              onChange={(e) => setContentHtml(e.target.value)}
              placeholder="Write your email content here..."
              rows={8}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Available tokens: {'{first_name}'}, {'{last_name}'}, {'{email}'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Targeting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recipients
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Target Audience</Label>
            <Select value={targetType} onValueChange={(v: 'all' | 'tags' | 'segment') => setTargetType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    All Subscribed Contacts
                  </div>
                </SelectItem>
                <SelectItem value="tags">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    By Tags
                  </div>
                </SelectItem>
                <SelectItem value="segment">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    By Segment
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tag Selection */}
          {targetType === 'tags' && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Label>Match</Label>
                <Select value={tagsMatch} onValueChange={(v: 'all' | 'any') => setTagsMatch(v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any tag</SelectItem>
                    <SelectItem value="all">All tags</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags?.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className={`cursor-pointer transition-all ${
                      selectedTags.includes(tag.slug)
                        ? getTagColor(tag.color)
                        : 'bg-transparent hover:bg-muted'
                    }`}
                    onClick={() => toggleTag(tag.slug)}
                  >
                    {tag.name}
                    {selectedTags.includes(tag.slug) && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
              {selectedTags.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Select at least one tag to target
                </p>
              )}
            </div>
          )}

          {/* Segment Selection */}
          {targetType === 'segment' && (
            <div>
              <Label>Select Segment</Label>
              <Select 
                value={selectedSegmentId || ''} 
                onValueChange={(v) => setSelectedSegmentId(v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a segment..." />
                </SelectTrigger>
                <SelectContent>
                  {segments?.map((segment) => (
                    <SelectItem key={segment.id} value={segment.id}>
                      {segment.name}
                      {segment.last_computed_count !== null && (
                        <span className="text-muted-foreground ml-2">
                          ({segment.last_computed_count} contacts)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {segments?.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  No segments created yet. Create segments in Settings.
                </p>
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
                  {recipientCount?.toLocaleString() || 0} contacts
                </Badge>
              )}
            </div>
            {previewContacts.length > 0 ? (
              <div className="space-y-1 text-sm">
                {previewContacts.map((contact) => (
                  <div key={contact.id} className="text-muted-foreground">
                    {contact.first_name} {contact.last_name} ({contact.email})
                  </div>
                ))}
                {(recipientCount || 0) > 5 && (
                  <div className="text-muted-foreground">
                    ...and {(recipientCount || 0) - 5} more
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {targetType === 'tags' && selectedTags.length === 0
                  ? 'Select tags to see matching contacts'
                  : 'No contacts match this targeting'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          onClick={() => saveCampaign.mutate()}
          disabled={!name || !subject || !contentHtml || !selectedSenderId || saveCampaign.isPending}
        >
          {saveCampaign.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Draft
        </Button>
      </div>
    </div>
  );
}
