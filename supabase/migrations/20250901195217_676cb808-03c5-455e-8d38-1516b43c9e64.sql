CREATE TABLE class_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id),
    class_name VARCHAR(100),
    instructor VARCHAR(100), 
    day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc
    start_time TIME,
    end_time TIME,
    max_capacity INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);