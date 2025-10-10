import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContentItem {
  content: string;
  hashtags?: string[];
}

interface ContentReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: ContentItem[] | string[]; // Support both old and new format
  businessId: string;
  platform: string;
  contentType: string;
  topic?: string;
  keywords?: string[];
  onSuccess?: () => void; // Callback after successful save
}

export function ContentReviewDialog({
  open,
  onOpenChange,
  content,
  businessId,
  platform,
  contentType,
  topic,
  keywords,
  onSuccess
}: ContentReviewDialogProps) {
  const [decisions, setDecisions] = useState<Record<number, 'pending' | 'approved' | 'rejected'>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<number, string>>({});
  const [tags, setTags] = useState<Record<number, string>>({});
  const [scheduleOptions, setScheduleOptions] = useState<Record<number, 'now' | 'later'>>({});
  const [scheduleDates, setScheduleDates] = useState<Record<number, string>>({});
  const [scheduleTimes, setScheduleTimes] = useState<Record<number, string>>({});
  const [processing, setProcessing] = useState(false);

  // Normalize content to always be ContentItem[]
  const normalizedContent: ContentItem[] = content.map(item => 
    typeof item === 'string' ? { content: item, hashtags: [] } : item
  );

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleApprove = (index: number) => {
    setDecisions({ ...decisions, [index]: 'approved' });
    // Set default to "now" if not already set
    if (!scheduleOptions[index]) {
      setScheduleOptions({ ...scheduleOptions, [index]: 'now' });
    }
  };

  const handleReject = (index: number) => {
    setDecisions({ ...decisions, [index]: 'rejected' });
  };

  const getBusinessIdFromSlug = (slug: string) => {
    const businessIds: Record<string, string> = {
      'fight-flow-academy': '456dc53b-d9d9-41b0-bc33-4f4c4a791eff',
      'sparkwave-ai': '5a9bbfcf-fae5-4063-9780-bcbe366bae88',
      'persona-ai': '18d0dbb1-a82d-4477-a9f8-816a1fa2ee08',
      'charx-world': '350b8fcb-9bfe-4b53-9548-c6ffdb1d3cb5'
    };
    return businessIds[slug] || slug;
  };

  const handleSaveDecisions = async () => {
    setProcessing(true);
    
    try {
      const approvedIndexes = Object.entries(decisions)
        .filter(([_, status]) => status === 'approved')
        .map(([index]) => parseInt(index));

      const rejectedIndexes = Object.entries(decisions)
        .filter(([_, status]) => status === 'rejected')
        .map(([index]) => parseInt(index));

      // Process approved content
      for (const index of approvedIndexes) {
        const tagArray = tags[index] 
          ? tags[index].split(',').map(t => t.trim()).filter(Boolean)
          : [];

        // Determine status and scheduled_for based on schedule options
        let status: 'draft' | 'scheduled' = 'draft';
        let scheduledFor: string | null = null;

        if (scheduleOptions[index] === 'later') {
          if (!scheduleDates[index] || !scheduleTimes[index]) {
            toast.error(`Tweet #${index + 1}: Please set both date and time for scheduled post`);
            setProcessing(false);
            return;
          }
          status = 'scheduled';
          scheduledFor = `${scheduleDates[index]}T${scheduleTimes[index]}:00`;
        }

        const item = normalizedContent[index];
        const fullContent = item.content;
        const hashtags = item.hashtags || [];

        const { error: approveError } = await supabase
          .from('scheduled_content')
          .insert({
            business_id: getBusinessIdFromSlug(businessId),
            platform: platform,
            content: fullContent,
            content_type: contentType,
            topic: topic,
            keywords: [...(keywords || []), ...hashtags], // Store hashtags in keywords
            tags: tagArray,
            approval_status: 'approved',
            approved_at: new Date().toISOString(),
            status: status,
            scheduled_for: scheduledFor
          });

        if (approveError) throw approveError;
      }

      // Process rejected content
      for (const index of rejectedIndexes) {
        const item = normalizedContent[index];
        const hashtags = item.hashtags || [];

        const { error: rejectError } = await supabase
          .from('rejected_content')
          .insert({
            business_id: getBusinessIdFromSlug(businessId),
            platform: platform,
            content: item.content,
            topic: topic,
            keywords: [...(keywords || []), ...hashtags],
            rejection_reason: rejectionReasons[index] || 'No reason provided',
            generation_params: {
              topic,
              keywords,
              contentType,
              generated_at: new Date().toISOString()
            }
          });

        if (rejectError) throw rejectError;
      }

      toast.success(
        `Approved ${approvedIndexes.length} tweets${
          approvedIndexes.some(i => scheduleOptions[i] === 'later') 
            ? ' (some scheduled for later)' 
            : ''
        }, rejected ${rejectedIndexes.length}`
      );
      
      // Reset state
      setDecisions({});
      setRejectionReasons({});
      setTags({});
      setScheduleOptions({});
      setScheduleDates({});
      setScheduleTimes({});
      onOpenChange(false);
      
      // Call success callback to clear parent state
      onSuccess?.();
      
    } catch (error) {
      console.error('Error saving decisions:', error);
      toast.error('Failed to save decisions');
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = normalizedContent.length - Object.keys(decisions).filter(k => decisions[parseInt(k)] !== 'pending').length;
  const approvedCount = Object.values(decisions).filter(d => d === 'approved').length;
  const rejectedCount = Object.values(decisions).filter(d => d === 'rejected').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Review Generated Content</DialogTitle>
          <div className="flex gap-4 text-sm mt-2">
            <Badge variant="secondary">Pending: {pendingCount}</Badge>
            <Badge variant="default" className="bg-green-600">Approved: {approvedCount}</Badge>
            <Badge variant="destructive">Rejected: {rejectedCount}</Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {normalizedContent.map((item, index) => {
              const decision = decisions[index] || 'pending';
              const hasHashtags = item.hashtags && item.hashtags.length > 0;
              
              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    decision === 'approved' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
                    decision === 'rejected' ? 'border-red-500 bg-red-50 dark:bg-red-950' :
                    'border-border'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium">Tweet #{index + 1}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={decision === 'approved' ? 'default' : 'outline'}
                        onClick={() => handleApprove(index)}
                        className={decision === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant={decision === 'rejected' ? 'destructive' : 'outline'}
                        onClick={() => handleReject(index)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <Label className="text-xs font-medium">Post Content</Label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(item.content, 'Post')}
                          className="h-7 text-xs"
                        >
                          📋 Copy Post
                        </Button>
                      </div>
                      <div className="p-3 bg-background rounded border border-border">
                        <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {item.content.length} characters
                        </p>
                      </div>
                    </div>

                    {hasHashtags && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-xs font-medium">Suggested Hashtags</Label>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(
                              item.hashtags!.map(tag => `#${tag}`).join(' '),
                              'Hashtags'
                            )}
                            className="h-7 text-xs"
                          >
                            📋 Copy Hashtags
                          </Button>
                        </div>
                        <div className="p-3 bg-muted/50 rounded border border-border">
                          <p className="text-sm">
                            {item.hashtags!.map(tag => `#${tag}`).join(' ')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {decision === 'approved' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs">Tags (comma-separated, optional)</Label>
                        <Input
                          placeholder="motivation, training, technique"
                          value={tags[index] || ''}
                          onChange={(e) => setTags({ ...tags, [index]: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                      
                      {/* Scheduling Options */}
                      <div className="space-y-3 mt-3 p-3 border rounded-lg bg-muted/30">
                        <Label className="text-sm font-medium">When to post?</Label>
                        
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={scheduleOptions[index] === 'now' ? 'default' : 'outline'}
                            className="flex-1"
                            onClick={() => setScheduleOptions({ ...scheduleOptions, [index]: 'now' })}
                          >
                            Post Immediately
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={scheduleOptions[index] === 'later' ? 'default' : 'outline'}
                            className="flex-1"
                            onClick={() => setScheduleOptions({ ...scheduleOptions, [index]: 'later' })}
                          >
                            Schedule for Later
                          </Button>
                        </div>

                        {scheduleOptions[index] === 'later' && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Date</Label>
                                <Input
                                  type="date"
                                  value={scheduleDates[index] || ''}
                                  onChange={(e) => setScheduleDates({ ...scheduleDates, [index]: e.target.value })}
                                  min={new Date().toISOString().split('T')[0]}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Time (Eastern)</Label>
                                <Input
                                  type="time"
                                  value={scheduleTimes[index] || ''}
                                  onChange={(e) => setScheduleTimes({ ...scheduleTimes, [index]: e.target.value })}
                                />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              All times are in Eastern Time (ET)
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {decision === 'rejected' && (
                    <div className="space-y-2">
                      <Label className="text-xs">Rejection Reason (optional)</Label>
                      <Textarea
                        placeholder="Why is this being rejected? (e.g., too generic, wrong tone, factually incorrect)"
                        value={rejectionReasons[index] || ''}
                        onChange={(e) => setRejectionReasons({ ...rejectionReasons, [index]: e.target.value })}
                        className="text-sm"
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveDecisions}
            disabled={processing || pendingCount === normalizedContent.length}
          >
            {processing ? 'Saving...' : `Save Decisions (${approvedCount + rejectedCount}/${normalizedContent.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
