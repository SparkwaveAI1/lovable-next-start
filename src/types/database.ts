export interface Business {
  id: string;
  name: string;
  slug: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Automation {
  id: string;
  business_id: string;
  name: string;
  type: 'lead_processing' | 'social_media' | 'email_marketing';
  status: 'active' | 'paused' | 'error';
  description?: string;
  config: Record<string, any>;
  last_run?: string;
  next_run?: string;
  created_at: string;
  updated_at: string;
}

export interface AutomationRun {
  id: string;
  automation_id: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  error_message?: string;
  processed_count: number;
  success_count: number;
  error_count: number;
}

export interface DashboardStats {
  activeAutomations: number;
  todayActivity: number;
  errors: number;
  totalRuns: number;
  successRate: number;
}