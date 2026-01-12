-- ============================================
-- CONTACT DEDUPLICATION AND UNIQUE CONSTRAINTS
-- This migration:
-- 1. Identifies and merges duplicate contacts (by email and phone)
-- 2. Reassigns all FK references to the oldest contact
-- 3. Deletes duplicate records
-- 4. Creates unique partial indexes to prevent future duplicates
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: MERGE EMAIL DUPLICATES
-- For each business, find contacts with the same email
-- Keep the oldest one, reassign FKs from newer ones
-- ============================================

-- Create temp table to track email duplicates (newer contacts to be deleted)
CREATE TEMP TABLE email_duplicates_to_delete AS
WITH email_duplicates AS (
  SELECT
    c.id,
    c.business_id,
    LOWER(TRIM(c.email)) as normalized_email,
    c.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY c.business_id, LOWER(TRIM(c.email))
      ORDER BY c.created_at ASC
    ) as rn
  FROM public.contacts c
  WHERE c.email IS NOT NULL
    AND TRIM(c.email) != ''
),
-- Get the oldest contact (keeper) for each email
keepers AS (
  SELECT id as keeper_id, business_id, normalized_email
  FROM email_duplicates
  WHERE rn = 1
),
-- Get all duplicates (non-keepers) with their keeper
duplicates AS (
  SELECT
    ed.id as duplicate_id,
    k.keeper_id,
    ed.normalized_email
  FROM email_duplicates ed
  JOIN keepers k ON ed.business_id = k.business_id
    AND ed.normalized_email = k.normalized_email
  WHERE ed.rn > 1
)
SELECT duplicate_id, keeper_id FROM duplicates;

-- Report count for logging
DO $$
DECLARE
  dup_count INT;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM email_duplicates_to_delete;
  RAISE NOTICE 'Found % email duplicate contacts to merge', dup_count;
END $$;

-- Reassign conversation_threads from duplicates to keepers
UPDATE public.conversation_threads ct
SET contact_id = etd.keeper_id
FROM email_duplicates_to_delete etd
WHERE ct.contact_id = etd.duplicate_id;

-- Reassign sms_messages from duplicates to keepers
UPDATE public.sms_messages sm
SET contact_id = etd.keeper_id
FROM email_duplicates_to_delete etd
WHERE sm.contact_id = etd.duplicate_id;

-- Reassign class_bookings from duplicates to keepers
UPDATE public.class_bookings cb
SET contact_id = etd.keeper_id
FROM email_duplicates_to_delete etd
WHERE cb.contact_id = etd.duplicate_id;

-- Reassign email_sends from duplicates to keepers
UPDATE public.email_sends es
SET contact_id = etd.keeper_id
FROM email_duplicates_to_delete etd
WHERE es.contact_id = etd.duplicate_id;

-- Reassign contact_activities from duplicates to keepers
UPDATE public.contact_activities ca
SET contact_id = etd.keeper_id
FROM email_duplicates_to_delete etd
WHERE ca.contact_id = etd.duplicate_id;

-- Reassign email_queue from duplicates to keepers
UPDATE public.email_queue eq
SET contact_id = etd.keeper_id
FROM email_duplicates_to_delete etd
WHERE eq.contact_id = etd.duplicate_id;

-- Update keeper contacts with any non-null data from duplicates
-- (fill in missing phone, names, etc.)
UPDATE public.contacts c
SET
  phone = COALESCE(c.phone, dup.phone),
  first_name = CASE
    WHEN c.first_name IS NULL OR c.first_name = '' OR c.first_name = 'Unknown'
    THEN COALESCE(NULLIF(dup.first_name, ''), c.first_name)
    ELSE c.first_name
  END,
  last_name = CASE
    WHEN c.last_name IS NULL OR c.last_name = ''
    THEN COALESCE(NULLIF(dup.last_name, ''), c.last_name)
    ELSE c.last_name
  END,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (etd.keeper_id)
    etd.keeper_id,
    contacts.phone,
    contacts.first_name,
    contacts.last_name
  FROM email_duplicates_to_delete etd
  JOIN public.contacts ON contacts.id = etd.duplicate_id
  WHERE contacts.phone IS NOT NULL
    OR (contacts.first_name IS NOT NULL AND contacts.first_name != '' AND contacts.first_name != 'Unknown')
    OR (contacts.last_name IS NOT NULL AND contacts.last_name != '')
  ORDER BY etd.keeper_id, contacts.created_at ASC
) dup
WHERE c.id = dup.keeper_id;

