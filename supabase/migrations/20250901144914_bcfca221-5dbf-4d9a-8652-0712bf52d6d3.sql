-- Add api_key column to ghl_configurations table
ALTER TABLE ghl_configurations 
ADD COLUMN api_key TEXT;