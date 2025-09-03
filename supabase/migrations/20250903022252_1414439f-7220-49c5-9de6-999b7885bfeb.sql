-- Create scheduled content table for content scheduling and queue management
CREATE TABLE public.scheduled_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id),
  content TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- twitter_post, discord_message, etc
  topic VARCHAR(255),
  platform VARCHAR(50) NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, posted, failed, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  posted_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.scheduled_content ENABLE ROW LEVEL SECURITY;

-- Create policies for scheduled content access
CREATE POLICY "Scheduled content is publicly readable" 
ON public.scheduled_content 
FOR SELECT 
USING (true);

CREATE POLICY "Scheduled content is publicly writable" 
ON public.scheduled_content 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Scheduled content can be updated" 
ON public.scheduled_content 
FOR UPDATE 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_scheduled_content_status_time ON public.scheduled_content(status, scheduled_for);
CREATE INDEX idx_scheduled_content_business ON public.scheduled_content(business_id);
CREATE INDEX idx_scheduled_content_platform ON public.scheduled_content(platform);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_scheduled_content_updated_at
BEFORE UPDATE ON public.scheduled_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();