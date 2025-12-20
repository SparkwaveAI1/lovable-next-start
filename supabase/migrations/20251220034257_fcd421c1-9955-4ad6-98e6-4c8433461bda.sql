-- ============================================
-- UPDATE EMAIL CAMPAIGNS FOR CONTACT TARGETING
-- ============================================

-- Add targeting fields to email_campaigns
ALTER TABLE public.email_campaigns
ADD COLUMN IF NOT EXISTS target_type VARCHAR(20) DEFAULT 'all';

-- Tags to target (when target_type = 'tags')
ALTER TABLE public.email_campaigns
ADD COLUMN IF NOT EXISTS target_tags TEXT[] DEFAULT '{}';

-- How to match tags: 'all' = must have ALL tags, 'any' = must have ANY tag
ALTER TABLE public.email_campaigns
ADD COLUMN IF NOT EXISTS target_tags_match VARCHAR(10) DEFAULT 'all';

-- Segment to target (when target_type = 'segment')
ALTER TABLE public.email_campaigns
ADD COLUMN IF NOT EXISTS target_segment_id UUID REFERENCES public.contact_segments(id) ON DELETE SET NULL;

-- Additional filters that can be combined with tags/segments
ALTER TABLE public.email_campaigns
ADD COLUMN IF NOT EXISTS target_filters JSONB DEFAULT '{}';

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_email_campaigns_target_type 
ON public.email_campaigns(business_id, target_type);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_target_tags 
ON public.email_campaigns USING GIN(target_tags);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_target_segment 
ON public.email_campaigns(target_segment_id);

-- ============================================
-- FUNCTION TO GET CAMPAIGN RECIPIENTS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_campaign_recipients(
    p_campaign_id UUID
)
RETURNS TABLE (
    contact_id UUID,
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_campaign RECORD;
BEGIN
    SELECT * INTO v_campaign 
    FROM public.email_campaigns 
    WHERE id = p_campaign_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        c.id AS contact_id,
        c.email,
        c.first_name,
        c.last_name
    FROM public.contacts c
    WHERE c.business_id = v_campaign.business_id
    AND c.email IS NOT NULL
    AND c.email != ''
    AND c.email_status = 'subscribed'
    AND (
        v_campaign.target_type = 'all'
        OR
        (v_campaign.target_type = 'tags' 
         AND v_campaign.target_tags_match = 'all'
         AND c.tags @> v_campaign.target_tags)
        OR
        (v_campaign.target_type = 'tags' 
         AND v_campaign.target_tags_match = 'any'
         AND c.tags && v_campaign.target_tags)
        OR
        (v_campaign.target_type = 'segment' 
         AND v_campaign.target_segment_id IS NOT NULL
         AND EXISTS (
             SELECT 1 FROM public.contact_segments cs
             WHERE cs.id = v_campaign.target_segment_id
             AND (
                 NOT (cs.filters ? 'tags')
                 OR jsonb_array_length(cs.filters->'tags') = 0
                 OR (cs.filters->>'tags_match' = 'any' AND c.tags && ARRAY(SELECT jsonb_array_elements_text(cs.filters->'tags')))
                 OR (COALESCE(cs.filters->>'tags_match', 'all') = 'all' AND c.tags @> ARRAY(SELECT jsonb_array_elements_text(cs.filters->'tags')))
             )
         ))
        OR
        (v_campaign.target_type = 'list' 
         AND v_campaign.list_id IS NOT NULL
         AND EXISTS (
             SELECT 1 FROM public.email_list_members elm
             JOIN public.email_subscribers es ON es.id = elm.subscriber_id
             WHERE elm.list_id = v_campaign.list_id
             AND es.email = c.email
         ))
    );
END;
$$;

-- Function to count campaign recipients (for preview)
CREATE OR REPLACE FUNCTION public.count_campaign_recipients(
    p_campaign_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.get_campaign_recipients(p_campaign_id);
    
    RETURN v_count;
END;
$$;

-- Function to preview campaign recipients (with limit)
CREATE OR REPLACE FUNCTION public.preview_campaign_recipients(
    p_campaign_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    contact_id UUID,
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.get_campaign_recipients(p_campaign_id)
    LIMIT p_limit;
END;
$$;

-- ============================================
-- UPDATE EXISTING CAMPAIGNS
-- ============================================

UPDATE public.email_campaigns
SET target_type = 'list'
WHERE list_id IS NOT NULL AND target_type IS NULL;

UPDATE public.email_campaigns
SET target_type = 'all'
WHERE list_id IS NULL AND target_type IS NULL;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN public.email_campaigns.target_type IS 'How to select recipients: all, tags, segment, or list (legacy)';
COMMENT ON COLUMN public.email_campaigns.target_tags IS 'Array of tag slugs to target when target_type = tags';
COMMENT ON COLUMN public.email_campaigns.target_tags_match IS 'all = contacts must have ALL tags, any = contacts must have ANY tag';
COMMENT ON COLUMN public.email_campaigns.target_segment_id IS 'Reference to saved segment when target_type = segment';
COMMENT ON COLUMN public.email_campaigns.target_filters IS 'Additional JSON filters to combine with targeting';