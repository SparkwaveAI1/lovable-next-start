#!/usr/bin/env node
/**
 * paperclip-queue-poll.cb.mjs
 * Circuit-breaker wrapper for the paperclip-queue-poll cron.
 *
 * Deploy to Rico: wrap the existing paperclip-poll.mjs or paperclip-poll-http.mjs
 *
 * Part of: SPA-664 — cron circuit breaker integration
 */
import { isTripped, recordError } from '/root/repos/sparkwave-automation/scripts/circuit-breaker-check.mjs';

const CRON_ID = 'paperclip-queue-poll';

// ── Circuit breaker check ────────────────────────────────────────────────────
if (await isTripped(CRON_ID)) {
  console.error(`[${CRON_ID}] 🔴 CIRCUIT BREAKER TRIPPED — aborting run.`);
  console.error(`   To clear: node /root/repos/sparkwave-automation/scripts/clear-circuit-breaker.mjs ${CRON_ID}`);
  process.exit(1);
}

// ── Main cron logic ──────────────────────────────────────────────────────────
try {
  // TODO: Import and run the original paperclip-queue-poll logic here
  // e.g.: const { run } = await import('/root/clawd/scripts/paperclip-poll-http.mjs');
  //       await run();
  console.log(`[${CRON_ID}] Queue poll complete.`);
} catch (err) {
  console.error(`[${CRON_ID}] Error: ${err.message}`);
  const { tripped, count } = await recordError(CRON_ID, err.message);
  if (tripped) {
    console.error(`[${CRON_ID}] 🔴 Circuit breaker TRIPPED after ${count} errors. Scott has been alerted via SMS.`);
  }
  process.exit(1);
}
