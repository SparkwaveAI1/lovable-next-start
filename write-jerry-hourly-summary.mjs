#!/usr/bin/env node
/**
 * write-jerry-hourly-summary.mjs — Generate Jerry's hourly summary and post to mc_reports
 * Run hourly via cron: 0 * * * * (every hour on the hour)
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

// Current hour in ET
const now = new Date();
const etFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric', month: 'short', day: 'numeric',
  hour: '2-digit', minute: '2-digit',
  hour12: true,
});
const etDate = etFormatter.format(now);

console.log(`⚙️  Jerry hourly summary — ${etDate}`);

// Check duplicate: skip if summary for this hour already exists
try {
  const hourTitle = `Hourly Summary — ${etDate}`;
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/mc_reports?title=eq.${encodeURIComponent(hourTitle)}&type=eq.hourly_summary&limit=1`,
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
  );
  const existing = await checkRes.json();
  if (Array.isArray(existing) && existing.length > 0) {
    console.log(`⏭️  Summary for ${etDate} already exists — skipping duplicate insert.`);
    process.exit(0);
  }
} catch (err) {
  console.error(`⚠️  Duplicate check failed: ${err.message} — proceeding with insert`);
}

// Fetch last hour's activities from Supabase (MC activities table)
const oneHourAgo = new Date(now.getTime() - 3600000).toISOString();
let activities = [];
try {
  const activitiesRes = await fetch(
    `${SUPABASE_URL}/rest/v1/mc_activities?agent_id=eq.${JERRY_AGENT_ID}&created_at=gte.${oneHourAgo}&order=created_at.asc`,
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

// Fetch agent_logs for Jerry (last hour)
let agentLogs = [];
try {
  const logsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/agent_logs?agent=eq.jerry&created_at=gte.${oneHourAgo}&order=created_at.asc&limit=30`,
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
  : '  • No activities logged this hour.';

const logLines = agentLogs.length > 0
  ? agentLogs.slice(0, 15).map(l => `  • [${l.event_type || l.log_type || 'log'}] ${l.details || l.content || l.label || ''}`).join('\n')
  : '  • No agent logs this hour.';

const content = `⚙️ **Jerry Hourly Summary** — ${etDate}

## Activities This Hour
${activityLines}

## Agent Logs (Last Hour)
${logLines}

## Status
Jerry is running autonomous profit center automations and task execution workflows.
`.trim();

// Post to mc_reports
const reportPayload = {
  type: 'hourly_summary',
  title: `Hourly Summary — ${etDate}`,
  content,
  business_id: BUSINESS_ID,
  metadata: {
    agent: 'Jerry',
    agent_id: JERRY_AGENT_ID,
    activities_count: activities.length,
    generated_by: 'write-jerry-hourly-summary.mjs',
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
    console.log(`✅ Jerry hourly summary posted for ${etDate}`);
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
