-- Create service_requests table for SPA-2310
-- Dedicated table for freeze and cancellation requests (previously queried contacts table)

CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  request_type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'pending_review',
  priority text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_service_requests_business_id ON public.service_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_contact_id ON public.service_requests(contact_id);

-- Seed from existing contacts with freeze/cancellation request lead types
INSERT INTO public.service_requests (
  business_id, contact_id, title, description, request_type, status, created_at
)
SELECT
  c.business_id,
  c.id,
  CASE c.lead_type
    WHEN 'freeze_request' THEN 'Membership Freeze Request'
    WHEN 'cancellation_request' THEN 'Membership Cancellation Request'
    ELSE 'Service Request'
  END,
  c.status_notes,
  c.lead_type,
  CASE c.pipeline_stage
    WHEN 'new'            THEN 'pending_review'
    WHEN 'pending_review' THEN 'pending_review'
    WHEN 'in_progress'    THEN 'in_progress'
    WHEN 'completed'      THEN 'completed'
    WHEN 'cancelled'      THEN 'cancelled'
    WHEN 'disqualified'   THEN 'disqualified'
    ELSE 'pending_review'
  END,
  c.created_at
FROM public.contacts c
WHERE c.lead_type IN ('freeze_request', 'cancellation_request')
ON CONFLICT DO NOTHING;
