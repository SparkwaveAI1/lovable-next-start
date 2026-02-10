/**
 * Module Registry Hooks
 * 
 * React Query hooks for the module registry system.
 * Provides per-tenant module enable/disable functionality.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  ModuleSlug,
  TenantModuleState,
  ModuleDefinition,
  ModulesByCategory,
  ModuleCategory,
  TenantModuleConfig,
} from '@/types/module-registry';
import {
  DEFAULT_ENABLED_MODULES,
  PREMIUM_MODULES,
  CATEGORY_METADATA,
} from '@/types/module-registry';

// Query keys
const QUERY_KEYS = {
  modules: (businessId?: string) => ['modules', businessId] as const,
  moduleDefinitions: ['module-definitions'] as const,
  moduleConfig: (businessId: string, moduleSlug: ModuleSlug) => 
    ['module-config', businessId, moduleSlug] as const,
};

// ============================================================================
// Core Query Hooks
// ============================================================================

/**
 * Fetch all modules with their enabled status for a tenant
 */
export function useModules(businessId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.modules(businessId),
    queryFn: async (): Promise<TenantModuleState[]> => {
      if (!businessId) {
        // Return fallback with default enabled states
        return getFallbackModuleStates();
      }

      const { data, error } = await supabase
        .rpc('get_tenant_modules', { p_business_id: businessId });

      if (error) {
        console.error('Error fetching tenant modules:', error);
        return getFallbackModuleStates();
      }

      return (data || []) as TenantModuleState[];
    },
    staleTime: 60000, // 1 minute
    enabled: true, // Always enabled, falls back gracefully
  });
}

/**
 * Fetch all module definitions (master catalog)
 */
export function useModuleDefinitions() {
  return useQuery({
    queryKey: QUERY_KEYS.moduleDefinitions,
    queryFn: async (): Promise<ModuleDefinition[]> => {
      const { data, error } = await supabase
        .from('module_definitions')
        .select('*')
        .eq('is_deprecated', false)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching module definitions:', error);
        return [];
      }

      return (data || []) as ModuleDefinition[];
    },
    staleTime: 300000, // 5 minutes - definitions change infrequently
  });
}

/**
 * Get module configuration for a specific module
 */
export function useModuleConfig(businessId?: string, moduleSlug?: ModuleSlug) {
  return useQuery({
    queryKey: QUERY_KEYS.moduleConfig(businessId || '', moduleSlug || 'crm'),
    queryFn: async (): Promise<Record<string, unknown>> => {
      if (!businessId || !moduleSlug) return {};

      const { data, error } = await supabase
        .from('tenant_module_config')
        .select('config')
        .eq('business_id', businessId)
        .eq('module_slug', moduleSlug)
        .single();

      if (error) {
        // Return default config from module definition
        const { data: def } = await supabase
          .from('module_definitions')
          .select('default_config')
          .eq('slug', moduleSlug)
          .single();
        
        return def?.default_config || {};
      }

      return data?.config || {};
    },
    enabled: !!businessId && !!moduleSlug,
    staleTime: 60000,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Toggle a module on/off for a tenant
 */
export function useToggleModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      businessId,
      moduleSlug,
      enabled,
    }: {
      businessId: string;
      moduleSlug: ModuleSlug;
      enabled: boolean;
    }): Promise<boolean> => {
      const { data, error } = await supabase
        .rpc('set_module_enabled', {
          p_business_id: businessId,
          p_module_slug: moduleSlug,
          p_enabled: enabled,
        });

      if (error) {
        console.error('Error toggling module:', error);
        throw error;
      }

      return data ?? false;
    },
    onSuccess: (_, variables) => {
      // Invalidate the modules query to refetch
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.modules(variables.businessId),
      });
    },
  });
}

/**
 * Update module configuration for a tenant
 */
