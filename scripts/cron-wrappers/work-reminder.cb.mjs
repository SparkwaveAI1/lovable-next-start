#!/usr/bin/env node
/**
 * work-reminder.cb.mjs
 * Circuit-breaker wrapper for the work-reminder cron.
 *
 * Part of: SPA-664 — cron circuit breaker integration
 */
import { isTripped, recordError } from '/root/repos/sparkwave-automation/scripts/circuit-breaker-check.mjs';

const CRON_ID = 'work-reminder';

// ── Circuit breaker check ────────────────────────────────────────────────────
if (await isTripped(CRON_ID)) {
  console.error(`[${CRON_ID}] 🔴 CIRCUIT BREAKER TRIPPED — aborting run.`);
  console.error(`   To clear: node /root/repos/sparkwave-automation/scripts/clear-circuit-breaker.mjs ${CRON_ID}`);
  process.exit(1);
}

// ── Main cron logic ──────────────────────────────────────────────────────────
try {
  // TODO: The work-reminder is typically an OpenClaw systemEvent cron, not a script.
  // If converted to a script, the circuit breaker is already integrated here.
  console.log(`[${CRON_ID}] Work reminder complete.`);
} catch (err) {
  console.error(`[${CRON_ID}] Error: ${err.message}`);
  const { tripped, count } = await recordError(CRON_ID, err.message);
  if (tripped) {
    console.error(`[${CRON_ID}] 🔴 Circuit breaker TRIPPED after ${count} errors. Scott has been alerted via SMS.`);
  }
  process.exit(1);
}
