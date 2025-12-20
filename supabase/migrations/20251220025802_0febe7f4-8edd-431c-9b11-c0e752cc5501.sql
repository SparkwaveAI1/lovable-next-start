-- Create a function to safely increment campaign statistics
CREATE OR REPLACE FUNCTION public.increment_campaign_stat(
  p_campaign_id uuid,
  p_stat text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format(
    'UPDATE public.email_campaigns SET %I = COALESCE(%I, 0) + 1, updated_at = now() WHERE id = $1',
    p_stat, p_stat
  ) USING p_campaign_id;
END;
$$;