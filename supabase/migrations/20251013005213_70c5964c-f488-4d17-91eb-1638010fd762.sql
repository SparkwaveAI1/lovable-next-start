-- Create media storage bucket for direct uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for media bucket
CREATE POLICY "Public read access for media"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

CREATE POLICY "Public upload access for media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media');

CREATE POLICY "Public update access for media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'media');

CREATE POLICY "Public delete access for media"
ON storage.objects FOR DELETE
USING (bucket_id = 'media');