-- Delete email duplicate contacts
DELETE FROM public.contacts
WHERE id IN (SELECT duplicate_id FROM email_duplicates_to_delete);

DROP TABLE email_duplicates_to_delete;

-- ============================================
-- STEP 2: MERGE PHONE DUPLICATES
-- For each business, find contacts with the same phone
-- Keep the oldest one, reassign FKs from newer ones
-- ============================================

-- Create temp table to track phone duplicates (newer contacts to be deleted)
CREATE TEMP TABLE phone_duplicates_to_delete AS
WITH phone_duplicates AS (
  SELECT
    c.id,
    c.business_id,
    TRIM(c.phone) as normalized_phone,
    c.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY c.business_id, TRIM(c.phone)
      ORDER BY c.created_at ASC
    ) as rn
  FROM public.contacts c
  WHERE c.phone IS NOT NULL
    AND TRIM(c.phone) != ''
),
-- Get the oldest contact (keeper) for each phone
keepers AS (
  SELECT id as keeper_id, business_id, normalized_phone
  FROM phone_duplicates
  WHERE rn = 1
),
-- Get all duplicates (non-keepers) with their keeper
duplicates AS (
  SELECT
    pd.id as duplicate_id,
    k.keeper_id,
    pd.normalized_phone
  FROM phone_duplicates pd
  JOIN keepers k ON pd.business_id = k.business_id
    AND pd.normalized_phone = k.normalized_phone
  WHERE pd.rn > 1
)
SELECT duplicate_id, keeper_id FROM duplicates;

-- Report count for logging
DO $$
DECLARE
  dup_count INT;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM phone_duplicates_to_delete;
  RAISE NOTICE 'Found % phone duplicate contacts to merge', dup_count;
END $$;

-- Reassign conversation_threads from duplicates to keepers
UPDATE public.conversation_threads ct
SET contact_id = ptd.keeper_id
FROM phone_duplicates_to_delete ptd
WHERE ct.contact_id = ptd.duplicate_id;

-- Reassign sms_messages from duplicates to keepers
UPDATE public.sms_messages sm
SET contact_id = ptd.keeper_id
FROM phone_duplicates_to_delete ptd
WHERE sm.contact_id = ptd.duplicate_id;

-- Reassign class_bookings from duplicates to keepers
UPDATE public.class_bookings cb
SET contact_id = ptd.keeper_id
FROM phone_duplicates_to_delete ptd
WHERE cb.contact_id = ptd.duplicate_id;

-- Reassign email_sends from duplicates to keepers
UPDATE public.email_sends es
SET contact_id = ptd.keeper_id
FROM phone_duplicates_to_delete ptd
WHERE es.contact_id = ptd.duplicate_id;

-- Reassign contact_activities from duplicates to keepers
UPDATE public.contact_activities ca
SET contact_id = ptd.keeper_id
FROM phone_duplicates_to_delete ptd
WHERE ca.contact_id = ptd.duplicate_id;

-- Reassign email_queue from duplicates to keepers
UPDATE public.email_queue eq
SET contact_id = ptd.keeper_id
FROM phone_duplicates_to_delete ptd
WHERE eq.contact_id = ptd.duplicate_id;

-- Update keeper contacts with any non-null data from duplicates
UPDATE public.contacts c
SET
  email = COALESCE(c.email, dup.email),
  first_name = CASE
    WHEN c.first_name IS NULL OR c.first_name = '' OR c.first_name = 'Unknown'
    THEN COALESCE(NULLIF(dup.first_name, ''), c.first_name)
    ELSE c.first_name
  END,
  last_name = CASE
    WHEN c.last_name IS NULL OR c.last_name = ''
    THEN COALESCE(NULLIF(dup.last_name, ''), c.last_name)
    ELSE c.last_name
  END,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (ptd.keeper_id)
    ptd.keeper_id,
    contacts.email,
    contacts.first_name,
    contacts.last_name
  FROM phone_duplicates_to_delete ptd
  JOIN public.contacts ON contacts.id = ptd.duplicate_id
  WHERE contacts.email IS NOT NULL
    OR (contacts.first_name IS NOT NULL AND contacts.first_name != '' AND contacts.first_name != 'Unknown')
    OR (contacts.last_name IS NOT NULL AND contacts.last_name != '')
  ORDER BY ptd.keeper_id, contacts.created_at ASC
) dup
WHERE c.id = dup.keeper_id;

