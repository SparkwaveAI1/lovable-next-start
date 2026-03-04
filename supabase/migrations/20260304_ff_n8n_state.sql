CREATE TABLE IF NOT EXISTS ff_n8n_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO ff_n8n_state (key, value) VALUES
  ('form_capture_last_poll', (now() - interval '5 minutes')::text),
  ('immediate_response_last_run', (now() - interval '5 minutes')::text),
  ('bookings_sync_last_poll', (now() - interval '15 minutes')::text)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE ff_n8n_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON ff_n8n_state
  USING (auth.role() = 'service_role');
