-- Communication Center: Campaign Management Schema
-- Phase 1: Database tables for campaign tracking

-- ============================================
-- CAMPAIGNS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Campaign identity
  name TEXT NOT NULL,
  description TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'both')),
  
  -- Status tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  
  -- Message content
  message_template TEXT NOT NULL,
  subject_template TEXT, -- For email campaigns
  
  -- Targeting
  target_criteria JSONB DEFAULT '{}'::jsonb,
  -- Example: {"status": "new_lead", "tags": ["boxing"], "last_contacted_days_ago": 30}
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Cached stats (updated by triggers)
  stats JSONB DEFAULT '{
    "total": 0,
    "pending": 0,
    "sent": 0,
    "delivered": 0,
    "failed": 0,
    "replied": 0,
    "opted_out": 0
  }'::jsonb,
  
  -- Metadata
  created_by TEXT, -- 'rico-sales', 'manual', etc.
  tags TEXT[] DEFAULT '{}'
);

-- ============================================
-- CAMPAIGN RECIPIENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Queued but not sent
    'sent',         -- Message sent to provider
    'delivered',    -- Confirmed delivered
    'failed',       -- Send or delivery failed
    'replied',      -- Contact replied
    'opted_out',    -- Contact opted out
    'skipped'       -- Skipped (already contacted, etc.)
  )),
  
  -- Provider references
  message_sid TEXT,        -- Twilio SID for SMS
  email_id TEXT,           -- Resend ID for email
  
  -- Personalized content (if different from template)
  personalized_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  
  -- Reply tracking
  reply_message TEXT,
  
  -- Error tracking
  error_message TEXT,
  
  -- Ensure one send per contact per campaign
  UNIQUE(campaign_id, contact_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_campaigns_business_id ON campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_contact_id ON campaign_recipients(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_message_sid ON campaign_recipients(message_sid);

-- ============================================
-- TRIGGER: Update campaign stats on recipient status change
-- ============================================
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaigns
  SET stats = (
    SELECT jsonb_build_object(
      'total', COUNT(*),
      'pending', COUNT(*) FILTER (WHERE status = 'pending'),
      'sent', COUNT(*) FILTER (WHERE status = 'sent'),
      'delivered', COUNT(*) FILTER (WHERE status = 'delivered'),
      'failed', COUNT(*) FILTER (WHERE status = 'failed'),
      'replied', COUNT(*) FILTER (WHERE status = 'replied'),
      'opted_out', COUNT(*) FILTER (WHERE status = 'opted_out'),
      'skipped', COUNT(*) FILTER (WHERE status = 'skipped')
    )
    FROM campaign_recipients
    WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.campaign_id, OLD.campaign_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_campaign_stats ON campaign_recipients;
CREATE TRIGGER trigger_update_campaign_stats
  AFTER INSERT OR UPDATE OR DELETE ON campaign_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_stats();

-- ============================================
-- TRIGGER: Update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_campaign_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Set started_at when first going active
  IF NEW.status = 'active' AND OLD.status = 'draft' THEN
    NEW.started_at = NOW();
  END IF;
  
  -- Set completed_at when completing
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_campaign_timestamps ON campaigns;
CREATE TRIGGER trigger_campaign_timestamps
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_timestamps();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access to campaigns"
  ON campaigns FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to campaign_recipients"
  ON campaign_recipients FOR ALL
  USING (auth.role() = 'service_role');

-- Authenticated users can view all campaigns (simplified for now)
-- TODO: Add business-level access control when user_business_access exists
CREATE POLICY "Authenticated users can view campaigns"
  ON campaigns FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view campaign recipients"
  ON campaign_recipients FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================
-- HELPER VIEW: Campaign summary for dashboard
-- ============================================
CREATE OR REPLACE VIEW campaign_summary AS
SELECT 
  c.id,
  c.business_id,
  c.name,
  c.channel,
  c.status,
  c.message_template,
  c.created_at,
  c.started_at,
  c.completed_at,
  c.tags,
  (c.stats->>'total')::int as total_recipients,
  (c.stats->>'sent')::int as sent_count,
  (c.stats->>'delivered')::int as delivered_count,
  (c.stats->>'replied')::int as replied_count,
  (c.stats->>'failed')::int as failed_count,
  (c.stats->>'opted_out')::int as opted_out_count,
  CASE 
    WHEN (c.stats->>'sent')::int > 0 
    THEN ROUND(((c.stats->>'replied')::numeric / (c.stats->>'sent')::numeric) * 100, 1)
    ELSE 0 
  END as reply_rate,
  CASE 
    WHEN (c.stats->>'sent')::int > 0 
    THEN ROUND(((c.stats->>'delivered')::numeric / (c.stats->>'sent')::numeric) * 100, 1)
    ELSE 0 
  END as delivery_rate
FROM campaigns c;

COMMENT ON TABLE campaigns IS 'Marketing campaigns for SMS and email outreach';
COMMENT ON TABLE campaign_recipients IS 'Individual recipients and their status within a campaign';
COMMENT ON VIEW campaign_summary IS 'Dashboard view with calculated metrics';
