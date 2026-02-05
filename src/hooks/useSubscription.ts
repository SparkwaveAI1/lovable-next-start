import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  getTierLimits,
  canAddWatchlistItem,
  canCreateWatchlist,
  canCreateAlert,
  hasFeature,
  getLimitUsagePercent,
  getRemainingCapacity,
  isApproachingLimit,
  type SubscriptionTier,
  type TierLimits,
} from '@/lib/featureFlags';

export interface SubscriptionState {
  /** Current tier */
  tier: SubscriptionTier;
  /** Tier limits */
  limits: TierLimits;
  /** Current usage counts */
  usage: {
    watchlistItems: number;
    watchlists: number;
    alerts: number;
  };
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Helper functions */
  canAddWatchlistItem: () => boolean;
  canCreateWatchlist: () => boolean;
  canCreateAlert: () => boolean;
  hasFeature: (feature: keyof TierLimits) => boolean;
  getUsagePercent: (type: 'items' | 'alerts' | 'watchlists') => number;
  getRemainingCapacity: (type: 'items' | 'alerts' | 'watchlists') => number;
  isApproachingLimit: (type: 'items' | 'alerts' | 'watchlists') => boolean;
  isPro: boolean;
}

interface UsageData {
  tier: SubscriptionTier;
  watchlistItems: number;
  watchlists: number;
  alerts: number;
}

/**
 * Hook to fetch subscription tier and usage data
 */
export function useSubscription(businessId?: string): SubscriptionState {
  const {
    data,
    isLoading,
    error,
  } = useQuery<UsageData>({
    queryKey: ['subscription', businessId],
    queryFn: async (): Promise<UsageData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch tier from business if provided, otherwise default to free
      let tier: SubscriptionTier = 'free';
      
      if (businessId) {
        const { data: business } = await supabase
          .from('businesses')
          .select('investment_tier')
          .eq('id', businessId)
          .single();
        
        if (business?.investment_tier) {
          tier = business.investment_tier as SubscriptionTier;
        }
      }

      // Fetch current usage counts
      // Count watchlist items
      let watchlistItemsQuery = supabase
        .from('watchlist_items')
        .select('id', { count: 'exact', head: true });
      
      // We need to filter by user's watchlists
      const { data: userWatchlists } = await supabase
        .from('investment_watchlists')
        .select('id')
        .eq('user_id', user.id);
      
      const watchlistIds = (userWatchlists || []).map(w => w.id);
      
      let watchlistItems = 0;
      if (watchlistIds.length > 0) {
        const { count } = await supabase
          .from('watchlist_items')
          .select('id', { count: 'exact', head: true })
          .in('watchlist_id', watchlistIds);
        watchlistItems = count || 0;
      }

      // Count watchlists
      let watchlistsQuery = supabase
        .from('investment_watchlists')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (businessId) {
        watchlistsQuery = watchlistsQuery.eq('business_id', businessId);
      }
      
      const { count: watchlistsCount } = await watchlistsQuery;

      // Count alerts
      let alertsQuery = supabase
        .from('investment_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (businessId) {
        alertsQuery = alertsQuery.eq('business_id', businessId);
      }
      
      const { count: alertsCount } = await alertsQuery;

      return {
        tier,
        watchlistItems,
        watchlists: watchlistsCount || 0,
        alerts: alertsCount || 0,
      };
    },
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: true,
  });

  const tier = data?.tier || 'free';
  const limits = getTierLimits(tier);
  const usage = {
    watchlistItems: data?.watchlistItems || 0,
    watchlists: data?.watchlists || 0,
    alerts: data?.alerts || 0,
  };

  return {
    tier,
    limits,
    usage,
    isLoading,
    error: error as Error | null,
    canAddWatchlistItem: () => canAddWatchlistItem(tier, usage.watchlistItems),
    canCreateWatchlist: () => canCreateWatchlist(tier, usage.watchlists),
    canCreateAlert: () => canCreateAlert(tier, usage.alerts),
    hasFeature: (feature) => hasFeature(tier, feature),
    getUsagePercent: (type) => {
      switch (type) {
        case 'items': return getLimitUsagePercent(tier, type, usage.watchlistItems);
        case 'alerts': return getLimitUsagePercent(tier, type, usage.alerts);
        case 'watchlists': return getLimitUsagePercent(tier, type, usage.watchlists);
      }
    },
    getRemainingCapacity: (type) => {
      switch (type) {
        case 'items': return getRemainingCapacity(tier, type, usage.watchlistItems);
        case 'alerts': return getRemainingCapacity(tier, type, usage.alerts);
        case 'watchlists': return getRemainingCapacity(tier, type, usage.watchlists);
      }
    },
    isApproachingLimit: (type) => {
      switch (type) {
        case 'items': return isApproachingLimit(tier, type, usage.watchlistItems);
        case 'alerts': return isApproachingLimit(tier, type, usage.alerts);
        case 'watchlists': return isApproachingLimit(tier, type, usage.watchlists);
      }
    },
    isPro: tier === 'pro',
  };
}

/**
 * Hook to just get tier info (lightweight version)
 */
export function useTier(businessId?: string): { tier: SubscriptionTier; isPro: boolean; isLoading: boolean } {
  const { tier, isPro, isLoading } = useSubscription(businessId);
  return { tier, isPro, isLoading };
}
