// Audit module - Action logging
// Task 1.5 will expand this with more audit features

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ActionLog {
  conversation_id?: string;
  message_id?: string;
  business_id: string;
  user_id: string;
  function_name: string;
  function_input: any;
  function_output?: any;
  status: 'pending' | 'approved' | 'executed' | 'failed' | 'denied' | 'rate_limited';
  error_message?: string;
  execution_time_ms?: number;
  required_confirmation?: boolean;
}

/**
 * Log an action to the audit trail
 * Returns the action ID
 */
export async function logAction(
  supabase: SupabaseClient,
  action: ActionLog
): Promise<string> {
  const { data, error } = await supabase
    .from('assistant_actions')
    .insert({
      conversation_id: action.conversation_id,
      message_id: action.message_id,
      business_id: action.business_id,
      user_id: action.user_id,
      function_name: action.function_name,
      function_input: action.function_input,
      function_output: action.function_output,
      status: action.status,
      error_message: action.error_message,
      execution_time_ms: action.execution_time_ms,
      required_confirmation: action.required_confirmation ?? false
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error logging action:', error);
    throw new Error(`Failed to log action: ${error.message}`);
  }

  return data.id;
}

/**
 * Update an existing action log
 */
export async function updateAction(
  supabase: SupabaseClient,
  actionId: string,
  updates: Partial<ActionLog>
): Promise<void> {
  const { error } = await supabase
    .from('assistant_actions')
    .update({
      ...updates,
      ...(updates.status === 'executed' || updates.status === 'denied' || updates.status === 'failed'
        ? { confirmed_at: new Date().toISOString() }
        : {})
    })
    .eq('id', actionId);

  if (error) {
    console.error('Error updating action:', error);
    throw new Error(`Failed to update action: ${error.message}`);
  }
}

/**
 * Get action history for a conversation
 */
export async function getConversationActions(
  supabase: SupabaseClient,
  conversationId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from('assistant_actions')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching actions:', error);
    return [];
  }

  return data;
}

/**
 * Get recent actions for a business (for admin dashboard)
 */
export async function getBusinessActions(
  supabase: SupabaseClient,
  businessId: string,
  limit: number = 100
): Promise<any[]> {
  const { data, error } = await supabase
    .from('assistant_actions')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching business actions:', error);
    return [];
  }

  return data;
}

/**
 * Get action statistics for a business
 */
export async function getActionStats(
  supabase: SupabaseClient,
  businessId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  total: number;
  executed: number;
  failed: number;
  denied: number;
  rate_limited: number;
  by_function: Record<string, number>;
}> {
  const query = supabase
    .from('assistant_actions')
    .select('function_name, status')
    .eq('business_id', businessId);

  if (startDate) {
    query.gte('created_at', startDate.toISOString());
  }
  if (endDate) {
    query.lte('created_at', endDate.toISOString());
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Error fetching stats:', error);
    return {
      total: 0,
      executed: 0,
      failed: 0,
      denied: 0,
      rate_limited: 0,
      by_function: {}
    };
  }

  const stats = {
    total: data.length,
    executed: 0,
    failed: 0,
    denied: 0,
    rate_limited: 0,
    by_function: {} as Record<string, number>
  };

  for (const action of data) {
    // Count by status
    if (action.status === 'executed') stats.executed++;
    else if (action.status === 'failed') stats.failed++;
    else if (action.status === 'denied') stats.denied++;
    else if (action.status === 'rate_limited') stats.rate_limited++;

    // Count by function
    stats.by_function[action.function_name] = 
      (stats.by_function[action.function_name] || 0) + 1;
  }

  return stats;
}
