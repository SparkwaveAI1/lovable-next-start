import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Check, Search, AlertCircle, RefreshCw, History } from 'lucide-react';
import { format } from 'date-fns';
import {
  useAlertHistory,
  useAcknowledgeAlert,
  AlertEvent,
  InvestmentAlert,
  INDICATOR_LABELS,
  OPERATOR_LABELS,
} from '@/hooks/useAlerts';
import { useToast } from '@/hooks/use-toast';

interface AlertHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alertId?: string; // Optional filter by specific alert
}

function HistoryTableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

function formatCondition(event: AlertEvent): string {
  const snapshot = event.condition_snapshot;
  if (!snapshot) return 'N/A';
  
  const indicator = INDICATOR_LABELS[snapshot.indicator as keyof typeof INDICATOR_LABELS] || snapshot.indicator;
  const operator = OPERATOR_LABELS[snapshot.operator as keyof typeof OPERATOR_LABELS] || snapshot.operator;
  
  return `${indicator} ${operator} ${snapshot.expected_value}`;
}

export function AlertHistory({ open, onOpenChange, alertId }: AlertHistoryProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: history,
    isLoading,
    error,
    refetch,
  } = useAlertHistory(alertId, 100);

  const acknowledgeMutation = useAcknowledgeAlert();

  const handleAcknowledge = async (eventId: string) => {
    try {
      await acknowledgeMutation.mutateAsync(eventId);
      toast({
        title: 'Alert acknowledged',
        description: 'The alert event has been marked as acknowledged.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to acknowledge alert',
        variant: 'destructive',
      });
    }
  };

  // Filter history by search query
  const filteredHistory = (history || []).filter((event) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const alertName = event.alert?.name?.toLowerCase() || '';
    const symbol = event.alert?.symbol?.toLowerCase() || event.condition_snapshot?.symbol?.toLowerCase() || '';
    return alertName.includes(query) || symbol.includes(query);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Alert History
          </DialogTitle>
          <DialogDescription>
            View all triggered alerts and their details.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by alert name or symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <HistoryTableSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Failed to load history
              </h3>
              <p className="text-gray-500 mb-4">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-gray-300 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No matching events' : 'No alerts triggered yet'}
              </h4>
              <p className="text-gray-500">
                {searchQuery
                  ? 'Try adjusting your search query.'
                  : 'When your alerts trigger, they will appear here.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Alert Name</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Triggered Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm">
                        {format(new Date(event.triggered_at), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(event.triggered_at), 'h:mm a')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {event.alert?.name || 'Unknown Alert'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {(event.alert?.symbol || event.condition_snapshot?.symbol || 'N/A').toUpperCase()}
                        </span>
                        {event.alert?.asset_type && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              event.alert.asset_type === 'crypto'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {event.alert.asset_type === 'crypto' ? 'Crypto' : 'Stock'}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatCondition(event)}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {event.condition_snapshot?.actual_value?.toLocaleString() || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {event.acknowledged ? (
                        <Badge variant="outline" className="bg-gray-50 text-gray-600">
                          <Check className="h-3 w-3 mr-1" />
                          Acknowledged
                        </Badge>
                      ) : (
                        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
                          New
                        </Badge>
                      )}
                      {event.workflow_triggered && (
                        <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                          Workflow
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!event.acknowledged && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAcknowledge(event.id)}
                          disabled={acknowledgeMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer with count */}
        {filteredHistory.length > 0 && (
          <div className="pt-4 border-t text-sm text-gray-500 flex items-center justify-between">
            <span>
              Showing {filteredHistory.length} {filteredHistory.length === 1 ? 'event' : 'events'}
              {searchQuery && ` matching "${searchQuery}"`}
            </span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3 w-3 mr-2" />
              Refresh
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
