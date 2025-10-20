-- Fix RLS policies on businesses table to allow updates

-- Add policy to allow authenticated users to update businesses
CREATE POLICY "Allow authenticated users to update businesses"
ON businesses
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Add policy to allow authenticated users to insert businesses
CREATE POLICY "Allow authenticated users to insert businesses"
ON businesses
FOR INSERT
TO authenticated
WITH CHECK (true);