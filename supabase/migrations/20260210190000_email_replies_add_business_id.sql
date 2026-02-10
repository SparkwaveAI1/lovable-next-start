-- Add business_id to email_replies for multi-tenant queries

ALTER TABLE email_replies 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);

CREATE INDEX IF NOT EXISTS idx_email_replies_business ON email_replies(business_id);

COMMENT ON COLUMN email_replies.business_id IS 'Business this reply belongs to (for multi-tenant filtering)';
