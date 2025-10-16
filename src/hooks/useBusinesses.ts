import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Business {
  id: string;
  name: string;
  slug: string;
  parent_business_id: string | null;
  business_type: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  user_permission?: string; // Add user's permission level
}

export const useBusinesses = () => {
  return useQuery({
    queryKey: ['businesses-with-permissions'],
    queryFn: async () => {
      // First check if user is super admin
      const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
      
      if (isSuperAdmin) {
        // Super admins see all businesses
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('status', 'active')
          .order('name');
          
        if (error) throw error;
        
        // Add admin permission level to all businesses for super admin
        return data?.map(b => ({ ...b, user_permission: 'admin' })) || [];
      } else {
        // Regular users only see businesses they have permission for
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No authenticated user');
        
        // Get businesses through permissions
        const { data, error } = await supabase
          .from('business_permissions')
          .select(`
            permission_level,
            business:businesses(*)
          `)
          .eq('user_id', user.id)
          .eq('is_active', true);
          
        if (error) throw error;
        
        // Transform the data to include permission level
        return data?.map(p => ({
          ...(p.business as any),
          user_permission: p.permission_level
        })).filter(b => b && b.id) || [];
      }
    },
  });
};

// Hook to get a single business if user has permission
export const useBusinessById = (businessId: string | null) => {
  return useQuery({
    queryKey: ['business', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      
      // Check if user can access this business
      const { data: canAccess, error: accessError } = await supabase
        .rpc('can_access_business', { p_business_id: businessId });
        
      if (accessError) throw accessError;
      if (!canAccess) throw new Error('You do not have permission to access this business');
      
      // Get the business data
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();
        
      if (error) throw error;
      
      // Get user's permission level
      const { data: permissionLevel } = await supabase
        .rpc('get_user_business_permission', { p_business_id: businessId });
      
      return { ...data, user_permission: permissionLevel };
    },
    enabled: !!businessId,
  });
};

// Hook to check if user has specific permission level
export const useHasPermission = (businessId: string | null, requiredLevel: string) => {
  return useQuery({
    queryKey: ['permission-check', businessId, requiredLevel],
    queryFn: async () => {
      if (!businessId) return false;
      
      const { data: userLevel } = await supabase
        .rpc('get_user_business_permission', { p_business_id: businessId });
      
      if (!userLevel) return false;
      
      // Permission hierarchy: admin > manager > creator > viewer
      const levels = ['viewer', 'creator', 'manager', 'admin'];
      const userLevelIndex = levels.indexOf(userLevel);
      const requiredLevelIndex = levels.indexOf(requiredLevel);
      
      return userLevelIndex >= requiredLevelIndex;
    },
    enabled: !!businessId,
  });
};

// Hook to get all businesses without authentication (for public pages)
export const usePublicBusinesses = () => {
  return useQuery({
    queryKey: ['public-businesses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('status', 'active')
        .order('name');
        
      if (error) throw error;
      return data || [];
    },
  });
};
