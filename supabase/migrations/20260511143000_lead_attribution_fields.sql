-- SPA-4948: preserve public lead source/page/UTM context on Sparkwave capture tables.
-- Additive only; existing public INSERT RLS policies remain unchanged.

alter table public.sparkwave_contact_submissions
  add column if not exists source_url text,
  add column if not exists referrer text,
  add column if not exists user_agent text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists utm_content text;

alter table public.sparkwave_booking_requests
  add column if not exists source_url text,
  add column if not exists referrer text,
  add column if not exists user_agent text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists utm_content text;
