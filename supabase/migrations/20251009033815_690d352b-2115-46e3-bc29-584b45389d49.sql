-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing job if it exists
DO $$
BEGIN
  PERFORM cron.unschedule('content-scheduler-job') 
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'content-scheduler-job'
  );
END $$;

-- Create cron job to run content scheduler every 5 minutes
SELECT cron.schedule(
  'content-scheduler-job',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/content-scheduler',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Add comment
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for automated content posting';