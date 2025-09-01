-- Update the ghl_configurations table with the actual GoHighLevel API key
UPDATE ghl_configurations 
SET api_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6IjdTWnJzWFljeE1WUU4xQVBHTXdLIiwidmVyc2lvbiI6MSwiaWF0IjoxNzI5Njk1MjI4Nzg0LCJzdWIiOiJVZG1zNThEWXozRm1VcEhUWnZDVSJ9.cee7iIXYKol3VRgVSsWYMFtucWaTqqEqLbi199Drj2o'
WHERE business_id = (
  SELECT id FROM businesses WHERE slug = 'fight-flow-academy'
);