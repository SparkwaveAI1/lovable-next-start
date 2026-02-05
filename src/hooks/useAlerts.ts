import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types for alert data
export interface AlertCondition {
  indicator: 'price' | 'rsi_14' | 'change_pct' | 'volume_ratio' | 'sma_20' | 'sma_50';
  operator: 'gt' | 'lt' | 'crosses_above' | 'crosses_below';
  value: number;
}

export interface NotificationConfig {
  email: boolean;
  push: boolean;
  in_app: boolean;
}

export interface InvestmentAlert {
  id: string;
  user_id: string;
  business_id: string | null;
  symbol: string;
  asset_type: 'stock' | 'crypto';
  name?: string;
  condition_json: AlertCondition;
  notification_config: NotificationConfig;
  workflow_id: string | null;
  is_active: boolean;
  cooldown_minutes: number;
  last_triggered_at: string | null;
  created_at: string;
}

export interface AlertEvent {
  id: string;
  alert_id: string;
  triggered_at: string;
  condition_snapshot: {
    indicator: string;
    operator: string;
    expected_value: number;
    actual_value: number;
    symbol: string;
  };
  acknowledged: boolean;
  workflow_triggered: boolean;
}

// Human-readable labels for indicators and operators
export const INDICATOR_LABELS: Record<AlertCondition['indicator'], string> = {
  price: 'Price',
  rsi_14: 'RSI (14)',
  change_pct: 'Change %',
  volume_ratio: 'Volume Ratio',
  sma_20: 'SMA 20',
  sma_50: 'SMA 50',
};

export const OPERATOR_LABELS: Record<AlertCondition['operator'], string> = {
  gt: 'is above',
  lt: 'is below',
  crosses_above: 'crosses above',
  crosses_below: 'crosses below',
};

/**
 * Fetch all alerts for a business (or user if no business)
 */
export function useAlerts(businessId?: string) {
  return useQuery({
    queryKey: ['alerts', businessId],
    queryFn: async (): Promise<InvestmentAlert[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('investment_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching alerts:', error);
        throw error;
      }

      return (data || []) as InvestmentAlert[];
    },
    staleTime: 30000,
  });
}

/**
 * Create a new alert
 */
export function useCreateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      symbol,
      assetType,
      name,
      condition,
      notificationConfig,
      workflowId,
      cooldownMinutes,
      businessId,
    }: {
      symbol: string;
      assetType: 'stock' | 'crypto';
      name?: string;
      condition: AlertCondition;
      notificationConfig: NotificationConfig;
      workflowId?: string | null;
      cooldownMinutes?: number;
      businessId?: string;
    }): Promise<InvestmentAlert> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('investment_alerts')
        .insert({
          user_id: user.id,
          business_id: businessId || null,
          symbol: assetType === 'stock' ? symbol.toUpperCase() : symbol.toLowerCase(),
          asset_type: assetType,
          name: name || `${symbol.toUpperCase()} ${INDICATOR_LABELS[condition.indicator]} Alert`,
          condition_json: condition,
          notification_config: notificationConfig,
          workflow_id: workflowId || null,
          cooldown_minutes: cooldownMinutes || 60,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating alert:', error);
        throw error;
      }

      return data as InvestmentAlert;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['alerts', variables.businessId] });
    },
  });
}

/**
 * Update an alert (toggle active, edit settings)
 */
export function useUpdateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      isActive,
      name,
      condition,
      notificationConfig,
      workflowId,
      cooldownMinutes,
    }: {
      id: string;
      isActive?: boolean;
      name?: string;
      condition?: AlertCondition;
      notificationConfig?: NotificationConfig;
      workflowId?: string | null;
      cooldownMinutes?: number;
    }): Promise<InvestmentAlert> => {
      const updates: Record<string, unknown> = {};
      if (isActive !== undefined) updates.is_active = isActive;
      if (name !== undefined) updates.name = name;
      if (condition !== undefined) updates.condition_json = condition;
      if (notificationConfig !== undefined) updates.notification_config = notificationConfig;
      if (workflowId !== undefined) updates.workflow_id = workflowId;
      if (cooldownMinutes !== undefined) updates.cooldown_minutes = cooldownMinutes;

      const { data, error } = await supabase
        .from('investment_alerts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating alert:', error);
        throw error;
      }

      return data as InvestmentAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

/**
 * Delete an alert
 */
export function useDeleteAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string): Promise<void> => {
      const { error } = await supabase
        .from('investment_alerts')
        .delete()
        .eq('id', alertId);

      if (error) {
        console.error('Error deleting alert:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

/**
 * Fetch alert trigger history
 * Pass alertId to get events for a specific alert, or omit for all
 */
export function useAlertHistory(alertId?: string, limit = 50) {
  return useQuery({
    queryKey: ['alert-history', alertId, limit],
    queryFn: async (): Promise<(AlertEvent & { alert?: InvestmentAlert })[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // First get the user's alert IDs to filter events
      const { data: userAlerts } = await supabase
        .from('investment_alerts')
        .select('id')
        .eq('user_id', user.id);

      const alertIds = (userAlerts || []).map(a => a.id);
      if (alertIds.length === 0) return [];

      let query = supabase
        .from('alert_events')
        .select(`
          *,
          alert:investment_alerts(*)
        `)
        .in('alert_id', alertIds)
        .order('triggered_at', { ascending: false })
        .limit(limit);

      if (alertId) {
        query = query.eq('alert_id', alertId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching alert history:', error);
        throw error;
      }

      return (data || []) as (AlertEvent & { alert?: InvestmentAlert })[];
    },
    staleTime: 30000,
  });
}

/**
 * Mark an alert event as acknowledged
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string): Promise<AlertEvent> => {
      const { data, error } = await supabase
        .from('alert_events')
        .update({ acknowledged: true })
        .eq('id', eventId)
        .select()
        .single();

      if (error) {
        console.error('Error acknowledging alert:', error);
        throw error;
      }

      return data as AlertEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-history'] });
    },
  });
}
