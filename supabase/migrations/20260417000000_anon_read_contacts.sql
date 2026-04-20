-- Add SELECT policy for contacts table to allow SWapp to read contacts
-- For anon key: read-only access to all contacts (needed for frontend display)
CREATE POLICY "Anon can read all contacts"
ON public.contacts
FOR SELECT
TO anon
USING (true);

-- For authenticated users: can read contacts for accessible businesses
CREATE POLICY "Users can read contacts for accessible businesses"
ON public.contacts
FOR SELECT
TO authenticated
USING (public.can_access_business(business_id));