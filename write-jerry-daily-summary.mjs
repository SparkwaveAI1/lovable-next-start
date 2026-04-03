#!/usr/bin/env node
/**
 * write-jerry-daily-summary.mjs — Generate Jerry's daily summary and post to mc_reports
 * Run at 4 AM UTC (11 PM ET) via cron: 0 4 * * *
 */

import { readFileSync, existsSync, mkdirSync } from 'fs';

const LOGS_DIR = '/root/clawd/logs';
mkdirSync(LOGS_DIR, { recursive: true });

let config;
try {
  config = JSON.parse(readFileSync('/root/.config/sparkwave/supabase.json', 'utf8'));
} catch (err) {
  console.error(`❌ Failed to read Supabase config: ${err.message}`);
  process.exit(1);
}

const SUPABASE_URL = config.url;
const SERVICE_KEY = config.service_role_key;
const JERRY_AGENT_ID = '5c5ddfb9-c23e-49d8-b53a-a19269bcfc0b';
const BUSINESS_ID = '5a9bbfcf-fae5-4063-9780-bcbe366bae88';
const WORKSPACE = '/root/clawd';

// Get today's date in ET
const now = new Date();
const etDateParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now);
const today = etDateParts; // YYYY-MM-DD in ET

const etFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric', month: 'long', day: 'numeric',
  hour: '2-digit', minute: '2-digit',
  hour12: true,
});
const etDate = etFormatter.format(now);

console.log(`⚙️  Jerry daily summary for ${today} (ET: ${etDate})`);

// Check duplicate: skip if summary for this date already exists
try {
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/mc_reports?title=eq.Jerry Daily Summary — ${today}&limit=1`,
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
  );
  const existing = await checkRes.json();
  if (Array.isArray(existing) && existing.length > 0) {
    console.log(`⏭️  Summary for ${today} already exists — skipping duplicate insert.`);
    process.exit(0);
  }
} catch (err) {
  console.error(`⚠️  Duplicate check failed: ${err.message} — proceeding with insert`);
}

// Read Jerry's WORKING.md if exists (graceful fallback)
let working = 'Jerry working state not available.';
try {
  const workingPath = `${WORKSPACE}/memory/WORKING.md`;
  if (existsSync(workingPath)) {
    working = readFileSync(workingPath, 'utf8');
  } else {
    console.warn(`⚠️  WORKING.md not found at ${workingPath}`);
  }
} catch (err) {
  console.warn(`⚠️  Could not read WORKING.md: ${err.message}`);
}

// Fetch today's activities from Supabase
const etMidnightUTC = `${today}T05:00:00Z`; // midnight ET ≈ 5am UTC
let activities = [];
try {
  const activitiesRes = await fetch(
    `${SUPABASE_URL}/rest/v1/mc_activities?agent_id=eq.${JERRY_AGENT_ID}&created_at=gte.${etMidnightUTC}&order=created_at.asc`,
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
  );
  if (activitiesRes.ok) {
    activities = await activitiesRes.json();
    if (!Array.isArray(activities)) activities = [];
  } else {
    console.error(`⚠️  mc_activities fetch failed: ${activitiesRes.status}`);
  }
} catch (err) {
  console.error(`⚠️  mc_activities fetch error: ${err.message}`);
}

// Fetch agent_logs for Jerry (last 24h)
let agentLogs = [];
try {
  const logsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/agent_logs?agent=eq.jerry&created_at=gte.${etMidnightUTC}&order=created_at.asc&limit=50`,
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
  );
  if (logsRes.ok) {
    agentLogs = await logsRes.json();
    if (!Array.isArray(agentLogs)) agentLogs = [];
  } else {
    console.error(`⚠️  agent_logs fetch failed: ${logsRes.status}`);
  }
} catch (err) {
  console.error(`⚠️  agent_logs fetch error: ${err.message}`);
}

// Build summary content
const activityLines = activities.length > 0
  ? activities.map(a => `  • [${a.type}] ${a.message}`).join('\n')
  : '  • No activities logged today.';

const logLines = agentLogs.length > 0
  ? agentLogs.slice(0, 25).map(l => `  • [${l.event_type || l.log_type || 'log'}] ${l.details || l.content || l.label || ''}`).join('\n')
  : '  • No agent logs today.';

const content = `⚙️ **Jerry Daily Summary** — ${etDate}

## Activities Today
${activityLines}

## Agent Logs (Last 24h)
${logLines}

## Profit Center Status
${working.split('\n').slice(0, 30).join('\n')}

## Notes
Jerry is responsible for autonomous profit center execution and task automation workflows across the organization.
`.trim();

// Post to mc_reports
const reportPayload = {
  type: 'daily_summary',
  title: `Jerry Daily Summary — ${today}`,
  content,
  business_id: BUSINESS_ID,
  metadata: {
    agent: 'Jerry',
    agent_id: JERRY_AGENT_ID,
    activities_count: activities.length,
    generated_by: 'write-jerry-daily-summary.mjs',
    date: today,
  },
};

try {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/mc_reports`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(reportPayload),
  });

  if (res.ok) {
    console.log(`✅ Jerry daily summary posted for ${today}`);
    console.log(`   Activities logged: ${activities.length}`);
    console.log(`   Agent logs: ${agentLogs.length}`);
  } else {
    const err = await res.text();
    console.error(`❌ Failed to post summary: ${res.status} ${err}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`❌ Supabase insert error: ${err.message}`);
  process.exit(1);
}
