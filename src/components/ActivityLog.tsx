import { useState } from 'react';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertCircle, CheckCircle, Clock, ChevronDown } from 'lucide-react';
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

  const getSourceDataSummary = (log: any) => {
    if (!log.source_data) return 'No data';
    
    // Extract contact info from nested structure (GHL form submissions)
    const contact = log.source_data?.data?.contact || {};
    const firstName = contact.first_name || contact.name?.first || '';
    const lastName = contact.last_name || contact.name?.last || '';
    const email = contact.email || '';
    const phone = contact.phone || '';
    
    // Extract form name
    const formName = log.source_data?.data?.formName || '';
    
    // Extract SMS message from processed_data
    const smsMessage = log.processed_data?.message || log.source_data?.message || '';
    
    // Build display string
    const parts = [];
    if (firstName || lastName) parts.push(`${firstName} ${lastName}`.trim());
    if (email) parts.push(email);
    if (phone) parts.push(phone);
    if (formName) parts.push(`Form: ${formName}`);
    if (smsMessage && log.automation_type === 'sms_welcome_sent') {
      parts.push(`"${smsMessage.substring(0, 50)}${smsMessage.length > 50 ? '...' : ''}"`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'Unknown';
  };

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
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
                <TableHead className="w-12"></TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <Collapsible key={log.id} open={expandedRows.has(log.id)}>
                  <TableRow className="cursor-pointer hover:bg-accent/50">
                    <CollapsibleTrigger asChild>
                      <TableCell onClick={() => toggleRow(log.id)}>
                        <ChevronDown className={`h-4 w-4 transition-transform ${expandedRows.has(log.id) ? 'rotate-180' : ''}`} />
                      </TableCell>
                    </CollapsibleTrigger>
                    <CollapsibleTrigger asChild>
                      <TableCell onClick={() => toggleRow(log.id)}>
                        {getStatusIcon(log.status)}
                      </TableCell>
                    </CollapsibleTrigger>
                    <CollapsibleTrigger asChild>
                      <TableCell className="font-mono text-sm" onClick={() => toggleRow(log.id)}>
                        {formatTimestamp(log.created_at)}
                      </TableCell>
                    </CollapsibleTrigger>
                    <CollapsibleTrigger asChild>
                      <TableCell onClick={() => toggleRow(log.id)}>
                        <Badge variant="outline">
                          {log.automation_type.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                    </CollapsibleTrigger>
                    <CollapsibleTrigger asChild>
                      <TableCell onClick={() => toggleRow(log.id)}>
                        {getStatusBadge(log.status)}
                      </TableCell>
                    </CollapsibleTrigger>
                    <CollapsibleTrigger asChild>
                      <TableCell className="max-w-md" onClick={() => toggleRow(log.id)}>
                        {getSourceDataSummary(log)}
                      </TableCell>
                    </CollapsibleTrigger>
                    <CollapsibleTrigger asChild>
                      <TableCell className="font-mono text-sm" onClick={() => toggleRow(log.id)}>
                        {log.execution_time_ms ? `${log.execution_time_ms}ms` : '-'}
                      </TableCell>
                    </CollapsibleTrigger>
                  </TableRow>
                  <CollapsibleContent asChild>
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/30 p-4">
                        <div className="space-y-3 text-sm">
                          {log.source_data && (
                            <div>
                              <h4 className="font-semibold mb-2">Source Data:</h4>
                              <pre className="bg-background p-3 rounded border overflow-x-auto text-xs">
                                {JSON.stringify(log.source_data, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.processed_data && (
                            <div>
                              <h4 className="font-semibold mb-2">Processed Data:</h4>
                              <pre className="bg-background p-3 rounded border overflow-x-auto text-xs">
                                {JSON.stringify(log.processed_data, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.error_message && (
                            <div>
                              <h4 className="font-semibold mb-2 text-destructive">Error Message:</h4>
                              <p className="text-destructive">{log.error_message}</p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}