-- Add intel gathering fields to contacts table
-- These fields help capture sales intelligence during conversations

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS pain_points TEXT,
ADD COLUMN IF NOT EXISTS current_tools TEXT,
ADD COLUMN IF NOT EXISTS budget_signals TEXT,
ADD COLUMN IF NOT EXISTS decision_timeline TEXT;

-- Add comment for documentation
COMMENT ON COLUMN contacts.pain_points IS 'Customer pain points and challenges identified during conversations';
COMMENT ON COLUMN contacts.current_tools IS 'Current tools/solutions the contact is using';
COMMENT ON COLUMN contacts.budget_signals IS 'Budget indicators and spending signals';
COMMENT ON COLUMN contacts.decision_timeline IS 'Timeline for making a decision';
