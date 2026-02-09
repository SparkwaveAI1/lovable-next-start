-- Add subject and to_email columns to email_sends for individual email tracking
-- This allows tracking outreach emails without requiring a campaign

ALTER TABLE email_sends 
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS to_email TEXT;

-- Add index for querying by to_email
CREATE INDEX IF NOT EXISTS idx_email_sends_to_email ON email_sends(to_email);

-- Add comment explaining the columns
COMMENT ON COLUMN email_sends.subject IS 'Email subject line - used for individual emails outside of campaigns';
COMMENT ON COLUMN email_sends.to_email IS 'Recipient email address - alternative to contact_id for external outreach';
