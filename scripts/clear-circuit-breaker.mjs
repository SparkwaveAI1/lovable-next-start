#!/usr/bin/env node
/**
 * clear-circuit-breaker.mjs <cron_id>
 * Manual clearance tool for cron circuit breakers.
 * Clears all active trips and error records for the specified cron.
 * Logs the action to Supabase.
 *
 * Usage:
 *   node scripts/clear-circuit-breaker.mjs <cron_id>
 *
 * Examples:
 *   node scripts/clear-circuit-breaker.mjs karpathy-loop-nightly
 *   node scripts/clear-circuit-breaker.mjs paperclip-queue-poll
 *
 * Part of: SPA-664 — Jarvis Stack #13 — P0: Implement cron circuit breaker (Supabase-backed)
 */

import { clearBreaker } from './circuit-breaker-check.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const cronId = process.argv[2];

if (!cronId) {
  console.error('Usage: node scripts/clear-circuit-breaker.mjs <cron_id>');
  console.error('');
  console.error('Known cron IDs:');
  console.error('  karpathy-loop-nightly');
  console.error('  paperclip-queue-poll');
  console.error('  work-reminder');
  console.error('  rico-twitter-morning');
  console.error('  rico-twitter-afternoon');
  process.exit(1);
}

try {
  console.log(`Clearing circuit breaker for cron: "${cronId}"...`);
  const result = await clearBreaker(cronId);

  // Log the manual clearance action to Supabase for audit trail
  try {
    const cfg = JSON.parse(readFileSync('/root/.config/sparkwave/supabase.json', 'utf8'));
    const supabase = createClient(cfg.url, cfg.service_role_key);

    await supabase.from('cron_circuit_breakers').insert({
      cron_id: cronId,
      error_hash: 'MANUAL_CLEAR',
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      count: 0,
      cleared_at: new Date().toISOString(),
      tripped_by: null,
      updated_at: new Date().toISOString(),
    });
  } catch (logErr) {
    // Non-fatal — clearance already done
    console.warn(`Warning: Could not log clearance action: ${logErr.message}`);
  }

  console.log(`✅ Circuit breaker cleared for "${cronId}"`);
  console.log(`   Records cleared: ${result.cleared}`);
  console.log(`   The cron will now run normally on its next trigger.`);
} catch (e) {
  console.error(`❌ Failed to clear circuit breaker: ${e.message}`);
  process.exit(1);
}
