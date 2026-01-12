import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Mail,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QueueProgress {
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  skipped: number;
  percent_complete: number;
}

interface ProcessResponse {
  success: boolean;
  campaign_id: string;
  batch_processed?: number;
  sent?: number;
  failed?: number;
  queue_empty?: boolean;
  error?: string;
  retry_after?: number;
  progress?: QueueProgress;
}

interface CampaignQueueMonitorProps {
  campaignId: string;
  campaignName?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

type ProcessingState = 'idle' | 'processing' | 'paused' | 'rate_limited' | 'complete' | 'error';

export function CampaignQueueMonitor({
  campaignId,
  campaignName,
  onComplete,
  onCancel
}: CampaignQueueMonitorProps) {
  const { toast } = useToast();
  const [state, setState] = useState<ProcessingState>('idle');
  const [progress, setProgress] = useState<QueueProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);
  const [batchesSent, setBatchesSent] = useState(0);
  const [isQueuing, setIsQueuing] = useState(false);

  const abortRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial progress
  useEffect(() => {
    loadProgress();
  }, [campaignId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const loadProgress = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_queue_progress', { p_campaign_id: campaignId });

      if (error) throw error;

      if (data && data.length > 0) {
        const progressData = data[0];
        setProgress(progressData);

        // Check if already complete
        if (progressData.pending === 0 && progressData.processing === 0 && progressData.total > 0) {
          setState('complete');
        }
      }
    } catch (err) {
      console.error('Error loading progress:', err);
    }
  };

  const queueCampaign = async () => {
    setIsQueuing(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .rpc('queue_campaign_emails', { p_campaign_id: campaignId });

      if (error) throw error;

      toast({
        title: 'Campaign Queued',
        description: `${data} recipients added to queue`,
      });

      await loadProgress();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to queue campaign');
      toast({
        title: 'Queue Failed',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsQueuing(false);
    }
  };

  const processBatch = async (): Promise<ProcessResponse> => {
    const { data, error } = await supabase.functions.invoke('process-email-queue', {
      body: { campaign_id: campaignId, batch_size: 100 }
    });

    if (error) {
      throw new Error(error.message || 'Failed to process batch');
    }

    return data as ProcessResponse;
  };

  const startProcessing = async () => {
    // Check current campaign status to determine if we need to queue
    const { data: campaign } = await supabase
      .from('email_campaigns')
      .select('status')
      .eq('id', campaignId)
      .single();

    const currentStatus = campaign?.status || 'draft';

    // Only queue if campaign is in draft or scheduled status
    // If already queued/sending, skip to processing
    if (currentStatus === 'draft' || currentStatus === 'scheduled') {
      const queued = await queueCampaign();
      if (!queued) return;
    }

    abortRef.current = false;
    setState('processing');
    setError(null);

    await processLoop();
  };

  const processLoop = useCallback(async () => {
    if (abortRef.current) {
      setState('paused');
      return;
    }

    try {
      const result = await processBatch();

      if (result.progress) {
        setProgress(result.progress);
      }

      if (!result.success) {
        if (result.error === 'rate_limited') {
          setState('rate_limited');
          const waitSeconds = result.retry_after || 60;
          setRateLimitSeconds(waitSeconds);

          // Countdown and retry
          let remaining = waitSeconds;
          const countdown = setInterval(() => {
            remaining--;
            setRateLimitSeconds(remaining);
            if (remaining <= 0) {
              clearInterval(countdown);
              if (!abortRef.current) {
                setState('processing');
                processLoop();
              }
            }
          }, 1000);

          timerRef.current = countdown as unknown as NodeJS.Timeout;
          return;
        }

        throw new Error(result.error || 'Processing failed');
      }

      setBatchesSent(prev => prev + 1);

      if (result.queue_empty) {
        setState('complete');
        toast({
          title: 'Campaign Complete!',
          description: `Successfully sent to ${result.progress?.sent || 0} contacts`,
        });
        onComplete?.();
        return;
      }

      // Small delay between batches to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 500));

      // Continue processing
      if (!abortRef.current) {
        processLoop();
      } else {
        setState('paused');
      }

    } catch (err: any) {
      console.error('Processing error:', err);
      setState('error');
      setError(err.message || 'Unknown error');
      toast({
        title: 'Processing Error',
        description: err.message,
        variant: 'destructive',
      });
    }
  }, [campaignId, onComplete, toast]);

  const pauseProcessing = () => {
    abortRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setState('paused');
  };

  const resumeProcessing = () => {
    abortRef.current = false;
    setState('processing');
    processLoop();
  };

  const getStateIcon = () => {
    switch (state) {
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case 'rate_limited':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'paused':
        return <Pause className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Mail className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStateBadge = () => {
    const variants: Record<ProcessingState, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      idle: 'outline',
      processing: 'default',
      paused: 'secondary',
      rate_limited: 'secondary',
      complete: 'default',
      error: 'destructive',
    };

    const labels: Record<ProcessingState, string> = {
      idle: 'Ready',
      processing: 'Sending...',
      paused: 'Paused',
      rate_limited: `Rate limited (${rateLimitSeconds}s)`,
      complete: 'Complete',
      error: 'Error',
    };

    return (
      <Badge variant={variants[state]}>
        {labels[state]}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStateIcon()}
            <div>
              <CardTitle className="text-lg">
                {campaignName || 'Campaign'} Queue
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {state === 'complete'
                  ? 'All emails have been sent'
                  : state === 'processing'
                    ? `Processing batch ${batchesSent + 1}...`
                    : 'Monitor and control email sending'}
              </p>
            </div>
          </div>
          {getStateBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {progress && (progress.total ?? 0) > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress.percent_complete ?? 0}%</span>
            </div>
            <Progress value={progress.percent_complete ?? 0} className="h-2" />
          </div>
        )}

        {/* Stats Grid */}
        {progress && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{(progress.total ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
              <p className="text-2xl font-bold text-green-600">{(progress.sent ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Sent</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <p className="text-2xl font-bold text-blue-600">{(progress.pending ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
              <p className="text-2xl font-bold text-red-600">{(progress.failed ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </div>
        )}

        {/* Rate Limit Warning */}
        {state === 'rate_limited' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Rate limited by email provider. Automatically retrying in {rateLimitSeconds} seconds...
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {error && state === 'error' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {state === 'idle' && (
            <>
              <Button
                onClick={startProcessing}
                disabled={isQueuing}
                className="flex-1"
              >
                {isQueuing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Queuing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Sending
                  </>
                )}
              </Button>
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </>
          )}

          {state === 'processing' && (
            <Button variant="outline" onClick={pauseProcessing} className="flex-1">
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}

          {state === 'paused' && (
            <>
              <Button onClick={resumeProcessing} className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </>
          )}

          {state === 'rate_limited' && (
            <Button variant="outline" onClick={pauseProcessing} className="flex-1">
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}

          {state === 'error' && (
            <>
              <Button onClick={resumeProcessing} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </>
          )}

          {state === 'complete' && (
            <Button onClick={onComplete || onCancel} className="flex-1">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Done
            </Button>
          )}
        </div>

        {/* Processing Info */}
        {(state === 'processing' || state === 'rate_limited') && (
          <p className="text-xs text-center text-muted-foreground">
            Sending in batches of 100. You can pause at any time.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
