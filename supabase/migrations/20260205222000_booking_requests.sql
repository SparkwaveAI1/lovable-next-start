-- Sparkwave booking requests table for prospect call scheduling
CREATE TABLE IF NOT EXISTS sparkwave_booking_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    preferred_date DATE NOT NULL,
    preferred_time TEXT NOT NULL,
    topic TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    notes TEXT
);

-- Index for quick lookups
CREATE INDEX idx_booking_requests_status ON sparkwave_booking_requests(status);
CREATE INDEX idx_booking_requests_date ON sparkwave_booking_requests(preferred_date);
CREATE INDEX idx_booking_requests_email ON sparkwave_booking_requests(email);

-- Enable RLS
ALTER TABLE sparkwave_booking_requests ENABLE ROW LEVEL SECURITY;

-- Public insert policy (anyone can submit a booking request)
CREATE POLICY "Anyone can create booking requests"
    ON sparkwave_booking_requests
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Authenticated users can view all bookings
CREATE POLICY "Authenticated users can view bookings"
    ON sparkwave_booking_requests
    FOR SELECT
    TO authenticated
    USING (true);

-- Authenticated users can update bookings
CREATE POLICY "Authenticated users can update bookings"
    ON sparkwave_booking_requests
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_booking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_requests_updated_at
    BEFORE UPDATE ON sparkwave_booking_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_updated_at();

COMMENT ON TABLE sparkwave_booking_requests IS 'Booking requests from prospects wanting to schedule calls with Scott';
