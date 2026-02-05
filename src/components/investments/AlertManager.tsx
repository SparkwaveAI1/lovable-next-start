import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Bell,
  BellOff,
  Plus,
  Trash2,
  Clock,
  Mail,
  Smartphone,
  Inbox,
  Zap,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useAlerts,
  useUpdateAlert,
  useDeleteAlert,
  useAlertHistory,
  InvestmentAlert,
  INDICATOR_LABELS,
  OPERATOR_LABELS,
} from '@/hooks/useAlerts';
import { useToast } from '@/hooks/use-toast';
import { AlertForm } from './AlertForm';
import { AlertHistory } from './AlertHistory';

interface AlertManagerProps {
  businessId?: string;
}

function AlertSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Skeleton className="h-5 w-5 mt-1" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertCard({
  alert,
  onToggle,
  onDelete,
  isUpdating,
}: {
  alert: InvestmentAlert;
  onToggle: () => void;
  onDelete: () => void;
  isUpdating: boolean;
}) {
  const condition = alert.condition_json;
  const notifications = alert.notification_config;

  // Build condition description
  const conditionText = `${INDICATOR_LABELS[condition.indicator]} ${OPERATOR_LABELS[condition.operator]} ${condition.value}`;

  // Build notification badges
  const notificationIcons = [];
  if (notifications?.email) notificationIcons.push({ icon: Mail, label: 'Email' });
  if (notifications?.push) notificationIcons.push({ icon: Smartphone, label: 'Push' });
  if (notifications?.in_app) notificationIcons.push({ icon: Inbox, label: 'In-app' });
  if (alert.workflow_id) notificationIcons.push({ icon: Zap, label: 'Workflow' });

  // Format last triggered
  const lastTriggered = alert.last_triggered_at
    ? formatDistanceToNow(new Date(alert.last_triggered_at), { addSuffix: true })
    : 'Never triggered';

  return (
    <Card className={`transition-opacity ${!alert.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {alert.is_active ? (
              <Bell className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
            ) : (
              <BellOff className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-gray-900 truncate">
                  {alert.name || `${alert.symbol.toUpperCase()} Alert`}
                </h4>
                <Badge
                  variant="outline"
                  className={`text-xs flex-shrink-0 ${
                    alert.asset_type === 'crypto'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  {alert.asset_type === 'crypto' ? 'Crypto' : 'Stock'}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {alert.symbol.toUpperCase()} • {conditionText}
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {/* Notification icons */}
                <div className="flex items-center gap-1">
                  {notificationIcons.map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="p-1 rounded bg-gray-100 text-gray-600"
                      title={label}
                    >
                      <Icon className="h-3 w-3" />
                    </div>
                  ))}
                </div>
                {/* Last triggered */}
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {lastTriggered}
                </span>
                {/* Cooldown */}
                {alert.cooldown_minutes > 0 && (
                  <span className="text-xs text-gray-400">
                    {alert.cooldown_minutes}m cooldown
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <Switch
              checked={alert.is_active}
              onCheckedChange={onToggle}
              disabled={isUpdating}
              aria-label={alert.is_active ? 'Disable alert' : 'Enable alert'}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
              onClick={onDelete}
              disabled={isUpdating}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AlertManager({ businessId }: AlertManagerProps) {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Fetch alerts
  const {
    data: alerts,
    isLoading,
    error,
    refetch,
  } = useAlerts(businessId);

  // Fetch recent history (limit 5 for preview)
  const { data: recentHistory } = useAlertHistory(undefined, 5);

  // Mutations
  const updateAlertMutation = useUpdateAlert();
  const deleteAlertMutation = useDeleteAlert();

  const handleToggleAlert = async (alert: InvestmentAlert) => {
    try {
      await updateAlertMutation.mutateAsync({
        id: alert.id,
        isActive: !alert.is_active,
      });
      toast({
        title: alert.is_active ? 'Alert disabled' : 'Alert enabled',
        description: `${alert.name || alert.symbol.toUpperCase()} is now ${alert.is_active ? 'off' : 'on'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update alert',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAlert = async () => {
    if (!deleteConfirmId) return;
    
    try {
      await deleteAlertMutation.mutateAsync(deleteConfirmId);
      toast({
        title: 'Alert deleted',
        description: 'The alert has been removed.',
      });
      setDeleteConfirmId(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete alert',
        variant: 'destructive',
      });
    }
  };

  const handleAlertCreated = () => {
    setCreateDialogOpen(false);
    toast({
      title: 'Alert created',
      description: 'Your new alert is now active.',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Alerts</h3>
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <AlertSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to load alerts
        </h3>
        <p className="text-gray-500 mb-4">
          {error instanceof Error ? error.message : 'An error occurred'}
        </p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Alerts</h3>
          <p className="text-sm text-gray-500">
            {alerts?.length || 0} {alerts?.length === 1 ? 'alert' : 'alerts'} configured
          </p>
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Alert
        </Button>
      </div>

      {/* Alerts List */}
      {alerts && alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onToggle={() => handleToggleAlert(alert)}
              onDelete={() => setDeleteConfirmId(alert.id)}
              isUpdating={updateAlertMutation.isPending || deleteAlertMutation.isPending}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No alerts yet</h4>
            <p className="text-gray-500 mb-4">
              Create price alerts to get notified when your investments hit certain conditions.
            </p>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Alert
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Triggers Preview */}
      {recentHistory && recentHistory.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Recent Triggers</h4>
            <Button
              variant="link"
              className="text-indigo-600 p-0 h-auto"
              onClick={() => setShowAllHistory(true)}
            >
              View All
            </Button>
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {recentHistory.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          event.acknowledged ? 'bg-gray-300' : 'bg-indigo-500'
                        }`}
                      />
                      <span className="text-sm text-gray-900">
                        {event.alert?.name || event.condition_snapshot?.symbol || 'Alert'} triggered
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(event.triggered_at), { addSuffix: true })}
                      {event.condition_snapshot?.actual_value && (
                        <span className="ml-2 text-gray-400">
                          ({event.condition_snapshot.indicator}: {event.condition_snapshot.actual_value})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Alert Dialog */}
      <AlertForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        businessId={businessId}
        onSuccess={handleAlertCreated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Alert</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this alert? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAlert}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Full History Dialog */}
      <AlertHistory
        open={showAllHistory}
        onOpenChange={setShowAllHistory}
      />
    </div>
  );
}
