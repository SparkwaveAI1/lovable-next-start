-- Content Analytics Tracking
-- Tracks image views, video plays, and social shares

-- Content analytics events table
CREATE TABLE IF NOT EXISTS content_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  content_id UUID NOT NULL, -- References media_assets.id or content_pieces.id
  content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video', 'post', 'article')),
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'play', 'share', 'download', 'click', 'complete')),
  platform TEXT, -- twitter, linkedin, instagram, email, web, etc.
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT, -- For anonymous tracking
  metadata JSONB DEFAULT '{}', -- Additional event data (duration, scroll_depth, etc.)
  ip_hash TEXT, -- Hashed IP for deduplication (privacy-safe)
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_content_analytics_business ON content_analytics(business_id);
CREATE INDEX idx_content_analytics_content ON content_analytics(content_id);
CREATE INDEX idx_content_analytics_event ON content_analytics(event_type);
CREATE INDEX idx_content_analytics_created ON content_analytics(created_at);
CREATE INDEX idx_content_analytics_composite ON content_analytics(business_id, content_type, event_type, created_at);

-- Aggregated stats table for fast dashboard queries
CREATE TABLE IF NOT EXISTS content_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  unique_count INTEGER NOT NULL DEFAULT 0, -- Unique users/sessions
  metadata JSONB DEFAULT '{}', -- Aggregated data (avg_duration, etc.)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, content_id, content_type, event_type, date)
);

CREATE INDEX idx_analytics_daily_business ON content_analytics_daily(business_id, date);
CREATE INDEX idx_analytics_daily_content ON content_analytics_daily(content_id, date);

-- Function to increment daily stats
CREATE OR REPLACE FUNCTION increment_content_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO content_analytics_daily (
    business_id, content_id, content_type, event_type, date, count, unique_count
  ) VALUES (
    NEW.business_id, NEW.content_id, NEW.content_type, NEW.event_type, 
    CURRENT_DATE, 1, 1
  )
  ON CONFLICT (business_id, content_id, content_type, event_type, date)
  DO UPDATE SET 
    count = content_analytics_daily.count + 1,
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-aggregate stats
CREATE TRIGGER trigger_content_analytics_aggregate
  AFTER INSERT ON content_analytics
  FOR EACH ROW
  EXECUTE FUNCTION increment_content_analytics();

-- Enable RLS
ALTER TABLE content_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_analytics_daily ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can view analytics for their businesses
CREATE POLICY "Users can view own business analytics"
  ON content_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = content_analytics.business_id
      AND (b.owner_id = auth.uid() OR b.id IN (
        SELECT business_id FROM business_members WHERE user_id = auth.uid()
      ))
    )
  );

-- Allow insert from authenticated users and service role
CREATE POLICY "Authenticated users can insert analytics"
  ON content_analytics FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

CREATE POLICY "Users can view own daily analytics"
  ON content_analytics_daily FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = content_analytics_daily.business_id
      AND (b.owner_id = auth.uid() OR b.id IN (
        SELECT business_id FROM business_members WHERE user_id = auth.uid()
      ))
    )
  );

-- Grant service role full access for edge functions
GRANT ALL ON content_analytics TO service_role;
GRANT ALL ON content_analytics_daily TO service_role;

COMMENT ON TABLE content_analytics IS 'Tracks individual content interaction events (views, plays, shares)';
COMMENT ON TABLE content_analytics_daily IS 'Aggregated daily statistics for fast dashboard queries';
