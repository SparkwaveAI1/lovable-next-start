-- Email Campaign Builder Enhancement Migration
-- Adds columns for visual email editor and enhanced functionality

-- Add new columns to email_campaigns table
ALTER TABLE email_campaigns 
ADD COLUMN IF NOT EXISTS content_json JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS global_styles JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS template_id UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS preview_text TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS plain_text TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ab_test_id UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_ab_variant BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ab_variant_label TEXT DEFAULT NULL;

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  thumbnail_url TEXT,
  content_json JSONB NOT NULL DEFAULT '[]',
  content_html TEXT NOT NULL DEFAULT '',
  global_styles JSONB DEFAULT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for email_templates
CREATE INDEX IF NOT EXISTS idx_email_templates_business ON email_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_system ON email_templates(is_system) WHERE is_system = TRUE;

-- Enable RLS for email_templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_templates
CREATE POLICY "Users can view system templates" ON email_templates
  FOR SELECT USING (is_system = TRUE);

CREATE POLICY "Users can view own templates" ON email_templates
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own templates" ON email_templates
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid()
    )
  );

-- Create email_ab_tests table
CREATE TABLE IF NOT EXISTS email_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id),
  name TEXT NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('subject', 'sender', 'content', 'send_time')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'cancelled')),
  
  -- Test configuration
  sample_percentage INTEGER DEFAULT 20 CHECK (sample_percentage BETWEEN 5 AND 50),
  winner_metric TEXT DEFAULT 'opens' CHECK (winner_metric IN ('opens', 'clicks')),
  test_duration_hours INTEGER DEFAULT 4,
  auto_send_winner BOOLEAN DEFAULT TRUE,
  
  -- Variants stored as JSONB array
  variants JSONB NOT NULL DEFAULT '[]',
  
  -- Results
  winner_variant_id TEXT,
  winner_declared_at TIMESTAMPTZ,
  is_significant BOOLEAN DEFAULT FALSE,
  confidence_level DECIMAL(3,2),
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for email_ab_tests
CREATE INDEX IF NOT EXISTS idx_email_ab_tests_business ON email_ab_tests(business_id);
CREATE INDEX IF NOT EXISTS idx_email_ab_tests_campaign ON email_ab_tests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_ab_tests_status ON email_ab_tests(status);

-- Enable RLS for email_ab_tests
ALTER TABLE email_ab_tests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_ab_tests
CREATE POLICY "Users can manage own AB tests" ON email_ab_tests
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid()
    )
  );

-- Create email_segments table
CREATE TABLE IF NOT EXISTS email_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Segment conditions as JSONB
  conditions JSONB NOT NULL DEFAULT '[]',
  logic_type TEXT DEFAULT 'AND' CHECK (logic_type IN ('AND', 'OR')),
  
  is_dynamic BOOLEAN DEFAULT TRUE,
  contact_count INTEGER DEFAULT 0,
  contact_count_updated_at TIMESTAMPTZ,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for email_segments
CREATE INDEX IF NOT EXISTS idx_email_segments_business ON email_segments(business_id);
CREATE INDEX IF NOT EXISTS idx_email_segments_active ON email_segments(business_id, is_active) WHERE is_active = TRUE;

-- Enable RLS for email_segments
ALTER TABLE email_segments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_segments
CREATE POLICY "Users can manage own segments" ON email_segments
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid()
    )
  );

-- Enhance email_sends table if needed
DO $$ 
BEGIN
  -- Add new columns to email_sends table if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_sends' AND column_name='device_type') THEN
    ALTER TABLE email_sends ADD COLUMN device_type TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_sends' AND column_name='email_client') THEN
    ALTER TABLE email_sends ADD COLUMN email_client TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_sends' AND column_name='country_code') THEN
    ALTER TABLE email_sends ADD COLUMN country_code TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_sends' AND column_name='clicked_links') THEN
    ALTER TABLE email_sends ADD COLUMN clicked_links JSONB DEFAULT '[]';
  END IF;
END $$;

-- Create email_link_clicks table for detailed link tracking
CREATE TABLE IF NOT EXISTS email_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id UUID NOT NULL REFERENCES email_sends(id),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id),
  contact_id UUID REFERENCES contacts(id),
  
  link_url TEXT NOT NULL,
  link_text TEXT,
  link_position INTEGER,
  
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  device_type TEXT,
  user_agent TEXT,
  ip_address INET
);

