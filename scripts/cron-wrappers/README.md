# Cron Wrapper Pattern for Circuit Breaker Integration

These wrapper scripts add circuit breaker protection to the 5 high-risk Rico crons.
Deploy these to Rico's server at `/root/clawd/scripts/` to replace or wrap the originals.

## Pattern
```javascript
import { isTripped, recordError } from '/root/repos/sparkwave-automation/scripts/circuit-breaker-check.mjs';

const CRON_ID = 'my-cron-name';

// Check at start — abort if tripped
if (await isTripped(CRON_ID)) {
  console.error(`[${CRON_ID}] CIRCUIT BREAKER TRIPPED — aborting. Run: node scripts/clear-circuit-breaker.mjs ${CRON_ID}`);
  process.exit(1);
}

try {
  // ... cron work here ...
} catch (err) {
  await recordError(CRON_ID, err.message);
  process.exit(1);
}
```

## Deployment
1. Copy circuit-breaker-check.mjs to Rico's /root/repos/sparkwave-automation/scripts/
2. Wrap each of the 5 high-risk cron scripts with the pattern above
3. The circuit breaker reads from ~/.config/sparkwave/supabase.json (already on Rico's server)
