-- ============================================
-- STAGING CONTENT TABLE
-- ============================================

-- 1. Create staged_content table
CREATE TABLE IF NOT EXISTS public.staged_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('twitter', 'instagram', 'tiktok', 'linkedin', 'facebook')),
    content_type VARCHAR(50) NOT NULL,
    topic TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_staged_content_business ON public.staged_content(business_id);
CREATE INDEX IF NOT EXISTS idx_staged_content_created ON public.staged_content(created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.staged_content ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (simple - all authenticated users)
CREATE POLICY "Authenticated users can view staged content"
ON public.staged_content FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage staged content"
ON public.staged_content FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Auto-update timestamp
CREATE OR REPLACE FUNCTION public.update_staged_content_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_staged_content_timestamp ON public.staged_content;
CREATE TRIGGER set_staged_content_timestamp
BEFORE UPDATE ON public.staged_content
FOR EACH ROW
EXECUTE FUNCTION public.update_staged_content_timestamp();

-- 6. Create staging_media junction table (for media pairing history)
CREATE TABLE IF NOT EXISTS public.staging_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staged_content_id UUID REFERENCES public.staged_content(id) ON DELETE CASCADE NOT NULL,
    media_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE NOT NULL,
    display_order INTEGER DEFAULT 0,
    paired_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_staging_media_pair UNIQUE (staged_content_id, media_id, display_order)
);

-- 7. Index for staging_media
CREATE INDEX IF NOT EXISTS idx_staging_media_content ON public.staging_media(staged_content_id);
CREATE INDEX IF NOT EXISTS idx_staging_media_media ON public.staging_media(media_id);

-- 8. Enable RLS on staging_media
ALTER TABLE public.staging_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view staging media"
ON public.staging_media FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage staging media"
ON public.staging_media FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 9. Comments for documentation
COMMENT ON TABLE public.staged_content IS 'Content accepted from generation, waiting for media attachment before saving/posting';
COMMENT ON TABLE public.staging_media IS 'Junction table tracking which media is paired with staged content';
COMMENT ON COLUMN public.staging_media.paired_at IS 'Timestamp when media was attached (for usage tracking)';