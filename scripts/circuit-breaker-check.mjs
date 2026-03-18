#!/usr/bin/env node
/**
 * circuit-breaker-check.mjs
 * Supabase-backed cron circuit breaker library.
 *
 * Trip rule: same error hash ≥3 times within 10 minutes from same cron_id → set tripped_at
 * Auto-clear: if last_seen > 30 min ago and no new errors → clear automatically
 *
 * Usage (as library):
 *   import { recordError, isTripped, clearBreaker } from './circuit-breaker-check.mjs';
 *
 * Usage (as CLI for testing):
 *   node scripts/circuit-breaker-check.mjs record <cron_id> <error_message>
 *   node scripts/circuit-breaker-check.mjs check <cron_id>
 *   node scripts/circuit-breaker-check.mjs clear <cron_id>
 *
 * Part of: SPA-664 — Jarvis Stack #13 — P0: Implement cron circuit breaker (Supabase-backed)
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

// ── Config ────────────────────────────────────────────────────────────────────

function loadConfig() {
  try {
    const cfg = JSON.parse(readFileSync('/root/.config/sparkwave/supabase.json', 'utf8'));
    return { url: cfg.url, key: cfg.service_role_key };
  } catch (e) {
    throw new Error(`Failed to load Supabase config: ${e.message}`);
  }
}

const TRIP_THRESHOLD = 3;          // errors before trip
const TRIP_WINDOW_MINUTES = 10;    // window for counting
const AUTO_CLEAR_MINUTES = 30;     // auto-clear if idle this long
const ALERT_PHONE = '+19195324050'; // Scott's phone

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Normalize and hash an error message for deduplication.
 * Strips stack traces, memory addresses, timestamps for stable hashing.
 */
function hashError(errorMessage) {
  const normalized = String(errorMessage)
    .replace(/0x[0-9a-f]+/gi, '0xADDR')      // memory addresses
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.Z+-]+/g, 'TIMESTAMP')  // ISO timestamps
    .replace(/:\d+:\d+\)/g, ':LINE:COL)')      // line numbers
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500);  // cap length
  return createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}

/**
 * Send SMS alert via Supabase send-sms edge function.
 * Falls back to console.error if edge function fails.
 */
