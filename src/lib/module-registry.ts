/**
 * Module Registry System
 * 
 * Provides per-tenant module enable/disable functionality.
 * Works with the module_definitions and tenant_module_config tables.
 * 
 * Key features:
 * - Toggle modules on/off per tenant
 * - Store settings in database
 * - Check module status before showing features
 */

import { supabase } from "@/integrations/supabase/client"

// ============================================================================
// Types
// ============================================================================

export type ModuleCategory = 'core' | 'marketing' | 'operations' | 'analytics' | 'advanced'

export interface ModuleDefinition {
  id: string
  slug: string
  name: string
  description: string | null
  category: ModuleCategory
  icon: string
  color: string
  sort_order: number
  is_premium: boolean
  is_beta: boolean
  is_deprecated: boolean
  dependencies: string[]
  default_config: Record<string, unknown>
  docs_url: string | null
  help_text: string | null
  created_at: string
  updated_at: string
}

export interface TenantModuleState {
  slug: string
  name: string
  description: string | null
  category: ModuleCategory
  icon: string
  color: string
  is_premium: boolean
  is_beta: boolean
  is_enabled: boolean
  config: Record<string, unknown>
  last_used_at: string | null
}

export interface ModuleConfig {
  slug: string
  enabled: boolean
  config: Record<string, unknown>
}

// ============================================================================
// Module Slug Constants
// ============================================================================

export const MODULE_SLUGS = {
  CRM: 'crm',
  EMAIL_MARKETING: 'email_marketing',
  SMS: 'sms',
  AI_ASSISTANT: 'ai_assistant',
  INVESTMENT: 'investment',
  SOCIAL_MEDIA: 'social_media',
  ANALYTICS: 'analytics',
  AUTOMATION: 'automation',
  BOOKING: 'booking',
  MISSION_CONTROL: 'mission_control',
  COMMUNICATIONS: 'communications',
  CONTENT_CENTER: 'content_center',
  MEDIA_LIBRARY: 'media_library',
  AGENTS: 'agents',
  REPORTS: 'reports',
} as const

export type ModuleSlug = typeof MODULE_SLUGS[keyof typeof MODULE_SLUGS]

// Map of module slugs to their route paths (for sidebar filtering)
export const MODULE_ROUTES: Record<ModuleSlug, string[]> = {
  [MODULE_SLUGS.CRM]: ['/contacts'],
  [MODULE_SLUGS.EMAIL_MARKETING]: ['/email-marketing'],
  [MODULE_SLUGS.SMS]: [], // Part of communications
  [MODULE_SLUGS.AI_ASSISTANT]: [], // Embedded feature
  [MODULE_SLUGS.INVESTMENT]: ['/investments'],
  [MODULE_SLUGS.SOCIAL_MEDIA]: ['/twitter-analytics'],
  [MODULE_SLUGS.ANALYTICS]: ['/analytics'],
  [MODULE_SLUGS.AUTOMATION]: ['/automation-app', '/automation-audit'],
  [MODULE_SLUGS.BOOKING]: ['/bookings'],
  [MODULE_SLUGS.MISSION_CONTROL]: ['/mission-control'],
  [MODULE_SLUGS.COMMUNICATIONS]: ['/communications'],
  [MODULE_SLUGS.CONTENT_CENTER]: ['/content-center', '/content-visibility'],
  [MODULE_SLUGS.MEDIA_LIBRARY]: ['/media-library'],
  [MODULE_SLUGS.AGENTS]: ['/agents'],
  [MODULE_SLUGS.REPORTS]: ['/reports'],
}

// Default modules that are enabled for new tenants
const DEFAULT_ENABLED_MODULES: ModuleSlug[] = [
  MODULE_SLUGS.CRM,
  MODULE_SLUGS.EMAIL_MARKETING,
  MODULE_SLUGS.SMS,
  MODULE_SLUGS.AI_ASSISTANT,
  MODULE_SLUGS.SOCIAL_MEDIA,
  MODULE_SLUGS.ANALYTICS,
  MODULE_SLUGS.AUTOMATION,
  MODULE_SLUGS.BOOKING,
  MODULE_SLUGS.COMMUNICATIONS,
  MODULE_SLUGS.CONTENT_CENTER,
  MODULE_SLUGS.MEDIA_LIBRARY,
  MODULE_SLUGS.REPORTS,
]

// Premium modules that require a paid plan
const PREMIUM_MODULES: ModuleSlug[] = [
  MODULE_SLUGS.INVESTMENT,
  MODULE_SLUGS.MISSION_CONTROL,
  MODULE_SLUGS.AGENTS,
]

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get all module definitions from the master catalog
 */
