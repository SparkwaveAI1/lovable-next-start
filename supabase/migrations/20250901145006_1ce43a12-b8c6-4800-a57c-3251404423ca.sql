-- Update the ghl_configurations table with your GoHighLevel API key
-- Replace 'YOUR_GOHIGHLEVEL_API_KEY_HERE' with your actual API key
UPDATE ghl_configurations 
SET api_key = 'YOUR_GOHIGHLEVEL_API_KEY_HERE'
WHERE business_id = (
  SELECT id FROM businesses WHERE slug = 'fight-flow-academy'
);