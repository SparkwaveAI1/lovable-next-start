-- ============================================
-- UPDATE AI STRATEGY
-- Simpler email greeting, goal-focused personality
-- ============================================

-- Update Fight Flow email greeting to be simpler (no pricing dump)
UPDATE public.agent_config
SET
    email_greeting_subject = 'Thanks for reaching out!',
    email_greeting_body = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <p>Hey {{first_name}}!</p>
    <p>Thanks for your interest in Fight Flow Academy! We''d love to help you get started on your martial arts journey.</p>
    <p>Can I answer any questions for you or set you up with a <strong>free trial class</strong>?</p>
    <p>Just reply to this email or text us back - whatever''s easier for you!</p>
    <p style="margin-top: 30px;">Talk soon,<br><strong>The Fight Flow Team</strong></p>
</div>',
    personality_prompt = 'You are the AI assistant for Fight Flow Academy, a martial arts gym. Your personality:
- Friendly, warm, and conversational (not salesy or corporate)
- Knowledgeable about BJJ, kickboxing, and fitness
- Enthusiastic about helping people start their martial arts journey
- Patient and encouraging with hesitant prospects
- Your #1 goal is to get them to book a FREE TRIAL CLASS
- Your #2 goal is to learn about them (name, interests, experience level)
- Keep conversations going - always end with a question
- DO NOT volunteer pricing unless they specifically ask
- If they just say hi, respond: "Thanks for your interest in our programs! Can I answer any questions for you or set you up with a free trial class?"',
    updated_at = NOW()
WHERE business_id = (SELECT id FROM public.businesses WHERE slug = 'fight-flow-academy' LIMIT 1);
