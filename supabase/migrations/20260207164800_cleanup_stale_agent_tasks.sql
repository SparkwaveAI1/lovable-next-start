-- Migration: Cleanup stale agent tasks
-- Problem: Agent tasks stuck in 'running'/'waiting' status clutter the Activity Feed
-- Solution: Add 'timed_out' status and auto-cleanup function

-- 1. Add 'timed_out' to valid statuses
ALTER TABLE mc_active_agent_tasks 
  DROP CONSTRAINT IF EXISTS mc_active_agent_tasks_status_check;

ALTER TABLE mc_active_agent_tasks 
  ADD CONSTRAINT mc_active_agent_tasks_status_check 
  CHECK (status = ANY (ARRAY['running'::text, 'waiting'::text, 'completed'::text, 'error'::text, 'timed_out'::text]));

-- 2. Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_stale_agent_tasks(stale_threshold_hours INTEGER DEFAULT 2)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- Mark tasks as 'timed_out' if they've been running/waiting 
  -- for longer than the threshold without updates
  UPDATE mc_active_agent_tasks
  SET 
    status = 'timed_out',
    completed_at = NOW(),
    updated_at = NOW(),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'timed_out_at', NOW()::text,
      'timed_out_reason', 'No update for ' || stale_threshold_hours || ' hours'
    )
  WHERE status IN ('running', 'waiting')
    AND COALESCE(updated_at, started_at) < NOW() - (stale_threshold_hours || ' hours')::interval;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  -- Also clean up very old completed/timed_out/error entries (older than 7 days)
  DELETE FROM mc_active_agent_tasks
  WHERE status IN ('completed', 'timed_out', 'error')
    AND completed_at < NOW() - INTERVAL '7 days';
  
  RETURN rows_updated;
END;
$$;

-- 3. Run immediate cleanup of existing stale entries
SELECT cleanup_stale_agent_tasks(2);

-- 4. Create a scheduled cleanup job (runs every hour via pg_cron if available)
-- This is idempotent - will update if job exists
DO $$
BEGIN
  -- Check if pg_cron extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if present (ignore if doesn't exist)
    BEGIN
      PERFORM cron.unschedule('cleanup-stale-agent-tasks');
    EXCEPTION WHEN OTHERS THEN
      -- Job doesn't exist yet, that's fine
      NULL;
    END;
    
    -- Schedule hourly cleanup
    PERFORM cron.schedule(
      'cleanup-stale-agent-tasks',
      '0 * * * *',  -- Every hour at minute 0
      'SELECT cleanup_stale_agent_tasks(2);'
    );
    
    RAISE NOTICE 'pg_cron job scheduled for hourly cleanup';
  ELSE
    RAISE NOTICE 'pg_cron not available - cleanup will need to be run manually or via edge function';
  END IF;
END
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION cleanup_stale_agent_tasks(INTEGER) TO service_role;

COMMENT ON FUNCTION cleanup_stale_agent_tasks IS 
  'Marks stale agent tasks (no update for X hours) as timed_out. 
   Run periodically via cron or edge function to keep Activity Feed clean.';
