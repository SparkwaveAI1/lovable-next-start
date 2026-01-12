import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, MessageSquare, Calendar, User, Activity,
  Mail, Phone, Sparkles, X, Send, ChevronDown, Pencil, Save
} from 'lucide-react';
import { formatToEasternDateTime, formatToEasternDate } from '@/lib/dateUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  comments: string;
  created_at: string;
  business_id: string;
  email_status?: string;
  sms_status?: string;
  tags?: string[];
  preferred_channel?: string;
  pipeline_stage?: string;
  lead_type?: string;
}

// Status options for contacts
const STATUS_OPTIONS = [
  { value: 'new_lead', label: 'New Lead' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'active_member', label: 'Active Member' },
  { value: 'inactive', label: 'Inactive' },
];

// Pipeline stage options
const PIPELINE_STAGE_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

// Phone normalization function for E.164 format
function normalizePhoneNumber(phoneNumber: string): string | null {
  if (!phoneNumber) return null;

  // Remove all non-numeric characters except leading +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // If already has +, keep it
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Remove all non-numeric characters
  const digits = phoneNumber.replace(/\D/g, '');

  if (digits.length === 10) {
    // 10 digits: assume US number, add country code
    return '+1' + digits;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // 11 digits starting with 1: already has US country code
    return '+' + digits;
  }

  // Return as-is if we can't normalize
  return phoneNumber;
}

interface SMSMessage {
  id: string;
  direction: string;
  message: string;
  ai_response: boolean;
  created_at: string;
}

interface EmailSend {
  id: string;
  status: string;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  campaign_id: string;
}

interface ClassBooking {
  id: string;
  booking_date: string;
  status: string;
  notes: string;
  class_schedule: {
    class_name: string;
    instructor: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
  };
}

// Unified message for conversation timeline
interface UnifiedMessage {
  id: string;
  type: 'sms' | 'email' | 'form';
  direction: 'inbound' | 'outbound';
  content: string;
  created_at: string;
  metadata?: {
    ai_response?: boolean;
    email_status?: string;
    form_name?: string;
  };
}

type MessageChannel = 'sms' | 'email';

interface ContactTag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

