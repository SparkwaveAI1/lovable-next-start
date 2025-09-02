-- Create conversation threading tables
CREATE TABLE conversation_threads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID REFERENCES contacts(id),
    business_id UUID REFERENCES businesses(id),
    status VARCHAR(20) DEFAULT 'active',
    context JSONB DEFAULT '{}',
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sms_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID REFERENCES conversation_threads(id),
    contact_id UUID REFERENCES contacts(id),
    direction VARCHAR(10), -- 'inbound' or 'outbound'
    message TEXT,
    ai_response BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE class_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID REFERENCES contacts(id),
    class_schedule_id UUID REFERENCES class_schedule(id),
    booking_date DATE,
    status VARCHAR(20) DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON conversation_threads FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON conversation_threads FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON sms_messages FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON sms_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON class_bookings FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON class_bookings FOR INSERT WITH CHECK (true);