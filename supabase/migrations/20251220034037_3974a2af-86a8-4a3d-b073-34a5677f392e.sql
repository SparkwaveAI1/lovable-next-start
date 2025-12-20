-- ============================================
-- CONTACT TAGS TABLE (Predefined Tags)
-- ============================================

-- Predefined tags that users can apply to contacts
CREATE TABLE IF NOT EXISTS public.contact_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    color VARCHAR(20) DEFAULT 'gray',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    contact_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_tag_name_per_business UNIQUE (business_id, slug)
);

-- ============================================
-- CONTACT SEGMENTS TABLE (Saved Filters)
-- ============================================

CREATE TABLE IF NOT EXISTS public.contact_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    filters JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_computed_count INTEGER,
    last_computed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_segment_name_per_business UNIQUE (business_id, name)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_contact_tags_business ON public.contact_tags(business_id);
CREATE INDEX idx_contact_tags_slug ON public.contact_tags(business_id, slug);
CREATE INDEX idx_contact_segments_business ON public.contact_segments(business_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_segments ENABLE ROW LEVEL SECURITY;

-- contact_tags policies
CREATE POLICY "Users can view tags for accessible businesses"
ON public.contact_tags FOR SELECT TO authenticated
USING (public.can_access_business(business_id));

CREATE POLICY "Users can manage tags for accessible businesses"
ON public.contact_tags FOR ALL TO authenticated
USING (public.can_access_business(business_id))
WITH CHECK (public.can_access_business(business_id));

-- contact_segments policies
CREATE POLICY "Users can view segments for accessible businesses"
ON public.contact_segments FOR SELECT TO authenticated
USING (public.can_access_business(business_id));

CREATE POLICY "Users can manage segments for accessible businesses"
ON public.contact_segments FOR ALL TO authenticated
USING (public.can_access_business(business_id))
WITH CHECK (public.can_access_business(business_id));

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to create a tag (generates slug automatically)
CREATE OR REPLACE FUNCTION public.create_contact_tag(
    p_business_id UUID,
    p_name VARCHAR(50),
    p_color VARCHAR(20) DEFAULT 'gray',
    p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_slug VARCHAR(50);
    v_tag_id UUID;
BEGIN
    v_slug := lower(regexp_replace(trim(p_name), '\s+', '-', 'g'));
    
    INSERT INTO public.contact_tags (business_id, name, slug, color, description)
    VALUES (p_business_id, trim(p_name), v_slug, p_color, p_description)
    ON CONFLICT (business_id, slug) DO UPDATE 
    SET name = EXCLUDED.name, color = EXCLUDED.color, description = EXCLUDED.description, updated_at = now()
    RETURNING id INTO v_tag_id;
    
    RETURN v_tag_id;
END;
$$;

-- Function to compute segment contact count
CREATE OR REPLACE FUNCTION public.compute_segment_count(
    p_segment_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_segment RECORD;
    v_count INTEGER;
    v_query TEXT;
BEGIN
    SELECT * INTO v_segment FROM public.contact_segments WHERE id = p_segment_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    v_query := 'SELECT COUNT(*) FROM public.contacts WHERE business_id = $1';
    
    IF v_segment.filters ? 'tags' AND jsonb_array_length(v_segment.filters->'tags') > 0 THEN
        IF v_segment.filters->>'tags_match' = 'any' THEN
            v_query := v_query || ' AND tags && $2::text[]';
        ELSE
            v_query := v_query || ' AND tags @> $2::text[]';
        END IF;
    END IF;
    
    IF v_segment.filters ? 'email_status' AND jsonb_array_length(v_segment.filters->'email_status') > 0 THEN
        v_query := v_query || ' AND email_status = ANY($3::text[])';
    END IF;
    
    EXECUTE v_query INTO v_count
    USING v_segment.business_id,
          ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_segment.filters->'tags', '[]'::jsonb))),
          ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_segment.filters->'email_status', '["subscribed"]'::jsonb)));
    
    UPDATE public.contact_segments 
    SET last_computed_count = v_count, last_computed_at = now()
    WHERE id = p_segment_id;
    
    RETURN v_count;
END;
$$;

-- Function to update tag contact counts
CREATE OR REPLACE FUNCTION public.refresh_tag_counts(
    p_business_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.contact_tags ct
    SET contact_count = (
        SELECT COUNT(*) 
        FROM public.contacts c 
        WHERE c.business_id = ct.business_id 
        AND ct.slug = ANY(c.tags)
    ),
    updated_at = now()
    WHERE ct.business_id = p_business_id;
END;
$$;

-- ============================================
-- SEED DEFAULT TAGS FOR EACH BUSINESS
-- ============================================

INSERT INTO public.contact_tags (business_id, name, slug, color, description)
SELECT 
    b.id,
    tag.name,
    tag.slug,
    tag.color,
    tag.description
FROM public.businesses b
CROSS JOIN (VALUES
    ('Lead', 'lead', 'blue', 'New potential customer'),
    ('Customer', 'customer', 'green', 'Paying customer'),
    ('VIP', 'vip', 'purple', 'High-value customer'),
    ('Newsletter', 'newsletter', 'cyan', 'Subscribed to newsletter'),
    ('Trial', 'trial', 'yellow', 'On trial/intro offer'),
    ('Inactive', 'inactive', 'gray', 'No recent activity')
) AS tag(name, slug, color, description)
ON CONFLICT (business_id, slug) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.contact_tags IS 'Predefined tags for categorizing contacts per business';
COMMENT ON TABLE public.contact_segments IS 'Saved dynamic filters for targeting groups of contacts';
COMMENT ON COLUMN public.contact_segments.filters IS 'JSON object with filter criteria: tags, email_status, sms_status, date ranges, etc.';