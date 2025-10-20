import { supabase } from "@/integrations/supabase/client";
import { getBusinessConfig } from "@/lib/game/business-configs";

export interface ScheduledContentItem {
  id: string;
  business_id: string;
  content: string;
  content_type: string;
  topic?: string;
  platform: string;
  scheduled_for: string;
  status: 'scheduled' | 'processing' | 'posted' | 'failed' | 'cancelled';
  content_hash?: string;
  created_at: string;
  posted_at?: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface ScheduleContentParams {
  businessId: string;
  content: string;
  contentType: string;
  scheduledFor: Date;
  topic?: string;
  metadata?: Record<string, any>;
}

/**
 * Schedule content for posting at a specific time
 */
export async function scheduleContent(params: ScheduleContentParams): Promise<{
  success: boolean;
  scheduleId?: string;
  message: string;
}> {
  try {
    const { businessId, content, contentType, scheduledFor, topic, metadata } = params;
    
    // Extract platform from content type
    const platform = extractPlatformFromContentType(contentType);
    
    const { data, error } = await supabase
      .from('scheduled_content')
      .insert({
        business_id: businessId,
        content,
        content_type: contentType,
        topic,
        platform,
        scheduled_for: scheduledFor.toISOString(),
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error scheduling content:', error);
      return {
        success: false,
        message: `Failed to schedule content: ${error.message}`
      };
    }

    return {
      success: true,
      scheduleId: data.id,
      message: `Content scheduled successfully for ${scheduledFor.toLocaleString()}`
    };

  } catch (error) {
    console.error('Scheduling service error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get scheduled content with optional filters
 */
export async function getScheduledContent(
  businessId?: string,
  status?: string,
  limit: number = 50
): Promise<{
  success: boolean;
  content: ScheduledContentItem[];
  message: string;
}> {
  try {
    let query = supabase
      .from('scheduled_content')
      .select('*')
      .order('scheduled_for', { ascending: true })
      .limit(limit);

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching scheduled content:', error);
      return {
        success: false,
        content: [],
        message: `Failed to fetch scheduled content: ${error.message}`
      };
    }

    return {
      success: true,
      content: (data || []) as ScheduledContentItem[],
      message: `Found ${data?.length || 0} scheduled items`
    };

  } catch (error) {
    console.error('Error in getScheduledContent:', error);
    return {
      success: false,
      content: [],
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Cancel scheduled content
 */
export async function cancelScheduledContent(scheduleId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { error } = await supabase
      .from('scheduled_content')
      .update({ status: 'cancelled' })
      .eq('id', scheduleId)
      .eq('status', 'scheduled'); // Only cancel if still scheduled

    if (error) {
      console.error('Error cancelling scheduled content:', error);
      return {
        success: false,
        message: `Failed to cancel content: ${error.message}`
      };
    }

    return {
      success: true,
      message: 'Content cancelled successfully'
    };

  } catch (error) {
    console.error('Error in cancelScheduledContent:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get content due for posting (for background job processing)
 */
export async function getDueContent(): Promise<{
  success: boolean;
  content: ScheduledContentItem[];
  message: string;
}> {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('scheduled_content')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true });

    if (error) {
      console.error('Error fetching due content:', error);
      return {
        success: false,
        content: [],
        message: `Failed to fetch due content: ${error.message}`
      };
    }

    return {
      success: true,
      content: (data || []) as ScheduledContentItem[],
      message: `Found ${data?.length || 0} items due for posting`
    };

  } catch (error) {
    console.error('Error in getDueContent:', error);
    return {
      success: false,
      content: [],
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Mark content as posted manually
 */
export async function markAsPosted(contentId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { error } = await supabase
      .from('scheduled_content')
      .update({ 
        status: 'posted',
        posted_at: new Date().toISOString()
      })
      .eq('id', contentId);

    if (error) {
      console.error('Error marking content as posted:', error);
      return {
        success: false,
        message: `Failed to mark as posted: ${error.message}`
      };
    }

    return {
      success: true,
      message: 'Content marked as posted'
    };

  } catch (error) {
    console.error('Error in markAsPosted:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Mark content as posted or failed
 */
export async function updateContentStatus(
  scheduleId: string,
  status: 'posted' | 'failed',
  errorMessage?: string
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const updateData: any = {
      status,
      ...(status === 'posted' && { posted_at: new Date().toISOString() }),
      ...(status === 'failed' && errorMessage && { error_message: errorMessage })
    };

    const { error } = await supabase
      .from('scheduled_content')
      .update(updateData)
      .eq('id', scheduleId);

    if (error) {
      console.error('Error updating content status:', error);
      return {
        success: false,
        message: `Failed to update status: ${error.message}`
      };
    }

    return {
      success: true,
      message: `Content marked as ${status}`
    };

  } catch (error) {
    console.error('Error in updateContentStatus:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Extract platform from content type
 */
function extractPlatformFromContentType(contentType: string): string {
  const platformMap: Record<string, string> = {
    twitter_post: "twitter",
    discord_message: "discord",
    telegram_post: "telegram",
    linkedin_post: "linkedin"
  };

  return platformMap[contentType] || "unknown";
}

/**
 * Get content analytics for dashboard
 */
export async function getContentAnalytics(
  businessId?: string,
  days: number = 30
): Promise<{
  success: boolean;
  analytics: {
    totalScheduled: number;
    totalPosted: number;
    totalFailed: number;
    successRate: number;
    byPlatform: Record<string, number>;
  };
  message: string;
}> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = supabase
      .from('scheduled_content')
      .select('status, platform')
      .gte('created_at', startDate.toISOString());

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching analytics:', error);
      return {
        success: false,
        analytics: {
          totalScheduled: 0,
          totalPosted: 0,
          totalFailed: 0,
          successRate: 0,
          byPlatform: {}
        },
        message: `Failed to fetch analytics: ${error.message}`
      };
    }

    const items = data || [];
    const totalScheduled = items.length;
    const totalPosted = items.filter(item => item.status === 'posted').length;
    const totalFailed = items.filter(item => item.status === 'failed').length;
    const successRate = totalScheduled > 0 ? Math.round((totalPosted / totalScheduled) * 100) : 0;

    const byPlatform: Record<string, number> = {};
    items.forEach(item => {
      byPlatform[item.platform] = (byPlatform[item.platform] || 0) + 1;
    });

    return {
      success: true,
      analytics: {
        totalScheduled,
        totalPosted,
        totalFailed,
        successRate,
        byPlatform
      },
      message: `Analytics for last ${days} days`
    };

  } catch (error) {
    console.error('Error in getContentAnalytics:', error);
    return {
      success: false,
      analytics: {
        totalScheduled: 0,
        totalPosted: 0,
        totalFailed: 0,
        successRate: 0,
        byPlatform: {}
      },
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}