/**
 * Elisa Veras Imóveis Business Configuration
 *
 * NAMESPACE SCAFFOLD ONLY - NOT A SECURITY BOUNDARY
 * Real authorization requires business_id + RLS on Supabase.
 * Do not trust this config or localStorage for access control.
 */

import type { BusinessConfig } from './registry';
import type { BusinessModuleKey, BusinessModuleStatus } from './modules';

/**
 * Module enablement configuration for Elisa Veras.
 * Uses typed module keys from the central module registry.
 */
export const elisaVerasModules: Record<BusinessModuleKey, { enabled: boolean; status: BusinessModuleStatus }> = {
  // Enabled modules
  home: { enabled: true, status: 'live' },
  crm: { enabled: true, status: 'demo' },
  agents: { enabled: true, status: 'planned' },
  approvals: { enabled: true, status: 'planned' },

  // Explicitly disabled modules (not in scope for this phase)
  properties: { enabled: false, status: 'not-in-scope' },
  content: { enabled: false, status: 'not-in-scope' },
  social: { enabled: false, status: 'not-in-scope' },
  analytics: { enabled: false, status: 'not-in-scope' },
  seo: { enabled: false, status: 'not-in-scope' },
  brain: { enabled: false, status: 'not-in-scope' },
};

export const elisaVerasConfig: BusinessConfig = {
  id: 'elisa-veras', // Placeholder ID - needs real business_id from Supabase
  slug: 'ElisaVeras',
  name: 'Elisa Veras Imóveis',

  // Display roles for the business shell UI only
  // These are NOT local user profiles - they represent Walter-server/Elisa-side display roles
  displayRoles: ['Walter', 'Luna', 'EVResearcher', 'Learner'],

  // Module configuration using typed keys
  modules: elisaVerasModules,

  // Branding
  branding: {
    primaryColor: '#1e40af', // Blue
    accentColor: '#3b82f6',
  },
};
