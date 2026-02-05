// Pre-built workflow templates for the Investment Module
// These templates can be used as starting points for user workflows

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'alerts' | 'reports' | 'journaling';
  icon: string; // Lucide icon name
  trigger: {
    type: 'schedule' | 'investment_alert' | 'price_change';
    cron?: string;
    indicator?: string;
    operator?: string;
    value?: number;
  };
  actions: Array<{
    type: string;
    template?: string;
    list?: string;
    [key: string]: unknown;
  }>;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'morning-brief',
    name: 'Morning Market Brief',
    description: 'Daily email summary of your watchlist performance at 8 AM on weekdays',
    category: 'reports',
    icon: 'Sunrise',
    trigger: {
      type: 'schedule',
      cron: '0 8 * * 1-5', // 8 AM weekdays
    },
    actions: [
      { type: 'fetch_watchlist_data' },
      { type: 'generate_summary' },
      { type: 'send_email', template: 'morning_brief' },
    ],
    tags: ['email', 'daily', 'watchlist'],
    difficulty: 'beginner',
  },
  {
    id: 'rsi-alert-journal',
    name: 'RSI Alert → Trading Journal',
    description: 'Automatically log RSI alerts to your trading journal for future analysis',
    category: 'journaling',
    icon: 'BookOpen',
    trigger: {
      type: 'investment_alert',
      indicator: 'rsi_14',
    },
    actions: [
      { type: 'log_to_journal', template: 'rsi_alert_entry' },
    ],
    tags: ['rsi', 'journal', 'technical-analysis'],
    difficulty: 'intermediate',
  },
  {
    id: 'price-drop-buy-list',
    name: 'Price Drop → Add to Buy List',
    description: 'When a watched asset drops 5%+, automatically add it to your buy consideration list',
    category: 'alerts',
    icon: 'TrendingDown',
    trigger: {
      type: 'investment_alert',
      indicator: 'change_percent',
      operator: 'lte',
      value: -5,
    },
    actions: [
      { type: 'add_to_list', list: 'buy_consideration' },
      { type: 'send_notification' },
    ],
    tags: ['price-alert', 'dip-buying', 'automation'],
    difficulty: 'beginner',
  },
  {
    id: 'weekly-portfolio-review',
    name: 'Weekly Portfolio Review',
    description: 'Every Sunday at 6 PM, get a comprehensive summary of the week\'s performance',
    category: 'reports',
    icon: 'Calendar',
    trigger: {
      type: 'schedule',
      cron: '0 18 * * 0', // 6 PM Sunday
    },
    actions: [
      { type: 'calculate_weekly_performance' },
      { type: 'send_email', template: 'weekly_review' },
    ],
    tags: ['email', 'weekly', 'portfolio'],
    difficulty: 'beginner',
  },
  {
    id: 'breakout-alert',
    name: 'Breakout Alert',
    description: 'Get notified when an asset breaks above its 50-day moving average',
    category: 'alerts',
    icon: 'Zap',
    trigger: {
      type: 'investment_alert',
      indicator: 'sma_50',
      operator: 'crosses_above',
    },
    actions: [
      { type: 'send_notification' },
      { type: 'log_to_journal', template: 'breakout_entry' },
    ],
    tags: ['technical-analysis', 'breakout', 'sma'],
    difficulty: 'intermediate',
  },
  {
    id: 'volume-spike-alert',
    name: 'Volume Spike Alert',
    description: 'Alert when trading volume is 2x+ the 20-day average — potential big move incoming',
    category: 'alerts',
    icon: 'BarChart3',
    trigger: {
      type: 'investment_alert',
      indicator: 'volume_ratio',
      operator: 'gt',
      value: 2,
    },
    actions: [
      { type: 'send_notification' },
      { type: 'send_email', template: 'volume_alert' },
    ],
    tags: ['volume', 'unusual-activity', 'momentum'],
    difficulty: 'intermediate',
  },
  {
    id: 'end-of-day-summary',
    name: 'End of Day Summary',
    description: 'Daily recap email at market close with your watchlist movers',
    category: 'reports',
    icon: 'Sunset',
    trigger: {
      type: 'schedule',
      cron: '0 16 * * 1-5', // 4 PM weekdays
    },
    actions: [
      { type: 'fetch_watchlist_data' },
      { type: 'calculate_daily_movers' },
      { type: 'send_email', template: 'end_of_day' },
    ],
    tags: ['email', 'daily', 'movers'],
    difficulty: 'beginner',
  },
  {
    id: 'oversold-rsi-journal',
    name: 'Oversold RSI → Journal Entry',
    description: 'When RSI drops below 30 (oversold), log it for potential buy opportunities',
    category: 'journaling',
    icon: 'FileText',
    trigger: {
      type: 'investment_alert',
      indicator: 'rsi_14',
      operator: 'lt',
      value: 30,
    },
    actions: [
      { type: 'log_to_journal', template: 'oversold_entry' },
      { type: 'send_notification' },
    ],
    tags: ['rsi', 'oversold', 'buy-signal'],
    difficulty: 'intermediate',
  },
];

export const TEMPLATE_CATEGORIES = {
  alerts: {
    label: 'Alerts',
    description: 'Get notified when conditions are met',
    color: 'blue',
  },
  reports: {
    label: 'Reports',
    description: 'Scheduled summaries and digests',
    color: 'green',
  },
  journaling: {
    label: 'Journaling',
    description: 'Automatic trade logging',
    color: 'purple',
  },
} as const;

export type TemplateCategory = keyof typeof TEMPLATE_CATEGORIES;
