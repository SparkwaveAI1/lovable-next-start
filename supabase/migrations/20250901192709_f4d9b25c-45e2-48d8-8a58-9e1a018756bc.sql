-- Enable Row Level Security on contacts table
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (matching existing pattern)
CREATE POLICY "Contacts are publicly readable" 
ON contacts 
FOR SELECT 
USING (true);