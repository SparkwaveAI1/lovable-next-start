import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail, Send, AlertCircle, Eye, Smartphone, Monitor, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { AudienceSelector, AudienceSelection, DEFAULT_AUDIENCE_SELECTION } from './AudienceSelector';
import { RichTextEditor } from './RichTextEditor';
import { EmailPreview } from './EmailPreview';
import { EmailEditor, EmailEditorState, generateEmailHtml, validateEmailContent } from './EmailEditor';

interface EnhancedCampaignBuilderProps {
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

type ScheduleMode = 'immediate' | 'scheduled';
type PreviewMode = 'desktop' | 'mobile';

export function EnhancedCampaignBuilder({ businessId, campaignId, onSave, onCancel }: EnhancedCampaignBuilderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [emailEditorState, setEmailEditorState] = useState<EmailEditorState>({
    blocks: [],
    globalStyles: {
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#ffffff',
      primaryColor: '#2563eb',
      textColor: '#111827',
      linkColor: '#2563eb',
      maxWidth: '600px',
      padding: '20px',
    },
  });
  const [useVisualEditor, setUseVisualEditor] = useState(true);
  const [selectedSenderId, setSelectedSenderId] = useState<string | null>(null);
  const [audience, setAudience] = useState<AudienceSelection>(DEFAULT_AUDIENCE_SELECTION);
  
  // Scheduling state
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('immediate');
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState('09:00');
  
  // Preview state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  
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
      
      // Load visual editor content if available
      if (data.content_json && Array.isArray(data.content_json)) {
        setEmailEditorState({
          blocks: data.content_json,
          globalStyles: data.global_styles || emailEditorState.globalStyles,
        });
        setUseVisualEditor(true);
      } else {
        // Use HTML editor for legacy campaigns
        setUseVisualEditor(false);
      }
      
      // Handle scheduling
      if (data.scheduled_for) {
        setScheduleMode('scheduled');
        const scheduledFor = new Date(data.scheduled_for);
        setScheduledDate(scheduledFor);
        setScheduledTime(format(scheduledFor, 'HH:mm'));
      }
      
      // Find sender by email match when editing existing campaign
      const matchingSender = senders.find(s => s.email === data.from_email);
      if (matchingSender) {
        setSelectedSenderId(matchingSender.id);
      }
      
      // Map database audience_type to component state
      const audienceType = data.audience_type as string;
      setAudience({
        type: (audienceType === 'all_contacts' ? 'all' : 
               audienceType === 'manual_select' ? 'manual' :
               audienceType === 'import_list' ? 'import' :
               audienceType === 'segment' ? 'segment' :
               audienceType === 'list' ? 'tags' : 'all') as AudienceSelection['type'],
        tags: data.segment_filters?.tags || [],
        tagsMatch: 'any', // Default for now
        segmentId: null, // Will be handled by segment_filters
        manualContactIds: data.manual_contact_ids || [],
        importedContacts: [], // Will be handled by import_file_path
      });
    }
  };

  const selectedSender = senders.find(s => s.id === selectedSenderId);

  const getScheduledDateTime = (): Date | null => {
    if (scheduleMode === 'immediate' || !scheduledDate) return null;
    
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const dateTime = new Date(scheduledDate);
    dateTime.setHours(hours, minutes, 0, 0);
    
    return dateTime;
  };

  const saveCampaign = useMutation({
    mutationFn: async () => {
      if (!selectedSender) {
        throw new Error('Please select a verified sender');
      }
      
      // Validate visual editor content if using visual editor
      if (useVisualEditor) {
        const validationErrors = validateEmailContent(emailEditorState);
        if (validationErrors.length > 0) {
          throw new Error(`Please fix the following issues:\n${validationErrors.join('\n')}`);
        }
      }
      
      const scheduledAt = getScheduledDateTime();
      
      // Map audience type to database schema
      const mapAudienceType = (type: AudienceSelection['type']): string => {
        switch (type) {
          case 'all': return 'all_contacts';
          case 'manual': return 'manual_select';
          case 'import': return 'import_list';
          case 'segment': return 'segment';
          case 'tags': return 'segment'; // Tags are handled as segments
          default: return 'all_contacts';
        }
      };

      // Generate HTML from visual editor or use raw HTML
      const finalContentHtml = useVisualEditor ? generateEmailHtml(emailEditorState) : contentHtml;

      const campaignData = {
        business_id: businessId,
        name,
        subject,
        content_html: finalContentHtml,
        content_json: useVisualEditor ? emailEditorState.blocks : null,
        global_styles: useVisualEditor ? emailEditorState.globalStyles : null,
        from_name: selectedSender.name,
        from_email: selectedSender.email,
        audience_type: mapAudienceType(audience.type),
        segment_filters: audience.type === 'tags' || audience.type === 'segment' ? 
          { tags: audience.tags, tagsMatch: audience.tagsMatch } : {},
        manual_contact_ids: audience.type === 'manual' ? audience.manualContactIds : [],
        status: scheduledAt ? 'scheduled' : 'draft',
        scheduled_for: scheduledAt?.toISOString() || null
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
      const action = scheduleMode === 'scheduled' ? 'scheduled' : 'saved';
      toast({ 
        title: `Campaign ${action}`, 
        description: scheduleMode === 'scheduled' 
          ? `Your campaign will be sent on ${format(getScheduledDateTime()!, 'MMM d, yyyy \'at\' h:mm a')}`
          : 'Your campaign has been saved as a draft.'
      });
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
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {campaignId ? 'Edit Campaign' : 'Create Campaign'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Design and send email campaigns to your audience
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Preview Button */}
          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!contentHtml && (!useVisualEditor || emailEditorState.blocks.length === 0)}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>Email Preview</DialogTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={previewMode === 'desktop' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('desktop')}
                    >
                      <Monitor className="h-4 w-4 mr-1" />
                      Desktop
                    </Button>
                    <Button
                      variant={previewMode === 'mobile' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('mobile')}
                    >
                      <Smartphone className="h-4 w-4 mr-1" />
                      Mobile
                    </Button>
                  </div>
                </div>
                <DialogDescription>
                  Preview how your email will appear to recipients
                </DialogDescription>
              </DialogHeader>
              <EmailPreview
                subject={subject}
                content={useVisualEditor ? generateEmailHtml(emailEditorState) : contentHtml}
                senderName={selectedSender?.name || ''}
                senderEmail={selectedSender?.email || ''}
                mode={previewMode}
              />
            </DialogContent>
          </Dialog>
          
          {/* Send Test Button */}
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
        </div>
      </div>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Email Content
                <div className="flex items-center gap-2">
                  <Button
                    variant={useVisualEditor ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUseVisualEditor(true)}
                  >
                    Visual Editor
                  </Button>
                  <Button
                    variant={!useVisualEditor ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUseVisualEditor(false)}
                  >
                    HTML Editor
                  </Button>
                </div>
              </CardTitle>
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
                <Label htmlFor="subject">Subject Line</Label>
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

              {useVisualEditor ? (
                <div>
                  <Label>Email Design</Label>
                  <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                    <EmailEditor
                      value={emailEditorState}
                      onChange={setEmailEditorState}
                      className="h-full"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use the visual editor to design your email with drag-and-drop blocks.
                    Available tokens: {'{first_name}'}, {'{last_name}'}, {'{email}'}
                  </p>
                </div>
              ) : (
                <div>
                  <Label htmlFor="content">Email Body (HTML)</Label>
                  <RichTextEditor
                    value={contentHtml}
                    onChange={setContentHtml}
                    placeholder="Design your email content..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available tokens: {'{first_name}'}, {'{last_name}'}, {'{email}'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audience Tab */}
        <TabsContent value="audience" className="space-y-6">
          <AudienceSelector
            businessId={businessId}
            value={audience}
            onChange={setAudience}
          />
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>When to Send</Label>
                <div className="flex gap-4">
                  <Button
                    variant={scheduleMode === 'immediate' ? 'default' : 'outline'}
                    onClick={() => setScheduleMode('immediate')}
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Send Immediately
                  </Button>
                  <Button
                    variant={scheduleMode === 'scheduled' ? 'default' : 'outline'}
                    onClick={() => setScheduleMode('scheduled')}
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Schedule for Later
                  </Button>
                </div>
              </div>

              {scheduleMode === 'scheduled' && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label>Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {scheduledDate ? format(scheduledDate, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={scheduledDate}
                            onSelect={setScheduledDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex-1">
                      <Label>Time</Label>
                      <Select value={scheduledTime} onValueChange={setScheduledTime}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => {
                            const hour = i.toString().padStart(2, '0');
                            return [`${hour}:00`, `${hour}:30`];
                          }).flat().map(time => (
                            <SelectItem key={time} value={time}>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {scheduledDate && (
                    <div className="text-sm text-muted-foreground">
                      Campaign will be sent on{' '}
                      <span className="font-medium">
                        {format(getScheduledDateTime()!, 'EEEE, MMMM do, yyyy \'at\' h:mm a')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sender Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        
        <Button
          onClick={() => saveCampaign.mutate()}
          disabled={
            !name || 
            !subject || 
            (!useVisualEditor && !contentHtml) ||
            (useVisualEditor && emailEditorState.blocks.length === 0) ||
            !selectedSenderId || 
            saveCampaign.isPending
          }
        >
          {saveCampaign.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {scheduleMode === 'scheduled' ? 'Schedule Campaign' : 'Save Draft'}
        </Button>
      </div>
    </div>
  );
}