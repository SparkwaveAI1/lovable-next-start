-- Fix RLS issues for existing tables
-- Enable RLS on agent_actions table
ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on agent_notes table  
ALTER TABLE public.agent_notes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on agent_triggers table
ALTER TABLE public.agent_triggers ENABLE ROW LEVEL SECURITY;

-- Create basic policies for the existing tables (allowing all access for now)
-- You can restrict these later based on your requirements

-- Policies for agent_actions
CREATE POLICY "Agent actions are publicly accessible" 
ON public.agent_actions 
FOR ALL 
USING (true);

-- Policies for agent_notes
CREATE POLICY "Agent notes are publicly accessible" 
ON public.agent_notes 
FOR ALL 
USING (true);

-- Policies for agent_triggers  
CREATE POLICY "Agent triggers are publicly accessible" 
ON public.agent_triggers 
FOR ALL 
USING (true);