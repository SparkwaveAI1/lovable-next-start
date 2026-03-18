#!/usr/bin/env node
// stale-account-check.mjs
// Daily cron: find CRM accounts with no interactions in 14+ days, create mc_tasks for Iris
// SPA-796

import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Config — tilde-safe path resolution (Node does not expand ~)
const configPath = join(homedir(), '.config', 'sparkwave', 'supabase.json');
let SUPABASE_URL, SUPABASE_KEY;
try {
  const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
  SUPABASE_URL = cfg.url;
  SUPABASE_KEY = cfg.service_role_key;
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing url or service_role_key');
} catch (err) {
  console.error('FATAL: Cannot read Supabase config from', configPath, '-', err.message);
  process.exit(1);
}

const IRIS_AGENT_ID = '15562d82-85f5-4d52-bc72-b038ba21da35';
const STALE_DAYS = 14;

// ISO week year — fully UTC, no mutation side effects on input date
function getISOWeekYear(inputDate) {
  // Clone to UTC midnight to avoid timezone drift near year boundaries
  const d = new Date(Date.UTC(
    inputDate.getUTCFullYear(),
    inputDate.getUTCMonth(),
    inputDate.getUTCDate()
  ));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNum };
}

function makeHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: makeHeaders() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function supabasePost(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: { ...makeHeaders(), 'Prefer': 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const resBody = await res.text();
    throw new Error(`POST ${path} failed: ${res.status} ${resBody}`);
  }
}

async function main() {
  console.log('Stale account check started at', new Date().toISOString());

  // 1. Fetch all CRM accounts
  let accounts;
  try {
    accounts = await supabaseGet('crm_accounts?select=id,name,created_at');
  } catch (err) {
    console.error('FATAL: Cannot fetch crm_accounts:', err.message);
    process.exit(1);
  }
  console.log(`Found ${accounts.length} accounts`);

  if (accounts.length === 0) {
    console.log('No accounts to check. Done.');
    return;
  }

  // 2. Fetch ALL interactions at once to avoid N+1 HTTP calls
  // PostgREST doesn't support GROUP BY directly — fetch all, group in JS
  let allInteractions;
  try {
    allInteractions = await supabaseGet('crm_interactions?select=account_id,created_at&order=created_at.desc');
  } catch (err) {
    console.error('FATAL: Cannot fetch crm_interactions:', err.message);
    process.exit(1);
  }
  console.log(`Found ${allInteractions.length} total interactions`);

  // Build map: account_id -> most recent interaction ISO string (already ordered desc)
  const latestByAccount = {};
  for (const interaction of allInteractions) {
    if (!latestByAccount[interaction.account_id]) {
      latestByAccount[interaction.account_id] = interaction.created_at;
    }
  }

  const now = new Date();
  // Compute current ISO week (used for dedup key) — always from current date
  const { year: currentYear, week: currentWeek } = getISOWeekYear(new Date());

  let created = 0;
  let skipped = 0;
  let alreadyExists = 0;
  let errors = 0;

  for (const account of accounts) {
    let daysSince;
    const lastInteraction = latestByAccount[account.id];
    if (lastInteraction) {
      daysSince = (now - new Date(lastInteraction)) / 86400000;
    } else {
      // No interactions at all — use account creation date as baseline
      daysSince = (now - new Date(account.created_at)) / 86400000;
    }

    if (daysSince < STALE_DAYS) {
      skipped++;
      continue;
    }

    const externalId = `stale-${account.id}-${currentYear}-W${String(currentWeek).padStart(2, '0')}`;

    // Check for existing task this week (array-based Supabase response)
    let existing;
    try {
      existing = await supabaseGet(`mc_tasks?external_id=eq.${externalId}&select=id&limit=1`);
    } catch (err) {
      console.error(`  Skip "${account.name}": cannot check existing tasks:`, err.message);
      errors++;
      continue;
    }

    if (existing.length > 0) {
      alreadyExists++;
      continue;
    }

    // Create mc_task for Iris
    try {
      await supabasePost('mc_tasks', {
        title: `Follow up: ${account.name} — no activity in ${Math.floor(daysSince)} days`,
        priority: 'medium',
        status: 'todo',
        assignee_ids: [IRIS_AGENT_ID],
        external_id: externalId,
        external_source: 'rico',
        tags: ['stale-account', 'crm'],
      });
      created++;
      console.log(`  ✓ Created task: "${account.name}" (${Math.floor(daysSince)} days since last activity)`);
    } catch (err) {
      console.error(`  ✗ Failed to create task for "${account.name}":`, err.message);
      errors++;
    }
  }

  console.log(
    `\nStale account check complete: ${accounts.length} accounts scanned, ` +
    `${created} tasks created, ${alreadyExists} already exist this week, ` +
    `${skipped} active (not stale), ${errors} errors`
  );

  if (errors > 0) {
    process.exit(1); // Signal failure to OpenClaw cron
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
