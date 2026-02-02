-- Add business_id to Mission Control tables for per-business filtering
-- Created: 2026-02-02

-- Add business_id column to mc_agents
ALTER TABLE mc_agents 
ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- Add business_id column to mc_tasks
ALTER TABLE mc_tasks 
ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- Add business_id column to mc_activities
ALTER TABLE mc_activities 
ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- Create indexes for efficient filtering
CREATE INDEX idx_mc_agents_business_id ON mc_agents(business_id);
CREATE INDEX idx_mc_tasks_business_id ON mc_tasks(business_id);
CREATE INDEX idx_mc_activities_business_id ON mc_activities(business_id);

-- Update existing data: assign existing tasks/agents/activities to Fight Flow Academy
-- (the primary business - can be reassigned later)
UPDATE mc_agents 
SET business_id = '456dc53b-d9d9-41b0-bc33-4f4c4a791eff'
WHERE business_id IS NULL;

UPDATE mc_tasks 
SET business_id = '456dc53b-d9d9-41b0-bc33-4f4c4a791eff'
WHERE business_id IS NULL;

UPDATE mc_activities 
SET business_id = '456dc53b-d9d9-41b0-bc33-4f4c4a791eff'
WHERE business_id IS NULL;

COMMENT ON COLUMN mc_agents.business_id IS 'Business this agent belongs to';
COMMENT ON COLUMN mc_tasks.business_id IS 'Business this task belongs to';
COMMENT ON COLUMN mc_activities.business_id IS 'Business this activity belongs to';
