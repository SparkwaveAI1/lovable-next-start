// Pipeline and lead management types

export type LeadType = 
  | 'sales_lead'
  | 'freeze_request'
  | 'cancellation_request'
  | 'service_request';

export type SalesPipelineStage = 
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'trial_scheduled'
  | 'trial_completed'
  | 'closed_won'
  | 'closed_lost';

export type ServiceRequestStage =
  | 'pending_review'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PipelineStage = SalesPipelineStage | ServiceRequestStage;

export type Program = 
  | 'boxing'
  | 'muay-thai'
  | 'jiu-jitsu'
  | 'mma'
  | 'general';

export type ActivityType =
  | 'note'
  | 'status_change'
  | 'stage_change'
  | 'sms_sent'
  | 'sms_received'
  | 'call'
  | 'email'
  | 'booking'
  | 'follow_up_scheduled'
  | 'follow_up_completed'
  | 'form_submission';

export interface ContactActivity {
  id: string;
  contact_id: string;
  activity_type: ActivityType;
  activity_data: Record<string, any>;
  notes: string | null;
  created_at: string;
}

export interface PipelineContact {
  id: string;
  lead_type: LeadType;
  pipeline_stage: PipelineStage;
  last_activity_date: string | null;
  interested_programs: Program[] | null;
  next_follow_up_date: string | null;
}
