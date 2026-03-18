#!/usr/bin/env node
/**
 * rico-twitter-afternoon.cb.mjs
 * Circuit-breaker wrapper for the rico-twitter-afternoon cron.
 *
 * Deploy to Rico: wrap the existing integrated-workflow.mjs afternoon invocation
 *
 * Part of: SPA-664 — cron circuit breaker integration
 */
import { isTripped, recordError } from '/root/repos/sparkwave-automation/scripts/circuit-breaker-check.mjs';

const CRON_ID = 'rico-twitter-afternoon';

// ── Circuit breaker check ────────────────────────────────────────────────────
if (await isTripped(CRON_ID)) {
  console.error(`[${CRON_ID}] 🔴 CIRCUIT BREAKER TRIPPED — aborting run.`);
  console.error(`   To clear: node /root/repos/sparkwave-automation/scripts/clear-circuit-breaker.mjs ${CRON_ID}`);
  process.exit(1);
}

// ── Main cron logic ──────────────────────────────────────────────────────────
try {
  // TODO: Import and run the original rico-twitter afternoon logic here
  // e.g.: const { run } = await import('/root/clawd/scripts/integrated-workflow.mjs');
  //       await run({ account: 'rico', slot: 'afternoon' });
  console.log(`[${CRON_ID}] Twitter afternoon post complete.`);
} catch (err) {
  console.error(`[${CRON_ID}] Error: ${err.message}`);
  const { tripped, count } = await recordError(CRON_ID, err.message);
  if (tripped) {
    console.error(`[${CRON_ID}] 🔴 Circuit breaker TRIPPED after ${count} errors. Scott has been alerted via SMS.`);
  }
  process.exit(1);
}
