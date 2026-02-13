export type BlockType = 
  | 'text' 
  | 'image' 
  | 'button' 
  | 'divider' 
  | 'spacer' 
  | 'columns' 
  | 'social' 
  | 'video';

export type PreviewMode = 'desktop' | 'mobile';

export interface EmailBlock {
  id: string;
  type: BlockType;
  content: any; // Type varies by block type
  styles: Record<string, any>;
}

export interface GlobalStyles {
  fontFamily: string;
  backgroundColor: string;
  primaryColor: string;
  textColor: string;
  linkColor: string;
  maxWidth: string;
  padding: string;
}

export interface EmailEditorState {
  blocks: EmailBlock[];
  globalStyles: GlobalStyles;
}

export interface TextBlockContent {
  text: string;
}

export interface ImageBlockContent {
  src: string;
  alt: string;
  href?: string;
  width?: string;
  height?: string;
}

export interface ButtonBlockContent {
  text: string;
  href: string;
  style: 'primary' | 'secondary' | 'outline';
}

export interface DividerBlockContent {
  color: string;
  thickness: number;
  style: 'solid' | 'dashed' | 'dotted';
}

export interface SpacerBlockContent {
  height: number;
}

export interface ColumnBlockContent {
  layout: '2-column' | '3-column' | '4-column';
  columns: Array<{
    content: string;
    width?: string;
  }>;
}

export interface SocialBlockContent {
  platforms: Array<{
    name: string;
    url: string;
    icon: string;
  }>;
  iconSize: number;
  spacing: number;
}

export interface VideoBlockContent {
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  description?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  thumbnailUrl?: string;
  content: EmailEditorState;
  isSystem: boolean;
  createdAt: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description?: string;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: 'all', name: 'All Templates' },
  { id: 'welcome', name: 'Welcome', description: 'New subscriber welcome emails' },
  { id: 'newsletter', name: 'Newsletter', description: 'Regular updates and news' },
  { id: 'promotional', name: 'Promotional', description: 'Sales and special offers' },
  { id: 'announcement', name: 'Announcement', description: 'Product and feature launches' },
  { id: 'event', name: 'Event', description: 'Event invitations and reminders' },
  { id: 'transactional', name: 'Transactional', description: 'Order confirmations, receipts' },
  { id: 'blank', name: 'Blank', description: 'Start from scratch' },
];

export interface CampaignAnalytics {
  campaignId: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  linkClicks: Array<{
    url: string;
    text?: string;
    clicks: number;
  }>;
  deviceBreakdown: Array<{
    device: string;
    count: number;
    percentage: number;
  }>;
  timeSeriesData: Array<{
    timestamp: string;
    opens: number;
    clicks: number;
  }>;
}

export interface ABTest {
  id: string;
  campaignId: string;
  name: string;
  testType: 'subject' | 'sender' | 'content' | 'sendTime';
  status: 'draft' | 'running' | 'completed' | 'cancelled';
  samplePercentage: number;
  winnerMetric: 'opens' | 'clicks';
  testDurationHours: number;
  autoSendWinner: boolean;
  variants: Array<{
    id: string;
    label: string;
    subject?: string;
    senderName?: string;
    content?: EmailEditorState;
    sendTime?: string;
    sent: number;
    opens: number;
    clicks: number;
  }>;
  winnerId?: string;
  winnerDeclaredAt?: string;
  isSignificant?: boolean;
  startedAt?: string;
  completedAt?: string;
}

export interface EmailSegment {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  conditions: SegmentCondition[];
  logicType: 'AND' | 'OR';
  isDynamic: boolean;
  contactCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentCondition {
  field: string;
  operator: string;
  value: any;
  group?: 'AND' | 'OR';
}

export const SEGMENT_FIELDS = [
  { id: 'tags', label: 'Tags', type: 'array' },
  { id: 'email', label: 'Email', type: 'string' },
  { id: 'first_name', label: 'First Name', type: 'string' },
  { id: 'last_name', label: 'Last Name', type: 'string' },
  { id: 'created_at', label: 'Contact Date', type: 'date' },
  { id: 'last_email_opened', label: 'Last Email Opened', type: 'date' },
  { id: 'last_email_clicked', label: 'Last Email Clicked', type: 'date' },
  { id: 'email_engagement_score', label: 'Engagement Score', type: 'number' },
];

export const SEGMENT_OPERATORS = {
  string: [
    { id: 'equals', label: 'equals' },
    { id: 'contains', label: 'contains' },
    { id: 'starts_with', label: 'starts with' },
    { id: 'ends_with', label: 'ends with' },
    { id: 'is_empty', label: 'is empty' },
    { id: 'is_not_empty', label: 'is not empty' },
  ],
  array: [
    { id: 'contains_any', label: 'contains any' },
    { id: 'contains_all', label: 'contains all' },
    { id: 'contains_none', label: 'contains none' },
    { id: 'is_empty', label: 'is empty' },
  ],
  number: [
    { id: 'equals', label: 'equals' },
    { id: 'greater_than', label: 'greater than' },
    { id: 'less_than', label: 'less than' },
    { id: 'between', label: 'between' },
  ],
  date: [
    { id: 'is_after', label: 'is after' },
    { id: 'is_before', label: 'is before' },
    { id: 'is_between', label: 'is between' },
    { id: 'within_days', label: 'within last X days' },
    { id: 'more_than_days_ago', label: 'more than X days ago' },
  ],
};