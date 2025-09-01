-- Enable Row Level Security on class_schedule table
ALTER TABLE class_schedule ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (matching existing pattern)
CREATE POLICY "Class schedule is publicly readable" 
ON class_schedule 
FOR SELECT 
USING (true);