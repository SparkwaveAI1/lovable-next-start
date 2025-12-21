-- Update the default Sparkwave sender email
UPDATE verified_senders 
SET email = 'info@sparkwave-ai.com', updated_at = now() 
WHERE id = '119593f2-321a-4f1b-844c-d7008797501b';