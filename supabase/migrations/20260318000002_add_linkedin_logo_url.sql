-- LinkedIn Phase 2C: Add logo_url column to linkedin_accounts
-- Populated during OAuth callback for company accounts via LinkedIn Organization API
-- Migration: 20260318000002_add_linkedin_logo_url.sql

ALTER TABLE linkedin_accounts ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN linkedin_accounts.logo_url IS
  'Company page logo URL fetched from LinkedIn Organization API during OAuth callback. NULL for personal accounts.';
