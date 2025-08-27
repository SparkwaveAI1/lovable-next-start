-- Create automation_logs table
CREATE TABLE public.automation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    automation_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    source_data JSONB,
    processed_data JSONB,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Automation logs are publicly readable" 
ON public.automation_logs 
FOR SELECT 
USING (true);

-- Add sample automation data for testing
INSERT INTO automation_logs (business_id, automation_type, status, execution_time_ms) 
SELECT b.id, 'wix_to_ghl', 'success', 250
FROM businesses b WHERE b.slug = 'fight-flow-academy';

INSERT INTO automation_logs (business_id, automation_type, status, execution_time_ms) 
SELECT b.id, 'twitter_post', 'success', 180  
FROM businesses b WHERE b.slug = 'persona-ai';

INSERT INTO automation_logs (business_id, automation_type, status, execution_time_ms) 
SELECT b.id, 'lead_capture', 'success', 320
FROM businesses b WHERE b.slug = 'sparkwave-ai';

INSERT INTO automation_logs (business_id, automation_type, status, execution_time_ms) 
SELECT b.id, 'content_generation', 'error', 0
FROM businesses b WHERE b.slug = 'charx-world';

-- Add more sample data for today's activity
INSERT INTO automation_logs (business_id, automation_type, status, execution_time_ms, created_at) 
SELECT b.id, 'wix_to_ghl', 'success', 180, NOW() - INTERVAL '2 hours'
FROM businesses b WHERE b.slug = 'fight-flow-academy';

INSERT INTO automation_logs (business_id, automation_type, status, execution_time_ms, created_at) 
SELECT b.id, 'lead_capture', 'success', 220, NOW() - INTERVAL '1 hour'
FROM businesses b WHERE b.slug = 'sparkwave-ai';

INSERT INTO automation_logs (business_id, automation_type, status, execution_time_ms, created_at) 
SELECT b.id, 'twitter_post', 'success', 150, NOW() - INTERVAL '30 minutes'
FROM businesses b WHERE b.slug = 'persona-ai';