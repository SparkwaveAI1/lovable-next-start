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

interface ContentReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string[];
  businessId: string;
  platform: string;
  contentType: string;
  topic?: string;
  keywords?: string[];
}

export function ContentReviewDialog({
  open,
  onOpenChange,
  content,
  businessId,
  platform,
  contentType,
  topic,
  keywords
}: ContentReviewDialogProps) {
  const [decisions, setDecisions] = useState<Record<number, 'pending' | 'approved' | 'rejected'>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<number, string>>({});
  const [tags, setTags] = useState<Record<number, string>>({});
  const [processing, setProcessing] = useState(false);

  const handleApprove = (index: number) => {
    setDecisions({ ...decisions, [index]: 'approved' });
  };

  const handleReject = (index: number) => {
    setDecisions({ ...decisions, [index]: 'rejected' });
  };

  const getBusinessIdFromSlug = (slug: string) => {
    const businessIds: Record<string, string> = {
      'fight-flow-academy': 'a1b2c3d4-e5f6-7890-abcd-123456789abc',
      'sparkwave-ai': 'b2c3d4e5-f6g7-8901-bcde-234567890def',
      'persona-ai': 'c3d4e5f6-g7h8-9012-cdef-345678901efg',
      'charx-world': 'd4e5f6g7-h8i9-0123-defg-456789012fgh'
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

        const { error: approveError } = await supabase
          .from('scheduled_content')
          .insert({
            business_id: getBusinessIdFromSlug(businessId),
            platform: platform,
            content: content[index],
            content_type: contentType,
            topic: topic,
            keywords: keywords || [],
            tags: tagArray,
            approval_status: 'approved',
            approved_at: new Date().toISOString(),
            status: 'draft',
            scheduled_for: null
          });

        if (approveError) throw approveError;
      }

      // Process rejected content
      for (const index of rejectedIndexes) {
        const { error: rejectError } = await supabase
          .from('rejected_content')
          .insert({
            business_id: getBusinessIdFromSlug(businessId),
            platform: platform,
            content: content[index],
            topic: topic,
            keywords: keywords || [],
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
        `Approved ${approvedIndexes.length} tweets, rejected ${rejectedIndexes.length}`
      );
      
      // Reset state
      setDecisions({});
      setRejectionReasons({});
      setTags({});
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error saving decisions:', error);
      toast.error('Failed to save decisions');
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = content.length - Object.keys(decisions).filter(k => decisions[parseInt(k)] !== 'pending').length;
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
            {content.map((tweet, index) => {
              const decision = decisions[index] || 'pending';
              
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

                  <div className="mb-3 p-3 bg-background rounded border border-border">
                    <p className="text-sm whitespace-pre-wrap">{tweet}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {tweet.length} characters
                    </p>
                  </div>

                  {decision === 'approved' && (
                    <div className="space-y-2">
                      <Label className="text-xs">Tags (comma-separated, optional)</Label>
                      <Input
                        placeholder="motivation, training, technique"
                        value={tags[index] || ''}
                        onChange={(e) => setTags({ ...tags, [index]: e.target.value })}
                        className="text-sm"
                      />
                    </div>
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
            disabled={processing || pendingCount === content.length}
          >
            {processing ? 'Saving...' : `Save Decisions (${approvedCount + rejectedCount}/${content.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
