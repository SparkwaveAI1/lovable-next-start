-- ============================================
-- COMM-022: Add audience selector to campaigns
-- ============================================

-- Add audience selector fields to email_campaigns table
ALTER TABLE public.email_campaigns 
ADD COLUMN audience_type VARCHAR(20) DEFAULT 'list' CHECK (audience_type IN ('all_contacts', 'segment', 'manual_select', 'import_list', 'list')),
ADD COLUMN segment_filters JSONB DEFAULT '{}',
ADD COLUMN manual_contact_ids UUID[] DEFAULT '{}',
ADD COLUMN import_file_path VARCHAR(500),
ADD COLUMN import_mapping JSONB DEFAULT '{}';

-- Update existing campaigns to use 'list' audience_type if they have a list_id
UPDATE public.email_campaigns 
SET audience_type = 'list' 
WHERE list_id IS NOT NULL;

-- Update campaigns without list_id to use 'all_contacts'
UPDATE public.email_campaigns 
SET audience_type = 'all_contacts' 
WHERE list_id IS NULL;

-- Create table for campaign segments (reusable segment definitions)
CREATE TABLE public.campaign_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    filters JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    contact_count INTEGER DEFAULT 0,
    last_calculated TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_segment_name_per_business UNIQUE (business_id, name)
);

-- Create index for performance
CREATE INDEX idx_campaign_segments_business ON public.campaign_segments(business_id);

-- Add RLS for segments
ALTER TABLE public.campaign_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view segments for accessible businesses"
ON public.campaign_segments FOR SELECT TO authenticated
USING (public.can_access_business(business_id));

CREATE POLICY "Users can manage segments for accessible businesses"
ON public.campaign_segments FOR ALL TO authenticated
USING (public.can_access_business(business_id))
WITH CHECK (public.can_access_business(business_id));

-- Add auto-update timestamp trigger
CREATE TRIGGER set_campaign_segments_timestamp
BEFORE UPDATE ON public.campaign_segments
FOR EACH ROW EXECUTE FUNCTION public.update_email_timestamp();

-- Function to calculate segment contact count
CREATE OR REPLACE FUNCTION public.calculate_segment_contacts(
    p_business_id UUID,
    p_filters JSONB
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
    v_query TEXT;
    v_conditions TEXT[] := '{}';
    v_tag_filter TEXT[];
    v_stage_filter TEXT;
    v_date_filter JSONB;
BEGIN
    -- Base query
    v_query := 'SELECT COUNT(*) FROM public.contacts WHERE business_id = $1';
    
    -- Add tag filters
    IF p_filters ? 'tags' AND jsonb_array_length(p_filters->'tags') > 0 THEN
        v_tag_filter := ARRAY(SELECT jsonb_array_elements_text(p_filters->'tags'));
        v_conditions := array_append(v_conditions, 'tags && $2');
    END IF;
    
    -- Add pipeline stage filter
    IF p_filters ? 'pipeline_stage' AND (p_filters->>'pipeline_stage') IS NOT NULL THEN
        v_stage_filter := p_filters->>'pipeline_stage';
        v_conditions := array_append(v_conditions, 'pipeline_stage = $3');
    END IF;
    
    -- Add date filters (created_at, updated_at)
    IF p_filters ? 'created_after' AND (p_filters->>'created_after') IS NOT NULL THEN
        v_conditions := array_append(v_conditions, 'created_at >= $4::timestamptz');
    END IF;
    
    IF p_filters ? 'created_before' AND (p_filters->>'created_before') IS NOT NULL THEN
        v_conditions := array_append(v_conditions, 'created_at <= $5::timestamptz');
    END IF;
    
    -- Build final query
    IF array_length(v_conditions, 1) > 0 THEN
        v_query := v_query || ' AND ' || array_to_string(v_conditions, ' AND ');
    END IF;
    
    -- Execute dynamic query (simplified version for now)
    -- In a real implementation, this would use dynamic SQL with proper parameter binding
    IF v_tag_filter IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count 
        FROM public.contacts 
        WHERE business_id = p_business_id 
        AND tags && v_tag_filter;
    ELSE
        SELECT COUNT(*) INTO v_count 
        FROM public.contacts 
        WHERE business_id = p_business_id;
    END IF;
    
    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get campaign recipients based on audience type
CREATE OR REPLACE FUNCTION public.get_campaign_recipients(
    p_campaign_id UUID
) RETURNS TABLE (
    contact_id UUID,
    email VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR
) AS $$
DECLARE
    v_campaign RECORD;
    v_business_id UUID;
BEGIN
    -- Get campaign details
    SELECT * INTO v_campaign 
    FROM public.email_campaigns 
    WHERE id = p_campaign_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaign not found: %', p_campaign_id;
    END IF;
    
    v_business_id := v_campaign.business_id;
    
    -- Route based on audience type
    CASE v_campaign.audience_type
        WHEN 'all_contacts' THEN
            RETURN QUERY
            SELECT c.id, c.email, c.first_name, c.last_name
            FROM public.contacts c
            WHERE c.business_id = v_business_id
            AND c.email IS NOT NULL
            AND c.email != '';
            
        WHEN 'list' THEN
            IF v_campaign.list_id IS NOT NULL THEN
                RETURN QUERY
                SELECT es.id, es.email, es.first_name, es.last_name
                FROM public.email_subscribers es
                JOIN public.email_list_members elm ON elm.subscriber_id = es.id
                WHERE elm.list_id = v_campaign.list_id
                AND es.status = 'active';
            END IF;
            
        WHEN 'manual_select' THEN
            IF v_campaign.manual_contact_ids IS NOT NULL THEN
                RETURN QUERY
                SELECT c.id, c.email, c.first_name, c.last_name
                FROM public.contacts c
                WHERE c.id = ANY(v_campaign.manual_contact_ids)
                AND c.business_id = v_business_id
                AND c.email IS NOT NULL
                AND c.email != '';
            END IF;
            
        WHEN 'segment' THEN
            -- Apply segment filters to contacts table
            IF v_campaign.segment_filters ? 'tags' THEN
                RETURN QUERY
                SELECT c.id, c.email, c.first_name, c.last_name
                FROM public.contacts c
                WHERE c.business_id = v_business_id
                AND c.email IS NOT NULL
                AND c.email != ''
                AND c.tags && ARRAY(SELECT jsonb_array_elements_text(v_campaign.segment_filters->'tags'));
            ELSE
                RETURN QUERY
                SELECT c.id, c.email, c.first_name, c.last_name
                FROM public.contacts c
                WHERE c.business_id = v_business_id
                AND c.email IS NOT NULL
                AND c.email != '';
            END IF;
            
        WHEN 'import_list' THEN
            -- For import lists, we'd typically process the CSV and create temp records
            -- This is a placeholder - actual implementation would read from processed import data
            RETURN;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON COLUMN public.email_campaigns.audience_type IS 'Type of audience selection: all_contacts, segment, manual_select, import_list, list';
COMMENT ON COLUMN public.email_campaigns.segment_filters IS 'JSON filters for segment audience type';
COMMENT ON COLUMN public.email_campaigns.manual_contact_ids IS 'Array of contact IDs for manual selection';
COMMENT ON COLUMN public.email_campaigns.import_file_path IS 'Path to imported CSV file for import_list type';
COMMENT ON COLUMN public.email_campaigns.import_mapping IS 'Column mapping configuration for imported data';
COMMENT ON TABLE public.campaign_segments IS 'Reusable segment definitions for targeted campaigns';