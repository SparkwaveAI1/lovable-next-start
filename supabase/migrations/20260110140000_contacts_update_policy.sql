-- Add UPDATE policy for contacts table
-- Required for ContactDetail tag management and other contact updates
CREATE POLICY "Users can update contacts for accessible businesses"
ON public.contacts
FOR UPDATE
TO authenticated
USING (public.can_access_business(business_id))
WITH CHECK (public.can_access_business(business_id));