async function sendSmsAlert(url, key, message) {
  try {
    const res = await fetch(`${url}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: ALERT_PHONE,
        message,
        skipContactCheck: true,  // direct alert — skip CRM contact lookup
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`[circuit-breaker] SMS alert failed (${res.status}): ${txt}`);
    } else {
      console.log(`[circuit-breaker] SMS alert sent to ${ALERT_PHONE}`);
    }
  } catch (e) {
    console.error(`[circuit-breaker] SMS alert exception: ${e.message}`);
  }
}

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * recordError(cronId, errorMessage)
 * Records an error for the given cron. Increments count, checks trip threshold.
 * Returns { tripped: boolean, count: number, errorHash: string }
 */
export async function recordError(cronId, errorMessage) {
  const { url, key } = loadConfig();
  const supabase = createClient(url, key);
  const errorHash = hashError(errorMessage);
  const now = new Date().toISOString();
  const windowCutoff = new Date(Date.now() - TRIP_WINDOW_MINUTES * 60 * 1000).toISOString();

  // Upsert the error record (insert or increment)
  const { data: existing, error: fetchErr } = await supabase
    .from('cron_circuit_breakers')
    .select('*')
    .eq('cron_id', cronId)
    .eq('error_hash', errorHash)
    .single();

  if (fetchErr && fetchErr.code !== 'PGRST116') {
    // PGRST116 = row not found, which is fine
    throw new Error(`[circuit-breaker] DB fetch error: ${fetchErr.message}`);
  }

  let record;
  if (!existing) {
    // Insert new record
    const { data, error: insertErr } = await supabase
      .from('cron_circuit_breakers')
      .insert({
        cron_id: cronId,
        error_hash: errorHash,
        first_seen: now,
        last_seen: now,
        count: 1,
        updated_at: now,
      })
      .select()
      .single();
    if (insertErr) throw new Error(`[circuit-breaker] DB insert error: ${insertErr.message}`);
    record = data;
  } else {
    // Update existing
    const newCount = existing.count + 1;
    const { data, error: updateErr } = await supabase
      .from('cron_circuit_breakers')
      .update({
        last_seen: now,
        count: newCount,
        cleared_at: null,  // re-open if was cleared
        updated_at: now,
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (updateErr) throw new Error(`[circuit-breaker] DB update error: ${updateErr.message}`);
    record = data;
  }

  // Check if should trip: ≥ threshold errors within window, not already tripped
  let tripped = false;
  if (!record.tripped_at && record.cleared_at === null) {
    // Count errors within the window
    const { count: windowCount, error: countErr } = await supabase
      .from('cron_circuit_breakers')
      .select('*', { count: 'exact', head: true })
      .eq('cron_id', cronId)
      .is('cleared_at', null)
      .gte('last_seen', windowCutoff);

    if (countErr) {
      console.error(`[circuit-breaker] Count error: ${countErr.message}`);
    } else if (windowCount >= TRIP_THRESHOLD || record.count >= TRIP_THRESHOLD) {
      // Trip the breaker
      await supabase
        .from('cron_circuit_breakers')
        .update({
          tripped_at: now,
          tripped_by: 'same-hash',
          updated_at: now,
        })
        .eq('cron_id', cronId)
        .is('cleared_at', null);

      tripped = true;
      const alertMsg = `🚨 CIRCUIT BREAKER TRIPPED: cron "${cronId}" failed ${record.count}x with same error (hash: ${errorHash}). Cron is now BLOCKED. Run: node scripts/clear-circuit-breaker.mjs ${cronId}`;
      console.error(`[circuit-breaker] TRIPPED for ${cronId}: ${alertMsg}`);
      await sendSmsAlert(url, key, alertMsg);
    }
  } else if (record.tripped_at && !record.cleared_at) {
    tripped = true;
  }

  return { tripped, count: record.count, errorHash };
}

/**
 * isTripped(cronId)
 * Returns true if there is any active (uncleared) trip for this cron.
 * Also auto-clears if last_seen > AUTO_CLEAR_MINUTES ago.
 */
export async function isTripped(cronId) {
  const { url, key } = loadConfig();
  const supabase = createClient(url, key);
  const autoClearCutoff = new Date(Date.now() - AUTO_CLEAR_MINUTES * 60 * 1000).toISOString();

  // Auto-clear stale trips
  await supabase
    .from('cron_circuit_breakers')
    .update({
      cleared_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('cron_id', cronId)
    .not('tripped_at', 'is', null)
    .is('cleared_at', null)
    .lt('last_seen', autoClearCutoff);

  // Check for active trips
  const { data, error } = await supabase
    .from('cron_circuit_breakers')
    .select('id, tripped_at, error_hash, count')
    .eq('cron_id', cronId)
    .not('tripped_at', 'is', null)
    .is('cleared_at', null)
    .limit(1);

  if (error) {
    console.error(`[circuit-breaker] isTripped DB error: ${error.message}`);
    return false; // fail open — don't block crons on DB errors
  }

  return data && data.length > 0;
}

/**
 * clearBreaker(cronId)
 * Manually clears all active trips and error records for a cron.
 * Logs the clearance action.
 */
export async function clearBreaker(cronId) {
  const { url, key } = loadConfig();
  const supabase = createClient(url, key);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('cron_circuit_breakers')
    .update({
      cleared_at: now,
      updated_at: now,
    })
    .eq('cron_id', cronId)
    .is('cleared_at', null)
    .select();

  if (error) {
    throw new Error(`[circuit-breaker] clearBreaker DB error: ${error.message}`);
  }

  const count = data ? data.length : 0;
  console.log(`[circuit-breaker] Cleared ${count} record(s) for cron "${cronId}"`);
  return { cleared: count };
}

// ── CLI entry point ───────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const [,, cmd, cronId, ...rest] = process.argv;

  if (!cmd || !cronId) {
    console.log('Usage:');
    console.log('  node scripts/circuit-breaker-check.mjs record <cron_id> <error_message>');
    console.log('  node scripts/circuit-breaker-check.mjs check  <cron_id>');
    console.log('  node scripts/circuit-breaker-check.mjs clear  <cron_id>');
    process.exit(1);
  }

  try {
    if (cmd === 'record') {
      const errorMsg = rest.join(' ') || 'test error';
      const result = await recordError(cronId, errorMsg);
      console.log(JSON.stringify(result, null, 2));
    } else if (cmd === 'check') {
      const tripped = await isTripped(cronId);
      console.log(JSON.stringify({ cronId, tripped }, null, 2));
      process.exit(tripped ? 1 : 0);
    } else if (cmd === 'clear') {
      const result = await clearBreaker(cronId);
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
