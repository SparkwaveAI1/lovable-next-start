/**
 * Feature Flags & Tier Limits for Investment Module
 * INV-074: Subscription tier feature gating
 */

export type SubscriptionTier = 'free' | 'pro';

export interface TierLimits {
  /** Maximum symbols across all watchlists */
  maxWatchlistItems: number;
  /** Maximum price/indicator alerts */
  maxAlerts: number;
  /** Maximum number of watchlists */
  maxWatchlists: number;
  /** Access to real-time data (vs delayed) */
  hasRealTimeData: boolean;
  /** Access to RSI, SMA, volume ratio etc */
  hasAdvancedIndicators: boolean;
  /** Can trigger Sparkwave workflows from alerts */
  hasWorkflowTriggers: boolean;
  /** Access to stock screener */
  hasScreener: boolean;
  /** Data refresh interval in seconds */
  refreshIntervalSeconds: number;
}

/**
 * Tier limits configuration
 */
const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    maxWatchlistItems: 20,
    maxAlerts: 5,
    maxWatchlists: 3,
    hasRealTimeData: false,
    hasAdvancedIndicators: false,
    hasWorkflowTriggers: false,
    hasScreener: true, // basic screener included
    refreshIntervalSeconds: 300, // 5 minutes
  },
  pro: {
    maxWatchlistItems: Infinity,
    maxAlerts: Infinity,
    maxWatchlists: Infinity,
    hasRealTimeData: true,
    hasAdvancedIndicators: true,
    hasWorkflowTriggers: true,
    hasScreener: true,
    refreshIntervalSeconds: 60, // 1 minute
  },
};

/**
 * Get limits for a subscription tier
 */
export function getTierLimits(tier: string): TierLimits {
  return TIER_LIMITS[tier as SubscriptionTier] || TIER_LIMITS.free;
}

/**
 * Check if user can add another watchlist item
 */
export function canAddWatchlistItem(tier: string, currentCount: number): boolean {
  const limits = getTierLimits(tier);
  return currentCount < limits.maxWatchlistItems;
}

/**
 * Check if user can create another watchlist
 */
export function canCreateWatchlist(tier: string, currentCount: number): boolean {
  const limits = getTierLimits(tier);
  return currentCount < limits.maxWatchlists;
}

/**
 * Check if user can create another alert
 */
export function canCreateAlert(tier: string, currentCount: number): boolean {
  const limits = getTierLimits(tier);
  return currentCount < limits.maxAlerts;
}

/**
 * Check if a feature is available for a tier
 */
export function hasFeature(tier: string, feature: keyof TierLimits): boolean {
  const limits = getTierLimits(tier);
  const value = limits[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  return false;
}

/**
 * Get percentage of limit used (for progress bars)
 */
export function getLimitUsagePercent(tier: string, limitType: 'items' | 'alerts' | 'watchlists', currentCount: number): number {
  const limits = getTierLimits(tier);
  let max: number;
  
  switch (limitType) {
    case 'items':
      max = limits.maxWatchlistItems;
      break;
    case 'alerts':
      max = limits.maxAlerts;
      break;
    case 'watchlists':
      max = limits.maxWatchlists;
      break;
  }
  
  if (!isFinite(max)) return 0;
  return Math.min(100, Math.round((currentCount / max) * 100));
}

/**
 * Get remaining capacity for a limit
 */
export function getRemainingCapacity(tier: string, limitType: 'items' | 'alerts' | 'watchlists', currentCount: number): number {
  const limits = getTierLimits(tier);
  let max: number;
  
  switch (limitType) {
    case 'items':
      max = limits.maxWatchlistItems;
      break;
    case 'alerts':
      max = limits.maxAlerts;
      break;
    case 'watchlists':
      max = limits.maxWatchlists;
      break;
  }
  
  if (!isFinite(max)) return Infinity;
  return Math.max(0, max - currentCount);
}

/**
 * Check if user is approaching a limit (>80% used)
 */
export function isApproachingLimit(tier: string, limitType: 'items' | 'alerts' | 'watchlists', currentCount: number): boolean {
  const limits = getTierLimits(tier);
  let max: number;
  
  switch (limitType) {
    case 'items':
      max = limits.maxWatchlistItems;
      break;
    case 'alerts':
      max = limits.maxAlerts;
      break;
    case 'watchlists':
      max = limits.maxWatchlists;
      break;
  }
  
  if (!isFinite(max)) return false;
  return currentCount >= max * 0.8;
}

/**
 * Get the name of a limit for display
 */
export function getLimitDisplayName(limitType: 'items' | 'alerts' | 'watchlists'): string {
  switch (limitType) {
    case 'items':
      return 'watchlist items';
    case 'alerts':
      return 'price alerts';
    case 'watchlists':
      return 'watchlists';
  }
}

/**
 * Pro tier features for marketing/upgrade prompts
 */
export const PRO_FEATURES = [
  {
    title: 'Unlimited Watchlists',
    description: 'Track as many symbols as you need across unlimited watchlists',
    icon: '📊',
  },
  {
    title: 'Unlimited Alerts',
    description: 'Never miss a trading opportunity with unlimited price alerts',
    icon: '🔔',
  },
  {
    title: 'Real-Time Data',
    description: 'Get live market data with faster refresh rates',
    icon: '⚡',
  },
  {
    title: 'Advanced Indicators',
    description: 'Access RSI, SMA, volume analysis and more',
    icon: '📈',
  },
  {
    title: 'Workflow Triggers',
    description: 'Connect alerts to Sparkwave automation workflows',
    icon: '🤖',
  },
];
