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
import { Loader2, Mail, Send, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AudienceSelector, AudienceSelection, DEFAULT_AUDIENCE_SELECTION } from './AudienceSelector';

interface CampaignBuilderProps {
  businessId: string;
  campaignId?: string;
  onSave?: (campaignId: string) => void;
  onCancel?: () => void;
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
  const [audience, setAudience] = useState<AudienceSelection>(DEFAULT_AUDIENCE_SELECTION);
  
  // Test email dialog state
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

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
      // Map legacy target_type to new audience type
      const targetType = data.target_type as string;
      setAudience({
        type: (targetType === 'all' || targetType === 'tags' || targetType === 'segment' || targetType === 'leads' || targetType === 'customers' || targetType === 'manual' || targetType === 'import') 
          ? targetType as AudienceSelection['type']
          : 'all',
        tags: data.target_tags || [],
        tagsMatch: (data.target_tags_match as 'all' | 'any') || 'any',
        segmentId: data.target_segment_id || null,
        manualContactIds: data.target_manual_contacts || [],
        importedContacts: data.target_imported_contacts || [],
      });
    }
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
        target_type: audience.type,
        target_tags: audience.type === 'tags' ? audience.tags : [],
        target_tags_match: audience.tagsMatch,
        target_segment_id: audience.type === 'segment' ? audience.segmentId : null,
        target_manual_contacts: audience.type === 'manual' ? audience.manualContactIds : [],
        target_imported_contacts: audience.type === 'import' ? audience.importedContacts : [],
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

  const sendTestEmail = async () => {
    if (!testEmailAddress) {
      toast({ 
        title: 'Enter Email', 
        description: 'Please enter an email address to send the test to.',
        variant: 'destructive'
      });
      return;
    }
    
    if (!campaignId) {
      toast({ 
        title: 'Save First', 
        description: 'Please save the campaign as a draft before sending a test.',
        variant: 'destructive'
      });
      return;
    }

    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { 
          campaign_id: campaignId, 
          test_email: testEmailAddress 
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({ 
          title: 'Test Sent!', 
          description: `Test email sent to ${testEmailAddress}` 
        });
        setIsTestDialogOpen(false);
        setTestEmailAddress('');
      } else {
        throw new Error(data?.error || 'Failed to send test');
      }
    } catch (err: any) {
      toast({ 
        title: 'Test Failed', 
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsSendingTest(false);
    }
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

      {/* Audience Selection */}
      <AudienceSelector
        businessId={businessId}
        value={audience}
        onChange={setAudience}
      />

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        
        {/* Send Test Email Dialog */}
        <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={!campaignId}>
              <Send className="h-4 w-4 mr-2" />
              Send Test
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Test Email</DialogTitle>
              <DialogDescription>
                Send a preview of this campaign to verify it looks correct. The subject will be prefixed with [TEST].
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="test-email">Email Address</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={sendTestEmail} 
                disabled={!testEmailAddress || isSendingTest}
              >
                {isSendingTest && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Test
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
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
