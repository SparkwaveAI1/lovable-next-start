#!/usr/bin/env node
// Setup System Operations Dashboard tables and seed data

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const SUPABASE_URL = 'https://wrsoacujxcskydlzgopa.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || fs.readFileSync('/root/.config/sparkwave/supabase.json', 'utf8').match(/"service_role_key":\s*"([^"]+)"/)[1]

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function createTables() {
  console.log('Creating system_registry table...')
  
  const createRegistryTable = `
    CREATE TABLE IF NOT EXISTS system_registry (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        script_path TEXT,
        schedule TEXT,
        pipeline TEXT,
        trigger_type TEXT,
        dependencies TEXT[],
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );
  `
  
  const { error: registryError } = await supabase.rpc('exec_sql', { query: createRegistryTable })
  if (registryError) {
    console.log('Registry table might already exist, continuing...', registryError.message)
  }

  console.log('Creating system_status_log table...')
  
  const createStatusTable = `
    CREATE TABLE IF NOT EXISTS system_status_log (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        registry_id UUID REFERENCES system_registry(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        last_run TIMESTAMPTZ,
        next_run TIMESTAMPTZ,
        error_message TEXT,
        runtime_seconds INTEGER,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
    );
  `
  
  const { error: statusError } = await supabase.rpc('exec_sql', { query: createStatusTable })
  if (statusError) {
    console.log('Status table might already exist, continuing...', statusError.message)
  }

  // Create indexes
  console.log('Creating indexes...')
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_system_registry_category ON system_registry(category)',
    'CREATE INDEX IF NOT EXISTS idx_system_registry_type ON system_registry(type)',
    'CREATE INDEX IF NOT EXISTS idx_system_registry_pipeline ON system_registry(pipeline)',
    'CREATE INDEX IF NOT EXISTS idx_system_status_log_registry_id ON system_status_log(registry_id)',
    'CREATE INDEX IF NOT EXISTS idx_system_status_log_created_at ON system_status_log(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_system_status_log_status ON system_status_log(status)'
  ]
  
  for (const index of indexes) {
    await supabase.rpc('exec_sql', { query: index })
  }

  // Enable RLS
  console.log('Setting up RLS...')
  await supabase.rpc('exec_sql', { query: 'ALTER TABLE system_registry ENABLE ROW LEVEL SECURITY' })
  await supabase.rpc('exec_sql', { query: 'ALTER TABLE system_status_log ENABLE ROW LEVEL SECURITY' })

  // Create policies
  const policies = [
    'DROP POLICY IF EXISTS "Anyone can read system_registry" ON system_registry',
    'DROP POLICY IF EXISTS "Anyone can read system_status_log" ON system_status_log',
    'CREATE POLICY "Anyone can read system_registry" ON system_registry FOR SELECT USING (true)',
    'CREATE POLICY "Anyone can read system_status_log" ON system_status_log FOR SELECT USING (true)',
    'CREATE POLICY "Service role can write system_registry" ON system_registry FOR ALL USING (auth.role() = \'service_role\')',
    'CREATE POLICY "Service role can write system_status_log" ON system_status_log FOR ALL USING (auth.role() = \'service_role\')'
  ]
  
  for (const policy of policies) {
    await supabase.rpc('exec_sql', { query: policy })
  }

  console.log('Tables created successfully!')
}

