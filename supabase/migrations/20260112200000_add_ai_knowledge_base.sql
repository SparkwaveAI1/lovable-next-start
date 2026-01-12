-- ============================================
-- AI KNOWLEDGE BASE & AGENT CONFIGURATION
-- Phase 1: Fight Flow AI Agent
-- ============================================

BEGIN;

-- ============================================
-- 1. BUSINESS KNOWLEDGE TABLE
-- Stores FAQs, pricing, policies per business
-- ============================================

CREATE TABLE IF NOT EXISTS public.business_knowledge (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- 'pricing', 'faq', 'policy', 'program', 'hours', 'location'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}', -- For keyword matching
    priority INTEGER DEFAULT 0, -- Higher = more relevant when multiple matches
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_business_knowledge_business_id ON public.business_knowledge(business_id);
CREATE INDEX idx_business_knowledge_category ON public.business_knowledge(category);
CREATE INDEX idx_business_knowledge_active ON public.business_knowledge(is_active) WHERE is_active = true;
CREATE INDEX idx_business_knowledge_keywords ON public.business_knowledge USING GIN(keywords);

-- Enable RLS
ALTER TABLE public.business_knowledge ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Knowledge is readable by authenticated users"
    ON public.business_knowledge FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Knowledge is readable by service role"
    ON public.business_knowledge FOR SELECT
    TO service_role
    USING (true);

CREATE POLICY "Super admins can manage knowledge"
    ON public.business_knowledge FOR ALL
    USING (public.is_super_admin());

-- Updated_at trigger
CREATE TRIGGER update_business_knowledge_updated_at
    BEFORE UPDATE ON public.business_knowledge
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. AGENT CONFIGURATION TABLE
-- Per-business AI agent settings
-- ============================================

CREATE TABLE IF NOT EXISTS public.agent_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID UNIQUE NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    agent_name VARCHAR(100) DEFAULT 'AI Assistant',
    personality_prompt TEXT, -- Custom personality instructions
    greeting_message TEXT,
    fallback_message TEXT DEFAULT 'I''ll have someone follow up with you shortly!',
    booking_enabled BOOLEAN DEFAULT true,
    auto_reply_enabled BOOLEAN DEFAULT true,
    business_hours JSONB DEFAULT '{}', -- {"mon": {"open": "06:00", "close": "21:00"}, ...}
    notification_emails TEXT[] DEFAULT '{}', -- Emails to notify on bookings
    max_response_length INTEGER DEFAULT 160, -- SMS character limit
    model VARCHAR(50) DEFAULT 'gpt-4o-mini', -- AI model to use
    temperature DECIMAL(2,1) DEFAULT 0.7,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.agent_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Agent config readable by authenticated users"
    ON public.agent_config FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Agent config readable by service role"
    ON public.agent_config FOR SELECT
    TO service_role
    USING (true);

CREATE POLICY "Super admins can manage agent config"
    ON public.agent_config FOR ALL
    USING (public.is_super_admin());

-- Updated_at trigger
CREATE TRIGGER update_agent_config_updated_at
    BEFORE UPDATE ON public.agent_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. CONVERSATION STATE TRACKING
-- Add state columns to conversation_threads
-- ============================================

ALTER TABLE public.conversation_threads
    ADD COLUMN IF NOT EXISTS conversation_state VARCHAR(50) DEFAULT 'initial';
    -- States: initial, greeting, answering_questions, collecting_booking_info,
    --         awaiting_booking_confirmation, class_scheduled, post_class_followup,
    --         nurturing, needs_human, closed

ALTER TABLE public.conversation_threads
    ADD COLUMN IF NOT EXISTS state_data JSONB DEFAULT '{}';
    -- Stores: selected_class, preferred_date, collected_name, booking_step, etc.

ALTER TABLE public.conversation_threads
    ADD COLUMN IF NOT EXISTS needs_human_review BOOLEAN DEFAULT false;

ALTER TABLE public.conversation_threads
    ADD COLUMN IF NOT EXISTS last_bot_message_at TIMESTAMPTZ;

ALTER TABLE public.conversation_threads
    ADD COLUMN IF NOT EXISTS intent_history JSONB DEFAULT '[]';
    -- Track detected intents: [{"intent": "pricing_inquiry", "timestamp": "...", "confidence": 0.9}]

