-- First, drop the problematic RLS policy that causes infinite recursion
DROP POLICY IF EXISTS "Business admins can manage permissions" ON public.business_permissions;

-- Create a security definer function to check if user is business admin
-- This prevents infinite recursion by bypassing RLS when checking permissions
CREATE OR REPLACE FUNCTION public.is_business_admin(p_business_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super admins are always business admins
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;
  
  -- Check if user has admin permission for this business
  RETURN EXISTS (
    SELECT 1
    FROM public.business_permissions
    WHERE user_id = p_user_id
      AND business_id = p_business_id
      AND permission_level = 'admin'::business_permission_level
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$;

-- Now create the RLS policy using the security definer function
CREATE POLICY "Business admins can manage permissions"
ON public.business_permissions
FOR ALL
USING (public.is_business_admin(business_id))
WITH CHECK (public.is_business_admin(business_id));