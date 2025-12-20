-- ============================================
-- VERIFIED EMAIL SENDERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.verified_senders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    verified_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_sender_email_per_business UNIQUE (business_id, email)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_verified_senders_business ON public.verified_senders(business_id);
CREATE INDEX idx_verified_senders_active ON public.verified_senders(business_id, is_active);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.verified_senders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view senders for accessible businesses"
ON public.verified_senders FOR SELECT TO authenticated
USING (public.can_access_business(business_id));

CREATE POLICY "Users can manage senders for accessible businesses"
ON public.verified_senders FOR ALL TO authenticated
USING (public.can_access_business(business_id))
WITH CHECK (public.can_access_business(business_id));

-- ============================================
-- FUNCTION TO SET DEFAULT SENDER
-- ============================================

CREATE OR REPLACE FUNCTION public.set_default_sender(
    p_sender_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_business_id UUID;
BEGIN
    SELECT business_id INTO v_business_id 
    FROM public.verified_senders 
    WHERE id = p_sender_id;
    
    -- Clear existing default for this business
    UPDATE public.verified_senders 
    SET is_default = false, updated_at = now()
    WHERE business_id = v_business_id AND is_default = true;
    
    -- Set new default
    UPDATE public.verified_senders 
    SET is_default = true, updated_at = now()
    WHERE id = p_sender_id;
END;
$$;

-- ============================================
-- SEED INITIAL SENDERS FOR EXISTING BUSINESSES
-- ============================================

-- Fight Flow Academy
INSERT INTO public.verified_senders (business_id, email, name, is_default)
SELECT b.id, 'members@fightflowmma.com', 'Fight Flow Academy', true
FROM public.businesses b 
WHERE b.slug = 'fight-flow-academy'
ON CONFLICT (business_id, email) DO NOTHING;

-- Sparkwave (if exists)
INSERT INTO public.verified_senders (business_id, email, name, is_default)
SELECT b.id, 'hello@sparkwave-ai.com', 'Sparkwave AI', true
FROM public.businesses b 
WHERE b.slug = 'sparkwave' OR b.name ILIKE '%sparkwave%'
ON CONFLICT (business_id, email) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.verified_senders IS 'Verified email addresses that can be used as campaign senders';
COMMENT ON COLUMN public.verified_senders.is_default IS 'Default sender for this business when creating new campaigns';