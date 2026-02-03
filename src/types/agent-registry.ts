// Agent Registry Types

export type AgentRegistryStatus = 'active' | 'paused' | 'disabled';
export type AgentRuntimeStatus = 'idle' | 'working' | 'waiting' | 'error';
export type AgentActivityType = 'task_started' | 'task_completed' | 'error' | 'message_sent' | 'decision_made' | 'api_call' | 'config_changed';

export interface AgentRegistry {
  id: string;
  business_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  full_documentation: string | null;
  capabilities: string[];
  status: AgentRegistryStatus;
  config: Record<string, any>;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface AgentRegistryStatusRecord {
  id: string;
  agent_id: string;
  status: AgentRuntimeStatus;
  current_task: string | null;
  started_at: string;
  metadata: Record<string, any>;
  updated_at: string;
}

export interface AgentRegistryActivity {
  id: string;
  agent_id: string;
  action_type: AgentActivityType;
  description: string | null;
  details: Record<string, any>;
  created_at: string;
}

// Combined type for UI with status attached
export interface AgentWithStatus extends AgentRegistry {
  runtime_status?: AgentRegistryStatusRecord;
}

// Filter options for activity feed
export const AGENT_ACTIVITY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'task_started', label: 'Started' },
  { id: 'task_completed', label: 'Completed' },
  { id: 'error', label: 'Errors' },
  { id: 'message_sent', label: 'Messages' },
  { id: 'decision_made', label: 'Decisions' },
  { id: 'api_call', label: 'API Calls' },
] as const;

// Status color/label configurations
export const RUNTIME_STATUS_CONFIG: Record<AgentRuntimeStatus, { label: string; color: string; bgColor: string; pulseColor: string }> = {
  idle: {
    label: 'Idle',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500',
    pulseColor: 'bg-emerald-400',
  },
  working: {
    label: 'Working',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    pulseColor: 'bg-blue-400',
  },
  waiting: {
    label: 'Waiting',
    color: 'text-amber-600',
    bgColor: 'bg-amber-500',
    pulseColor: 'bg-amber-400',
  },
  error: {
    label: 'Error',
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    pulseColor: 'bg-red-400',
  },
};

export const REGISTRY_STATUS_CONFIG: Record<AgentRegistryStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  paused: {
    label: 'Paused',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  disabled: {
    label: 'Disabled',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};
