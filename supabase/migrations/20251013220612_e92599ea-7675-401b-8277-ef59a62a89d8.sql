-- Fix search_path for the staging timestamp function
-- Drop trigger first, then function, then recreate both with proper settings

DROP TRIGGER IF EXISTS set_staged_content_timestamp ON public.staged_content;
DROP FUNCTION IF EXISTS public.update_staged_content_timestamp();

-- Recreate function with proper search_path
CREATE OR REPLACE FUNCTION public.update_staged_content_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER set_staged_content_timestamp
BEFORE UPDATE ON public.staged_content
FOR EACH ROW
EXECUTE FUNCTION public.update_staged_content_timestamp();