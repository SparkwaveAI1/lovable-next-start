-- Create storage bucket for Twitter content images
INSERT INTO storage.buckets (id, name, public) VALUES ('twitter-content', 'twitter-content', true);

-- Create policy for public read access
CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'twitter-content');

-- Create policy for authenticated upload access  
CREATE POLICY "Authenticated upload access" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'twitter-content');