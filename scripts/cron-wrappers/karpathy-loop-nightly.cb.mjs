#!/usr/bin/env node
/**
 * karpathy-loop-nightly.cb.mjs
 * Circuit-breaker wrapper for the karpathy-loop-nightly cron.
 *
 * Deploy to Rico: /root/clawd/scripts/karpathy-loop-nightly.mjs
 * Replace the original script content with this wrapper, or import it.
 *
 * Part of: SPA-664 — cron circuit breaker integration
 */
import { isTripped, recordError } from '/root/repos/sparkwave-automation/scripts/circuit-breaker-check.mjs';

const CRON_ID = 'karpathy-loop-nightly';

// ── Circuit breaker check ────────────────────────────────────────────────────
if (await isTripped(CRON_ID)) {
  console.error(`[${CRON_ID}] 🔴 CIRCUIT BREAKER TRIPPED — aborting run.`);
  console.error(`   To clear: node /root/repos/sparkwave-automation/scripts/clear-circuit-breaker.mjs ${CRON_ID}`);
  process.exit(1);
}

// ── Main cron logic ──────────────────────────────────────────────────────────
try {
  // TODO: Import and run the original karpathy-loop-nightly logic here
  // e.g.: const { run } = await import('/root/clawd/scripts/karpathy-loop-nightly-impl.mjs');
  //       await run();
  console.log(`[${CRON_ID}] Nightly loop complete.`);
} catch (err) {
  console.error(`[${CRON_ID}] Error: ${err.message}`);
  const { tripped, count } = await recordError(CRON_ID, err.message);
  if (tripped) {
    console.error(`[${CRON_ID}] 🔴 Circuit breaker TRIPPED after ${count} errors. Scott has been alerted via SMS.`);
  }
  process.exit(1);
}
