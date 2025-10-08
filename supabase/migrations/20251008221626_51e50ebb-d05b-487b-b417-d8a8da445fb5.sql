-- Make scheduled_for nullable to support approved but unscheduled content
ALTER TABLE scheduled_content 
  ALTER COLUMN scheduled_for DROP NOT NULL;