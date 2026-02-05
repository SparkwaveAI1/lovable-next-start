-- Migration: Add name column to investment_alerts
-- Created: 2026-02-05

-- Add name column for user-friendly alert naming
ALTER TABLE investment_alerts 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add comment
COMMENT ON COLUMN investment_alerts.name IS 'User-friendly name for the alert';