export function useUpdateModuleConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      businessId,
      moduleSlug,
      config,
    }: {
      businessId: string;
      moduleSlug: ModuleSlug;
      config: Record<string, unknown>;
    }): Promise<void> => {
      const { error } = await supabase
        .from('tenant_module_config')
        .upsert({
          business_id: businessId,
          module_slug: moduleSlug,
          config,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'business_id,module_slug',
        });

      if (error) {
        console.error('Error updating module config:', error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.moduleConfig(variables.businessId, variables.moduleSlug),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.modules(variables.businessId),
      });
    },
  });
}

/**
 * Bulk update modules for a tenant
 */
export function useBulkUpdateModules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      businessId,
      modules,
    }: {
      businessId: string;
      modules: { slug: ModuleSlug; enabled: boolean }[];
    }): Promise<{ success: boolean; errors: string[] }> => {
      const errors: string[] = [];

      for (const { slug, enabled } of modules) {
        const { error } = await supabase
          .rpc('set_module_enabled', {
            p_business_id: businessId,
            p_module_slug: slug,
            p_enabled: enabled,
          });

        if (error) {
          errors.push(`Failed to ${enabled ? 'enable' : 'disable'} ${slug}: ${error.message}`);
        }
      }

      return { success: errors.length === 0, errors };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.modules(variables.businessId),
      });
    },
  });
}

/**
 * Track module usage (call when a module is accessed)
 */
