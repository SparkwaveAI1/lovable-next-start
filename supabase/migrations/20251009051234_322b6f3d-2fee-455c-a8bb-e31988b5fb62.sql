-- Add public delete and update policies for scheduled_content
CREATE POLICY "Public delete access for scheduled_content"
ON scheduled_content
FOR DELETE
TO public
USING (true);

CREATE POLICY "Public update access for scheduled_content"
ON scheduled_content
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);