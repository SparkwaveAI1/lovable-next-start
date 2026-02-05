/**
 * Investment Alerts Types
 * INV-056 to INV-060: Workflow Integration & Notifications
 */

// ============ ALERT TYPES ============

export type AlertOperator = 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'crosses_above' | 'crosses_below';

export type AlertIndicator = 
  | 'price' 
  | 'change_percent' 
  | 'volume'
  | 'rsi_14'
  | 'sma_20'
  | 'sma_50'
  | 'sma_200'
  | 'ema_20'
  | 'ema_50'
  | 'volume_ratio';

export interface AlertCondition {
  indicator: AlertIndicator;
  operator: AlertOperator;
  value: number;
}

export interface NotificationConfig {
  email?: boolean;
  inApp?: boolean;
  push?: boolean;
}

export interface InvestmentAlert {
  id: string;
  user_id: string;
  business_id: string | null;
  name: string | null;
  symbol: string;
  asset_type: 'stock' | 'crypto';
  condition_json: AlertCondition;
  notification_config: NotificationConfig | null;
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
    actualValue: number;
    threshold: number;
    indicator: string;
    operator: string;
    price: number;
  };
  acknowledged: boolean;
  workflow_triggered: boolean;
}

// ============ WORKFLOW TYPES ============

// INV-056: Investment Alert Trigger Type
export interface InvestmentAlertTrigger {
  type: 'investment_alert';
  config: {
    alertId?: string;      // Specific alert, or
    anyAlert?: boolean;    // Any alert from this user
    symbols?: string[];    // Filter by symbols
    indicators?: string[]; // Filter by indicator type
  };
}

export interface ScheduledTrigger {
  type: 'scheduled';
  config: {
    cron?: string;
    interval?: string;
  };
}

export interface ManualTrigger {
  type: 'manual';
  config: Record<string, unknown>;
}

export interface WebhookTrigger {
  type: 'webhook';
  config: {
    secret?: string;
  };
}

export type WorkflowTrigger = 
  | InvestmentAlertTrigger 
  | ScheduledTrigger 
  | ManualTrigger 
  | WebhookTrigger;

export type WorkflowActionType = 'send_email' | 'send_sms' | 'discord' | 'webhook' | 'log';

export interface WorkflowAction {
  type: WorkflowActionType;
  config: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  user_id: string;
  business_id: string | null;
  name: string;
  description: string | null;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string | null;
  trigger_type: string;
  payload: Record<string, unknown>;
  actions_executed: string[];
  success: boolean;
  error: string | null;
  executed_at: string;
}

// ============ PAYLOAD TYPES ============

// INV-057: Alert Workflow Payload Schema
export interface AlertWorkflowPayload {
  alertId: string;
  alertName: string;
  symbol: string;
  assetType: 'stock' | 'crypto';
  indicator: string;
  operator: string;
  threshold: number;
  actualValue: number;
  priceAtTrigger: number;
  triggeredAt: string;
  formatted: {
    summary: string;  // "BTC RSI dropped to 28.5 (threshold: 30)"
    symbol: string;
    price: string;    // "$67,425.00"
  };
}

// ============ NOTIFICATION TYPES ============

export interface UserNotification {
  id: string;
  user_id: string;
  type: 'investment_alert' | 'system' | 'workflow_complete';
  title: string;
  body: string | null;
  data: AlertWorkflowPayload | Record<string, unknown> | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

// ============ API RESPONSE TYPES ============

export interface EvaluationResult {
  alertId: string;
  alertName: string | null;
  symbol: string;
  triggered: boolean;
  actualValue: number | null;
  threshold: number;
  indicator: string;
  operator: string;
  notificationsSent: string[];
  workflowTriggered: boolean;
  error?: string;
}

export interface AlertEvaluationResponse {
  evaluated: number;
  triggered: number;
  errors: number;
  results: EvaluationResult[];
  executionTimeMs: number;
}

export interface AlertTestResponse {
  symbol: string;
  assetType: 'stock' | 'crypto';
  condition: AlertCondition;
  actualValue: number | null;
  currentPrice: number;
  wouldTrigger: boolean;
  allIndicators: Record<string, number | undefined>;
}

// ============ FORM TYPES ============

export interface CreateAlertInput {
  name?: string;
  symbol: string;
  asset_type: 'stock' | 'crypto';
  condition_json: AlertCondition;
  notification_config?: NotificationConfig;
  workflow_id?: string;
  cooldown_minutes?: number;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
}

// ============ HELPER CONSTANTS ============

export const ALERT_OPERATORS: { value: AlertOperator; label: string }[] = [
  { value: 'gt', label: 'Greater than' },
  { value: 'lt', label: 'Less than' },
  { value: 'gte', label: 'Greater than or equal' },
  { value: 'lte', label: 'Less than or equal' },
  { value: 'eq', label: 'Equals' },
  { value: 'crosses_above', label: 'Crosses above' },
  { value: 'crosses_below', label: 'Crosses below' },
];

export const ALERT_INDICATORS: { value: AlertIndicator; label: string; description: string }[] = [
  { value: 'price', label: 'Price', description: 'Current market price' },
  { value: 'change_percent', label: 'Price Change %', description: '24h price change percentage' },
  { value: 'rsi_14', label: 'RSI (14)', description: 'Relative Strength Index' },
  { value: 'sma_20', label: 'SMA (20)', description: '20-day Simple Moving Average' },
  { value: 'sma_50', label: 'SMA (50)', description: '50-day Simple Moving Average' },
  { value: 'sma_200', label: 'SMA (200)', description: '200-day Simple Moving Average' },
  { value: 'ema_20', label: 'EMA (20)', description: '20-day Exponential Moving Average' },
  { value: 'ema_50', label: 'EMA (50)', description: '50-day Exponential Moving Average' },
  { value: 'volume', label: 'Volume', description: 'Trading volume' },
  { value: 'volume_ratio', label: 'Volume Ratio', description: 'Volume vs 20-day average' },
];
