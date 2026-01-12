-- ============================================
-- ADD SPARKWAVE-AI.COM AS VERIFIED SENDER
-- For domains that are actually verified in Resend
-- ============================================

-- Add sparkwave-ai.com sender for Fight Flow Academy
-- This domain should be verified in Resend
INSERT INTO public.verified_senders (business_id, email, name, is_default, is_active)
SELECT b.id, 'noreply@sparkwave-ai.com', 'Fight Flow Academy', true, true
FROM public.businesses b
WHERE b.slug = 'fight-flow-academy' OR b.name ILIKE '%fight flow%'
ON CONFLICT (business_id, email) DO UPDATE
SET is_active = true, is_default = true, updated_at = now();

-- Deactivate the unverified fightflowmma.com sender (keep for records)
UPDATE public.verified_senders
SET is_active = false, is_default = false, updated_at = now()
WHERE email LIKE '%@fightflowmma.com';

-- Add sparkwave-ai.com sender for any other businesses that need it
INSERT INTO public.verified_senders (business_id, email, name, is_default, is_active)
SELECT b.id, 'noreply@sparkwave-ai.com', b.name, true, true
FROM public.businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM public.verified_senders vs
    WHERE vs.business_id = b.id AND vs.is_active = true
)
ON CONFLICT (business_id, email) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.verified_senders IS
'Verified email addresses for campaign senders. Only domains verified in Resend should be active.';