export async function getModuleDefinitions(): Promise<ModuleDefinition[]> {
  const { data, error } = await supabase
    .from('module_definitions')
    .select('*')
    .eq('is_deprecated', false)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching module definitions:', error)
    return []
  }

  return data || []
}

/**
 * Get a single module definition by slug
 */
export async function getModuleDefinition(slug: ModuleSlug): Promise<ModuleDefinition | null> {
  const { data, error } = await supabase
    .from('module_definitions')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    console.error('Error fetching module definition:', error)
    return null
  }

  return data
}

/**
 * Get all modules with their enabled status for a tenant
 * Uses the database function get_tenant_modules
 */
export async function getTenantModules(businessId: string): Promise<TenantModuleState[]> {
  const { data, error } = await supabase
    .rpc('get_tenant_modules', { p_business_id: businessId })

  if (error) {
    console.error('Error fetching tenant modules:', error)
    // Fall back to module definitions with default enabled states
    return getFallbackModuleStates()
  }

  return data || []
}

/**
 * Check if a specific module is enabled for a tenant
 * Uses the database function is_module_enabled
 */
export async function isModuleEnabled(
  businessId: string,
  moduleSlug: ModuleSlug
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('is_module_enabled', {
      p_business_id: businessId,
      p_module_slug: moduleSlug,
    })

  if (error) {
    console.error('Error checking module status:', error)
    // Default to true for core modules, false for premium
    return !PREMIUM_MODULES.includes(moduleSlug)
  }

  return data ?? false
}

/**
 * Enable or disable a module for a tenant
 * Uses the database function set_module_enabled
 */
export async function setModuleEnabled(
  businessId: string,
  moduleSlug: ModuleSlug,
  enabled: boolean
): Promise<boolean> {
  // Check dependencies before enabling
  if (enabled) {
    const definition = await getModuleDefinition(moduleSlug)
    if (definition && definition.dependencies.length > 0) {
      for (const dep of definition.dependencies) {
        const depEnabled = await isModuleEnabled(businessId, dep as ModuleSlug)
        if (!depEnabled) {
          console.error(`Cannot enable ${moduleSlug}: dependency ${dep} is not enabled`)
          return false
        }
      }
    }
  }

  const { data, error } = await supabase
    .rpc('set_module_enabled', {
      p_business_id: businessId,
      p_module_slug: moduleSlug,
      p_enabled: enabled,
    })

  if (error) {
    console.error('Error setting module enabled:', error)
    return false
  }

  return data ?? false
}

/**
 * Get module configuration for a tenant
 */
export async function getModuleConfig(
  businessId: string,
  moduleSlug: ModuleSlug
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('tenant_module_config')
    .select('config')
    .eq('business_id', businessId)
    .eq('module_slug', moduleSlug)
    .single()

  if (error) {
    // Return default config from module definition
    const definition = await getModuleDefinition(moduleSlug)
    return definition?.default_config || {}
  }

  return data?.config || {}
}

/**
 * Update module configuration for a tenant
 */
export async function updateModuleConfig(
  businessId: string,
  moduleSlug: ModuleSlug,
  config: Record<string, unknown>
): Promise<boolean> {
  const { error } = await supabase
    .from('tenant_module_config')
    .upsert({
      business_id: businessId,
      module_slug: moduleSlug,
      config,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'business_id,module_slug',
    })

  if (error) {
    console.error('Error updating module config:', error)
    return false
  }

  return true
}

/**
 * Track module usage (call when a module is accessed)
 */
export async function trackModuleUsage(
  businessId: string,
  moduleSlug: ModuleSlug
): Promise<void> {
  const { error } = await supabase
    .from('tenant_module_config')
    .upsert({
      business_id: businessId,
      module_slug: moduleSlug,
      last_used_at: new Date().toISOString(),
      usage_count: 1, // Will be incremented by the upsert
    }, {
      onConflict: 'business_id,module_slug',
    })
    .then(async () => {
      // Increment usage count
      await supabase.rpc('increment', {
        table_name: 'tenant_module_config',
        column_name: 'usage_count',
        row_id: `${businessId}:${moduleSlug}`,
      }).catch(() => {
        // Ignore increment error - not critical
      })
    })

  if (error) {
    // Non-critical, just log
    console.warn('Error tracking module usage:', error)
  }
}

/**
 * Bulk enable/disable modules for a tenant
 */
