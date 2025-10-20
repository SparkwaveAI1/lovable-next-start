-- Populate Late profile IDs for all businesses

-- Update Sparkwave with its profile ID (main account)
UPDATE businesses 
SET late_profile_id = '68eb20bae5a3240b61890ce4'
WHERE name = 'Sparkwave';

-- Update Fight Flow Academy with its profile ID
UPDATE businesses 
SET late_profile_id = '68eb20e35a16dea56ea31455'
WHERE name = 'Fight Flow Academy';

-- Update PersonaAI with its profile ID
UPDATE businesses 
SET late_profile_id = '68edebff55fe98a2e66493f5'
WHERE name = 'PersonaAI';

-- Update CharX World with its profile ID
UPDATE businesses 
SET late_profile_id = '68eddbe1895236554d9c8cd4'
WHERE name = 'CharX World';