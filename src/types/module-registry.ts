/**
 * Module Registry Types
 * Types for the module registry system that tracks available modules
 * and their enabled status per tenant.
 */

export type ModuleCategory = 'core' | 'marketing' | 'operations' | 'analytics' | 'advanced';

export type ModuleSlug =
  | 'crm'
  | 'email_marketing'
  | 'sms'
  | 'ai_assistant'
  | 'investment'
  | 'social_media'
  | 'analytics'
  | 'automation'
  | 'booking'
  | 'mission_control'
  | 'communications'
  | 'content_center'
  | 'media_library'
  | 'agents'
  | 'reports';

/**
 * Module definition from the master catalog (module_definitions table)
 */
export interface ModuleDefinition {
  id: string;
  slug: ModuleSlug;
  name: string;
  description: string | null;
  category: ModuleCategory;
  icon: string;
  color: string;
  sort_order: number;
  is_premium: boolean;
  is_beta: boolean;
  is_deprecated: boolean;
  dependencies: string[];
  default_config: Record<string, unknown>;
  docs_url: string | null;
  help_text: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Per-tenant module configuration (tenant_module_config table)
 */
export interface TenantModuleConfig {
  id: string;
  business_id: string;
  module_slug: ModuleSlug;
  enabled: boolean;
  enabled_at: string | null;
  disabled_at: string | null;
  config: Record<string, unknown>;
  last_used_at: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Combined module state for a tenant (returned by get_tenant_modules RPC)
 */
export interface TenantModuleState {
  slug: ModuleSlug;
  name: string;
  description: string | null;
  category: ModuleCategory;
  icon: string;
  color: string;
  is_premium: boolean;
  is_beta: boolean;
  is_enabled: boolean;
  config: Record<string, unknown>;
  last_used_at: string | null;
}

/**
 * Module toggle action payload
 */
export interface ModuleTogglePayload {
  businessId: string;
  moduleSlug: ModuleSlug;
  enabled: boolean;
}

/**
 * Module config update payload
 */
export interface ModuleConfigUpdatePayload {
  businessId: string;
  moduleSlug: ModuleSlug;
  config: Record<string, unknown>;
}

/**
 * Grouped modules by category
 */
export type ModulesByCategory = Record<ModuleCategory, TenantModuleState[]>;

/**
 * Module registry context state
 */
export interface ModuleRegistryState {
  modules: TenantModuleState[];
  enabledModules: Set<ModuleSlug>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Category metadata for UI display
 */
export interface CategoryMetadata {
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
}

export const CATEGORY_METADATA: Record<ModuleCategory, CategoryMetadata> = {
  core: {
    name: 'Core',
    description: 'Essential business features',
    icon: 'Layers',
    sortOrder: 1,
  },
  marketing: {
    name: 'Marketing',
    description: 'Marketing and outreach tools',
    icon: 'Megaphone',
    sortOrder: 2,
  },
  operations: {
    name: 'Operations',
    description: 'Day-to-day business operations',
    icon: 'Settings2',
    sortOrder: 3,
  },
  analytics: {
    name: 'Analytics',
    description: 'Reporting and insights',
    icon: 'BarChart3',
    sortOrder: 4,
  },
  advanced: {
    name: 'Advanced',
    description: 'Premium and power-user features',
    icon: 'Sparkles',
    sortOrder: 5,
  },
};

/**
 * Default enabled modules for new tenants
 */
export const DEFAULT_ENABLED_MODULES: ModuleSlug[] = [
  'crm',
  'email_marketing',
  'sms',
  'ai_assistant',
  'social_media',
  'analytics',
  'automation',
  'booking',
  'communications',
  'content_center',
  'media_library',
  'reports',
];

/**
 * Premium modules that require a paid plan
 */
export const PREMIUM_MODULES: ModuleSlug[] = [
  'investment',
  'mission_control',
  'agents',
];
