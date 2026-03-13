// Mission Control Types

export type AgentStatus = 'working' | 'idle' | 'blocked' | 'active' | 'offline';
export type AgentLevel = 'lead' | 'specialist' | 'intern';
export type TaskStatus = 'todo' | 'inbox' | 'assigned' | 'in_progress' | 'review' | 'blocked' | 'cancelled' | 'done';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type ActivityType = 'task_created' | 'task_updated' | 'task_deleted' | 'status_changed' | 'message_sent' | 'decision_made' | 'document_created';

export interface Agent {
  id: string;
  name: string;
  role: string;
  level: AgentLevel;
  status: AgentStatus;
  current_task_id: string | null;
  session_key: string;
  avatar_url: string | null;
  agent_name: string | null;
  business_id: string | null;
  created_at: string;
  updated_at: string;
  type?: 'rico' | 'agent';
  description?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee_ids: string[];
  tags: string[];
  priority: TaskPriority;
  external_id: string | null;
  external_source: string | null;
  agent_name: string | null;
  business_id: string | null;
  document_url: string | null;
  work_summary: string | null;
  project: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  agent_id: string;
  task_id: string | null;
  message: string;
  metadata: Record<string, any>;
  agent_name: string | null;
  business_id: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  task_id: string;
  from_agent_id: string;
  content: string;
  attachments: string[];
  created_at: string;
}

export const KANBAN_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'TODO' },
  { id: 'in_progress', label: 'IN PROGRESS' },
  { id: 'blocked', label: 'BLOCKED' },
  { id: 'review', label: 'REVIEW' },
  { id: 'done', label: 'DONE' },
];

export const ACTIVITY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'task_created', label: 'Tasks' },
  { id: 'message_sent', label: 'Comments' },
  { id: 'decision_made', label: 'Decisions' },
  { id: 'document_created', label: 'Docs' },
  { id: 'status_changed', label: 'Status' },
] as const;

export const PROJECT_OPTIONS = [
  'Sparkwave App',
  'n8n Migration',
  'Fight Flow',
  'Twitter / Iris',
  'Infrastructure',
  'Website',
] as const;

export const ALL_KANBAN_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'review', 'done'];
