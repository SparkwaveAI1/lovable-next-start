-- Add policy to allow public INSERT access (matching existing pattern)
CREATE POLICY "Contacts are publicly writable" 
ON contacts 
FOR INSERT 
WITH CHECK (true);