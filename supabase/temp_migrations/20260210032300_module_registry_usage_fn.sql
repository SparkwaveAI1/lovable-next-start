-- Module Registry: Add increment_module_usage function
-- Increments usage count and updates last_used_at for module tracking

CREATE OR REPLACE FUNCTION increment_module_usage(
  p_business_id uuid,
  p_module_slug text
) RETURNS void AS $$
BEGIN
  INSERT INTO tenant_module_config (
    business_id,
    module_slug,
    last_used_at,
    usage_count
  ) VALUES (
    p_business_id,
    p_module_slug,
    now(),
    1
  )
  ON CONFLICT (business_id, module_slug) DO UPDATE SET
    last_used_at = now(),
    usage_count = tenant_module_config.usage_count + 1,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access
GRANT EXECUTE ON FUNCTION increment_module_usage TO authenticated, service_role;

COMMENT ON FUNCTION increment_module_usage IS 'Track module usage by incrementing count and updating last_used_at';
