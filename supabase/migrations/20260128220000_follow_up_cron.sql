-- Add cron job for processing follow-ups
-- This runs every hour to check for and send due follow-up messages

-- Remove existing job if it exists (for idempotency)
DO $$
BEGIN
  PERFORM cron.unschedule('process-follow-ups-job') 
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'process-follow-ups-job'
  );
END $$;

-- Create cron job to run follow-up processor every hour
-- Running at minute 15 to avoid peak times (when content-scheduler runs at :00, :05, etc.)
SELECT cron.schedule(
  'process-follow-ups-job',
  '15 * * * *',  -- At minute 15 of every hour
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/process-follow-ups',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Add comment
COMMENT ON FUNCTION cron.schedule IS 'Includes follow-up processing at minute 15 of each hour';
