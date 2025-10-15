-- Create a secure function to look up user ID by email
-- This is needed because auth.users table can't be accessed directly from frontend
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Only allow super admins to look up users
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can look up users';
  END IF;

  -- Normalize email to lowercase and look up user
  SELECT id INTO user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(user_email);

  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', user_email;
  END IF;

  RETURN user_id;
END;
$$;

-- Create a function to safely grant permissions by email
CREATE OR REPLACE FUNCTION public.grant_business_permission_by_email(
  user_email TEXT,
  p_business_id UUID,
  p_permission_level business_permission_level
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_granter_id UUID;
BEGIN
  -- Only super admins can grant permissions
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can grant permissions';
  END IF;

  -- Get the user ID from email
  v_user_id := public.get_user_id_by_email(user_email);
  
  -- Get the granter's ID
  v_granter_id := auth.uid();

  -- Insert or update the permission
  INSERT INTO public.business_permissions (
    user_id, 
    business_id, 
    permission_level, 
    granted_by,
    is_active
  )
  VALUES (
    v_user_id, 
    p_business_id, 
    p_permission_level,
    v_granter_id,
    true
  )
  ON CONFLICT (user_id, business_id) 
  DO UPDATE SET 
    permission_level = EXCLUDED.permission_level,
    granted_by = EXCLUDED.granted_by,
    updated_at = NOW(),
    is_active = true;
END;
$$;

-- Create a function to get user email by ID (for displaying in UI)
CREATE OR REPLACE FUNCTION public.get_user_email_by_id(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Only allow super admins or the user themselves to get email
  IF NOT (public.is_super_admin() OR auth.uid() = p_user_id) THEN
    RETURN 'Hidden';
  END IF;

  SELECT email INTO user_email
  FROM auth.users
  WHERE id = p_user_id;

  RETURN COALESCE(user_email, 'Unknown');
END;
$$;