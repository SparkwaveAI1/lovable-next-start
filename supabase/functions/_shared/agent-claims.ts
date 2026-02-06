/**
 * Agent Claim System
 * 
 * Prevents Rico-Main and Rico-Sales from duplicating work.
 * Uses mc_active_agent_tasks table for coordination.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const CLAIM_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export interface ClaimResult {
  claimed: boolean;
  reason: string;
  claimedBy?: string;
  claimedAt?: string;
  taskId?: string;
}

/**
 * Attempt to claim a task for an agent
 * 
 * Returns success if:
 * - Task is not claimed
 * - Task claim expired (>30 min)
 * - Task already claimed by same agent
 */
export async function claimTask(
  supabase: SupabaseClient,
  taskKey: string,  // Unique key like "outreach:fight-flow" or "follow-up:contact-123"
  agentId: string,  // "rico-main" or "rico-sales"
  description?: string
): Promise<ClaimResult> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CLAIM_TIMEOUT_MS);

  try {
    // Check for existing claim
    const { data: existing, error: checkError } = await supabase
      .from('mc_active_agent_tasks')
      .select('*')
      .eq('task_key', taskKey)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // Real error (not just "not found")
      console.error('Claim check error:', checkError);
      return { claimed: false, reason: `Database error: ${checkError.message}` };
    }

    if (existing) {
      // Check if same agent
      if (existing.agent_id === agentId) {
        // Refresh the claim
        await supabase
          .from('mc_active_agent_tasks')
          .update({ 
            updated_at: now.toISOString(),
            expires_at: expiresAt.toISOString()
          })
          .eq('id', existing.id);

        return {
          claimed: true,
          reason: 'Already claimed by this agent (refreshed)',
          claimedBy: agentId,
          claimedAt: existing.created_at,
          taskId: existing.id
        };
      }

      // Check if expired
      const claimAge = now.getTime() - new Date(existing.updated_at).getTime();
      if (claimAge < CLAIM_TIMEOUT_MS) {
        return {
          claimed: false,
          reason: `Already claimed by ${existing.agent_id} (${Math.round(claimAge / 60000)}m ago)`,
          claimedBy: existing.agent_id,
          claimedAt: existing.created_at
        };
      }

      // Expired - take over the claim
      const { data: updated, error: updateError } = await supabase
        .from('mc_active_agent_tasks')
        .update({
          agent_id: agentId,
          description: description || existing.description,
          updated_at: now.toISOString(),
          expires_at: expiresAt.toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        return { claimed: false, reason: `Failed to take expired claim: ${updateError.message}` };
      }

      return {
        claimed: true,
        reason: `Took over expired claim from ${existing.agent_id}`,
        claimedBy: agentId,
        claimedAt: now.toISOString(),
        taskId: updated.id
      };
    }

    // No existing claim - create new one
    const { data: newClaim, error: insertError } = await supabase
      .from('mc_active_agent_tasks')
      .insert({
        task_key: taskKey,
        agent_id: agentId,
        description: description || taskKey,
        status: 'in_progress',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (insertError) {
      // Might be race condition - another agent claimed it
      if (insertError.code === '23505') {
        return { claimed: false, reason: 'Another agent claimed it first' };
      }
      return { claimed: false, reason: `Insert failed: ${insertError.message}` };
    }

    return {
      claimed: true,
      reason: 'New claim created',
      claimedBy: agentId,
      claimedAt: now.toISOString(),
      taskId: newClaim.id
    };

  } catch (error: any) {
    console.error('Claim error:', error);
    return { claimed: false, reason: `Error: ${error.message}` };
  }
}

/**
 * Release a claim when done
 */
export async function releaseClaim(
  supabase: SupabaseClient,
  taskKey: string,
  agentId: string,
  status: 'completed' | 'failed' | 'abandoned' = 'completed'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('mc_active_agent_tasks')
      .update({
        status,
        completed_at: new Date().toISOString()
      })
      .eq('task_key', taskKey)
      .eq('agent_id', agentId);

    if (error) {
      console.error('Release claim error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Release claim error:', error);
    return false;
  }
}

/**
 * Check if a task is claimed by another agent
 */
export async function isClaimedByOther(
  supabase: SupabaseClient,
  taskKey: string,
  myAgentId: string
): Promise<{ claimed: boolean; by?: string }> {
  try {
    const { data, error } = await supabase
      .from('mc_active_agent_tasks')
      .select('agent_id, updated_at')
      .eq('task_key', taskKey)
      .single();

    if (error || !data) {
      return { claimed: false };
    }

    // Check if expired
    const claimAge = Date.now() - new Date(data.updated_at).getTime();
    if (claimAge >= CLAIM_TIMEOUT_MS) {
      return { claimed: false }; // Expired
    }

    if (data.agent_id === myAgentId) {
      return { claimed: false }; // Claimed by me
    }

    return { claimed: true, by: data.agent_id };
  } catch {
    return { claimed: false };
  }
}

/**
 * Get all active claims for an agent
 */
export async function getAgentClaims(
  supabase: SupabaseClient,
  agentId: string
): Promise<string[]> {
  try {
    const cutoff = new Date(Date.now() - CLAIM_TIMEOUT_MS);
    
    const { data, error } = await supabase
      .from('mc_active_agent_tasks')
      .select('task_key')
      .eq('agent_id', agentId)
      .gte('updated_at', cutoff.toISOString())
      .is('completed_at', null);

    if (error || !data) {
      return [];
    }

    return data.map(d => d.task_key);
  } catch {
    return [];
  }
}