-- Index for finding threads needing human review
CREATE INDEX IF NOT EXISTS idx_conversation_threads_needs_human
    ON public.conversation_threads(needs_human_review)
    WHERE needs_human_review = true;

-- Index for conversation state
CREATE INDEX IF NOT EXISTS idx_conversation_threads_state
    ON public.conversation_threads(conversation_state);

-- ============================================
-- 4. SEED FIGHT FLOW ACADEMY DATA
-- ============================================

-- Get Fight Flow Academy business ID and insert knowledge
DO $$
DECLARE
    v_business_id UUID;
BEGIN
    -- Get Fight Flow Academy ID
    SELECT id INTO v_business_id
    FROM public.businesses
    WHERE slug = 'fight-flow-academy'
    LIMIT 1;

    IF v_business_id IS NULL THEN
        RAISE NOTICE 'Fight Flow Academy not found, skipping seed data';
        RETURN;
    END IF;

    RAISE NOTICE 'Seeding knowledge base for Fight Flow Academy: %', v_business_id;

    -- ============================================
    -- PRICING DATA
    -- ============================================

    -- Adult Unlimited Classes
    INSERT INTO public.business_knowledge (business_id, category, title, content, keywords, priority)
    VALUES (
        v_business_id,
        'pricing',
        'Adult Unlimited Classes',
        '$159/month + $50 registration fee. Includes unlimited access to all group classes including BJJ, Kickboxing, and Fitness classes.',
        ARRAY['price', 'cost', 'adult', 'unlimited', 'classes', 'membership', 'monthly', 'how much', 'rate', 'fee'],
        10
    ) ON CONFLICT DO NOTHING;

    -- Adult Unlimited + 24/7 Access
    INSERT INTO public.business_knowledge (business_id, category, title, content, keywords, priority)
    VALUES (
        v_business_id,
        'pricing',
        'Adult Unlimited + 24/7 Gym Access',
        '$189/month + $50 registration fee. All unlimited classes PLUS 24/7 gym access for open mat time and independent training.',
        ARRAY['price', 'cost', 'adult', 'unlimited', '24/7', 'gym', 'access', 'membership', 'all access', 'premium'],
        10
    ) ON CONFLICT DO NOTHING;

    -- 24/7 Gym Access Only
    INSERT INTO public.business_knowledge (business_id, category, title, content, keywords, priority)
    VALUES (
        v_business_id,
        'pricing',
        '24/7 Gym Access Only',
        '$89/month + $50 registration fee. 24/7 gym access for independent training without class enrollment.',
        ARRAY['price', 'cost', 'gym', 'only', 'access', '24/7', 'no classes', 'open gym'],
        8
    ) ON CONFLICT DO NOTHING;

    -- Personal Training
    INSERT INTO public.business_knowledge (business_id, category, title, content, keywords, priority)
    VALUES (
        v_business_id,
        'pricing',
        'Personal Training',
        '$80/hour for one-on-one personal training sessions with our experienced coaches. Great for accelerated learning or competition prep.',
        ARRAY['price', 'cost', 'personal', 'training', 'private', '1on1', 'one on one', 'private lesson', 'pt'],
        8
    ) ON CONFLICT DO NOTHING;

    -- Youth Program
    INSERT INTO public.business_knowledge (business_id, category, title, content, keywords, priority)
    VALUES (
        v_business_id,
        'pricing',
        'Youth Program',
        '$125/month + $50 registration fee. For ages 5-17. Includes all youth martial arts classes focused on discipline, confidence, and fitness.',
        ARRAY['price', 'cost', 'youth', 'kids', 'children', 'junior', 'child', 'young', 'teen', 'teenager'],
        10
    ) ON CONFLICT DO NOTHING;

    -- Registration Fee
    INSERT INTO public.business_knowledge (business_id, category, title, content, keywords, priority)
    VALUES (
        v_business_id,
        'pricing',
        'Registration Fee',
        'All memberships have a one-time $50 registration fee that covers your initial gear and enrollment.',
        ARRAY['registration', 'signup', 'sign up', 'enrollment', 'start', 'fee', 'joining'],
        5
    ) ON CONFLICT DO NOTHING;

    -- ============================================
    -- FAQ DATA
    -- ============================================

    -- Free Trial
    INSERT INTO public.business_knowledge (business_id, category, title, content, keywords, priority)
    VALUES (
        v_business_id,
        'faq',
        'Free Trial Class',
        'Yes! We offer a FREE trial class so you can experience our training before committing. Just let me know what type of class interests you and I can get you scheduled!',
        ARRAY['free', 'trial', 'try', 'first', 'class', 'test', 'sample', 'intro', 'introductory', 'beginner'],
        15
    ) ON CONFLICT DO NOTHING;

    -- What to Wear
    INSERT INTO public.business_knowledge (business_id, category, title, content, keywords, priority)
    VALUES (
        v_business_id,
        'faq',
        'What to Wear',
        'Wear comfortable athletic clothing you can move in. For BJJ, we recommend a rash guard if you have one, but a t-shirt works fine. We have loaner gis available for your first classes!',
        ARRAY['wear', 'clothes', 'clothing', 'bring', 'gi', 'attire', 'dress', 'outfit', 'gear', 'equipment'],
        10
    ) ON CONFLICT DO NOTHING;

    -- Experience Required
    INSERT INTO public.business_knowledge (business_id, category, title, content, keywords, priority)
    VALUES (
        v_business_id,
        'faq',
        'No Experience Required',
        'No experience needed at all! We welcome complete beginners and have classes for all skill levels. Our coaches are great at working with first-timers.',
        ARRAY['beginner', 'experience', 'never', 'first time', 'new', 'start', 'starting', 'newbie', 'skill level'],
        12
    ) ON CONFLICT DO NOTHING;

    -- Programs Offered
    INSERT INTO public.business_knowledge (business_id, category, title, content, keywords, priority)
    VALUES (
        v_business_id,
        'program',
        'Programs Offered',
        'We offer Brazilian Jiu-Jitsu (BJJ), Kickboxing, and Fitness classes for both adults and youth. BJJ focuses on ground fighting and submissions. Kickboxing combines punches, kicks, and cardio.',
        ARRAY['program', 'classes', 'offer', 'bjj', 'jiu jitsu', 'kickboxing', 'fitness', 'martial arts', 'what do you have'],
        10
    ) ON CONFLICT DO NOTHING;

    -- BJJ Info
    INSERT INTO public.business_knowledge (business_id, category, title, content, keywords, priority)
    VALUES (
        v_business_id,
        'program',
        'Brazilian Jiu-Jitsu (BJJ)',
        'Our BJJ program teaches ground fighting, submissions, and self-defense. Classes range from beginner fundamentals to advanced competition training. Great for all ages and fitness levels!',
        ARRAY['bjj', 'jiu jitsu', 'jiujitsu', 'brazilian', 'grappling', 'ground', 'submission', 'rolling'],
        10
    ) ON CONFLICT DO NOTHING;

    -- Kickboxing Info
    INSERT INTO public.business_knowledge (business_id, category, title, content, keywords, priority)
    VALUES (
        v_business_id,
        'program',
        'Kickboxing',
        'Our kickboxing classes combine striking techniques with high-intensity cardio. Learn punches, kicks, knees, and elbows while getting an amazing workout. Bag work and partner drills included.',
        ARRAY['kickboxing', 'kick boxing', 'striking', 'boxing', 'cardio', 'punch', 'kick', 'muay thai'],
        10
    ) ON CONFLICT DO NOTHING;

    -- Location
    INSERT INTO public.business_knowledge (business_id, category, title, content, keywords, priority)
    VALUES (
        v_business_id,
        'location',
        'Location & Address',
        'We''re located at Fight Flow Academy. Text us for the exact address and directions! We have plenty of free parking available.',
        ARRAY['location', 'address', 'where', 'directions', 'find', 'located', 'map'],
        8
    ) ON CONFLICT DO NOTHING;

    -- Parking
    INSERT INTO public.business_knowledge (business_id, category, title, content, keywords, priority)
    VALUES (
        v_business_id,
        'location',
        'Parking',
        'We have free parking available right in front of our building. There''s always plenty of spots!',
        ARRAY['parking', 'park', 'car', 'drive', 'lot'],
        5
    ) ON CONFLICT DO NOTHING;

    -- Hours
    INSERT INTO public.business_knowledge (business_id, category, title, content, keywords, priority)
    VALUES (
        v_business_id,
        'hours',
        'Class Schedule Hours',
        'We have classes throughout the day, typically from early morning to evening. Our 24/7 members can access the gym anytime. Want me to tell you about specific class times?',
        ARRAY['hours', 'schedule', 'time', 'when', 'open', 'close', 'available'],
        8
    ) ON CONFLICT DO NOTHING;

    -- Cancellation
    INSERT INTO public.business_knowledge (business_id, category, title, content, keywords, priority)
    VALUES (
        v_business_id,
        'policy',
        'Cancellation Policy',
        'Memberships are month-to-month with no long-term contracts. You can cancel anytime with 30 days notice. No cancellation fees!',
        ARRAY['cancel', 'cancellation', 'quit', 'stop', 'contract', 'commitment', 'leave'],
        8
    ) ON CONFLICT DO NOTHING;

    -- ============================================
    -- AGENT CONFIGURATION
    -- ============================================

    INSERT INTO public.agent_config (
        business_id,
        agent_name,
        personality_prompt,
        greeting_message,
        fallback_message,
        booking_enabled,
        auto_reply_enabled,
        notification_emails,
        max_response_length,
        model,
        temperature
    ) VALUES (
        v_business_id,
        'Fight Flow Assistant',
        'You are the AI assistant for Fight Flow Academy, a martial arts gym. Your personality:
- Friendly, encouraging, and welcoming
- Knowledgeable about BJJ, kickboxing, and fitness
- Enthusiastic about helping people start their martial arts journey
- Use casual, warm language (not corporate)
- Occasionally use martial arts terms naturally
- Be helpful without being pushy about sales
- If someone seems hesitant, be encouraging but respect their pace
- Always try to get them to book a free trial class
- End messages with a clear next step or question when appropriate',
        'Hey! Thanks for reaching out to Fight Flow Academy! How can I help you today?',
        'Great question! Let me have one of our team members get back to you on that. In the meantime, is there anything else I can help with?',
        true,
        true,
        ARRAY['scott@sparkwave-ai.com'],
        300, -- Allow slightly longer for informative responses
        'gpt-4o-mini',
        0.7
    ) ON CONFLICT (business_id) DO UPDATE SET
        agent_name = EXCLUDED.agent_name,
        personality_prompt = EXCLUDED.personality_prompt,
        greeting_message = EXCLUDED.greeting_message,
        notification_emails = EXCLUDED.notification_emails,
        updated_at = NOW();

    RAISE NOTICE 'Fight Flow Academy knowledge base seeded successfully!';
