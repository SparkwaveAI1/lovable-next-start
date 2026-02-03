-- Enable realtime for Mission Control tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.mc_agents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mc_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mc_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mc_messages;
