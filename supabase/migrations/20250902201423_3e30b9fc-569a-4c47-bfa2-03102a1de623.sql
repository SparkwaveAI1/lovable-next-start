-- Enable real-time updates for automation_logs table
ALTER TABLE public.automation_logs REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_logs;