-- Create indexes for email_link_clicks
CREATE INDEX IF NOT EXISTS idx_email_link_clicks_campaign ON email_link_clicks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_link_clicks_send ON email_link_clicks(send_id);
CREATE INDEX IF NOT EXISTS idx_email_link_clicks_url ON email_link_clicks(campaign_id, link_url);

-- Enable RLS for email_link_clicks
ALTER TABLE email_link_clicks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_link_clicks
CREATE POLICY "Users can view own link clicks" ON email_link_clicks
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM email_campaigns 
      WHERE business_id IN (
        SELECT business_id FROM business_users 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Insert system email templates
INSERT INTO email_templates (name, category, is_system, content_json, content_html, description) VALUES
(
  'Blank Template',
  'blank',
  TRUE,
  '[]',
  '',
  'Start with a completely blank email'
),
(
  'Simple Welcome',
  'welcome',
  TRUE,
  '[
    {
      "id": "block_1",
      "type": "text",
      "content": "<h1>Welcome to Our Community!</h1>",
      "styles": {
        "fontSize": "32px",
        "fontWeight": "700",
        "textAlign": "center",
        "paddingTop": "40px",
        "paddingBottom": "20px"
      }
    },
    {
      "id": "block_2",
      "type": "text",
      "content": "<p>Hi {{first_name}},</p><p>Thanks for joining us! We''re excited to have you as part of our community.</p>",
      "styles": {
        "fontSize": "16px",
        "lineHeight": "1.6",
        "paddingTop": "20px",
        "paddingBottom": "20px"
      }
    },
    {
      "id": "block_3",
      "type": "button",
      "content": {
        "text": "Get Started",
        "href": "#",
        "style": "primary"
      },
      "styles": {
        "textAlign": "center",
        "paddingTop": "20px",
        "paddingBottom": "40px"
      }
    }
  ]',
  '<h1 style="font-size: 32px; font-weight: 700; text-align: center; padding: 40px 0 20px 0;">Welcome to Our Community!</h1><p>Hi {{first_name}},</p><p>Thanks for joining us! We''re excited to have you as part of our community.</p><div style="text-align: center; padding: 20px 0 40px 0;"><a href="#" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Get Started</a></div>',
  'A simple welcome email for new subscribers'
),
(
  'Newsletter Basic',
  'newsletter',
  TRUE,
  '[
    {
      "id": "block_1",
      "type": "text",
      "content": "<h1>This Week''s Updates</h1>",
      "styles": {
        "fontSize": "28px",
        "fontWeight": "700",
        "textAlign": "center",
        "paddingTop": "20px",
        "paddingBottom": "10px"
      }
    },
    {
      "id": "block_2",
      "type": "divider",
      "content": {
        "color": "#e5e7eb",
        "thickness": 1
      },
      "styles": {
        "paddingTop": "10px",
        "paddingBottom": "20px"
      }
    },
    {
      "id": "block_3",
      "type": "text",
      "content": "<h2>What''s New</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.</p>",
      "styles": {
        "fontSize": "16px",
        "lineHeight": "1.6",
        "paddingTop": "10px",
        "paddingBottom": "20px"
      }
    },
    {
      "id": "block_4",
      "type": "button",
      "content": {
        "text": "Read More",
        "href": "#",
        "style": "outline"
      },
      "styles": {
        "textAlign": "center",
        "paddingTop": "20px",
        "paddingBottom": "20px"
      }
    }
  ]',
  '<h1 style="font-size: 28px; font-weight: 700; text-align: center; padding: 20px 0 10px 0;">This Week''s Updates</h1><hr style="border: none; height: 1px; background-color: #e5e7eb; margin: 10px 0 20px 0;"><h2>What''s New</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.</p><div style="text-align: center; padding: 20px 0;"><a href="#" style="border: 2px solid #2563eb; color: #2563eb; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Read More</a></div>',
  'A basic newsletter template with header and content sections'
) ON CONFLICT DO NOTHING;

-- Create function to update template usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE email_templates 
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT ON email_templates TO authenticated;
GRANT ALL ON email_templates TO service_role;
GRANT ALL ON email_ab_tests TO authenticated;
GRANT ALL ON email_segments TO authenticated;
GRANT SELECT ON email_link_clicks TO authenticated;
GRANT ALL ON email_link_clicks TO service_role;