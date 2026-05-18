/**
 * Business Registry
 *
 * Config-driven registry for business namespaces.
 * Future businesses can be added here following the same pattern.
 *
 * NAMESPACE SCAFFOLD ONLY - NOT A SECURITY BOUNDARY
 * Real authorization requires business_id + RLS on Supabase.
 */

export type FeatureStatus = 'live' | 'demo' | 'planned' | 'not-in-scope';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  status?: FeatureStatus;
}

export interface FeatureFlag {
  enabled: boolean;
  status: FeatureStatus;
}

export interface BusinessConfig {
  id: string; // Should map to Supabase business_id when RLS is implemented
  slug: string; // URL namespace e.g. "ElisaVeras"
  name: string; // Display name
  displayRoles: string[]; // Walter-server/business-side display roles (NOT local user profiles)
  navigation: NavItem[];
  branding: {
    primaryColor: string;
    accentColor: string;
  };
  features: Record<string, FeatureFlag>;
}

// Import business configs
import { elisaVerasConfig } from './elisa-veras.config';

/**
 * Registry of all business configurations
 * Key is the URL slug (case-sensitive)
 */
export const businessRegistry: Record<string, BusinessConfig> = {
  ElisaVeras: elisaVerasConfig,
};

/**
 * Get business config by slug
 */
export function getBusinessBySlug(slug: string): BusinessConfig | undefined {
  return businessRegistry[slug];
}

/**
 * Get all registered business slugs
 */
export function getBusinessSlugs(): string[] {
  return Object.keys(businessRegistry);
}

/**
 * Check if a feature is available for a business
 */
export function isFeatureEnabled(
  businessSlug: string,
  featureKey: string
): boolean {
  const config = getBusinessBySlug(businessSlug);
  if (!config) return false;
  return config.features[featureKey]?.enabled ?? false;
}

/**
 * Get feature status for display purposes
 */
export function getFeatureStatus(
  businessSlug: string,
  featureKey: string
): FeatureStatus | undefined {
  const config = getBusinessBySlug(businessSlug);
  if (!config) return undefined;
  return config.features[featureKey]?.status;
}
