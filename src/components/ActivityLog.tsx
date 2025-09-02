import { useActivityLogs } from '@/hooks/useActivityLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { formatToEasternCompact } from '@/lib/dateUtils';

interface ActivityLogProps {
  businessId?: string;
}

export function ActivityLog({ businessId }: ActivityLogProps) {
  const { logs, isLoading, error } = useActivityLogs(businessId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'success' ? 'default' : status === 'error' || status === 'failed' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  const formatTimestamp = (timestamp: string) => {
    return formatToEasternCompact(timestamp);
  };

  const getSourceDataSummary = (sourceData: any) => {
    if (!sourceData) return 'No data';
    
    const name = sourceData.name || sourceData.leadName || '';
    const email = sourceData.email || sourceData.leadEmail || '';
    const phone = sourceData.phone || sourceData.leadPhone || '';
    
    return [name, email, phone].filter(Boolean).join(' • ') || 'Unknown';
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading activity logs: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No activity logs found</p>
            <p className="text-sm">Form submissions will appear here</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lead Data</TableHead>
                <TableHead>Processing Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {getStatusIcon(log.status)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatTimestamp(log.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {log.automation_type.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(log.status)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {getSourceDataSummary(log.source_data)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {log.execution_time_ms ? `${log.execution_time_ms}ms` : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}