-- Create media assets table
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  width INTEGER,
  height INTEGER,
  duration INTEGER,
  thumbnail_path TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_business 
  ON media_assets(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_assets_type 
  ON media_assets(file_type);

CREATE INDEX IF NOT EXISTS idx_media_assets_tags 
  ON media_assets USING GIN(tags);

-- Create content_media junction table
CREATE TABLE IF NOT EXISTS content_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES scheduled_content(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(content_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_content_media_content 
  ON content_media(content_id);

CREATE INDEX IF NOT EXISTS idx_content_media_media 
  ON content_media(media_id);

-- Enable RLS
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_media ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read media_assets"
  ON media_assets FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert media_assets"
  ON media_assets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update media_assets"
  ON media_assets FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete media_assets"
  ON media_assets FOR DELETE
  USING (true);

CREATE POLICY "Allow public read content_media"
  ON content_media FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert content_media"
  ON content_media FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public delete content_media"
  ON content_media FOR DELETE
  USING (true);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-media', 'content-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'content-media');

CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'content-media');

CREATE POLICY "Public Delete"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'content-media');

-- Add comments
COMMENT ON TABLE media_assets IS 'Images and videos for social media content';
COMMENT ON TABLE content_media IS 'Links content to media assets (many-to-many)';
COMMENT ON COLUMN media_assets.file_type IS 'Type: image or video';
COMMENT ON COLUMN content_media.display_order IS 'Order for multi-image posts (Instagram carousel, etc)';