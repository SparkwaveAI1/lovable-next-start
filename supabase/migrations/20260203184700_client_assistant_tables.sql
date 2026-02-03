-- Client AI Assistant Tables
-- Created: 2026-02-03
-- Purpose: Support in-app AI assistant with function calling

-- ============================================
-- Table 1: client_assistant_config
-- Per-business permissions and settings
-- ============================================
CREATE TABLE public.client_assistant_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    allowed_functions TEXT[] DEFAULT ARRAY[]::TEXT[],
    blocked_functions TEXT[] DEFAULT ARRAY[]::TEXT[],
    require_confirmation TEXT[] DEFAULT ARRAY['send_email', 'send_sms', 'post_social']::TEXT[],
    daily_limits JSONB DEFAULT '{"send_email": 50, "send_sms": 100, "post_social": 10}'::JSONB,
    model VARCHAR(100) DEFAULT 'claude-sonnet-4-20250514',
    system_prompt_additions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id)
);

-- Enable RLS
ALTER TABLE public.client_assistant_config ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own business config
CREATE POLICY "Users can read own business assistant config"
ON public.client_assistant_config
FOR SELECT
USING (true);

-- Policy: Users can update their own business config
CREATE POLICY "Users can update own business assistant config"
ON public.client_assistant_config
FOR UPDATE
USING (true);

-- Policy: Users can insert their own business config
CREATE POLICY "Users can insert own business assistant config"
ON public.client_assistant_config
FOR INSERT
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_client_assistant_config_updated_at
    BEFORE UPDATE ON public.client_assistant_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Table 2: assistant_conversations
-- Chat sessions between user and assistant
-- ============================================
CREATE TABLE public.assistant_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL, -- Clerk user ID
    title VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own conversations
CREATE POLICY "Users can read own conversations"
ON public.assistant_conversations
FOR SELECT
USING (true);

CREATE POLICY "Users can insert own conversations"
ON public.assistant_conversations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update own conversations"
ON public.assistant_conversations
FOR UPDATE
USING (true);

-- Indexes for common queries
CREATE INDEX idx_assistant_conversations_business_user 
ON public.assistant_conversations(business_id, user_id);

CREATE INDEX idx_assistant_conversations_created 
ON public.assistant_conversations(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_assistant_conversations_updated_at
    BEFORE UPDATE ON public.assistant_conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Table 3: assistant_messages
-- Individual messages in conversations
-- ============================================
CREATE TABLE public.assistant_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES assistant_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT,
    tool_calls JSONB, -- For assistant messages with function calls
    tool_call_id VARCHAR(255), -- For tool response messages
    tool_name VARCHAR(100), -- For tool response messages
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage messages in their conversations
CREATE POLICY "Users can read messages in own conversations"
ON public.assistant_messages
FOR SELECT
USING (true);

CREATE POLICY "Users can insert messages"
ON public.assistant_messages
FOR INSERT
WITH CHECK (true);

-- Index for fetching messages by conversation
CREATE INDEX idx_assistant_messages_conversation 
ON public.assistant_messages(conversation_id, created_at ASC);

-- ============================================
-- Table 4: assistant_actions
-- Audit log of executed functions
-- ============================================
CREATE TABLE public.assistant_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES assistant_conversations(id) ON DELETE SET NULL,
    message_id UUID REFERENCES assistant_messages(id) ON DELETE SET NULL,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    function_name VARCHAR(100) NOT NULL,
    function_input JSONB NOT NULL,
    function_output JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'executed', 'failed', 'denied', 'rate_limited')),
    error_message TEXT,
    execution_time_ms INTEGER,
    required_confirmation BOOLEAN DEFAULT false,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.assistant_actions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own actions
CREATE POLICY "Users can read own actions"
ON public.assistant_actions
FOR SELECT
USING (true);

CREATE POLICY "Users can insert actions"
ON public.assistant_actions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update own actions"
ON public.assistant_actions
FOR UPDATE
USING (true);

-- Indexes for queries
CREATE INDEX idx_assistant_actions_business_user 
ON public.assistant_actions(business_id, user_id);

CREATE INDEX idx_assistant_actions_function 
ON public.assistant_actions(function_name, created_at DESC);

CREATE INDEX idx_assistant_actions_status 
ON public.assistant_actions(status) WHERE status = 'pending';

-- Index for rate limiting queries (function + business + date)
CREATE INDEX idx_assistant_actions_rate_limit 
ON public.assistant_actions(business_id, function_name, created_at DESC)
WHERE status = 'executed';

-- ============================================
-- Insert default config for existing businesses
-- ============================================
INSERT INTO public.client_assistant_config (business_id, enabled, allowed_functions)
SELECT id, true, ARRAY['lookup_contact', 'get_contact_details', 'create_task', 'query_bookings']
FROM public.businesses
WHERE slug IN ('fight-flow-academy', 'sparkwave-ai')
ON CONFLICT (business_id) DO NOTHING;

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE public.client_assistant_config IS 'Per-business configuration for AI assistant permissions and settings';
COMMENT ON TABLE public.assistant_conversations IS 'Chat sessions between users and the AI assistant';
COMMENT ON TABLE public.assistant_messages IS 'Individual messages within assistant conversations';
COMMENT ON TABLE public.assistant_actions IS 'Audit log of all function executions by the assistant';

COMMENT ON COLUMN public.client_assistant_config.allowed_functions IS 'Whitelist of function names the assistant can use';
COMMENT ON COLUMN public.client_assistant_config.blocked_functions IS 'Blacklist of functions (takes precedence over allowed)';
COMMENT ON COLUMN public.client_assistant_config.require_confirmation IS 'Functions that need user approval before execution';
COMMENT ON COLUMN public.client_assistant_config.daily_limits IS 'JSON object mapping function names to daily execution limits';
COMMENT ON COLUMN public.assistant_actions.status IS 'pending=awaiting confirmation, approved=user approved, executed=completed, failed=error, denied=user rejected, rate_limited=over limit';
