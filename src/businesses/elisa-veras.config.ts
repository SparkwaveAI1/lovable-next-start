/**
 * Elisa Veras Imóveis Business Configuration
 *
 * NAMESPACE SCAFFOLD ONLY - NOT A SECURITY BOUNDARY
 * Real authorization requires business_id + RLS on Supabase.
 * Do not trust this config or localStorage for access control.
 */

import type { BusinessConfig } from './registry';

export const elisaVerasConfig: BusinessConfig = {
  id: 'elisa-veras', // Placeholder ID - needs real business_id from Supabase
  slug: 'ElisaVeras',
  name: 'Elisa Veras Imóveis',

  // Display roles for the business shell UI only
  // These are NOT local user profiles - they represent Walter-server/Elisa-side display roles
  displayRoles: ['Walter', 'Luna', 'EVResearcher', 'Learner'],

  // Navigation items for the business shell
  navigation: [
    { label: 'Home', path: '/ElisaVeras', icon: 'home' },
    { label: 'CRM', path: '/ElisaVeras/crm', icon: 'users', status: 'demo' },
    { label: 'Agents', path: '/ElisaVeras/agents', icon: 'bot', status: 'planned' },
    { label: 'Approvals', path: '/ElisaVeras/approvals', icon: 'check-circle', status: 'planned' },
  ],

  // Branding
  branding: {
    primaryColor: '#1e40af', // Blue
    accentColor: '#3b82f6',
  },

  // Feature flags for this business
  features: {
    crm: { enabled: true, status: 'demo' },
    agents: { enabled: true, status: 'planned' },
    approvals: { enabled: true, status: 'planned' },
    // Explicitly disabled features per constraints
    properties: { enabled: false, status: 'not-in-scope' },
    content: { enabled: false, status: 'not-in-scope' },
    social: { enabled: false, status: 'not-in-scope' },
    analytics: { enabled: false, status: 'not-in-scope' },
    seo: { enabled: false, status: 'not-in-scope' },
    brain: { enabled: false, status: 'not-in-scope' },
  },
};
