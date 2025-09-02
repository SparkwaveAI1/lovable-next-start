INSERT INTO sms_config (business_id, provider, phone_number, welcome_message, is_active) 
VALUES 
    (
        (SELECT id FROM businesses WHERE slug = 'fight-flow-academy'), 
        'twilio',
        '+1234567890',
        'Welcome to Fight Flow Academy! 🥋 Thanks for your interest. Reply SCHEDULE to book a free trial class, or call us at (555) 123-4567.',
        true
    );