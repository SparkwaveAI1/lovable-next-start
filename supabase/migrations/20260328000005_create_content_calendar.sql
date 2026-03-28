-- Migration: create content_calendar table
-- Used by: src/components/dashboard/ContentCalendarPanel.tsx
-- SPA-2777 fix: table was missing; Content Calendar panel showed no data

CREATE TABLE IF NOT EXISTS content_calendar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    brand TEXT,                     -- 'sparkwave' | 'personaai' | 'charx' | 'fightflow' | 'dogoonow'
    platform TEXT,                  -- 'twitter' | 'linkedin' | 'tiktok' | 'instagram' | 'blog'
    status TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'scheduled' | 'published' | 'cancelled'
    abby_status TEXT,               -- QC status: 'pending' | 'approved' | 'rejected'
    publish_date DATE,
    published_at TIMESTAMPTZ,
    campaign TEXT,
    target_keyword TEXT,
    content TEXT,
    media_url TEXT,
    created_by TEXT,                -- agent name that created the entry
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_content_calendar_status ON content_calendar (status);
CREATE INDEX idx_content_calendar_brand ON content_calendar (brand);
CREATE INDEX idx_content_calendar_platform ON content_calendar (platform);
CREATE INDEX idx_content_calendar_publish_date ON content_calendar (publish_date);
CREATE INDEX idx_content_calendar_created_at ON content_calendar (created_at DESC);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_content_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_calendar_updated_at
    BEFORE UPDATE ON content_calendar
    FOR EACH ROW EXECUTE FUNCTION update_content_calendar_updated_at();

-- RLS
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read content_calendar"
    ON content_calendar FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can write content_calendar"
    ON content_calendar FOR ALL
    USING (auth.role() = 'service_role');

-- Allow authenticated users to insert/update for manual content creation in the UI
CREATE POLICY "Authenticated users can insert content_calendar"
    ON content_calendar FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update content_calendar"
    ON content_calendar FOR UPDATE
    USING (auth.role() = 'authenticated');

COMMENT ON TABLE content_calendar IS 'Multi-brand content calendar for scheduled and published social/blog content. Shown in ContentCalendarPanel dashboard component.';
