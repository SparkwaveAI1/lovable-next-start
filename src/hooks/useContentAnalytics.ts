/**
 * React hook for content analytics
 * Provides easy tracking of image views, video plays, and social shares
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  trackImageView,
  trackVideoPlay,
  trackVideoComplete,
  trackShare,
  trackDownload,
  getAnalyticsSummary,
  getContentAnalytics,
  getTopContent,
  ContentType,
  Platform,
  EventType,
} from '@/lib/analyticsService';

interface AnalyticsSummary {
  totalViews: number;
  totalPlays: number;
  totalShares: number;
  totalDownloads: number;
  byContent: {
    contentId: string;
    views: number;
    plays: number;
    shares: number;
  }[];
}

interface UseContentAnalyticsProps {
  businessId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useContentAnalytics({
  businessId,
  autoRefresh = false,
  refreshInterval = 60000, // 1 minute default
}: UseContentAnalyticsProps = {}) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [topContent, setTopContent] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track which content has been viewed to avoid duplicate tracking
  const viewedContent = useRef<Set<string>>(new Set());

  const fetchSummary = useCallback(async () => {
    if (!businessId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const [summaryResult, topResult] = await Promise.all([
        getAnalyticsSummary(businessId),
        getTopContent(businessId, 'view', 10),
      ]);

      if (summaryResult.success && summaryResult.data) {
        setSummary(summaryResult.data);
      }

      if (topResult.success && topResult.data) {
        setTopContent(topResult.data);
      }

      if (!summaryResult.success) {
        setError(summaryResult.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    if (businessId) {
      fetchSummary();
    }

    if (autoRefresh && businessId) {
      const interval = setInterval(fetchSummary, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [businessId, autoRefresh, refreshInterval, fetchSummary]);

  // Real-time subscription for analytics updates
  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel('content-analytics-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'content_analytics_daily',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          // Refresh summary when new analytics come in
          fetchSummary();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, fetchSummary]);

  /**
   * Track when an image is viewed
   * Automatically deduplicates within the same session
   */
  const onImageView = useCallback(async (
    contentId: string,
    options?: { source?: string; thumbnailFirst?: boolean }
  ) => {
    if (!businessId) return;
    
    const key = `image_${contentId}`;
    if (viewedContent.current.has(key)) return; // Already tracked
    
    viewedContent.current.add(key);
    await trackImageView(businessId, contentId, options);
  }, [businessId]);

  /**
   * Track when a video starts playing
   */
  const onVideoPlay = useCallback(async (
    contentId: string,
    options?: { autoplay?: boolean; duration?: number }
  ) => {
    if (!businessId) return;
    await trackVideoPlay(businessId, contentId, options);
  }, [businessId]);

  /**
   * Track when a video completes
   */
  const onVideoComplete = useCallback(async (
    contentId: string,
    options?: { watchedDuration?: number; totalDuration?: number; percentWatched?: number }
  ) => {
    if (!businessId) return;
    await trackVideoComplete(businessId, contentId, options);
  }, [businessId]);

  /**
   * Track when content is shared
   */
  const onShare = useCallback(async (
    contentId: string,
    contentType: ContentType,
    platform: Platform,
    options?: { shareUrl?: string }
  ) => {
    if (!businessId) return;
    await trackShare(businessId, contentId, contentType, platform, options);
  }, [businessId]);

  /**
   * Track when content is downloaded
   */
  const onDownload = useCallback(async (
    contentId: string,
    contentType: ContentType,
    options?: { fileName?: string; fileSize?: number }
  ) => {
    if (!businessId) return;
    await trackDownload(businessId, contentId, contentType, options);
  }, [businessId]);

  /**
   * Get analytics for a specific content item
   */
  const getContentStats = useCallback(async (contentId: string) => {
    return getContentAnalytics(contentId);
  }, []);

  return {
    // Data
    summary,
    topContent,
    isLoading,
    error,
    
    // Actions
    refetch: fetchSummary,
    
    // Tracking functions
    onImageView,
    onVideoPlay,
    onVideoComplete,
    onShare,
    onDownload,
    getContentStats,
  };
}

/**
 * Simple hook for tracking a single piece of content
 */
export function useTrackContent(businessId?: string) {
  const trackedRef = useRef<Set<string>>(new Set());

  const trackView = useCallback(async (
    contentId: string,
    contentType: ContentType = 'image'
  ) => {
    if (!businessId) return;
    
    const key = `${contentType}_${contentId}`;
    if (trackedRef.current.has(key)) return;
    
    trackedRef.current.add(key);
    
    if (contentType === 'image') {
      await trackImageView(businessId, contentId);
    } else if (contentType === 'video') {
      await trackVideoPlay(businessId, contentId);
    }
  }, [businessId]);

  const trackShareEvent = useCallback(async (
    contentId: string,
    contentType: ContentType,
    platform: Platform
  ) => {
    if (!businessId) return;
    await trackShare(businessId, contentId, contentType, platform);
  }, [businessId]);

  const trackDownloadEvent = useCallback(async (
    contentId: string,
    contentType: ContentType
  ) => {
    if (!businessId) return;
    await trackDownload(businessId, contentId, contentType);
  }, [businessId]);

  return {
    trackView,
    trackShare: trackShareEvent,
    trackDownload: trackDownloadEvent,
  };
}
