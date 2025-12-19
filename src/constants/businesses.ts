// Centralized business definitions
// This provides a single source of truth for business IDs across the app
// Future improvement: Replace with dynamic loading from useBusinesses() hook

export interface BusinessDefinition {
  id: string;
  slug: string;
  name: string;
}

export const BUSINESSES: BusinessDefinition[] = [
  { id: '456dc53b-d9d9-41b0-bc33-4f4c4a791eff', slug: 'fight-flow-academy', name: 'Fight Flow Academy' },
  { id: '5a9bbfcf-fae5-4063-9780-bcbe366bae88', slug: 'sparkwave-ai', name: 'Sparkwave AI' },
  { id: '18d0dbb1-a82d-4477-a9f8-816a1fa2ee08', slug: 'persona-ai', name: 'PersonaAI' },
  { id: '350b8fcb-9bfe-4b53-9548-c6ffdb1d3cb5', slug: 'charx-world', name: 'CharX World' },
];

export const BUSINESS_ID_MAP: Record<string, string> = {
  'fight-flow-academy': '456dc53b-d9d9-41b0-bc33-4f4c4a791eff',
  'sparkwave-ai': '5a9bbfcf-fae5-4063-9780-bcbe366bae88',
  'persona-ai': '18d0dbb1-a82d-4477-a9f8-816a1fa2ee08',
  'charx-world': '350b8fcb-9bfe-4b53-9548-c6ffdb1d3cb5',
};

export const getBusinessById = (id: string): BusinessDefinition | undefined =>
  BUSINESSES.find(b => b.id === id);

export const getBusinessBySlug = (slug: string): BusinessDefinition | undefined =>
  BUSINESSES.find(b => b.slug === slug);