END $$;

-- ============================================
-- HELPER FUNCTION: Search Knowledge Base
-- ============================================

CREATE OR REPLACE FUNCTION public.search_business_knowledge(
    p_business_id UUID,
    p_query TEXT,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    category VARCHAR(50),
    title VARCHAR(255),
    content TEXT,
    relevance_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_query_words TEXT[];
BEGIN
    -- Split query into words for matching
    v_query_words := string_to_array(lower(p_query), ' ');

    RETURN QUERY
    SELECT
        bk.id,
        bk.category,
        bk.title,
        bk.content,
        (
            bk.priority +
            -- Count keyword matches
            (SELECT COUNT(*)::INTEGER
             FROM unnest(bk.keywords) kw
             WHERE lower(p_query) LIKE '%' || kw || '%')
        )::INTEGER as relevance_score
    FROM public.business_knowledge bk
    WHERE bk.business_id = p_business_id
      AND bk.is_active = true
      AND (
          -- Match any keyword
          EXISTS (
              SELECT 1 FROM unnest(bk.keywords) kw
              WHERE lower(p_query) LIKE '%' || kw || '%'
          )
          -- Or match title/content
          OR lower(bk.title) LIKE '%' || lower(p_query) || '%'
          OR lower(bk.content) LIKE '%' || lower(p_query) || '%'
      )
    ORDER BY relevance_score DESC, bk.priority DESC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_business_knowledge TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_business_knowledge TO service_role;

COMMENT ON FUNCTION public.search_business_knowledge IS
'Searches business knowledge base by keywords and content. Returns most relevant results based on keyword matches and priority.';

COMMIT;
