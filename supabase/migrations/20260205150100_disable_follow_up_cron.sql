-- EMERGENCY: Disable follow-up cron job
-- Reason: AI sending error messages to customers, alienating contacts

DO $$
BEGIN
  -- Unschedule the problematic job
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-follow-ups-job') THEN
    PERFORM cron.unschedule('process-follow-ups-job');
    RAISE NOTICE 'Disabled process-follow-ups-job cron';
  END IF;
END $$;
