import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageSquare, Calendar, User, Activity } from 'lucide-react';
import { formatToEasternDateTime, formatToEasternDate } from '@/lib/dateUtils';

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
}

interface SMSMessage {
  id: string;
  direction: string;
  message: string;
  ai_response: boolean;
  created_at: string;
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

export function ContactDetail({ contactId, onBack }: { contactId: string; onBack: () => void }) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [bookings, setBookings] = useState<ClassBooking[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadContactDetails();
  }, [contactId]);

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

  const sendManualMessage = async () => {
    if (!newMessage.trim() || !contact?.phone) return;
    
    setIsSending(true);
    
    try {
      // Call the send-sms Edge Function
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: contact.phone,
          message: newMessage,
          businessId: contact.business_id
        }
      });

      if (error || !data.success) {
        console.error('SMS sending failed:', error || data.error);
        alert('Failed to send message. Please try again.');
        return;
      }

      // Store the outbound message in conversation history
      const { error: messageError } = await supabase
        .from('sms_messages')
        .insert({
          contact_id: contactId,
          direction: 'outbound',
          message: newMessage,
          ai_response: false
        });

      if (messageError) {
        console.error('Failed to log message:', messageError);
      }

      // Clear the input and reload conversation
      setNewMessage('');
      loadContactDetails(); // Refresh to show the new message
      
      console.log('Manual SMS sent successfully');
    } catch (error) {
      console.error('Error sending SMS:', error);
      alert('Error sending message. Please check your connection.');
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatToEasternDateTime(dateString);
  };

  const formatStatusLabel = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new_lead': return 'default';
      case 'qualified': return 'secondary';
      case 'active_member': return 'outline';
      default: return 'destructive';
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
          <p className="text-sm text-muted-foreground">The contact you're looking for doesn't exist</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contacts
        </Button>
        <h2 className="text-2xl font-bold text-foreground">
          {contact.first_name} {contact.last_name}
        </h2>
        <Badge variant={getStatusBadgeVariant(contact.status)}>
          {formatStatusLabel(contact.status)}
        </Badge>
      </div>

      {/* Interaction Timeline */}
      {interactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Interaction Timeline ({interactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {interactions.map((interaction) => {
                const contact = interaction.source_data?.data?.contact || {};
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
                    
                    {interaction.automation_type === 'contact_created' && (
                      <div className="text-sm space-y-1">
                        <div className="font-medium text-foreground">Form Submitted: {formName}</div>
                        {contact.email && <div className="text-muted-foreground">Email: {contact.email}</div>}
                        {contact.phone && <div className="text-muted-foreground">Phone: {contact.phone}</div>}
                      </div>
                    )}
                    
                    {interaction.automation_type === 'sms_welcome_sent' && message && (
                      <div className="text-sm">
                        <div className="font-medium text-foreground mb-1">Welcome SMS Sent</div>
                        <div className="text-muted-foreground italic">"{message}"</div>
                      </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <div className="text-foreground">{contact.email || 'Not provided'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Phone</label>
              <div className="text-foreground">{contact.phone || 'Not provided'}</div>
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
              <label className="text-sm font-medium text-muted-foreground">Comments</label>
              <div className="text-sm text-foreground">{contact.comments || 'No comments'}</div>
            </div>
          </CardContent>
        </Card>

        {/* SMS Conversation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              SMS Conversation ({messages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No SMS conversation yet</h3>
                <p className="text-sm text-muted-foreground">Messages will appear here when the customer texts</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg border ${
                      msg.direction === 'inbound'
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-secondary/50 border-secondary'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {msg.direction === 'inbound' ? 'Customer' : msg.ai_response ? 'AI Assistant' : 'Staff'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(msg.created_at)}
                      </span>
                    </div>
                    <div className="text-sm text-foreground">{msg.message}</div>
                    {msg.ai_response && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        AI Generated
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Manual Message Sending Interface */}
            {contact.phone && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="space-y-3">
                  <textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="w-full p-3 border border-input bg-background text-foreground rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    rows={3}
                    disabled={isSending}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {newMessage.length}/160 characters
                    </span>
                    <Button
                      onClick={sendManualMessage}
                      disabled={!newMessage.trim() || isSending}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {isSending ? 'Sending...' : 'Send Message'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
                <h3 className="text-lg font-medium text-muted-foreground">No class bookings yet</h3>
                <p className="text-sm text-muted-foreground">Bookings will appear here when classes are scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <div key={booking.id} className="p-3 border border-border rounded-lg bg-card">
                    <div className="font-medium text-foreground">
                      {booking.class_schedule?.class_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Instructor: {booking.class_schedule?.instructor}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Date: {formatToEasternDate(booking.booking_date)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Time: {booking.class_schedule?.start_time} - {booking.class_schedule?.end_time}
                    </div>
                    {booking.notes && (
                      <div className="text-sm text-muted-foreground mt-1">
                        Notes: {booking.notes}
                      </div>
                    )}
                    <Badge variant="outline" className="mt-2">
                      {formatStatusLabel(booking.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}