/**
 * AI Response Logging
 * 
 * Logs all AI-generated responses for quality auditing.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export interface AILogEntry {
  businessId: string;
  contactId?: string;
  inputMessage: string;
  inputChannel: 'sms' | 'email' | 'chat';
  modelUsed: string;
  intentsDetected?: string[];
  knowledgeUsed?: string[];
  responseText: string;
  confidenceScore?: number;
  patternsFlagged?: string[];
  requiredReview?: boolean;
  responseTimeMs?: number;
  tokensUsed?: number;
  costCents?: number;
}

/**
 * Log an AI response for auditing
 */
export async function logAIResponse(
  supabase: SupabaseClient,
  entry: AILogEntry
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('ai_response_logs')
      .insert({
        business_id: entry.businessId,
        contact_id: entry.contactId,
        input_message: entry.inputMessage,
        input_channel: entry.inputChannel,
        model_used: entry.modelUsed,
        intents_detected: entry.intentsDetected || [],
        knowledge_used: entry.knowledgeUsed || [],
        response_text: entry.responseText,
        response_length: entry.responseText.length,
        confidence_score: entry.confidenceScore,
        patterns_flagged: entry.patternsFlagged || [],
        required_review: entry.requiredReview || false,
        response_time_ms: entry.responseTimeMs,
        tokens_used: entry.tokensUsed,
        cost_cents: entry.costCents,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to log AI response:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('AI logging error:', error);
    return null;
  }
}

/**
 * Get recent AI responses for quality review
 */
export async function getAIResponsesForReview(
  supabase: SupabaseClient,
  businessId: string,
  options: {
    limit?: number;
    onlyUnreviewed?: boolean;
    onlyFlagged?: boolean;
  } = {}
): Promise<any[]> {
  const { limit = 10, onlyUnreviewed = true, onlyFlagged = false } = options;

  let query = supabase
    .from('ai_response_logs')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (onlyUnreviewed) {
    query = query.is('reviewed_at', null);
  }

  if (onlyFlagged) {
    query = query.eq('required_review', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get AI responses:', error);
    return [];
  }

  return data || [];
}

/**
 * Mark an AI response as reviewed
 */
export async function reviewAIResponse(
  supabase: SupabaseClient,
  logId: string,
  review: {
    rating: 'good' | 'acceptable' | 'poor' | 'incorrect';
    notes?: string;
    reviewedBy: string;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('ai_response_logs')
    .update({
      reviewed_at: new Date().toISOString(),
      reviewed_by: review.reviewedBy,
      review_rating: review.rating,
      review_notes: review.notes,
    })
    .eq('id', logId);

  if (error) {
    console.error('Failed to review AI response:', error);
    return false;
  }

  return true;
}

/**
 * Get AI quality metrics for a business
 */
export async function getAIQualityMetrics(
  supabase: SupabaseClient,
  businessId: string,
  daysBack: number = 7
): Promise<{
  totalResponses: number;
  reviewedCount: number;
  ratings: Record<string, number>;
  avgResponseTime: number;
  flaggedCount: number;
}> {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('ai_response_logs')
    .select('review_rating, response_time_ms, required_review, reviewed_at')
    .eq('business_id', businessId)
    .gte('created_at', since);

  if (error || !data) {
    return {
      totalResponses: 0,
      reviewedCount: 0,
      ratings: {},
      avgResponseTime: 0,
      flaggedCount: 0,
    };
  }

  const ratings: Record<string, number> = {};
  let totalTime = 0;
  let timeCount = 0;

  data.forEach((row) => {
    if (row.review_rating) {
      ratings[row.review_rating] = (ratings[row.review_rating] || 0) + 1;
    }
    if (row.response_time_ms) {
      totalTime += row.response_time_ms;
      timeCount++;
    }
  });

  return {
    totalResponses: data.length,
    reviewedCount: data.filter((r) => r.reviewed_at).length,
    ratings,
    avgResponseTime: timeCount > 0 ? Math.round(totalTime / timeCount) : 0,
    flaggedCount: data.filter((r) => r.required_review).length,
  };
}
