/**
 * Business Module Registry
 *
 * Typed, reusable module definitions for SW App business namespaces.
 * Each business can enable/disable modules from this central registry.
 *
 * NAMESPACE SCAFFOLD ONLY - NOT A SECURITY BOUNDARY
 * Real authorization requires business_id + RLS on Supabase.
 * Do not trust this registry for access control decisions.
 */

import {
  Home,
  Users,
  Bot,
  CheckCircle,
  Building2,
  FileText,
  Share2,
  BarChart3,
  Search,
  Brain,
  type LucideIcon,
} from 'lucide-react';

/**
 * All supported business module keys.
 * Add new modules here as the platform grows.
 */
export type BusinessModuleKey =
  | 'home'
  | 'crm'
  | 'agents'
  | 'approvals'
  | 'properties'
  | 'content'
  | 'social'
  | 'analytics'
  | 'seo'
  | 'brain';

/**
 * Module status for display and feature gating.
 * - live: fully functional
 * - demo: UI available with mock data, no live backend
 * - planned: placeholder UI, coming soon
 * - not-in-scope: explicitly disabled for this business/phase
 */
export type BusinessModuleStatus = 'live' | 'demo' | 'planned' | 'not-in-scope';

/**
 * Module definition with display/runtime metadata.
 */
export interface BusinessModuleDefinition {
  /** Unique module key */
  key: BusinessModuleKey;
  /** Human-readable label */
  label: string;
  /** Route path segment (appended to business slug) */
  pathSegment: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Icon key for serialization/lookup */
  iconKey: string;
  /** Short description for tooltips/help */
  description: string;
  /** Default status when enabled */
  defaultStatus: BusinessModuleStatus;
}

/**
 * Central registry of all business modules.
 * This is the single source of truth for module metadata.
 */
export const businessModuleRegistry: Record<BusinessModuleKey, BusinessModuleDefinition> = {
  home: {
    key: 'home',
    label: 'Home',
    pathSegment: '',
    icon: Home,
    iconKey: 'home',
    description: 'Business command center and overview',
    defaultStatus: 'live',
  },
  crm: {
    key: 'crm',
    label: 'CRM',
    pathSegment: 'crm',
    icon: Users,
    iconKey: 'users',
    description: 'Contact and lead management',
    defaultStatus: 'demo',
  },
  agents: {
    key: 'agents',
    label: 'Agents',
    pathSegment: 'agents',
    icon: Bot,
    iconKey: 'bot',
    description: 'AI agent team configuration and monitoring',
    defaultStatus: 'planned',
  },
  approvals: {
    key: 'approvals',
    label: 'Approvals',
    pathSegment: 'approvals',
    icon: CheckCircle,
    iconKey: 'check-circle',
    description: 'Content and campaign approval queue',
    defaultStatus: 'planned',
  },
  properties: {
    key: 'properties',
    label: 'Properties',
    pathSegment: 'properties',
    icon: Building2,
    iconKey: 'building-2',
    description: 'Real estate property listings and management',
    defaultStatus: 'not-in-scope',
  },
  content: {
    key: 'content',
    label: 'Content',
    pathSegment: 'content',
    icon: FileText,
    iconKey: 'file-text',
    description: 'Content creation and management',
    defaultStatus: 'not-in-scope',
  },
  social: {
    key: 'social',
    label: 'Social',
    pathSegment: 'social',
    icon: Share2,
    iconKey: 'share-2',
    description: 'Social media publishing and scheduling',
    defaultStatus: 'not-in-scope',
  },
  analytics: {
    key: 'analytics',
    label: 'Analytics',
    pathSegment: 'analytics',
    icon: BarChart3,
    iconKey: 'bar-chart-3',
    description: 'Business metrics and reporting',
    defaultStatus: 'not-in-scope',
  },
  seo: {
    key: 'seo',
    label: 'SEO',
    pathSegment: 'seo',
    icon: Search,
    iconKey: 'search',
    description: 'Search engine optimization tools',
    defaultStatus: 'not-in-scope',
  },
  brain: {
    key: 'brain',
    label: 'Brain',
    pathSegment: 'brain',
    icon: Brain,
    iconKey: 'brain',
    description: 'Knowledge base and AI training',
    defaultStatus: 'not-in-scope',
  },
};

/**
 * Get module definition by key.
 */
export function getModuleDefinition(key: BusinessModuleKey): BusinessModuleDefinition {
  return businessModuleRegistry[key];
}

/**
 * Get all module keys.
 */
export function getModuleKeys(): BusinessModuleKey[] {
  return Object.keys(businessModuleRegistry) as BusinessModuleKey[];
}

/**
 * Build the full route path for a module within a business namespace.
 * @param businessSlug - The business URL slug (e.g., "ElisaVeras")
 * @param moduleKey - The module key (e.g., "crm")
 * @returns Full path (e.g., "/ElisaVeras/crm")
 */
export function getBusinessModulePath(businessSlug: string, moduleKey: BusinessModuleKey): string {
  const module = businessModuleRegistry[moduleKey];
  if (module.pathSegment === '') {
    return `/${businessSlug}`;
  }
  return `/${businessSlug}/${module.pathSegment}`;
}

/**
 * Get the icon component for a module.
 */
export function getModuleIcon(key: BusinessModuleKey): LucideIcon {
  return businessModuleRegistry[key].icon;
}

/**
 * Check if a module key is valid.
 */
export function isValidModuleKey(key: string): key is BusinessModuleKey {
  return key in businessModuleRegistry;
}
