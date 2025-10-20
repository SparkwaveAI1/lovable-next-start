-- Fix Sparkwave AI profile ID (name has AI suffix)
UPDATE businesses 
SET late_profile_id = '68eb20bae5a3240b61890ce4'
WHERE name = 'Sparkwave AI';