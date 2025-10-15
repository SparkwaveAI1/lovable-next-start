-- Create enum for business permission levels
CREATE TYPE public.business_permission_level AS ENUM ('admin', 'manager', 'creator', 'viewer');

-- Create business_permissions table
CREATE TABLE IF NOT EXISTS public.business_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  permission_level public.business_permission_level NOT NULL DEFAULT 'viewer',
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one permission per user per business
  UNIQUE(user_id, business_id)
);

-- Create indexes for performance
CREATE INDEX idx_business_permissions_user_id ON public.business_permissions(user_id);
CREATE INDEX idx_business_permissions_business_id ON public.business_permissions(business_id);
CREATE INDEX idx_business_permissions_active ON public.business_permissions(is_active) WHERE is_active = true;

-- Add updated_at trigger
CREATE TRIGGER update_business_permissions_updated_at
  BEFORE UPDATE ON public.business_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.business_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Super admins have full access
CREATE POLICY "Super admins have full access to permissions" 
  ON public.business_permissions
  FOR ALL 
  USING (public.is_super_admin());

-- RLS Policy: Users can view their own permissions
CREATE POLICY "Users can view their own permissions" 
  ON public.business_permissions
  FOR SELECT 
  USING (user_id = auth.uid() AND is_active = true);

-- RLS Policy: Business admins can manage permissions for their business
CREATE POLICY "Business admins can manage permissions" 
  ON public.business_permissions
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.business_permissions bp
      WHERE bp.business_id = business_permissions.business_id
        AND bp.user_id = auth.uid()
        AND bp.permission_level = 'admin'::public.business_permission_level
        AND bp.is_active = true
    )
  );

-- Function: Get user's permission level for a business
CREATE OR REPLACE FUNCTION public.get_user_business_permission(
  p_business_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS public.business_permission_level AS $$
DECLARE
  v_permission public.business_permission_level;
BEGIN
  -- Super admins always have admin permission
  IF public.is_super_admin() THEN
    RETURN 'admin'::public.business_permission_level;
  END IF;
  
  -- Get user's permission level
  SELECT permission_level INTO v_permission
  FROM public.business_permissions
  WHERE user_id = p_user_id
    AND business_id = p_business_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());
    
  RETURN v_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Check if user can access business
CREATE OR REPLACE FUNCTION public.can_access_business(
  p_business_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_business_permission(p_business_id, p_user_id) IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_user_business_permission(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_business(UUID, UUID) TO authenticated;