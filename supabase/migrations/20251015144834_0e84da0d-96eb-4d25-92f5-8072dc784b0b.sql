-- Drop all existing policies on business_permissions to start fresh
DROP POLICY IF EXISTS "Business admins can manage permissions" ON public.business_permissions;
DROP POLICY IF EXISTS "Super admins have full access to permissions" ON public.business_permissions;
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.business_permissions;

-- Create simplified RLS policies without recursion
-- 1. Super admins can do everything
CREATE POLICY "Super admins full access"
ON public.business_permissions
FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- 2. Users can view their own permissions
CREATE POLICY "Users view own permissions"
ON public.business_permissions
FOR SELECT
USING (user_id = auth.uid());

-- Note: Business admins managing permissions will need to be super admins for now
-- This avoids the infinite recursion issue while we're setting up the system