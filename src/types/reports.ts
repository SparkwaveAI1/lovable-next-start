// Mission Control Reports Types

export type ReportType = 'hourly_summary' | 'health_check' | 'weekly_report' | 'activity_log' | 'daily_summary';

export interface Report {
  id: string;
  type: ReportType;
  title: string;
  content: string; // Markdown content
  metadata: ReportMetadata;
  business_id: string | null;
  created_at: string;
}

export interface ReportMetadata {
  // Common fields
  generated_by?: string;
  
  // Hourly summary specific
  tasks_completed?: number;
  tasks_in_progress?: number;
  tasks_blocked?: number;
  activities_logged?: number;
  sms_sent?: number;
  
  // Health check specific
  health_status?: 'GREEN' | 'YELLOW' | 'RED';
  checks_passed?: number;
  checks_failed?: number;
  checks_warning?: number;
  
  // Weekly report specific
  week_start?: string;
  week_end?: string;
  total_tasks?: number;
  
  // Flexible extension
  [key: string]: any;
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  hourly_summary: 'Hourly Summary',
  health_check: 'Health Check',
  weekly_report: 'Weekly Report',
  activity_log: 'Activity Log',
  daily_summary: 'Daily Summary',
};

export const REPORT_TYPE_ICONS: Record<ReportType, string> = {
  hourly_summary: '📊',
  health_check: '🏥',
  weekly_report: '📈',
  activity_log: '📝',
  daily_summary: '📅',
};