-- Delete phone duplicate contacts
DELETE FROM public.contacts
WHERE id IN (SELECT duplicate_id FROM phone_duplicates_to_delete);

DROP TABLE phone_duplicates_to_delete;

-- ============================================
-- STEP 3: CREATE UNIQUE INDEXES
-- Now that duplicates are merged, create indexes to prevent future duplicates
-- ============================================

-- Create unique partial index on business_id + email (where email is not null/empty)
-- This allows multiple contacts without email, but only one contact per email per business
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_unique_email_per_business
ON public.contacts (business_id, lower(email))
WHERE email IS NOT NULL AND email != '';

-- Create unique partial index on business_id + phone (where phone is not null/empty)
-- This allows multiple contacts without phone, but only one contact per phone per business
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_unique_phone_per_business
ON public.contacts (business_id, phone)
WHERE phone IS NOT NULL AND phone != '';

-- ============================================
-- STEP 4: HELPER FUNCTION - Find or create contact
-- This implements HubSpot-style deduplication at the database level
-- ============================================

CREATE OR REPLACE FUNCTION public.find_or_create_contact(
  p_business_id UUID,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_first_name TEXT DEFAULT 'Unknown',
  p_last_name TEXT DEFAULT '',
  p_source TEXT DEFAULT 'api',
  p_status TEXT DEFAULT 'new_lead'
)
RETURNS TABLE (
  contact_id UUID,
  is_new BOOLEAN,
  matched_by TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contact_id UUID;
  v_is_new BOOLEAN := false;
  v_matched_by TEXT := NULL;
  v_email TEXT;
  v_phone TEXT;
BEGIN
  -- Normalize email (lowercase, trim)
  v_email := NULLIF(LOWER(TRIM(p_email)), '');

  -- Normalize phone (keep as-is, but trim)
  v_phone := NULLIF(TRIM(p_phone), '');

  -- Step 1: Try to find by email first (primary identifier)
  IF v_email IS NOT NULL THEN
    SELECT c.id INTO v_contact_id
    FROM public.contacts c
    WHERE c.business_id = p_business_id
      AND LOWER(c.email) = v_email
    LIMIT 1;

    IF v_contact_id IS NOT NULL THEN
      v_matched_by := 'email';
    END IF;
  END IF;

  -- Step 2: If no email match, try phone
  IF v_contact_id IS NULL AND v_phone IS NOT NULL THEN
    SELECT c.id INTO v_contact_id
    FROM public.contacts c
    WHERE c.business_id = p_business_id
      AND c.phone = v_phone
    LIMIT 1;

    IF v_contact_id IS NOT NULL THEN
      v_matched_by := 'phone';
    END IF;
  END IF;

  -- Step 3: If still no match, create new contact
  IF v_contact_id IS NULL THEN
    INSERT INTO public.contacts (
      business_id,
      first_name,
      last_name,
      email,
      phone,
      source,
      status,
      email_status,
      sms_status,
      last_activity_date
    ) VALUES (
      p_business_id,
      COALESCE(NULLIF(p_first_name, ''), 'Unknown'),
      COALESCE(p_last_name, ''),
      v_email,
      v_phone,
      p_source,
      p_status,
      CASE WHEN v_email IS NOT NULL THEN 'subscribed' ELSE NULL END,
      CASE WHEN v_phone IS NOT NULL THEN 'active' ELSE NULL END,
      NOW()
    )
    RETURNING id INTO v_contact_id;

    v_is_new := true;
  ELSE
    -- Update last_activity_date for existing contact
    UPDATE public.contacts
    SET last_activity_date = NOW(),
        updated_at = NOW()
    WHERE id = v_contact_id;
  END IF;

  RETURN QUERY SELECT v_contact_id, v_is_new, v_matched_by;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.find_or_create_contact TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_or_create_contact TO service_role;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON INDEX idx_contacts_unique_email_per_business IS
'Ensures only one contact per email address per business. Partial index excludes NULL/empty emails.';

COMMENT ON INDEX idx_contacts_unique_phone_per_business IS
'Ensures only one contact per phone number per business. Partial index excludes NULL/empty phones.';

COMMENT ON FUNCTION public.find_or_create_contact IS
'HubSpot-style contact deduplication: finds existing contact by email or phone, or creates new one. Returns contact_id, is_new flag, and matched_by field.';

COMMIT;
