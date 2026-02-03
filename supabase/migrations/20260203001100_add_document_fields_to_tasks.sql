-- Add document link and work summary fields to mc_tasks
-- Created: 2026-02-03
-- Purpose: Allow task cards to link to documents with work summaries

-- Add document_url for linking to external docs (Notion, Google Docs, etc.)
ALTER TABLE mc_tasks ADD COLUMN IF NOT EXISTS document_url TEXT;

-- Add work_summary for inline expandable summary text
ALTER TABLE mc_tasks ADD COLUMN IF NOT EXISTS work_summary TEXT;

-- Add comments for documentation
COMMENT ON COLUMN mc_tasks.document_url IS 'URL to external document (Notion, Google Docs, etc.) with work details';
COMMENT ON COLUMN mc_tasks.work_summary IS 'Inline work summary text, expandable on task card';