export function ContactDetail({ contactId, onBack }: { contactId: string; onBack: () => void }) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [emails, setEmails] = useState<EmailSend[]>([]);
  const [bookings, setBookings] = useState<ClassBooking[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [unifiedMessages, setUnifiedMessages] = useState<UnifiedMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<MessageChannel>('sms');

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedContact, setEditedContact] = useState<Partial<Contact>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Fetch available tags from contact_tags table
  const { data: availableTags = [] } = useQuery({
    queryKey: ['contact-tags', contact?.business_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_tags')
        .select('*')
        .eq('business_id', contact?.business_id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as ContactTag[];
    },
    enabled: !!contact?.business_id
  });

  useEffect(() => {
    loadContactDetails();
  }, [contactId]);

  // Build unified timeline when data changes
  useEffect(() => {
    const unified: UnifiedMessage[] = [];

    // Add SMS messages
    messages.forEach(msg => {
      unified.push({
        id: `sms-${msg.id}`,
        type: 'sms',
        direction: msg.direction as 'inbound' | 'outbound',
        content: msg.message,
        created_at: msg.created_at,
        metadata: { ai_response: msg.ai_response }
      });
    });

    // Add form submissions from interactions
    interactions.forEach(interaction => {
      if (interaction.automation_type === 'contact_created') {
        const formName = interaction.source_data?.data?.formName || 'Form Submission';
        unified.push({
          id: `form-${interaction.id}`,
          type: 'form',
          direction: 'inbound',
          content: `Submitted: ${formName}`,
          created_at: interaction.created_at,
          metadata: { form_name: formName }
        });
      }
    });

    // Sort by date ascending
    unified.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    setUnifiedMessages(unified);
  }, [messages, emails, interactions]);

  const loadContactDetails = async () => {
    setIsLoading(true);
    
    // Load contact info
    const { data: contactData, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError) {
      console.error('Error loading contact:', contactError);
    } else {
      setContact(contactData);
      // Set preferred channel if available
      if (contactData?.preferred_channel === 'email' && contactData?.email) {
        setSelectedChannel('email');
      } else if (contactData?.phone) {
        setSelectedChannel('sms');
      } else if (contactData?.email) {
        setSelectedChannel('email');
      }
    }

    // Load SMS messages
    const { data: messagesData, error: messagesError } = await supabase
      .from('sms_messages')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error loading messages:', messagesError);
    } else {
      setMessages(messagesData || []);
    }

    // Load email sends for this contact
    const { data: emailData, error: emailError } = await supabase
      .from('email_sends')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: true });

    if (emailError) {
      console.error('Error loading emails:', emailError);
    } else {
      setEmails(emailData || []);
    }

    // Load class bookings
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('class_bookings')
      .select(`
        *,
        class_schedule (
          class_name,
          instructor,
          day_of_week,
          start_time,
          end_time
        )
      `)
      .eq('contact_id', contactId);

    if (bookingsError) {
      console.error('Error loading bookings:', bookingsError);
    } else {
      setBookings(bookingsData || []);
    }

    // Load automation logs (interaction history)
    const { data: logsData, error: logsError } = await supabase
      .from('automation_logs')
      .select('*')
      .contains('processed_data', { contact_id: contactId })
      .order('created_at', { ascending: false });

    if (logsError) {
      console.error('Error loading interactions:', logsError);
    } else {
      setInteractions(logsData || []);
    }

    setIsLoading(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !contact) return;
    
    if (selectedChannel === 'sms' && !contact.phone) {
      toast.error('No phone number available for SMS');
      return;
    }
    
    if (selectedChannel === 'email' && !contact.email) {
      toast.error('No email address available');
      return;
    }

    setIsSending(true);
    
    try {
      if (selectedChannel === 'sms') {
        // Send SMS
        const { data, error } = await supabase.functions.invoke('send-sms', {
          body: {
            to: contact.phone,
            message: newMessage,
            businessId: contact.business_id
          }
        });

        if (error || !data.success) {
          toast.error('Failed to send SMS');
          return;
        }

        // Store the outbound message
        await supabase.from('sms_messages').insert({
          contact_id: contactId,
          direction: 'outbound',
          message: newMessage,
          ai_response: false
        });

        toast.success('SMS sent successfully');
      } else {
        // Send Email
        if (!emailSubject.trim()) {
          toast.error('Please enter an email subject');
          setIsSending(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('send-email', {
          body: {
            to: contact.email,
            subject: emailSubject,
            html: `<p>${newMessage.replace(/\n/g, '<br/>')}</p>`,
            text: newMessage,
            contact_id: contactId,
            business_id: contact.business_id
          }
        });

        if (error || !data.success) {
          toast.error('Failed to send email');
          return;
        }

        toast.success('Email sent successfully');
        setEmailSubject('');
      }

      setNewMessage('');
      loadContactDetails();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error sending message');
    } finally {
      setIsSending(false);
    }
  };

  const generateAIMessage = async () => {
    if (!contact) return;
    
    setIsGeneratingAI(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-response', {
        body: {
          contactName: `${contact.first_name} ${contact.last_name}`,
          context: `Generate a friendly ${selectedChannel === 'sms' ? 'SMS message (keep under 160 chars)' : 'email'} for a ${contact.source || 'new'} contact.`,
          recentMessages: unifiedMessages.slice(-5).map(m => ({
            role: m.direction === 'inbound' ? 'user' : 'assistant',
            content: m.content
          }))
        }
      });

      if (error) throw error;
      
      if (data?.response) {
        setNewMessage(data.response);
        toast.success('AI message generated');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate AI message');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const addTag = async (tagSlug: string) => {
    if (!tagSlug || !contact) return;

    // Don't add if already exists
    if ((contact.tags || []).includes(tagSlug)) return;

    try {
      const updatedTags = [...(contact.tags || []), tagSlug];
      const { error } = await supabase
        .from('contacts')
        .update({ tags: updatedTags })
        .eq('id', contactId);

      if (error) throw error;

      setContact({ ...contact, tags: updatedTags });
      toast.success('Tag added');
    } catch (error) {
      console.error('Error adding tag:', error);
      toast.error('Failed to add tag');
    }
  };

  const removeTag = async (tagToRemove: string) => {
    if (!contact) return;
    
    try {
      const updatedTags = (contact.tags || []).filter(t => t !== tagToRemove);
      const { error } = await supabase
        .from('contacts')
        .update({ tags: updatedTags })
        .eq('id', contactId);
      
      if (error) throw error;
      
      setContact({ ...contact, tags: updatedTags });
      toast.success('Tag removed');
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Failed to remove tag');
    }
  };

  const formatDate = (dateString: string) => formatToEasternDateTime(dateString);

  const formatStatusLabel = (status: string) => {
    return status?.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ') || '';
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new_lead': return 'default';
      case 'qualified': return 'secondary';
      case 'active_member': return 'outline';
      default: return 'destructive';
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'sms': return <Phone className="h-3 w-3" />;
      case 'email': return <Mail className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  // Edit mode handlers
  const enterEditMode = () => {
    if (!contact) return;
    setEditedContact({
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      status: contact.status || 'new_lead',
      pipeline_stage: contact.pipeline_stage || 'new',
      lead_type: contact.lead_type || '',
      comments: contact.comments || '',
    });
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setEditedContact({});
  };

  const handleFieldChange = (field: keyof Contact, value: string) => {
    setEditedContact(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!contact) return;

    setIsSaving(true);
    try {
      // Normalize phone number before saving
      const normalizedPhone = editedContact.phone
        ? normalizePhoneNumber(editedContact.phone)
        : null;

      const updateData = {
        first_name: editedContact.first_name?.trim() || 'Unknown',
        last_name: editedContact.last_name?.trim() || '',
        email: editedContact.email?.trim().toLowerCase() || null,
        phone: normalizedPhone,
        status: editedContact.status || 'new_lead',
        pipeline_stage: editedContact.pipeline_stage || null,
        lead_type: editedContact.lead_type?.trim() || null,
        comments: editedContact.comments?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', contact.id);

      if (error) throw error;

      // Update local state with saved values
      setContact({ ...contact, ...updateData });
      setIsEditMode(false);
      setEditedContact({});
      toast.success('Contact updated successfully');
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error('Failed to save contact');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading contact details...</p>
        </CardContent>
      </Card>
    );
  }

  if (!contact) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">Contact not found</h3>
        </CardContent>
      </Card>
    );
  }

  const canSendSMS = contact.phone && contact.sms_status !== 'opted_out';
  const canSendEmail = contact.email && contact.email_status !== 'unsubscribed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h2 className="text-2xl font-bold text-foreground">
          {contact.first_name} {contact.last_name}
        </h2>
        <Badge variant={getStatusBadgeVariant(contact.status)}>
          {formatStatusLabel(contact.status)}
        </Badge>
        
        {/* Email/SMS Status Badges */}
        <div className="flex gap-2 ml-auto">
          {contact.email && (
            <Badge variant={contact.email_status === 'subscribed' ? 'outline' : 'destructive'} className="gap-1">
              <Mail className="h-3 w-3" />
              {contact.email_status || 'subscribed'}
            </Badge>
          )}
          {contact.phone && (
            <Badge variant={contact.sms_status === 'active' ? 'outline' : 'destructive'} className="gap-1">
              <Phone className="h-3 w-3" />
              {contact.sms_status || 'active'}
            </Badge>
          )}
        </div>
      </div>

      {/* Tags Section */}
      <Card className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">Tags:</span>
          {(contact.tags || []).map((tagSlug) => {
            const tagInfo = availableTags.find(t => t.slug === tagSlug);
            return (
              <Badge key={tagSlug} variant="secondary" className="gap-1">
                {tagInfo?.name || tagSlug}
                <button onClick={() => removeTag(tagSlug)} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {/* Tag dropdown - only show tags not already applied */}
          {(() => {
            const appliedTags = contact.tags || [];
            const unusedTags = availableTags.filter(t => !appliedTags.includes(t.slug));
            if (unusedTags.length === 0) return null;
            return (
              <Select onValueChange={addTag}>
                <SelectTrigger className="w-32 h-7 text-xs">
                  <SelectValue placeholder="Add tag..." />
                </SelectTrigger>
                <SelectContent>
                  {unusedTags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.slug}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })()}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </span>
              {!isEditMode ? (
                <Button variant="outline" size="sm" onClick={enterEditMode}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-1" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditMode ? (
              <>
                {/* Edit Mode Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">First Name</label>
                    <Input
                      value={editedContact.first_name || ''}
                      onChange={(e) => handleFieldChange('first_name', e.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                    <Input
                      value={editedContact.last_name || ''}
                      onChange={(e) => handleFieldChange('last_name', e.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    value={editedContact.email || ''}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <Input
                    type="tel"
                    value={editedContact.phone || ''}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Select
                    value={editedContact.status || 'new_lead'}
                    onValueChange={(value) => handleFieldChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Pipeline Stage</label>
                  <Select
                    value={editedContact.pipeline_stage || 'new'}
                    onValueChange={(value) => handleFieldChange('pipeline_stage', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Lead Type</label>
                  <Input
                    value={editedContact.lead_type || ''}
                    onChange={(e) => handleFieldChange('lead_type', e.target.value)}
                    placeholder="e.g., Referral, Website, Event"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Comments / Notes</label>
                  <Textarea
                    value={editedContact.comments || ''}
                    onChange={(e) => handleFieldChange('comments', e.target.value)}
                    placeholder="Add notes about this contact..."
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <>
                {/* View Mode Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">First Name</label>
                    <div className="text-foreground">{contact.first_name || 'Unknown'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                    <div className="text-foreground">{contact.last_name || '-'}</div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <div className="text-foreground">{contact.email || 'Not provided'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <div className="text-foreground">{contact.phone || 'Not provided'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="text-foreground">{formatStatusLabel(contact.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Pipeline Stage</label>
                  <div className="text-foreground">{formatStatusLabel(contact.pipeline_stage || 'new')}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Lead Type</label>
                  <div className="text-foreground">{contact.lead_type || 'Not set'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Source</label>
                  <div className="text-foreground">{formatStatusLabel(contact.source)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <div className="text-foreground">{formatDate(contact.created_at)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Preferred Channel</label>
                  <div className="text-foreground capitalize">{contact.preferred_channel || 'email'}</div>
                </div>
                {contact.comments && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Comments</label>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{contact.comments}</div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Unified Conversation - Wix Style */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversation
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {unifiedMessages.length} messages
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Unified Message Timeline */}
            {unifiedMessages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No conversation yet</h3>
                <p className="text-sm text-muted-foreground">Send the first message below</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto mb-4 pr-2">
                {unifiedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg border ${
                      msg.direction === 'inbound'
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-secondary/50 border-secondary ml-8'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-foreground flex items-center gap-2">
                        {getChannelIcon(msg.type)}
                        {msg.direction === 'inbound' 
                          ? 'Customer' 
                          : msg.metadata?.ai_response ? 'AI Assistant' : 'Staff'}
                        <Badge variant="outline" className="text-xs">
                          {msg.type.toUpperCase()}
                        </Badge>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(msg.created_at)}
                      </span>
                    </div>
                    <div className="text-sm text-foreground">{msg.content}</div>
                    {msg.metadata?.ai_response && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        AI Generated
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Multi-Channel Composer */}
            <div className="border-t border-border pt-4 space-y-3">
              {/* Channel Selector */}
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      {selectedChannel === 'sms' ? (
                        <>
                          <Phone className="h-4 w-4" />
                          SMS
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          Email
                        </>
                      )}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem 
                      onClick={() => setSelectedChannel('sms')}
                      disabled={!canSendSMS}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      SMS {contact.phone && <span className="text-xs text-muted-foreground ml-2">{contact.phone}</span>}
                      {!canSendSMS && <span className="text-xs text-destructive ml-2">(unavailable)</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSelectedChannel('email')}
                      disabled={!canSendEmail}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email {contact.email && <span className="text-xs text-muted-foreground ml-2">{contact.email}</span>}
                      {!canSendEmail && <span className="text-xs text-destructive ml-2">(unsubscribed)</span>}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <span className="text-sm text-muted-foreground">
                  To: {selectedChannel === 'sms' ? contact.phone : contact.email}
                </span>

                {/* Write with AI Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={generateAIMessage}
                  disabled={isGeneratingAI}
                  className="ml-auto gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {isGeneratingAI ? 'Writing...' : 'Write with AI'}
                </Button>
              </div>

              {/* Email Subject (only for email) */}
              {selectedChannel === 'email' && (
                <input
                  type="text"
                  placeholder="Subject..."
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full p-3 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              )}

              {/* Message Textarea */}
              <textarea
                placeholder={selectedChannel === 'sms' ? "Type your SMS..." : "Type your email..."}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full p-3 border border-input bg-background text-foreground rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                rows={4}
                disabled={isSending}
              />
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {selectedChannel === 'sms' && `${newMessage.length}/160 characters`}
                </span>
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || isSending || (selectedChannel === 'email' && !emailSubject.trim())}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isSending ? 'Sending...' : `Send ${selectedChannel.toUpperCase()}`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class Bookings and Interaction Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Class Bookings ({bookings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No bookings</h3>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {bookings.map((booking) => (
                  <div key={booking.id} className="p-3 border border-border rounded-lg bg-card">
                    <div className="font-medium text-foreground">
                      {booking.class_schedule?.class_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatToEasternDate(booking.booking_date)} • {booking.class_schedule?.start_time}
                    </div>
                    <Badge variant="outline" className="mt-2">
                      {formatStatusLabel(booking.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interaction Timeline */}
        {interactions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Timeline ({interactions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {interactions.map((interaction) => {
                  const formName = interaction.source_data?.data?.formName || '';
                  const message = interaction.processed_data?.message || '';
                  
                  return (
                    <div
                      key={interaction.id}
                      className="p-3 rounded-lg border border-border bg-card/50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline">
                          {interaction.automation_type.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(interaction.created_at)}
                        </span>
                      </div>
                      
                      {interaction.automation_type === 'contact_created' && formName && (
                        <div className="text-sm text-foreground">Form: {formName}</div>
                      )}
                      
                      {interaction.automation_type === 'sms_welcome_sent' && message && (
                        <div className="text-sm text-muted-foreground italic">"{message}"</div>
                      )}
                      
                      {interaction.status === 'error' && interaction.error_message && (
                        <div className="text-xs text-destructive mt-2">
                          Error: {interaction.error_message}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