export async function setModulesEnabled(
  businessId: string,
  modules: { slug: ModuleSlug; enabled: boolean }[]
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = []

  for (const { slug, enabled } of modules) {
    const success = await setModuleEnabled(businessId, slug, enabled)
    if (!success) {
      errors.push(`Failed to ${enabled ? 'enable' : 'disable'} ${slug}`)
    }
  }

  return {
    success: errors.length === 0,
    errors,
  }
}

/**
 * Get enabled modules for a tenant as a set (for quick lookups)
 */
export async function getEnabledModulesSet(businessId: string): Promise<Set<ModuleSlug>> {
  const modules = await getTenantModules(businessId)
  return new Set(
    modules
      .filter(m => m.is_enabled)
      .map(m => m.slug as ModuleSlug)
  )
}

/**
 * Check if a route should be visible based on enabled modules
 */
export async function isRouteEnabled(
  businessId: string,
  routePath: string
): Promise<boolean> {
  const enabledModules = await getEnabledModulesSet(businessId)

  // Find which module(s) this route belongs to
  for (const [moduleSlug, routes] of Object.entries(MODULE_ROUTES)) {
    if (routes.some(r => routePath.startsWith(r))) {
      return enabledModules.has(moduleSlug as ModuleSlug)
    }
  }

  // Routes not mapped to a module are always visible
  return true
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Fallback module states when database is unavailable
 */
function getFallbackModuleStates(): TenantModuleState[] {
  return Object.values(MODULE_SLUGS).map(slug => ({
    slug,
    name: formatModuleName(slug),
    description: null,
    category: getCategoryForModule(slug),
    icon: 'Box',
    color: 'indigo',
    is_premium: PREMIUM_MODULES.includes(slug),
    is_beta: false,
    is_enabled: DEFAULT_ENABLED_MODULES.includes(slug),
    config: {},
    last_used_at: null,
  }))
}

/**
 * Format a module slug to a display name
 */
function formatModuleName(slug: string): string {
  return slug
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Get category for a module (fallback)
 */
function getCategoryForModule(slug: ModuleSlug): ModuleCategory {
  const categoryMap: Record<ModuleSlug, ModuleCategory> = {
    [MODULE_SLUGS.CRM]: 'core',
    [MODULE_SLUGS.EMAIL_MARKETING]: 'marketing',
    [MODULE_SLUGS.SMS]: 'marketing',
    [MODULE_SLUGS.AI_ASSISTANT]: 'core',
    [MODULE_SLUGS.INVESTMENT]: 'advanced',
    [MODULE_SLUGS.SOCIAL_MEDIA]: 'marketing',
    [MODULE_SLUGS.ANALYTICS]: 'analytics',
    [MODULE_SLUGS.AUTOMATION]: 'core',
    [MODULE_SLUGS.BOOKING]: 'operations',
    [MODULE_SLUGS.MISSION_CONTROL]: 'advanced',
    [MODULE_SLUGS.COMMUNICATIONS]: 'operations',
    [MODULE_SLUGS.CONTENT_CENTER]: 'marketing',
    [MODULE_SLUGS.MEDIA_LIBRARY]: 'operations',
    [MODULE_SLUGS.AGENTS]: 'advanced',
    [MODULE_SLUGS.REPORTS]: 'analytics',
  }
  return categoryMap[slug] || 'core'
}

/**
 * Check if user has access to premium modules
 * (This would typically check subscription status)
 */
export async function canAccessPremiumModules(businessId: string): Promise<boolean> {
  // Check if business has a premium subscription
  const { data, error } = await supabase
    .from('businesses')
    .select('investment_tier')
    .eq('id', businessId)
    .single()

  if (error || !data) return false
  return data.investment_tier === 'pro'
}

/**
 * Get modules grouped by category
 */
export async function getModulesByCategory(
  businessId: string
): Promise<Record<ModuleCategory, TenantModuleState[]>> {
  const modules = await getTenantModules(businessId)
  
  const grouped: Record<ModuleCategory, TenantModuleState[]> = {
    core: [],
    marketing: [],
    operations: [],
    analytics: [],
    advanced: [],
  }

  for (const module of modules) {
    grouped[module.category].push(module)
  }

  return grouped
}

// ============================================================================
// Exports
// ============================================================================

export default {
  getModuleDefinitions,
  getModuleDefinition,
  getTenantModules,
  isModuleEnabled,
  setModuleEnabled,
  getModuleConfig,
  updateModuleConfig,
  trackModuleUsage,
  setModulesEnabled,
  getEnabledModulesSet,
  isRouteEnabled,
  canAccessPremiumModules,
  getModulesByCategory,
  MODULE_SLUGS,
  MODULE_ROUTES,
}