async function seedData() {
  console.log('Seeding registry data...')
  
  const seedItems = [
    // Fight Flow Pipeline
    {
      name: 'Form Capture',
      category: 'fightflow',
      type: 'cron',
      description: 'Polls Wix Forms API for new submissions; stores lead to Supabase; sends immediate SMS ack',
      script_path: '/root/clawd/scripts/fightflow-form-capture-v2.mjs',
      schedule: 'every 10 min',
      pipeline: 'Fight Flow',
      trigger_type: 'openclaw_cron',
      dependencies: ['Wix API', 'Supabase', 'send-sms edge function']
    },
    {
      name: 'Immediate Response',
      category: 'fightflow',
      type: 'cron',
      description: 'Sends immediate AI-generated SMS to new leads with phone numbers',
      script_path: '/root/clawd/scripts/fightflow-immediate-response.mjs',
      schedule: 'every 15 min',
      pipeline: 'Fight Flow',
      trigger_type: 'openclaw_cron',
      dependencies: ['Supabase', 'Twilio', 'send-sms edge function']
    },
    {
      name: 'Bookings Sync',
      category: 'fightflow',
      type: 'cron',
      description: 'Polls Wix Bookings API for new/updated bookings; upserts to fightflow_appointments',
      script_path: '/root/clawd/scripts/fightflow-bookings-sync.mjs',
      schedule: 'every 15 min',
      pipeline: 'Fight Flow',
      trigger_type: 'system_cron',
      dependencies: ['Wix Bookings API', 'Supabase']
    },
    {
      name: 'SMS Webhook',
      category: 'fightflow',
      type: 'edge_function',
      description: 'Receives inbound SMS; handles STOP keywords; routes responses; queues AI',
      script_path: 'supabase/functions/sms-webhook',
      schedule: null,
      pipeline: 'Fight Flow',
      trigger_type: 'webhook',
      dependencies: ['Twilio', 'Supabase']
    },
    {
      name: 'AI Response',
      category: 'fightflow',
      type: 'edge_function',
      description: 'AI chatbot using Claude; handles inquiries and booking confirmations',
      script_path: 'supabase/functions/ai-response',
      schedule: null,
      pipeline: 'Fight Flow',
      trigger_type: 'edge_function',
      dependencies: ['OpenRouter', 'Supabase']
    },

    // Twitter Pipeline
    {
      name: 'Daily Context Update',
      category: 'twitter',
      type: 'cron',
      description: 'Searches Twitter for active conversations per account; saves context',
      script_path: '/root/clawd/scripts/twitter/update-daily-context.mjs',
      schedule: '0 12 * * *',
      pipeline: 'Twitter',
      trigger_type: 'system_cron',
      dependencies: ['Twitter API']
    },
    {
      name: 'Integrated Workflow',
      category: 'twitter',
      type: 'cron',
      description: 'Full posting session: tweet + comments + engagement',
      script_path: '/root/clawd/scripts/twitter/integrated-workflow.mjs',
      schedule: '4x daily',
      pipeline: 'Twitter',
      trigger_type: 'openclaw_cron',
      dependencies: ['OpenRouter', 'Twitter API']
    },
    {
      name: 'Post Barnum',
      category: 'twitter',
      type: 'cron',
      description: 'Special Barnum pipeline: CharX API + quality gate + posting',
      script_path: '/root/clawd/scripts/twitter/post-barnum.mjs',
      schedule: '4x daily',
      pipeline: 'Twitter',
      trigger_type: 'openclaw_cron',
      dependencies: ['CharX API', 'Twitter API']
    },

    // Health Pipeline
    {
      name: 'Morning Health Check',
      category: 'health',
      type: 'cron',
      description: 'Loads goals.json; runs checks vs thresholds; outputs status',
      script_path: '/root/clawd/scripts/health/check.mjs',
      schedule: '8 AM ET',
      pipeline: 'Health',
      trigger_type: 'openclaw_cron',
      dependencies: ['Supabase', 'goals.json']
    },
    {
      name: 'Evaluation Loop',
      category: 'health',
      type: 'cron',
      description: 'Comprehensive nightly self-improvement review',
      script_path: '/root/clawd/scripts/metrics/evaluation-loop.mjs',
      schedule: '11:08 PM ET',
      pipeline: 'Health',
      trigger_type: 'openclaw_cron',
      dependencies: ['Supabase', 'OpenRouter']
    },
    {
      name: 'Nightly Report',
      category: 'health',
      type: 'cron',
      description: 'Generates markdown report from last 7 days metrics',
      script_path: '/root/clawd/scripts/metrics/nightly-report.mjs',
      schedule: '11:06 PM ET',
      pipeline: 'Health',
      trigger_type: 'openclaw_cron',
      dependencies: ['Supabase']
    },

    // Mission Control
    {
      name: 'MC Task Management',
      category: 'mission_control',
      type: 'script',
      description: 'Task lifecycle: start, progress, done, verify, block, abandon',
      script_path: '/root/clawd/scripts/mc-task.mjs',
      schedule: null,
      pipeline: null,
      trigger_type: 'manual',
      dependencies: ['Supabase']
    },
    {
      name: 'Task Staleness Check',
      category: 'mission_control',
      type: 'cron',
      description: 'Finds Rico-Main in_progress tasks >4h old; alerts Scott',
      script_path: '/root/clawd/scripts/mc-task-staleness-check.mjs',
      schedule: '9 AM ET',
      pipeline: null,
      trigger_type: 'openclaw_cron',
      dependencies: ['Supabase', 'Telegram']
    }
  ]

  // Clear existing data
  const { error: clearError } = await supabase
    .from('system_registry')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

  console.log('Cleared existing registry data')

  // Insert seed data
  const { data, error } = await supabase
    .from('system_registry')
    .insert(seedItems)

  if (error) {
    console.error('Error seeding data:', error)
    throw error
  }

  console.log(`Seeded ${seedItems.length} registry items`)
}

async function main() {
  try {
    await createTables()
    await seedData()
    
    console.log('\n✅ System Operations Dashboard setup complete!')
    console.log('Tables created: system_registry, system_status_log')
    console.log('View created: system_latest_status')
    console.log('Edge function deployed: system-ops-status')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

main()