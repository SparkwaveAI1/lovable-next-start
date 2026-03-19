-- Migration: speed_to_lead_v2
-- Purpose: Support Speed-to-Lead Framework (SPA-847) re-engagement scheduling
-- Adds: appointment_id nullable column (thread_id alias) and step_name index
--       for reengage_no_reply step lookups

-- conversation_threads already has needs_human_review, conversation_state, state_data
-- from 20260112200000_add_ai_knowledge_base.sql — no duplicates needed.

-- Add index for fast re-engagement step lookups by thread + step_name + status
CREATE INDEX IF NOT EXISTS fightflow_seq_steps_reengage_idx
  ON fightflow_sequence_steps (appointment_id, step_name, status)
  WHERE step_name = 'reengage_no_reply' AND status = 'pending';

-- Add index for ai message count queries (direction + thread)
CREATE INDEX IF NOT EXISTS sms_messages_thread_direction_idx
  ON sms_messages (thread_id, direction, created_at DESC);

COMMENT ON INDEX fightflow_seq_steps_reengage_idx IS
  'Speed-to-Lead v2: fast lookup of pending re-engagement steps per thread (SPA-847)';
