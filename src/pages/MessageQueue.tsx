import { useState, useEffect } from "react";
import { useBusinesses } from '@/hooks/useBusinesses';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatToEasternCompact } from "@/lib/dateUtils";
import { Mail, MessageSquare, Clock, CheckCircle2, XCircle, Send, Eye } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusinessContext } from "@/contexts/BusinessContext";

interface QueuedMessage {
  id: string;
  business_id: string;
  message_type: 'sms' | 'email';
  recipient_name: string | null;
  recipient_contact: string;
  subject: string | null;
  body: string;
  status: 'pending' | 'approved' | 'rejected' | 'sent';
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  sent_at: string | null;
  metadata: Record<string, any>;
}

export default function MessageQueue() {
  const [messages, setMessages] = useState<QueuedMessage[]>([]);
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [previewMessage, setPreviewMessage] = useState<QueuedMessage | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedBusiness) {
      loadMessages();
    }
  }, [selectedBusiness, statusFilter, typeFilter]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("outbound_message_queue")
        .select("*")
        .eq("business_id", selectedBusiness?.id)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (typeFilter !== "all") {
        query = query.eq("message_type", typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages((data as QueuedMessage[]) || []);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error",
        description: "Failed to load message queue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateMessageStatus = async (messageId: string, newStatus: 'approved' | 'rejected') => {
    setProcessingId(messageId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'approved') {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user?.id;
      }

      const { error } = await supabase
        .from("outbound_message_queue")
        .update(updateData)
        .eq("id", messageId);

      if (error) throw error;

      toast({
        title: newStatus === 'approved' ? "Message Approved" : "Message Rejected",
        description: newStatus === 'approved' 
          ? "Message will be sent shortly" 
          : "Message has been rejected and won't be sent",
      });
      
      setPreviewMessage(null);
      loadMessages();
    } catch (error) {
      console.error("Error updating message:", error);
      toast({
        title: "Error",
        description: "Failed to update message status",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: any }> = {
      pending: { 
        className: "bg-orange-100 text-orange-800 border-orange-300", 
        icon: Clock 
      },
      approved: { 
        className: "bg-blue-100 text-blue-800 border-blue-300", 
        icon: CheckCircle2 
      },
      rejected: { 
        className: "bg-red-100 text-red-800 border-red-300", 
        icon: XCircle 
      },
      sent: { 
        className: "bg-green-100 text-green-800 border-green-300", 
        icon: Send 
      },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border shadow-sm ${config.className}`}>
        <Icon className="h-3.5 w-3.5" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const Icon = type === 'email' ? Mail : MessageSquare;
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {type.toUpperCase()}
      </Badge>
    );
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const stats = {
    total: messages.length,
    pending: messages.filter(m => m.status === "pending").length,
    approved: messages.filter(m => m.status === "approved").length,
    sent: messages.filter(m => m.status === "sent").length,
    rejected: messages.filter(m => m.status === "rejected").length,
  };

  // Count all pending across filters for display
  const [totalPending, setTotalPending] = useState(0);
  useEffect(() => {
    const countPending = async () => {
      if (!selectedBusiness) return;
      const { count } = await supabase
        .from("outbound_message_queue")
        .select("*", { count: 'exact', head: true })
        .eq("business_id", selectedBusiness.id)
        .eq("status", "pending");
      setTotalPending(count || 0);
    };
    countPending();
  }, [selectedBusiness, messages]);

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={(id) => {
        const business = businesses.find(b => b.id === id);
        if (business) setSelectedBusiness(business);
      }}
      businessName={selectedBusiness?.name}
    >
      <main className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Message Approval Queue</h1>
          <p className="text-muted-foreground">
            Review and approve outbound SMS and email messages before they're sent
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className={totalPending > 0 ? "border-orange-300 bg-orange-50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalPending > 0 ? "text-orange-600" : ""}`}>
                {totalPending}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle>Messages</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No messages in queue
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message.id} className="group">
                      <TableCell>{getTypeBadge(message.message_type)}</TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {message.recipient_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {message.recipient_contact}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-sm">
                          {message.subject && (
                            <div className="font-medium">{truncateText(message.subject, 30)}</div>
                          )}
                          <div className="text-muted-foreground">
                            {truncateText(message.body)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(message.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatToEasternCompact(message.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewMessage(message)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {message.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                disabled={processingId === message.id}
                                onClick={() => updateMessageStatus(message.id, 'approved')}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={processingId === message.id}
                                onClick={() => updateMessageStatus(message.id, 'rejected')}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <Dialog open={!!previewMessage} onOpenChange={() => setPreviewMessage(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {previewMessage && getTypeBadge(previewMessage.message_type)}
                Message Preview
              </DialogTitle>
              <DialogDescription>
                Review the message content before approving or rejecting
              </DialogDescription>
            </DialogHeader>
            
            {previewMessage && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Recipient</label>
                    <p className="font-medium">{previewMessage.recipient_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">{previewMessage.recipient_contact}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">{getStatusBadge(previewMessage.status)}</div>
                  </div>
                </div>

                {previewMessage.subject && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Subject</label>
                    <p className="font-medium">{previewMessage.subject}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Message Body</label>
                  <div className="mt-1 p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                    {previewMessage.body}
                  </div>
                </div>

                {previewMessage.metadata && Object.keys(previewMessage.metadata).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Additional Context</label>
                    <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                      {JSON.stringify(previewMessage.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  Created: {formatToEasternCompact(previewMessage.created_at)}
                  {previewMessage.approved_at && (
                    <> • Approved: {formatToEasternCompact(previewMessage.approved_at)}</>
                  )}
                  {previewMessage.sent_at && (
                    <> • Sent: {formatToEasternCompact(previewMessage.sent_at)}</>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              {previewMessage?.status === 'pending' && (
                <>
                  <Button
                    variant="destructive"
                    disabled={processingId === previewMessage?.id}
                    onClick={() => previewMessage && updateMessageStatus(previewMessage.id, 'rejected')}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    variant="default"
                    disabled={processingId === previewMessage?.id}
                    onClick={() => previewMessage && updateMessageStatus(previewMessage.id, 'approved')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approve & Send
                  </Button>
                </>
              )}
              {previewMessage?.status !== 'pending' && (
                <Button variant="outline" onClick={() => setPreviewMessage(null)}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </DashboardLayout>
  );
}
