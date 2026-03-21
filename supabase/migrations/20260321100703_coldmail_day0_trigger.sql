-- Generated trigger migration for SPA-899
-- Generated at: 2026-03-21T10:07:03.816Z
-- Source: supabase/functions/lib/template-sets.json
-- Intro templates: iris-b2b-intro, iris-seo-outreach, fight-flow-seo-intro

CREATE OR REPLACE FUNCTION enforce_coldmail_day0()
RETURNS TRIGGER AS $$ BEGIN
  IF NEW.type = 'cold_email' 
    AND NEW.template_used IN ('iris-b2b-intro', 'iris-seo-outreach', 'fight-flow-seo-intro')
    AND NEW.sequence_day IS NULL
  THEN
    NEW.sequence_day := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS coldmail_day0_trigger ON outreach_log;
CREATE TRIGGER coldmail_day0_trigger
BEFORE INSERT ON outreach_log
FOR EACH ROW
EXECUTE FUNCTION enforce_coldmail_day0();
