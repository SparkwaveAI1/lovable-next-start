-- Migration: User Notifications for Investment Alerts
-- Created: 2026-02-05
-- INV-060: Notification integration for alert system

-- =============================================================================
-- TABLE: user_notifications
-- General user notification system for in-app notifications
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'investment_alert', 'system', etc.
  title TEXT NOT NULL,
  body TEXT,
  data JSONB, -- Additional payload data
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);

-- RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON user_notifications;
CREATE POLICY "Users can view their own notifications" ON user_notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON user_notifications;
CREATE POLICY "Users can update their own notifications" ON user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON user_notifications;
CREATE POLICY "Users can delete their own notifications" ON user_notifications
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert notifications" ON user_notifications;
CREATE POLICY "Service role can insert notifications" ON user_notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- Add name column to investment_alerts if not exists
-- =============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_alerts' AND column_name = 'name'
  ) THEN
    ALTER TABLE investment_alerts ADD COLUMN name TEXT;
  END IF;
END $$;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE user_notifications IS 'In-app notifications for users (investment alerts, system notices)';
COMMENT ON COLUMN user_notifications.type IS 'Notification type: investment_alert, system, workflow_complete, etc.';
COMMENT ON COLUMN user_notifications.data IS 'JSON payload with type-specific data (alert details, etc.)';
