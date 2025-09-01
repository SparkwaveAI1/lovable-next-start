-- Add SMS conversation tracking fields to automation_logs
ALTER TABLE automation_logs 
ADD COLUMN IF NOT EXISTS conversation_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS sms_from VARCHAR(20),
ADD COLUMN IF NOT EXISTS sms_to VARCHAR(20),
ADD COLUMN IF NOT EXISTS sms_direction VARCHAR(10); -- 'inbound' or 'outbound'

-- Create conversation state table for tracking SMS conversations
CREATE TABLE IF NOT EXISTS conversation_state (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_phone VARCHAR(20) NOT NULL,
    business_id UUID NOT NULL REFERENCES businesses(id),
    conversation_context JSONB DEFAULT '{}',
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'appointment_pending', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on conversation_state table
ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;

-- Create policy for conversation_state (publicly readable for now)
CREATE POLICY "Conversation state is publicly readable" 
ON conversation_state 
FOR SELECT 
USING (true);

-- Add SMS endpoint configuration for fight-flow-academy
INSERT INTO webhook_endpoints (business_id, endpoint_slug, webhook_type, secret_key)
SELECT b.id, 'fight-flow-sms-inbound', 'sms_reply', 'sms_secret_key_123'
FROM businesses b 
WHERE b.slug = 'fight-flow-academy'
AND NOT EXISTS (
    SELECT 1 FROM webhook_endpoints 
    WHERE endpoint_slug = 'fight-flow-sms-inbound' 
    AND webhook_type = 'sms_reply'
);