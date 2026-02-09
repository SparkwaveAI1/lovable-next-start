/**
 * Tenant Configuration System
 * 
 * Provides per-tenant settings for branding, enabled modules, 
 * notifications, and timezone preferences.
 */

import { supabase } from "@/integrations/supabase/client"

// ============================================================================
// Types
// ============================================================================

export interface TenantBranding {
  primary_color: string
  secondary_color: string
  logo_url: string | null
  favicon_url: string | null
  company_name: string | null
  tagline: string | null
}

export interface TenantModules {
  crm: boolean
  email_marketing: boolean
  sms: boolean
  ai_assistant: boolean
  investment: boolean
  social_media: boolean
  analytics: boolean
  automation: boolean
  booking: boolean
  mission_control: boolean
}

export interface TenantNotifications {
  email_enabled: boolean
  sms_enabled: boolean
  push_enabled: boolean
  digest_frequency: 'none' | 'daily' | 'weekly' | 'realtime'
  alert_threshold: 'low' | 'medium' | 'high' | 'critical'
  quiet_hours_start: string | null  // HH:MM format
  quiet_hours_end: string | null    // HH:MM format
}

export interface TenantConfig {
  id: string
  business_id: string
  branding: TenantBranding
  enabled_modules: TenantModules
  notifications: TenantNotifications
  timezone: string
  created_at: string
  updated_at: string
}

