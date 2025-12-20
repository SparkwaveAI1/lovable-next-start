-- ============================================
-- UNIFIED CRM: ENHANCE CONTACTS TABLE
-- ============================================

-- Add email marketing status to contacts
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS email_status VARCHAR(20) DEFAULT 'subscribed';

-- Add SMS marketing status to contacts
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS sms_status VARCHAR(20) DEFAULT 'active';

-- Add tags array for flexible categorization
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add metadata for custom fields (flexible schema)
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add lifetime value tracking
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS lifetime_value DECIMAL(10,2) DEFAULT 0;

-- Add preferred contact method
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS preferred_channel VARCHAR(20) DEFAULT 'email';

-- ============================================
-- LINK EMAIL_SENDS TO CONTACTS
-- ============================================

-- Add contact_id to email_sends for direct email tracking
ALTER TABLE public.email_sends 
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id);

-- ============================================
-- INDEXES FOR PERFORMANCE AT SCALE
-- ============================================

-- Index for email status filtering (campaign targeting)
CREATE INDEX IF NOT EXISTS idx_contacts_email_status 
ON public.contacts(business_id, email_status);

-- Index for SMS status filtering
CREATE INDEX IF NOT EXISTS idx_contacts_sms_status 
ON public.contacts(business_id, sms_status);

-- GIN index for tags array searching (critical for performance)
CREATE INDEX IF NOT EXISTS idx_contacts_tags 
ON public.contacts USING GIN(tags);

-- Index for activity-based queries
CREATE INDEX IF NOT EXISTS idx_contacts_last_activity 
ON public.contacts(business_id, last_activity_date DESC);

-- Index for email lookups (deduplication, imports)
CREATE INDEX IF NOT EXISTS idx_contacts_business_email 
ON public.contacts(business_id, email);

-- Index for contact_id in email_sends
CREATE INDEX IF NOT EXISTS idx_email_sends_contact_id 
ON public.email_sends(contact_id);

-- ============================================
-- HELPER FUNCTIONS FOR TAG MANAGEMENT
-- ============================================

-- Function to add a tag to a contact (idempotent)
CREATE OR REPLACE FUNCTION public.contact_add_tag(
    p_contact_id UUID,
    p_tag TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.contacts 
    SET tags = array_append(
        array_remove(tags, lower(trim(p_tag))),
        lower(trim(p_tag))
    ),
    updated_at = now()
    WHERE id = p_contact_id;
END;
$$;

-- Function to remove a tag from a contact
CREATE OR REPLACE FUNCTION public.contact_remove_tag(
    p_contact_id UUID,
    p_tag TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.contacts 
    SET tags = array_remove(tags, lower(trim(p_tag))),
    updated_at = now()
    WHERE id = p_contact_id;
END;
$$;

-- Function to update last activity (call this when contact engages)
CREATE OR REPLACE FUNCTION public.contact_touch(
    p_contact_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.contacts 
    SET last_activity_date = now(),
        updated_at = now()
    WHERE id = p_contact_id;
END;
$$;

-- Function to get contacts by tags (for campaign targeting)
CREATE OR REPLACE FUNCTION public.get_contacts_by_tags(
    p_business_id UUID,
    p_tags TEXT[],
    p_email_status TEXT DEFAULT 'subscribed'
)
RETURNS SETOF public.contacts
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT c.*
    FROM public.contacts c
    WHERE c.business_id = p_business_id
    AND c.email_status = p_email_status
    AND c.tags @> p_tags;
END;
$$;

-- ============================================
-- UPDATE EXISTING CONTACTS WITH DEFAULTS
-- ============================================

UPDATE public.contacts 
SET 
    email_status = COALESCE(email_status, 'subscribed'),
    sms_status = COALESCE(sms_status, 'active'),
    tags = COALESCE(tags, '{}'),
    metadata = COALESCE(metadata, '{}')
WHERE email_status IS NULL 
   OR sms_status IS NULL 
   OR tags IS NULL;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN public.contacts.email_status IS 'Email marketing status: subscribed, unsubscribed, bounced, complained';
COMMENT ON COLUMN public.contacts.sms_status IS 'SMS marketing status: active, opted_out';
COMMENT ON COLUMN public.contacts.tags IS 'Array of tags for flexible categorization and segmentation';
COMMENT ON COLUMN public.contacts.metadata IS 'Flexible JSON storage for custom fields';
COMMENT ON COLUMN public.contacts.lifetime_value IS 'Total revenue/value from this contact';
COMMENT ON COLUMN public.contacts.preferred_channel IS 'Preferred communication channel: email, sms, phone, any';