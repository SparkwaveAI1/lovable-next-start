-- Create outbound message queue for approval workflow
-- RS-074: Build Message Approval Queue System

CREATE TABLE IF NOT EXISTS public.outbound_message_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL CHECK (message_type IN ('sms', 'email')),
    recipient_name TEXT,
    recipient_contact TEXT NOT NULL,
    subject TEXT, -- for emails
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sent')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    sent_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_outbound_message_queue_business ON public.outbound_message_queue(business_id);
CREATE INDEX IF NOT EXISTS idx_outbound_message_queue_status ON public.outbound_message_queue(status);
CREATE INDEX IF NOT EXISTS idx_outbound_message_queue_created ON public.outbound_message_queue(created_at DESC);

-- Enable RLS
ALTER TABLE public.outbound_message_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using existing can_access_business function)

-- Users can view messages for businesses they have access to
CREATE POLICY "Users can view messages for their businesses"
    ON public.outbound_message_queue
    FOR SELECT
    USING (public.can_access_business(business_id));

-- Users can insert messages for businesses they have access to
CREATE POLICY "Users can create messages for their businesses"
    ON public.outbound_message_queue
    FOR INSERT
    WITH CHECK (public.can_access_business(business_id));

-- Users can update messages for businesses they have access to
CREATE POLICY "Users can update messages for their businesses"
    ON public.outbound_message_queue
    FOR UPDATE
    USING (public.can_access_business(business_id))
    WITH CHECK (public.can_access_business(business_id));

-- Users can delete messages for businesses they have access to
CREATE POLICY "Users can delete messages for their businesses"
    ON public.outbound_message_queue
    FOR DELETE
    USING (public.can_access_business(business_id));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_outbound_message_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_outbound_message_queue_updated_at
    BEFORE UPDATE ON public.outbound_message_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_outbound_message_queue_updated_at();
