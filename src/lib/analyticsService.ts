/**
 * Content Analytics Service
 * Tracks image views, video plays, and social shares
 */

import { supabase } from "@/integrations/supabase/client";

export type ContentType = 'image' | 'video' | 'post' | 'article';
export type EventType = 'view' | 'play' | 'share' | 'download' | 'click' | 'complete';
export type Platform = 'twitter' | 'linkedin' | 'instagram' | 'facebook' | 'email' | 'web' | 'internal';

interface TrackEventParams {
  businessId: string;
  contentId: string;
  contentType: ContentType;
  eventType: EventType;
  platform?: Platform;
  metadata?: Record<string, any>;
}

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

// Session ID for anonymous tracking (persists for browser session)
let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
  }
  return sessionId;
}

// Simple hash for IP privacy
async function hashString(str: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hash));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }
  // Fallback for environments without crypto
  return str.split('').reduce((a, b) => (a * 31 + b.charCodeAt(0)) & 0xffffffff, 0).toString(16);
}

/**
 * Track a content analytics event
 */
export async function trackEvent(params: TrackEventParams): Promise<{ success: boolean; error?: string }> {
  const { businessId, contentId, contentType, eventType, platform = 'web', metadata = {} } = params;

  try {
    // Get current user if authenticated
    const { data: { user } } = await supabase.auth.getUser();

    const eventData = {
      business_id: businessId,
      content_id: contentId,
      content_type: contentType,
      event_type: eventType,
      platform,
      user_id: user?.id || null,
      session_id: getSessionId(),
      metadata,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      referrer: typeof document !== 'undefined' ? document.referrer : null,
    };

    const { error } = await supabase
      .from('content_analytics')
      .insert(eventData);

    if (error) {
      console.error('Analytics tracking error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Analytics tracking exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Track an image view
 */
export async function trackImageView(
  businessId: string,
  contentId: string,
  metadata?: { source?: string; thumbnailFirst?: boolean }
): Promise<{ success: boolean }> {
  return trackEvent({
    businessId,
    contentId,
    contentType: 'image',
    eventType: 'view',
    platform: 'internal',
    metadata: metadata || {},
  });
}

/**
 * Track a video play
 */
export async function trackVideoPlay(
  businessId: string,
  contentId: string,
  metadata?: { autoplay?: boolean; duration?: number }
): Promise<{ success: boolean }> {
  return trackEvent({
    businessId,
    contentId,
    contentType: 'video',
    eventType: 'play',
    platform: 'internal',
    metadata: metadata || {},
  });
}

/**
 * Track video completion
 */
export async function trackVideoComplete(
  businessId: string,
  contentId: string,
  metadata?: { watchedDuration?: number; totalDuration?: number; percentWatched?: number }
): Promise<{ success: boolean }> {
  return trackEvent({
    businessId,
    contentId,
    contentType: 'video',
    eventType: 'complete',
    platform: 'internal',
    metadata: metadata || {},
  });
}

/**
 * Track a social share
 */
export async function trackShare(
  businessId: string,
  contentId: string,
  contentType: ContentType,
  platform: Platform,
  metadata?: { shareUrl?: string; recipient?: string }
): Promise<{ success: boolean }> {
  return trackEvent({
    businessId,
    contentId,
    contentType,
    eventType: 'share',
    platform,
    metadata: metadata || {},
  });
}

/**
 * Track a download event
 */
export async function trackDownload(
  businessId: string,
  contentId: string,
  contentType: ContentType,
  metadata?: { fileName?: string; fileSize?: number }
): Promise<{ success: boolean }> {
  return trackEvent({
    businessId,
    contentId,
    contentType,
    eventType: 'download',
    platform: 'internal',
    metadata: metadata || {},
  });
}

/**
 * Get analytics summary for a business
 */
export async function getAnalyticsSummary(
  businessId: string,
  dateRange?: { start: Date; end: Date }
): Promise<{ success: boolean; data?: AnalyticsSummary; error?: string }> {
  try {
    let query = supabase
      .from('content_analytics_daily')
      .select('*')
      .eq('business_id', businessId);

    if (dateRange) {
      query = query
        .gte('date', dateRange.start.toISOString().split('T')[0])
        .lte('date', dateRange.end.toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    // Aggregate the data
    const summary: AnalyticsSummary = {
      totalViews: 0,
      totalPlays: 0,
      totalShares: 0,
      totalDownloads: 0,
      byContent: [],
    };

    const contentMap = new Map<string, { views: number; plays: number; shares: number }>();

    (data || []).forEach((row: any) => {
      const count = row.count || 0;
      
      switch (row.event_type) {
        case 'view':
          summary.totalViews += count;
          break;
        case 'play':
          summary.totalPlays += count;
          break;
        case 'share':
          summary.totalShares += count;
          break;
        case 'download':
          summary.totalDownloads += count;
          break;
      }

      // Track by content
      const existing = contentMap.get(row.content_id) || { views: 0, plays: 0, shares: 0 };
      if (row.event_type === 'view') existing.views += count;
      if (row.event_type === 'play') existing.plays += count;
      if (row.event_type === 'share') existing.shares += count;
      contentMap.set(row.content_id, existing);
    });

    summary.byContent = Array.from(contentMap.entries()).map(([contentId, stats]) => ({
      contentId,
      ...stats,
    }));

    return { success: true, data: summary };
  } catch (err) {
    console.error('Error getting analytics summary:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Get analytics for a specific content item
 */
export async function getContentAnalytics(
  contentId: string,
  dateRange?: { start: Date; end: Date }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    let query = supabase
      .from('content_analytics_daily')
      .select('*')
      .eq('content_id', contentId)
      .order('date', { ascending: false });

    if (dateRange) {
      query = query
        .gte('date', dateRange.start.toISOString().split('T')[0])
        .lte('date', dateRange.end.toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Get top performing content
 */
export async function getTopContent(
  businessId: string,
  eventType: EventType = 'view',
  limit: number = 10
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('content_analytics_daily')
      .select('content_id, content_type, count')
      .eq('business_id', businessId)
      .eq('event_type', eventType)
      .order('count', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    // Aggregate by content_id
    const aggregated = (data || []).reduce((acc: Record<string, any>, row: any) => {
      if (!acc[row.content_id]) {
        acc[row.content_id] = {
          contentId: row.content_id,
          contentType: row.content_type,
          totalCount: 0,
        };
      }
      acc[row.content_id].totalCount += row.count;
      return acc;
    }, {});

    const sorted = Object.values(aggregated).sort((a: any, b: any) => b.totalCount - a.totalCount);

    return { success: true, data: sorted.slice(0, limit) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
