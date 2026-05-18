/**
 * Business Registry
 *
 * Config-driven registry for business namespaces.
 * Future businesses can be added here following the same pattern.
 *
 * NAMESPACE SCAFFOLD ONLY - NOT A SECURITY BOUNDARY
 * Real authorization requires business_id + RLS on Supabase.
 */

import {
  type BusinessModuleKey,
  type BusinessModuleStatus,
  businessModuleRegistry,
  getBusinessModulePath,
  getModuleDefinition,
} from './modules';

// Re-export module types for convenience
export type { BusinessModuleKey, BusinessModuleStatus };

// Re-export FeatureStatus as alias for backwards compatibility
export type FeatureStatus = BusinessModuleStatus;

/**
 * Module enablement config for a business.
 */
export interface BusinessModuleConfig {
  enabled: boolean;
  status: BusinessModuleStatus;
}

/**
 * Navigation item derived from module config.
 */
export interface NavItem {
  key: BusinessModuleKey;
  label: string;
  path: string;
  icon: string;
  status: BusinessModuleStatus;
  description: string;
}

/**
 * Business configuration using typed module keys.
 */
export interface BusinessConfig {
  /** Should map to Supabase business_id when RLS is implemented */
  id: string;
  /** URL namespace e.g. "ElisaVeras" */
  slug: string;
  /** Display name */
  name: string;
  /** Walter-server/business-side display roles (NOT local user profiles) */
  displayRoles: string[];
  /** Module enablement using typed keys */
  modules: Record<BusinessModuleKey, BusinessModuleConfig>;
  /** Branding colors */
  branding: {
    primaryColor: string;
    accentColor: string;
  };
}

// Import business configs
import { elisaVerasConfig } from './elisa-veras.config';

/**
 * Registry of all business configurations.
 * Key is the URL slug (case-sensitive).
 */
export const businessRegistry: Record<string, BusinessConfig> = {
  ElisaVeras: elisaVerasConfig,
};

/**
 * Get business config by slug.
 */
export function getBusinessBySlug(slug: string): BusinessConfig | undefined {
  return businessRegistry[slug];
}

/**
 * Get all registered business slugs.
 */
export function getBusinessSlugs(): string[] {
  return Object.keys(businessRegistry);
}

/**
 * Check if a module is enabled for a business.
 */
export function isModuleEnabled(
  businessSlug: string,
  moduleKey: BusinessModuleKey
): boolean {
  const config = getBusinessBySlug(businessSlug);
  if (!config) return false;
  return config.modules[moduleKey]?.enabled ?? false;
}

/**
 * Get module status for a business.
 */
export function getModuleStatus(
  businessSlug: string,
  moduleKey: BusinessModuleKey
): BusinessModuleStatus | undefined {
  const config = getBusinessBySlug(businessSlug);
  if (!config) return undefined;
  return config.modules[moduleKey]?.status;
}

/**
 * Get navigation items for a business based on enabled modules.
 * Derives labels, icons, and paths from the central module registry.
 */
export function getBusinessNavigation(businessSlug: string): NavItem[] {
  const config = getBusinessBySlug(businessSlug);
  if (!config) return [];

  const navItems: NavItem[] = [];

  // Iterate over module keys in registry order
  for (const [key, moduleDef] of Object.entries(businessModuleRegistry)) {
    const moduleKey = key as BusinessModuleKey;
    const moduleConfig = config.modules[moduleKey];

    // Only include enabled modules in navigation
    if (moduleConfig?.enabled) {
      navItems.push({
        key: moduleKey,
        label: moduleDef.label,
        path: getBusinessModulePath(businessSlug, moduleKey),
        icon: moduleDef.iconKey,
        status: moduleConfig.status,
        description: moduleDef.description,
      });
    }
  }

  return navItems;
}

/**
 * Get all enabled module keys for a business.
 */
export function getEnabledModules(businessSlug: string): BusinessModuleKey[] {
  const config = getBusinessBySlug(businessSlug);
  if (!config) return [];

  return (Object.entries(config.modules) as [BusinessModuleKey, BusinessModuleConfig][])
    .filter(([, moduleConfig]) => moduleConfig.enabled)
    .map(([key]) => key);
}

/**
 * Get module definition from central registry.
 * Re-exported for convenience.
 */
export { getModuleDefinition, getBusinessModulePath };
