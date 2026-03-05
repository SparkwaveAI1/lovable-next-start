import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const config = JSON.parse(readFileSync('/root/.config/sparkwave/supabase.json', 'utf8'))
const supabase = createClient(config.url, config.service_role_key)

const { error } = await supabase.from('agent_logs').insert({
  agent: 'jerry',
  event_type: 'heartbeat',
  label: 'hourly-check',
  status: 'ok',
  details: { timestamp: new Date().toISOString() }
})

if (error) { console.error('Failed to log:', error.message); process.exit(1) }
console.log('Logged jerry heartbeat')
