CREATE TABLE sms_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id),
    provider VARCHAR(20) DEFAULT 'twilio',
    account_sid VARCHAR(255),
    auth_token VARCHAR(255),
    phone_number VARCHAR(20),
    welcome_message TEXT DEFAULT 'Thanks for your interest! We''ll be in touch soon.',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE sms_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON sms_config
    FOR SELECT USING (true);