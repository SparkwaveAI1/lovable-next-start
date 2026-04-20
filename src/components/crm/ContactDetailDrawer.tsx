import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Phone, Building2, GitBranch, MessageCircle, Send, Clock, ExternalLink, CheckCircle, XCircle, Eye } from 'lucide-react';

export interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string | null;
  pipeline_stage: string | null;
  tags: string[] | null;
  last_activity_date: string | null;
  created_at: string;
  comments?: string | null;
}

interface ContactDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  contact: Contact | null;
  onActionComplete?: () => void;
}

function StatusBadge({ status }: { status: string | null }) {
  const config: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    new_lead: { label: 'New Lead', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    lead: { label: 'Lead', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    qualified: { label: 'Qualified', className: 'bg-green-100 text-green-700 border-green-200' },
    trial: { label: 'Trial', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    member: { label: 'Member', className: 'bg-purple-100 text-purple-700 border-purple-200' },
    active_member: { label: 'Active Member', className: 'bg-purple-100 text-purple-700 border-purple-200' },
    inactive: { label: 'Inactive', className: 'bg-slate-100 text-slate-500 border-slate-200' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-200' },
  };
  const key = status?.toLowerCase() ?? '';
  const s = config[key] ?? {
    label: status
      ? status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : 'Unknown',
    className: 'bg-slate-100 text-slate-400 border-slate-200',
  };
  return (
    <Badge variant="outline" className={`text-xs ${s.className}`}>
      {s.label}
    </Badge>
  );
}

const QUICK_ACTIONS: Array<{
  label: string;
  activityType: string;
  newStage: string | null;
  variant?: 'default' | 'outline' | 'destructive';
}> = [
  { label: 'Mark Follow-up', activityType: 'follow_up_sent', newStage: null, variant: 'outline' },
  { label: 'Book Call', activityType: 'call_booked', newStage: 'proposal', variant: 'outline' },
  { label: 'Mark Won', activityType: 'won', newStage: 'closed_won', variant: 'default' },
  { label: 'Mark Lost', activityType: 'lost', newStage: 'closed_lost', variant: 'destructive' },
];

export function ContactDetailDrawer({
  open,
  onClose,
  contact,
  onActionComplete,
}: ContactDetailDrawerProps) {
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [outreachHistory, setOutreachHistory] = useState<any[]>([]);
  const [isLoadingOutreach, setIsLoadingOutreach] = useState(false);

  // Fetch messages for this contact
  useEffect(() => {
    if (!contact?.id || activeTab !== 'messages') return;
    
    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      try {
        // Get threads for this contact
        const { data: threads } = await supabase
          .from('conversation_threads')
          .select('id')
          .eq('contact_id', contact.id);
        
        if (!threads || threads.length === 0) {
          setMessages([]);
          return;
        }
        
        const threadIds = threads.map(t => t.id);
        
        // Get messages for all threads
        const { data: msgs } = await supabase
          .from('sms_messages')
          .select('*')
          .in('thread_id', threadIds)
          .order('created_at', { ascending: true });
        
        setMessages(msgs || []);
      } catch (err) {
        console.error('Failed to fetch messages:', err);
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    
    fetchMessages();
  }, [contact?.id, activeTab]);

  // Fetch outreach history (emails, SMS, activities) for this contact
  useEffect(() => {
    if (!contact?.id) return;

    const fetchOutreach = async () => {
      setIsLoadingOutreach(true);
      try {
        const results: any[] = [];

        // Fetch email sends
        const { data: emails } = await supabase
          .from('email_sends')
          .select('id, subject, to_email, status, sent_at, opened_at, clicked_at, bounced_at, created_at')
          .eq('contact_id', contact.id)
          .order('created_at', { ascending: false });

        if (emails) {
          for (const e of emails) {
            results.push({
              id: e.id,
              type: 'email',
              label: e.subject || '(no subject)',
              status: e.status,
              sent_at: e.sent_at || e.created_at,
              opened: !!e.opened_at,
              clicked: !!e.clicked_at,
              bounced: !!e.bounced_at,
            });
          }
        }

        // Fetch SMS messages
        const { data: sms } = await supabase
          .from('sms_messages')
          .select('id, direction, message, created_at, ai_response')
          .eq('contact_id', contact.id)
          .order('created_at', { ascending: false });

        if (sms) {
          for (const s of sms) {
            results.push({
              id: s.id,
              type: 'sms',
              direction: s.direction,
              label: s.direction === 'inbound' ? 'Incoming SMS' : `Outgoing SMS${s.ai_response ? ' (AI)' : ''}`,
              status: s.direction,
              sent_at: s.created_at,
              preview: s.message?.substring(0, 80),
            });
          }
        }

        // Fetch sales activities
        const { data: activities } = await supabase
          .from('sales_activities')
          .select('id, activity_type, description, created_at, metadata')
          .eq('metadata->>contact_id', contact.id)
          .order('created_at', { ascending: false });

        if (activities) {
          for (const a of activities) {
            results.push({
              id: a.id,
              type: 'activity',
              label: a.activity_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Activity',
              status: 'completed',
              sent_at: a.created_at,
              description: a.description,
            });
          }
        }

        // Sort by date descending
        results.sort((a, b) => new Date(b.sent_at || 0).getTime() - new Date(a.sent_at || 0).getTime());
        setOutreachHistory(results);
      } catch (err) {
        console.error('Failed to fetch outreach history:', err);
        setOutreachHistory([]);
      } finally {
        setIsLoadingOutreach(false);
      }
    };

    fetchOutreach();
  }, [contact?.id]);

  // Sync notes when contact changes
  useEffect(() => {
    setNotesValue(contact?.comments ?? '');
  }, [contact?.id, contact?.comments]);

  if (!contact) return null;

  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unknown';

  const handleSaveNotes = async () => {
    if (!contact) return;
    setIsSavingNotes(true);
    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          comments: notesValue,
          last_activity_date: new Date().toISOString(),
        })
        .eq('id', contact.id);

      if (error) throw error;

      toast.success('Notes saved');
      onActionComplete?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleQuickAction = async (activityType: string, newStage: string | null) => {
    setActionLoading(activityType);
    try {
      const { error: actError } = await supabase.from('sales_activities').insert({
        activity_type: activityType,
        prospect_name: fullName,
        company_name: contact.source || '',
        description: `Action: ${activityType} from SWapp`,
        metadata: { contact_id: contact.id },
      });
      if (actError) throw actError;

      const { error: contactError } = await supabase
        .from('contacts')
        .update({
          pipeline_stage: newStage ?? contact.pipeline_stage,
          last_activity_date: new Date().toISOString(),
        })
        .eq('id', contact.id);
      if (contactError) throw contactError;

      toast.success('Action recorded');
      onActionComplete?.();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        {/* Header */}
        <SheetHeader className="mb-4">
          <div className="flex items-center gap-3 flex-wrap pr-6">
            <SheetTitle className="text-xl">{fullName}</SheetTitle>
            <StatusBadge status={contact.status} />
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 w-full justify-start">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="messages">
              <MessageCircle className="h-4 w-4 mr-1" />
              Messages
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-6">
            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Contact Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{contact.email || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{contact.phone || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{contact.source || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{contact.pipeline_stage || '—'}</span>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Outreach History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Outreach History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingOutreach ? (
                  <div className="flex items-center justify-center py-4">
                    <Clock className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : outreachHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No outreach activity yet for this contact.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {outreachHistory.map((item) => (
                      <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 py-2 border-b last:border-0">
                        <div className="mt-0.5 shrink-0">
                          {item.type === 'email' && <Mail className="h-4 w-4 text-blue-500" />}
                          {item.type === 'sms' && item.direction === 'inbound' && <MessageCircle className="h-4 w-4 text-green-500" />}
                          {item.type === 'sms' && item.direction !== 'inbound' && <Send className="h-4 w-4 text-orange-500" />}
                          {item.type === 'activity' && <CheckCircle className="h-4 w-4 text-purple-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{item.label}</span>
                            {item.type === 'email' && item.opened && (
                              <Eye className="h-3 w-3 text-green-500 shrink-0" title="Opened" />
                            )}
                            {item.type === 'email' && item.clicked && (
                              <ExternalLink className="h-3 w-3 text-blue-500 shrink-0" title="Clicked" />
                            )}
                            {item.type === 'email' && item.bounced && (
                              <XCircle className="h-3 w-3 text-red-500 shrink-0" title="Bounced" />
                            )}
                            {item.type === 'email' && item.status && (
                              <Badge variant="outline" className="text-[10px] h-4 shrink-0">
                                {item.status}
                              </Badge>
                            )}
                          </div>
                          {item.preview && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{item.preview}</p>
                          )}
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {item.sent_at ? new Date(item.sent_at).toLocaleString() : 'Pending'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Notes
              </h3>
              <Textarea
                placeholder="Add notes about this contact..."
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <Button
                size="sm"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
              >
                {isSavingNotes ? 'Saving...' : 'Save Notes'}
              </Button>
            </div>

            <Separator />

            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map(({ label, activityType, newStage, variant }) => (
                  <Button
                    key={activityType}
                    variant={variant ?? 'outline'}
                    size="sm"
                    disabled={actionLoading !== null}
                    onClick={() => handleQuickAction(activityType, newStage)}
                  >
                    {actionLoading === activityType ? 'Working...' : label}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="messages">
            <ScrollArea className="h-[500px] pr-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No messages for this contact yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          msg.direction === 'inbound'
                            ? 'bg-muted'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-1 text-xs opacity-70 mb-1">
                          {msg.direction === 'inbound' ? (
                            <MessageCircle className="h-3 w-3" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          <span>{new Date(msg.created_at).toLocaleString()}</span>
                          {msg.is_ai_response && (
                            <Badge variant="outline" className="ml-1 text-[10px] h-4">
                              AI
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
