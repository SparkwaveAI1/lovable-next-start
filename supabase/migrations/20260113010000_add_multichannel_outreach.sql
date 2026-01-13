-- ============================================
-- MULTI-CHANNEL OUTREACH
-- Send greeting via SMS and Email, track preferred channel
-- ============================================

BEGIN;

-- ============================================
-- 1. ADD PREFERRED CHANNEL TO CONTACTS
-- ============================================

ALTER TABLE public.contacts
    ADD COLUMN IF NOT EXISTS preferred_channel VARCHAR(20) DEFAULT NULL;
    -- Values: 'sms', 'email', NULL (not yet determined)

COMMENT ON COLUMN public.contacts.preferred_channel IS
'Preferred communication channel based on which channel the contact responds to first. NULL means not yet determined.';

-- ============================================
-- 2. ADD EMAIL GREETING TEMPLATES TO AGENT CONFIG
-- ============================================

ALTER TABLE public.agent_config
    ADD COLUMN IF NOT EXISTS email_greeting_subject VARCHAR(255) DEFAULT 'Thanks for reaching out!';

ALTER TABLE public.agent_config
    ADD COLUMN IF NOT EXISTS email_greeting_body TEXT;

-- Update Fight Flow Academy with email greeting template
UPDATE public.agent_config
SET
    email_greeting_subject = 'Thanks for reaching out to Fight Flow Academy!',
    email_greeting_body = '
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #1a1a1a;">Hey {{first_name}}!</h2>

    <p>Thanks for reaching out to Fight Flow Academy! We''re excited to hear from you.</p>

    <p>Whether you''re interested in Brazilian Jiu-Jitsu, Kickboxing, or our Fitness classes, we have something for everyone - and yes, <strong>we offer a FREE trial class</strong> so you can experience our training firsthand!</p>

    <h3 style="color: #333;">Our Programs:</h3>
    <ul>
        <li><strong>Brazilian Jiu-Jitsu (BJJ)</strong> - Ground fighting, submissions, and self-defense</li>
        <li><strong>Kickboxing</strong> - Striking, cardio, and bag work</li>
        <li><strong>Fitness Classes</strong> - High-intensity workouts for all levels</li>
    </ul>

    <h3 style="color: #333;">Membership Options:</h3>
    <ul>
        <li>Adult Unlimited Classes: $159/month</li>
        <li>Adult Unlimited + 24/7 Gym Access: $189/month</li>
        <li>Youth Program (ages 5-17): $125/month</li>
    </ul>

    <p>Ready to start your martial arts journey? Reply to this email or text us back to schedule your FREE trial class!</p>

    <p style="margin-top: 30px;">
        Train hard,<br>
        <strong>The Fight Flow Team</strong>
    </p>
</div>
'
WHERE business_id = (SELECT id FROM public.businesses WHERE slug = 'fight-flow-academy' LIMIT 1);

-- ============================================
-- 3. ADD FROM EMAIL CONFIG TO AGENT CONFIG
-- ============================================

ALTER TABLE public.agent_config
    ADD COLUMN IF NOT EXISTS from_email VARCHAR(255);

ALTER TABLE public.agent_config
    ADD COLUMN IF NOT EXISTS from_name VARCHAR(100);

-- Update Fight Flow with from email settings
UPDATE public.agent_config
SET
    from_email = 'hello@fightflowacademy.com',
    from_name = 'Fight Flow Academy'
WHERE business_id = (SELECT id FROM public.businesses WHERE slug = 'fight-flow-academy' LIMIT 1);

COMMIT;