export function useTrackModuleUsage() {
  return useMutation({
    mutationFn: async ({
      businessId,
      moduleSlug,
    }: {
      businessId: string;
      moduleSlug: ModuleSlug;
    }): Promise<void> => {
      // First, ensure the config row exists
      const { error: upsertError } = await supabase
        .from('tenant_module_config')
        .upsert({
          business_id: businessId,
          module_slug: moduleSlug,
          last_used_at: new Date().toISOString(),
        }, {
          onConflict: 'business_id,module_slug',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.warn('Error tracking module usage:', upsertError);
        return;
      }

      // Increment usage count
      await supabase.rpc('increment_module_usage', {
        p_business_id: businessId,
        p_module_slug: moduleSlug,
      }).catch(() => {
        // Non-critical, ignore errors
      });
    },
    // No need to invalidate queries for usage tracking
  });
}

// ============================================================================
// Derived/Computed Hooks
// ============================================================================

/**
 * Check if a specific module is enabled
 */
export function useIsModuleEnabled(businessId?: string, moduleSlug?: ModuleSlug): boolean {
  const { data: modules } = useModules(businessId);

  if (!modules || !moduleSlug) {
    // Default: enabled for non-premium, disabled for premium
    return !PREMIUM_MODULES.includes(moduleSlug || 'crm');
  }

  const module = modules.find(m => m.slug === moduleSlug);
  return module?.is_enabled ?? !PREMIUM_MODULES.includes(moduleSlug);
}

/**
 * Get enabled modules as a Set for quick lookups
 */
export function useEnabledModulesSet(businessId?: string): Set<ModuleSlug> {
  const { data: modules } = useModules(businessId);

  if (!modules) {
    return new Set(DEFAULT_ENABLED_MODULES);
  }

  return new Set(
    modules
      .filter(m => m.is_enabled)
      .map(m => m.slug)
  );
}

/**
 * Get modules grouped by category
 */
export function useModulesByCategory(businessId?: string): ModulesByCategory {
  const { data: modules } = useModules(businessId);

  const grouped: ModulesByCategory = {
    core: [],
    marketing: [],
    operations: [],
    analytics: [],
    advanced: [],
  };

  if (!modules) return grouped;

  for (const module of modules) {
    if (grouped[module.category]) {
      grouped[module.category].push(module);
    }
  }

  // Sort each category by the module's natural order
  for (const category of Object.keys(grouped) as ModuleCategory[]) {
    grouped[category].sort((a, b) => {
      // Premium modules at the end within each category
      if (a.is_premium !== b.is_premium) {
        return a.is_premium ? 1 : -1;
      }
      return 0;
    });
  }

  return grouped;
}

/**
 * Check if a route should be visible based on enabled modules
 */
export function useIsRouteEnabled(businessId?: string, routePath?: string): boolean {
  const enabledModules = useEnabledModulesSet(businessId);

  if (!routePath) return true;

  // Map routes to modules
  const routeToModule: Record<string, ModuleSlug> = {
    '/contacts': 'crm',
    '/email-marketing': 'email_marketing',
    '/investments': 'investment',
    '/twitter-analytics': 'social_media',
    '/analytics': 'analytics',
    '/automation-app': 'automation',
    '/automation-audit': 'automation',
    '/bookings': 'booking',
    '/mission-control': 'mission_control',
    '/communications': 'communications',
    '/content-center': 'content_center',
    '/content-visibility': 'content_center',
    '/media-library': 'media_library',
    '/agents': 'agents',
    '/reports': 'reports',
  };

  // Find matching route prefix
  for (const [route, moduleSlug] of Object.entries(routeToModule)) {
    if (routePath.startsWith(route)) {
      return enabledModules.has(moduleSlug);
    }
  }

  // Routes not mapped to a module are always visible
  return true;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Fallback module states when database is unavailable
 */
function getFallbackModuleStates(): TenantModuleState[] {
  const moduleData: Array<{ slug: ModuleSlug; name: string; category: ModuleCategory; icon: string; color: string }> = [
    { slug: 'crm', name: 'CRM', category: 'core', icon: 'Users', color: 'blue' },
    { slug: 'email_marketing', name: 'Email Marketing', category: 'marketing', icon: 'Mail', color: 'green' },
    { slug: 'sms', name: 'SMS', category: 'marketing', icon: 'MessageSquare', color: 'purple' },
    { slug: 'ai_assistant', name: 'AI Assistant', category: 'core', icon: 'Bot', color: 'violet' },
    { slug: 'investment', name: 'Investments', category: 'advanced', icon: 'TrendingUp', color: 'emerald' },
    { slug: 'social_media', name: 'Social Media', category: 'marketing', icon: 'Share2', color: 'pink' },
    { slug: 'analytics', name: 'Analytics', category: 'analytics', icon: 'BarChart3', color: 'amber' },
    { slug: 'automation', name: 'Automation', category: 'core', icon: 'Zap', color: 'orange' },
    { slug: 'booking', name: 'Bookings', category: 'operations', icon: 'Calendar', color: 'cyan' },
    { slug: 'mission_control', name: 'Mission Control', category: 'advanced', icon: 'Rocket', color: 'red' },
    { slug: 'communications', name: 'Communications', category: 'operations', icon: 'MessageCircle', color: 'teal' },
    { slug: 'content_center', name: 'Content Center', category: 'marketing', icon: 'FileText', color: 'slate' },
    { slug: 'media_library', name: 'Media Library', category: 'operations', icon: 'Image', color: 'gray' },
    { slug: 'agents', name: 'AI Agents', category: 'advanced', icon: 'Cpu', color: 'fuchsia' },
    { slug: 'reports', name: 'Reports', category: 'analytics', icon: 'ClipboardList', color: 'lime' },
  ];

  return moduleData.map(m => ({
    slug: m.slug,
    name: m.name,
    description: null,
    category: m.category,
    icon: m.icon,
    color: m.color,
    is_premium: PREMIUM_MODULES.includes(m.slug),
    is_beta: false,
    is_enabled: DEFAULT_ENABLED_MODULES.includes(m.slug),
    config: {},
    last_used_at: null,
  }));
}

/**
 * Get category display information
 */
export function getCategoryInfo(category: ModuleCategory) {
  return CATEGORY_METADATA[category];
}

// ============================================================================
// Export All
// ============================================================================

export {
  QUERY_KEYS as MODULE_QUERY_KEYS,
  getFallbackModuleStates,
};
