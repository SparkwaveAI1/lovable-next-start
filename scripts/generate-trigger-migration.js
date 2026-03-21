#!/usr/bin/env node
/**
 * Generate coldmail Day 0 trigger migration from template-sets.json
 * Run before deployment: node scripts/generate-trigger-migration.js
 * 
 * This ensures the trigger always stays in sync with TEMPLATE_SETS
 */

const fs = require('fs');
const path = require('path');

// Load template sets
const templateSetsPath = path.join(__dirname, '../supabase/functions/lib/template-sets.json');
const templateSets = JSON.parse(fs.readFileSync(templateSetsPath, 'utf8'));

// Extract intro templates
const introTemplates = Object.values(templateSets)
  .map(ts => ts.intro)
  .map(t => `'${t}'`)
  .join(', ');

// Generate timestamp-based filename to avoid conflicts
const now = new Date();
const timestamp = now.toISOString()
  .replace(/[^\d]/g, '')
  .slice(0, 14);

const filename = `${timestamp}_coldmail_day0_trigger.sql`;
const migrationsDir = path.join(__dirname, '../supabase/migrations');

// Ensure migrations directory exists
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

const filepath = path.join(migrationsDir, filename);

// Generate migration SQL
const migration = `-- Generated trigger migration for SPA-899
-- Generated at: ${now.toISOString()}
-- Source: supabase/functions/lib/template-sets.json
-- Intro templates: ${Object.values(templateSets).map(ts => ts.intro).join(', ')}

CREATE OR REPLACE FUNCTION enforce_coldmail_day0()
RETURNS TRIGGER AS $$ BEGIN
  IF NEW.type = 'cold_email' 
    AND NEW.template_used IN (${introTemplates})
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
`;

// Write migration
fs.writeFileSync(filepath, migration);
console.log(`✓ Generated trigger migration: ${filename}`);
console.log(`  Path: ${filepath}`);
console.log(`  Intro templates: ${Object.values(templateSets).map(ts => ts.intro).join(', ')}`);
