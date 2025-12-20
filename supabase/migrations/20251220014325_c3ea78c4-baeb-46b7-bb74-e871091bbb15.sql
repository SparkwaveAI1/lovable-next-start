-- ============================================
-- PERFORMANCE INDEXES FOR COMMON QUERIES
-- ============================================

-- scheduled_content: Often filtered by platform and status
CREATE INDEX IF NOT EXISTS idx_scheduled_content_platform 
ON public.scheduled_content(platform);

CREATE INDEX IF NOT EXISTS idx_scheduled_content_status_scheduled 
ON public.scheduled_content(status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_scheduled_content_business_status 
ON public.scheduled_content(business_id, status);

-- automation_logs: Filtered by type, status, and business
CREATE INDEX IF NOT EXISTS idx_automation_logs_type 
ON public.automation_logs(automation_type);

CREATE INDEX IF NOT EXISTS idx_automation_logs_status 
ON public.automation_logs(status);

CREATE INDEX IF NOT EXISTS idx_automation_logs_business_created 
ON public.automation_logs(business_id, created_at DESC);

-- media_assets: Queried by business and file type
CREATE INDEX IF NOT EXISTS idx_media_assets_business_type 
ON public.media_assets(business_id, file_type);

CREATE INDEX IF NOT EXISTS idx_media_assets_business_created 
ON public.media_assets(business_id, created_at DESC);

-- contacts: Phone lookups for SMS
CREATE INDEX IF NOT EXISTS idx_contacts_phone 
ON public.contacts(phone) WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_business_status 
ON public.contacts(business_id, status);

-- token_health_checks: Dashboard queries
CREATE INDEX IF NOT EXISTS idx_token_health_business_platform 
ON public.token_health_checks(business_id, platform, check_timestamp DESC);

-- content_media: Join queries
CREATE INDEX IF NOT EXISTS idx_content_media_content 
ON public.content_media(content_id);

CREATE INDEX IF NOT EXISTS idx_content_media_media 
ON public.content_media(media_id);

-- staged_content: Business and creation time queries
CREATE INDEX IF NOT EXISTS idx_staged_content_business_created 
ON public.staged_content(business_id, created_at DESC);

-- conversation_threads: Contact and business lookups
CREATE INDEX IF NOT EXISTS idx_conversation_threads_contact 
ON public.conversation_threads(contact_id);

CREATE INDEX IF NOT EXISTS idx_conversation_threads_business_status 
ON public.conversation_threads(business_id, status);

-- sms_messages: Thread lookups
CREATE INDEX IF NOT EXISTS idx_sms_messages_thread 
ON public.sms_messages(thread_id, created_at DESC);