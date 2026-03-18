-- Migration: cron_circuit_breakers
-- Purpose: Track repeated cron errors and trip circuit breakers to prevent runaway loops
-- Part of: SPA-664 — Jarvis Stack #13 — P0: Implement cron circuit breaker (Supabase-backed)

CREATE TABLE IF NOT EXISTS cron_circuit_breakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_id text NOT NULL,
  error_hash text NOT NULL,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 1,
  tripped_at timestamptz,
  cleared_at timestamptz,
  tripped_by text, -- 'same-hash' | 'spend-velocity' | 'timeout'
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cron_circuit_breakers_cron_error_idx 
  ON cron_circuit_breakers(cron_id, error_hash);

CREATE INDEX IF NOT EXISTS cron_circuit_breakers_cron_id_idx 
  ON cron_circuit_breakers(cron_id);

CREATE INDEX IF NOT EXISTS cron_circuit_breakers_tripped_idx 
  ON cron_circuit_breakers(cron_id, tripped_at) 
  WHERE tripped_at IS NOT NULL AND cleared_at IS NULL;

COMMENT ON TABLE cron_circuit_breakers IS 
  'Tracks repeated cron errors to automatically trip circuit breakers and prevent runaway loops';

COMMENT ON COLUMN cron_circuit_breakers.cron_id IS 'Identifier for the cron job (e.g. karpathy-loop-nightly)';
COMMENT ON COLUMN cron_circuit_breakers.error_hash IS 'MD5-like short hash of normalized error message for deduplication';
COMMENT ON COLUMN cron_circuit_breakers.tripped_by IS 'Trip trigger: same-hash | spend-velocity | timeout';
