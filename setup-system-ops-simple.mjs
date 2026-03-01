#!/usr/bin/env node
// Setup System Operations Dashboard - Simple approach

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const SUPABASE_URL = 'https://wrsoacujxcskydlzgopa.supabase.co'

// Read service key from config
let SERVICE_KEY
try {
  const config = JSON.parse(fs.readFileSync('/root/.config/sparkwave/supabase.json', 'utf8'))
  SERVICE_KEY = config.service_role_key
} catch (error) {
  console.error('Could not read Supabase config:', error.message)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

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
      name: 'Appointment Trigger',
      category: 'fightflow',
      type: 'cron',
      description: 'Creates sequence steps for new confirmed appointments with real class times',
      script_path: '/root/clawd/scripts/fightflow-appointment-trigger.mjs',
      schedule: 'every 15 min',
      pipeline: 'Fight Flow',
      trigger_type: 'openclaw_cron',
      dependencies: ['Supabase']
    },
    {
      name: 'Sequence Manager',
      category: 'fightflow',
      type: 'cron',
      description: 'Processes pending sequence steps; sends timed trial reminder SMS',
      script_path: '/root/clawd/scripts/fightflow-sequence-manager-fixed.mjs',
      schedule: '0,30 13-23 * * *',
      pipeline: 'Fight Flow',
      trigger_type: 'system_cron',
      dependencies: ['Supabase', 'Twilio']
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
    {
      name: 'SMS Response Alert',
      category: 'fightflow',
      type: 'cron',
      description: 'Alerts Scott via Telegram for new inbound SMS messages',
      script_path: '/root/clawd/scripts/sms-response-alert.mjs',
      schedule: 'every 15 min',
      pipeline: 'Fight Flow',
      trigger_type: 'system_cron',
      dependencies: ['Supabase', 'Telegram']
    },
    {
      name: 'Instructor Notify',
      category: 'fightflow',
      type: 'cron',
      description: 'Pre/post-class alerts to instructors about trial students',
      script_path: '/root/clawd/scripts/fightflow-instructor-notify.mjs',
      schedule: '11 AM + 9 PM UTC Mon-Fri',
      pipeline: 'Fight Flow',
      trigger_type: 'openclaw_cron',
      dependencies: ['Supabase', 'Twilio']
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
      name: 'Integrated Workflow PersonaAI',
      category: 'twitter',
      type: 'cron',
      description: 'Full posting session: tweet + comments + engagement for PersonaAI',
      script_path: '/root/clawd/scripts/twitter/integrated-workflow.mjs',
      schedule: '4x daily',
      pipeline: 'Twitter',
      trigger_type: 'openclaw_cron',
      dependencies: ['OpenRouter', 'Twitter API']
    },
    {
      name: 'Integrated Workflow CharX',
      category: 'twitter',
      type: 'cron',
      description: 'Full posting session: tweet + comments + engagement for CharX',
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
    {
      name: 'Scan and Reply',
      category: 'twitter',
      type: 'cron',
      description: 'Replies to comments on account posts (persona, charx, barnum)',
      script_path: '/root/clawd/scripts/twitter/scan-and-reply.mjs',
      schedule: 'hourly',
      pipeline: 'Twitter',
      trigger_type: 'system_cron',
      dependencies: ['Twitter API', 'OpenRouter']
    },
    {
      name: 'Cross Engage',
      category: 'twitter',
      type: 'cron',
      description: 'Cross-account comments and external engagement monitoring',
      script_path: '/root/clawd/scripts/twitter/cross-engage.mjs',
      schedule: 'every 4 hours',
      pipeline: 'Twitter',
      trigger_type: 'system_cron',
      dependencies: ['Twitter API', 'OpenRouter']
    },
    {
      name: 'Cross Account Like',
      category: 'twitter',
      type: 'cron',
      description: 'Likes each Sparkwave account tweets from the other 3 accounts',
      script_path: '/root/clawd/scripts/twitter/cross-account-like.mjs',
      schedule: 'every 15 min',
      pipeline: 'Twitter',
      trigger_type: 'openclaw_cron',
      dependencies: ['Twitter API', 'Supabase']
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
      name: 'Evening Health Check',
      category: 'health',
      type: 'cron',
      description: 'Evening system health check against thresholds',
      script_path: '/root/clawd/scripts/health/check.mjs',
      schedule: '11 PM ET',
      pipeline: 'Health',
      trigger_type: 'openclaw_cron',
      dependencies: ['Supabase', 'goals.json']
    },
    {
      name: 'Twitter Metrics',
      category: 'health',
      type: 'cron',
      description: 'Captures daily Twitter metrics to daily_metrics table',
      script_path: '/root/clawd/scripts/metrics/twitter-daily.mjs',
      schedule: '11:00 PM ET',
      pipeline: 'Health',
      trigger_type: 'openclaw_cron',
      dependencies: ['Twitter API', 'Supabase']
    },
    {
      name: 'Fight Flow Metrics',
      category: 'health',
      type: 'cron',
      description: 'Captures Fight Flow metrics (leads, SMS, bookings)',
      script_path: '/root/clawd/scripts/metrics/fightflow-daily.mjs',
      schedule: '11:02 PM ET',
      pipeline: 'Health',
      trigger_type: 'openclaw_cron',
      dependencies: ['Supabase']
    },
    {
      name: 'Agent Behavior Metrics',
      category: 'health',
      type: 'cron',
      description: 'Captures agent behavior metrics (tasks, spawns, rate limits)',
      script_path: '/root/clawd/scripts/metrics/agent-behavior.mjs',
      schedule: '11:04 PM ET',
      pipeline: 'Health',
      trigger_type: 'openclaw_cron',
      dependencies: ['Supabase']
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
      name: 'Verify Changes',
      category: 'health',
      type: 'cron',
      description: 'Checks change-log.md for pending entries; updates verdicts',
      script_path: '/root/clawd/scripts/metrics/verify-changes.mjs',
      schedule: '11:10 PM ET',
      pipeline: 'Health',
      trigger_type: 'openclaw_cron',
      dependencies: ['Supabase']
    },

    // Mission Control Infrastructure
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
      name: 'Activity Logging',
      category: 'mission_control',
      type: 'script',
      description: 'Logs activities to daily logs and mc_activities',
      script_path: '/root/clawd/scripts/log-activity.mjs',
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
    },
    {
      name: 'Working Sync',
      category: 'mission_control',
      type: 'cron',
      description: 'Syncs in_progress tasks with WORKING.md',
      script_path: '/root/clawd/scripts/mc-working-sync.mjs',
      schedule: 'every 30 min',
      pipeline: null,
      trigger_type: 'openclaw_cron',
      dependencies: ['Supabase']
    },
    {
      name: 'Session Audit',
      category: 'mission_control',
      type: 'cron',
      description: 'Daily session activity audit for quality/compliance',
      script_path: '/root/clawd/scripts/audit/session-audit.mjs',
      schedule: 'midnight UTC',
      pipeline: null,
      trigger_type: 'openclaw_cron',
      dependencies: ['session logs']
    },
    {
      name: 'Token Usage Monitor',
      category: 'mission_control',
      type: 'cron',
      description: 'Monitors Claude token usage; alerts at thresholds',
      script_path: null,
      schedule: '9AM/3PM/9PM ET',
      pipeline: null,
      trigger_type: 'openclaw_cron',
      dependencies: ['OpenClaw session_status', 'Telegram']
    },

    // Key Edge Functions
    {
      name: 'Send SMS',
      category: 'fightflow',
      type: 'edge_function',
      description: 'SMS via Twilio with E.164 normalization and validation',
      script_path: 'supabase/functions/send-sms',
      schedule: null,
      pipeline: 'Fight Flow',
      trigger_type: 'edge_function',
      dependencies: ['Twilio', 'Supabase']
    },
    {
      name: 'Send Email',
      category: 'mission_control',
      type: 'edge_function',
      description: 'Email via Resend with template support and retry logic',
      script_path: 'supabase/functions/send-email',
      schedule: null,
      pipeline: null,
      trigger_type: 'edge_function',
      dependencies: ['Resend', 'Supabase']
    },
    {
      name: 'Mission Control Activities',
      category: 'mission_control',
      type: 'edge_function',
      description: 'CRUD for mc_activities (activity feed)',
      script_path: 'supabase/functions/mission-control-activities',
      schedule: null,
      pipeline: null,
      trigger_type: 'edge_function',
      dependencies: ['Supabase']
    },
    {
      name: 'Mission Control Tasks',
      category: 'mission_control',
      type: 'edge_function',
      description: 'CRUD for mc_tasks table',
      script_path: 'supabase/functions/mission-control-tasks',
      schedule: null,
      pipeline: null,
      trigger_type: 'edge_function',
      dependencies: ['Supabase']
    },
    {
      name: 'System Ops Status',
      category: 'mission_control',
      type: 'edge_function',
      description: 'Collects status for all registered items; writes to system_status_log',
      script_path: 'supabase/functions/system-ops-status',
      schedule: '2x daily',
      pipeline: null,
      trigger_type: 'edge_function',
      dependencies: ['Supabase']
    }
  ]

  // Try to insert data - if tables don't exist, this will fail with helpful error
  const { data, error } = await supabase
    .from('system_registry')
    .insert(seedItems)

  if (error) {
    console.error('Error inserting data. Tables may not exist yet:', error)
    
    // Check if it's a "relation does not exist" error
    if (error.message?.includes('does not exist')) {
      console.log('\nTables need to be created first. Please create the tables using the Supabase dashboard or direct SQL.')
      console.log('SQL to create tables is in: create-system-ops-tables.sql')
      return false
    }
    
    throw error
  }

  console.log(`✅ Successfully seeded ${seedItems.length} registry items`)
  return true
}

async function main() {
  try {
    console.log('Setting up System Operations Dashboard...')
    
    const success = await seedData()
    
    if (success) {
      console.log('\n✅ System Operations Dashboard setup complete!')
      console.log('Seeded registry data successfully')
      console.log('Edge function deployed: system-ops-status')
      console.log('\nNext steps:')
      console.log('1. Visit /system-operations in the app')
      console.log('2. Click "Refresh Status" to populate initial status data')
      console.log('3. Set up OpenClaw cron to call system-ops-status 2x daily')
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

main()