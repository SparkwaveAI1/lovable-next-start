-- Insert sample Fight Flow Academy classes
INSERT INTO class_schedule (business_id, class_name, instructor, day_of_week, start_time, end_time, max_capacity) 
VALUES 
    ((SELECT id FROM businesses WHERE slug = 'fight-flow-academy'), 'Beginner Jiu Jitsu', 'John Smith', 1, '18:00', '19:00', 15),
    ((SELECT id FROM businesses WHERE slug = 'fight-flow-academy'), 'Advanced Jiu Jitsu', 'John Smith', 3, '19:00', '20:00', 12),
    ((SELECT id FROM businesses WHERE slug = 'fight-flow-academy'), 'Open Mat', 'Various', 6, '10:00', '12:00', 20);

-- Verify the inserted data
SELECT class_name, instructor, day_of_week, start_time, end_time 
FROM class_schedule 
WHERE business_id = (SELECT id FROM businesses WHERE slug = 'fight-flow-academy');