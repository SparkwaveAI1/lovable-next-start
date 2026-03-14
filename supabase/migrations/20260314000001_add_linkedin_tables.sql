-- LinkedIn Integration Phase 1: Database Schema
-- Adds tables for LinkedIn OAuth accounts, posts, engagement, and scheduling

-- Enable pgcrypto for token encryption (safe to run even if already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- linkedin_accounts
-- Stores OAuth-connected LinkedIn accounts (personal + company)
-- ============================================================
CREATE TABLE IF NOT EXISTS linkedin_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('personal', 'company')),
  linkedin_urn TEXT NOT NULL, -- e.g. urn:li:person:XXX or urn:li:organization:YYY
  account_name TEXT NOT NULL,
  profile_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  access_token_encrypted TEXT NOT NULL, -- pgp_sym_encrypt encrypted
  refresh_token_encrypted TEXT,          -- pgp_sym_encrypt encrypted
  token_expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  last_refresh_at TIMESTAMPTZ,
  refresh_error_count INTEGER DEFAULT 0,
  CONSTRAINT unique_linkedin_account UNIQUE(business_id, linkedin_urn)
);

CREATE INDEX IF NOT EXISTS idx_linkedin_accounts_business_id
  ON linkedin_accounts(business_id);

CREATE INDEX IF NOT EXISTS idx_linkedin_accounts_token_expires
  ON linkedin_accounts(token_expires_at)
  WHERE is_active = true;

-- ============================================================
-- linkedin_posts
-- Tracks composed / scheduled / published posts
-- ============================================================
CREATE TABLE IF NOT EXISTS linkedin_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES linkedin_accounts(id) ON DELETE CASCADE,
  post_urn TEXT, -- LinkedIn URN returned after publish
  content TEXT,  -- Required for text; optional caption for image/article
  media_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  article_url TEXT,
  post_type TEXT NOT NULL CHECK (post_type IN ('text', 'image', 'article')),
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_posts_status
  ON linkedin_posts(status);

CREATE INDEX IF NOT EXISTS idx_linkedin_posts_scheduled
  ON linkedin_posts(scheduled_for)
  WHERE status = 'scheduled';

-- ============================================================
-- linkedin_engagement
-- Latest analytics snapshot per post (upserted by collector cron)
-- ============================================================
CREATE TABLE IF NOT EXISTS linkedin_engagement (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES linkedin_posts(id) ON DELETE CASCADE,
  impressions INTEGER DEFAULT 0,       -- Company posts only
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,            -- Company posts only
  engagement_rate DECIMAL(8,4) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_post_engagement UNIQUE(post_id) -- One row per post, updated in place
);

CREATE INDEX IF NOT EXISTS idx_linkedin_engagement_post_id
  ON linkedin_engagement(post_id);

-- ============================================================
-- linkedin_scheduled_posts
-- Queue with distributed locking for concurrent-safe publishing
-- ============================================================
CREATE TABLE IF NOT EXISTS linkedin_scheduled_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES linkedin_posts(id) ON DELETE CASCADE UNIQUE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  time_slot TEXT CHECK (time_slot IN ('morning', 'afternoon', 'evening', 'custom')),
  position INTEGER DEFAULT 0,
  processing_started_at TIMESTAMPTZ,
  processing_lock_id UUID,
  processing_lock_expires_at TIMESTAMPTZ,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index to find and clear stale locks (> 5 minutes old)
CREATE INDEX IF NOT EXISTS idx_linkedin_scheduled_stale_locks
  ON linkedin_scheduled_posts(processing_started_at)
  WHERE processed = false AND processing_started_at IS NOT NULL;

-- Index to find pending posts ready to publish
CREATE INDEX IF NOT EXISTS idx_linkedin_scheduled_unprocessed
  ON linkedin_scheduled_posts(scheduled_time)
  WHERE processed = false AND processing_started_at IS NULL;

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE linkedin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_scheduled_posts ENABLE ROW LEVEL SECURITY;

-- linkedin_accounts: business members can read; service role can do all
-- Uses business_permissions table (user_id + business_id + is_active)
CREATE POLICY "linkedin_accounts_select"
  ON linkedin_accounts FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_permissions
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "linkedin_accounts_insert"
  ON linkedin_accounts FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_permissions
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "linkedin_accounts_update"
  ON linkedin_accounts FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM business_permissions
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "linkedin_accounts_delete"
  ON linkedin_accounts FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM business_permissions
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- linkedin_posts: accessible by business members
CREATE POLICY "linkedin_posts_select"
  ON linkedin_posts FOR SELECT
  USING (
    account_id IN (
      SELECT la.id FROM linkedin_accounts la
      JOIN business_permissions bp ON bp.business_id = la.business_id
      WHERE bp.user_id = auth.uid() AND bp.is_active = true
    )
  );

CREATE POLICY "linkedin_posts_insert"
  ON linkedin_posts FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT la.id FROM linkedin_accounts la
      JOIN business_permissions bp ON bp.business_id = la.business_id
      WHERE bp.user_id = auth.uid() AND bp.is_active = true
    )
  );

CREATE POLICY "linkedin_posts_update"
  ON linkedin_posts FOR UPDATE
  USING (
    account_id IN (
      SELECT la.id FROM linkedin_accounts la
      JOIN business_permissions bp ON bp.business_id = la.business_id
      WHERE bp.user_id = auth.uid() AND bp.is_active = true
    )
  );

CREATE POLICY "linkedin_posts_delete"
  ON linkedin_posts FOR DELETE
  USING (
    account_id IN (
      SELECT la.id FROM linkedin_accounts la
      JOIN business_permissions bp ON bp.business_id = la.business_id
      WHERE bp.user_id = auth.uid() AND bp.is_active = true
    )
  );

-- linkedin_engagement: read-only for business members; service role writes
CREATE POLICY "linkedin_engagement_select"
  ON linkedin_engagement FOR SELECT
  USING (
    post_id IN (
      SELECT lp.id FROM linkedin_posts lp
      JOIN linkedin_accounts la ON la.id = lp.account_id
      JOIN business_permissions bp ON bp.business_id = la.business_id
      WHERE bp.user_id = auth.uid() AND bp.is_active = true
    )
  );

-- linkedin_scheduled_posts: read-only for business members
CREATE POLICY "linkedin_scheduled_select"
  ON linkedin_scheduled_posts FOR SELECT
  USING (
    post_id IN (
      SELECT lp.id FROM linkedin_posts lp
      JOIN linkedin_accounts la ON la.id = lp.account_id
      JOIN business_permissions bp ON bp.business_id = la.business_id
      WHERE bp.user_id = auth.uid() AND bp.is_active = true
    )
  );
