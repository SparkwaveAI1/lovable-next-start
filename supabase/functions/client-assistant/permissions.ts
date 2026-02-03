// Permissions module - Permission checking and rate limiting
// Task 1.4 will implement the full permission checking logic

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AssistantConfig {
  allowed_functions: string[];
  blocked_functions: string[];
  daily_limits: Record<string, number>;
}

interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a function is allowed for this business
 */
export function checkPermission(
  functionName: string,
  config: AssistantConfig
): PermissionResult {
  // Check if explicitly blocked
  if (config.blocked_functions.includes(functionName)) {
    return {
      allowed: false,
      reason: `Function "${functionName}" is blocked for this business`
    };
  }

  // If allowed_functions is empty, allow all non-blocked functions
  if (config.allowed_functions.length === 0) {
    return { allowed: true };
  }

  // Check if explicitly allowed
  if (config.allowed_functions.includes(functionName)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Function "${functionName}" is not in the allowed list for this business`
  };
}

/**
 * Check if the rate limit has been exceeded for a function
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  businessId: string,
  functionName: string,
  config: AssistantConfig
): Promise<PermissionResult> {
  const limit = config.daily_limits[functionName];

  // No limit configured = unlimited
  if (!limit) {
    return { allowed: true };
  }

  // Count executions today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('assistant_actions')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('function_name', functionName)
    .eq('status', 'executed')
    .gte('created_at', today.toISOString());

  if (error) {
    console.error('Error checking rate limit:', error);
    // Fail open - allow if we can't check
    return { allowed: true };
  }

  if ((count ?? 0) >= limit) {
    return {
      allowed: false,
      reason: `Daily limit of ${limit} reached for "${functionName}". Resets at midnight.`
    };
  }

  return { allowed: true };
}

/**
 * Get remaining quota for a function
 */
export async function getRemainingQuota(
  supabase: SupabaseClient,
  businessId: string,
  functionName: string,
  config: AssistantConfig
): Promise<{ limit: number | null; used: number; remaining: number | null }> {
  const limit = config.daily_limits[functionName] ?? null;

  if (!limit) {
    return { limit: null, used: 0, remaining: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('assistant_actions')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('function_name', functionName)
    .eq('status', 'executed')
    .gte('created_at', today.toISOString());

  const used = count ?? 0;

  return {
    limit,
    used,
    remaining: limit - used
  };
}
