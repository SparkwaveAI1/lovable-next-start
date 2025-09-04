-- Create table for Twitter content generation
CREATE TABLE twitter_content_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active'
);

-- Create table for chat messages in content creation
CREATE TABLE twitter_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES twitter_content_sessions(id) ON DELETE CASCADE,
  message_type VARCHAR(20) CHECK (message_type IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create table for generated tweets
CREATE TABLE generated_tweets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  session_id UUID REFERENCES twitter_content_sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_urls TEXT[], -- Array of image URLs
  status VARCHAR(50) DEFAULT 'draft', -- draft, approved, scheduled, posted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME Zone,
  engagement_data JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE twitter_content_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_tweets ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for now, matching your existing pattern)
CREATE POLICY "Allow all operations on twitter_content_sessions" ON twitter_content_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on twitter_chat_messages" ON twitter_chat_messages FOR ALL USING (true);
CREATE POLICY "Allow all operations on generated_tweets" ON generated_tweets FOR ALL USING (true);