-- ============================================
-- EMAIL SYSTEM TABLES
-- ============================================

-- EMAIL LISTS: Organize subscribers into lists per business
CREATE TABLE public.email_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    subscriber_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_list_name_per_business UNIQUE (business_id, name)
);

-- EMAIL SUBSCRIBERS: Individual email contacts
CREATE TABLE public.email_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced', 'complained')),
    source VARCHAR(50), -- 'manual', 'import', 'form', 'api'
    metadata JSONB DEFAULT '{}',
    subscribed_at TIMESTAMPTZ DEFAULT now(),
    unsubscribed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_email_per_business UNIQUE (business_id, email)
);

-- LIST MEMBERSHIPS: Many-to-many relationship between subscribers and lists
CREATE TABLE public.email_list_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID REFERENCES public.email_lists(id) ON DELETE CASCADE NOT NULL,
    subscriber_id UUID REFERENCES public.email_subscribers(id) ON DELETE CASCADE NOT NULL,
    added_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_list_subscriber UNIQUE (list_id, subscriber_id)
);

-- EMAIL CAMPAIGNS: Marketing emails and newsletters
CREATE TABLE public.email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(200) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    preview_text VARCHAR(200),
    from_name VARCHAR(100) NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    reply_to VARCHAR(255),
    content_html TEXT NOT NULL,
    content_text TEXT, -- Plain text version
    list_id UUID REFERENCES public.email_lists(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    total_recipients INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_bounced INTEGER DEFAULT 0,
    total_complained INTEGER DEFAULT 0,
    total_unsubscribed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- EMAIL SENDS: Individual email delivery tracking
CREATE TABLE public.email_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE CASCADE NOT NULL,
    subscriber_id UUID REFERENCES public.email_subscribers(id) ON DELETE CASCADE NOT NULL,
    resend_id VARCHAR(100), -- Resend's message ID
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    bounce_type VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_campaign_subscriber UNIQUE (campaign_id, subscriber_id)
);

-- EMAIL CLICK TRACKING: Track which links were clicked
CREATE TABLE public.email_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    send_id UUID REFERENCES public.email_sends(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    clicked_at TIMESTAMPTZ DEFAULT now(),
    user_agent TEXT,
    ip_address INET
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_email_lists_business ON public.email_lists(business_id);
CREATE INDEX idx_email_subscribers_business ON public.email_subscribers(business_id);
CREATE INDEX idx_email_subscribers_email ON public.email_subscribers(email);
CREATE INDEX idx_email_subscribers_status ON public.email_subscribers(business_id, status);
CREATE INDEX idx_email_list_members_list ON public.email_list_members(list_id);
CREATE INDEX idx_email_list_members_subscriber ON public.email_list_members(subscriber_id);
CREATE INDEX idx_email_campaigns_business ON public.email_campaigns(business_id);
CREATE INDEX idx_email_campaigns_status ON public.email_campaigns(business_id, status);
CREATE INDEX idx_email_campaigns_scheduled ON public.email_campaigns(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_email_sends_campaign ON public.email_sends(campaign_id);
CREATE INDEX idx_email_sends_subscriber ON public.email_sends(subscriber_id);
CREATE INDEX idx_email_sends_resend ON public.email_sends(resend_id);
CREATE INDEX idx_email_clicks_send ON public.email_clicks(send_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_clicks ENABLE ROW LEVEL SECURITY;

-- EMAIL_LISTS policies
CREATE POLICY "Users can view email lists for accessible businesses"
ON public.email_lists FOR SELECT TO authenticated
USING (public.can_access_business(business_id));

CREATE POLICY "Users can manage email lists for accessible businesses"
ON public.email_lists FOR ALL TO authenticated
USING (public.can_access_business(business_id))
WITH CHECK (public.can_access_business(business_id));

-- EMAIL_SUBSCRIBERS policies
CREATE POLICY "Users can view subscribers for accessible businesses"
ON public.email_subscribers FOR SELECT TO authenticated
USING (public.can_access_business(business_id));

CREATE POLICY "Users can manage subscribers for accessible businesses"
ON public.email_subscribers FOR ALL TO authenticated
USING (public.can_access_business(business_id))
WITH CHECK (public.can_access_business(business_id));

-- EMAIL_LIST_MEMBERS policies (check via list's business)
CREATE POLICY "Users can view list members for accessible businesses"
ON public.email_list_members FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.email_lists el
        WHERE el.id = list_id AND public.can_access_business(el.business_id)
    )
);

CREATE POLICY "Users can manage list members for accessible businesses"
ON public.email_list_members FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.email_lists el
        WHERE el.id = list_id AND public.can_access_business(el.business_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.email_lists el
        WHERE el.id = list_id AND public.can_access_business(el.business_id)
    )
);

-- EMAIL_CAMPAIGNS policies
CREATE POLICY "Users can view campaigns for accessible businesses"
ON public.email_campaigns FOR SELECT TO authenticated
USING (public.can_access_business(business_id));

CREATE POLICY "Users can manage campaigns for accessible businesses"
ON public.email_campaigns FOR ALL TO authenticated
USING (public.can_access_business(business_id))
WITH CHECK (public.can_access_business(business_id));

-- EMAIL_SENDS policies (check via campaign's business)
CREATE POLICY "Users can view sends for accessible businesses"
ON public.email_sends FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.email_campaigns ec
        WHERE ec.id = campaign_id AND public.can_access_business(ec.business_id)
    )
);

CREATE POLICY "Users can manage sends for accessible businesses"
ON public.email_sends FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.email_campaigns ec
        WHERE ec.id = campaign_id AND public.can_access_business(ec.business_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.email_campaigns ec
        WHERE ec.id = campaign_id AND public.can_access_business(ec.business_id)
    )
);

-- EMAIL_CLICKS policies (check via send's campaign's business)
CREATE POLICY "Users can view clicks for accessible businesses"
ON public.email_clicks FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.email_sends es
        JOIN public.email_campaigns ec ON ec.id = es.campaign_id
        WHERE es.id = send_id AND public.can_access_business(ec.business_id)
    )
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update subscriber count on a list
CREATE OR REPLACE FUNCTION public.update_list_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.email_lists 
        SET subscriber_count = subscriber_count + 1, updated_at = now()
        WHERE id = NEW.list_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.email_lists 
        SET subscriber_count = subscriber_count - 1, updated_at = now()
        WHERE id = OLD.list_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_list_count
AFTER INSERT OR DELETE ON public.email_list_members
FOR EACH ROW EXECUTE FUNCTION public.update_list_subscriber_count();

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_email_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_email_lists_timestamp
BEFORE UPDATE ON public.email_lists
FOR EACH ROW EXECUTE FUNCTION public.update_email_timestamp();

CREATE TRIGGER set_email_subscribers_timestamp
BEFORE UPDATE ON public.email_subscribers
FOR EACH ROW EXECUTE FUNCTION public.update_email_timestamp();

CREATE TRIGGER set_email_campaigns_timestamp
BEFORE UPDATE ON public.email_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_email_timestamp();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.email_lists IS 'Email subscriber lists organized by business';
COMMENT ON TABLE public.email_subscribers IS 'Individual email subscribers with status tracking';
COMMENT ON TABLE public.email_list_members IS 'Many-to-many relationship between lists and subscribers';
COMMENT ON TABLE public.email_campaigns IS 'Email marketing campaigns with performance metrics';
COMMENT ON TABLE public.email_sends IS 'Individual email delivery tracking with Resend integration';
COMMENT ON TABLE public.email_clicks IS 'Click tracking for email links';