export interface TenantConfigUpdate {
  branding?: Partial<TenantBranding>
  enabled_modules?: Partial<TenantModules>
  notifications?: Partial<TenantNotifications>
  timezone?: string
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_BRANDING: TenantBranding = {
  primary_color: '#6366f1',
  secondary_color: '#8b5cf6',
  logo_url: null,
  favicon_url: null,
  company_name: null,
  tagline: null,
}

const DEFAULT_MODULES: TenantModules = {
  crm: true,
  email_marketing: true,
  sms: true,
  ai_assistant: true,
  investment: false,
  social_media: true,
  analytics: true,
  automation: true,
  booking: true,
  mission_control: false,
}

const DEFAULT_NOTIFICATIONS: TenantNotifications = {
  email_enabled: true,
  sms_enabled: false,
  push_enabled: false,
  digest_frequency: 'daily',
  alert_threshold: 'high',
  quiet_hours_start: null,
  quiet_hours_end: null,
}

const DEFAULT_TIMEZONE = 'America/New_York'

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get tenant configuration by business ID
 * Creates default config if none exists
 */
export async function getTenantConfig(businessId: string): Promise<TenantConfig | null> {
  try {
    // First, try to fetch existing config
    const { data, error } = await supabase
      .from('tenant_config')
      .select('*')
      .eq('business_id', businessId)
      .single()

    if (error) {
      // If no config exists, create one with defaults
      if (error.code === 'PGRST116') {
        return await createDefaultConfig(businessId)
      }
      console.error('Error fetching tenant config:', error)
      return null
    }

    // Parse JSONB fields and merge with defaults
    return normalizeConfig(data)
  } catch (error) {
    console.error('Error in getTenantConfig:', error)
    return null
  }
}

/**
 * Update tenant configuration
 * Supports partial updates for any section
 */
export async function updateTenantConfig(
  businessId: string,
  updates: TenantConfigUpdate
): Promise<TenantConfig | null> {
  try {
    // Get current config first
    const current = await getTenantConfig(businessId)
    if (!current) {
      console.error('No config found for business:', businessId)
      return null
    }

    // Build the update payload, merging partials
    const updatePayload: Record<string, unknown> = {}

    if (updates.branding) {
      updatePayload.branding = {
        ...current.branding,
        ...updates.branding,
      }
    }

    if (updates.enabled_modules) {
      updatePayload.enabled_modules = {
        ...current.enabled_modules,
        ...updates.enabled_modules,
      }
    }

    if (updates.notifications) {
      updatePayload.notifications = {
        ...current.notifications,
        ...updates.notifications,
      }
    }

    if (updates.timezone) {
      updatePayload.timezone = updates.timezone
    }

    // Perform the update
    const { data, error } = await supabase
      .from('tenant_config')
      .update(updatePayload)
      .eq('business_id', businessId)
      .select()
      .single()

    if (error) {
      console.error('Error updating tenant config:', error)
      return null
    }

    return normalizeConfig(data)
  } catch (error) {
    console.error('Error in updateTenantConfig:', error)
    return null
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create default configuration for a new tenant
 */
async function createDefaultConfig(businessId: string): Promise<TenantConfig | null> {
  const { data, error } = await supabase
    .from('tenant_config')
    .insert({
      business_id: businessId,
      branding: DEFAULT_BRANDING,
      enabled_modules: DEFAULT_MODULES,
      notifications: DEFAULT_NOTIFICATIONS,
      timezone: DEFAULT_TIMEZONE,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating default tenant config:', error)
    return null
  }

  return normalizeConfig(data)
}

/**
 * Normalize raw database row to TenantConfig type
 * Ensures all fields have proper defaults
 */
function normalizeConfig(raw: Record<string, unknown>): TenantConfig {
  return {
    id: raw.id as string,
    business_id: raw.business_id as string,
    branding: {
      ...DEFAULT_BRANDING,
      ...(raw.branding as Partial<TenantBranding> || {}),
    },
    enabled_modules: {
      ...DEFAULT_MODULES,
      ...(raw.enabled_modules as Partial<TenantModules> || {}),
    },
    notifications: {
      ...DEFAULT_NOTIFICATIONS,
      ...(raw.notifications as Partial<TenantNotifications> || {}),
    },
    timezone: (raw.timezone as string) || DEFAULT_TIMEZONE,
    created_at: raw.created_at as string,
    updated_at: raw.updated_at as string,
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Check if a specific module is enabled for a tenant
 */
export async function isModuleEnabled(
  businessId: string,
  module: keyof TenantModules
): Promise<boolean> {
  const config = await getTenantConfig(businessId)
  return config?.enabled_modules[module] ?? DEFAULT_MODULES[module]
}

/**
 * Get tenant's timezone
 */
export async function getTenantTimezone(businessId: string): Promise<string> {
  const config = await getTenantConfig(businessId)
  return config?.timezone ?? DEFAULT_TIMEZONE
}

/**
 * Get tenant's branding
 */
export async function getTenantBranding(businessId: string): Promise<TenantBranding> {
  const config = await getTenantConfig(businessId)
  return config?.branding ?? DEFAULT_BRANDING
}

/**
 * Enable or disable a module for a tenant
 */
export async function setModuleEnabled(
  businessId: string,
  module: keyof TenantModules,
  enabled: boolean
): Promise<boolean> {
  const result = await updateTenantConfig(businessId, {
    enabled_modules: { [module]: enabled },
  })
  return result !== null
}

/**
 * Update tenant branding
 */
export async function updateTenantBranding(
  businessId: string,
  branding: Partial<TenantBranding>
): Promise<TenantConfig | null> {
  return updateTenantConfig(businessId, { branding })
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  businessId: string,
  notifications: Partial<TenantNotifications>
): Promise<TenantConfig | null> {
  return updateTenantConfig(businessId, { notifications })
}

/**
 * Set tenant timezone
 */
export async function setTenantTimezone(
  businessId: string,
  timezone: string
): Promise<boolean> {
  const result = await updateTenantConfig(businessId, { timezone })
  return result !== null
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Get configs for multiple tenants
 */
export async function getTenantConfigs(
  businessIds: string[]
): Promise<Map<string, TenantConfig>> {
  const result = new Map<string, TenantConfig>()

  if (businessIds.length === 0) return result

  const { data, error } = await supabase
    .from('tenant_config')
    .select('*')
    .in('business_id', businessIds)

  if (error) {
    console.error('Error fetching tenant configs:', error)
    return result
  }

  for (const row of data || []) {
    result.set(row.business_id, normalizeConfig(row))
  }

  return result
}

/**
 * Get all tenant configs (admin use only)
 */
export async function getAllTenantConfigs(): Promise<TenantConfig[]> {
  const { data, error } = await supabase
    .from('tenant_config')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all tenant configs:', error)
    return []
  }

  return (data || []).map(normalizeConfig)
}
