/**
 * @deprecated BUSINESSES constant is deprecated. Use useBusinesses() hook instead.
 * 
 * The useBusinesses() hook loads businesses from the database with proper
 * permission checking. This file is kept for backwards compatibility with:
 * - EmployeeUpload.tsx (uses BUSINESS_ID_MAP for Fight Flow specific logic)
 * - ContentReviewDialog.tsx (uses BUSINESS_ID_MAP for slug-to-id conversion)
 * 
 * These files should be migrated to use the hook or database lookups.
 * 
 * @see src/hooks/useBusinesses.ts
 */

export interface BusinessDefinition {
  id: string;
  slug: string;
  name: string;
}

/** @deprecated Use useBusinesses() hook instead */
export const BUSINESSES: BusinessDefinition[] = [
  { id: '456dc53b-d9d9-41b0-bc33-4f4c4a791eff', slug: 'fight-flow-academy', name: 'Fight Flow Academy' },
  { id: '5a9bbfcf-fae5-4063-9780-bcbe366bae88', slug: 'sparkwave-ai', name: 'Sparkwave AI' },
  { id: '18d0dbb1-a82d-4477-a9f8-816a1fa2ee08', slug: 'persona-ai', name: 'PersonaAI' },
  { id: '350b8fcb-9bfe-4b53-9548-c6ffdb1d3cb5', slug: 'charx-world', name: 'CharX World' },
];

/** @deprecated Use database lookup or useBusinesses() hook instead */
export const BUSINESS_ID_MAP: Record<string, string> = {
  'fight-flow-academy': '456dc53b-d9d9-41b0-bc33-4f4c4a791eff',
  'sparkwave-ai': '5a9bbfcf-fae5-4063-9780-bcbe366bae88',
  'persona-ai': '18d0dbb1-a82d-4477-a9f8-816a1fa2ee08',
  'charx-world': '350b8fcb-9bfe-4b53-9548-c6ffdb1d3cb5',
};

/** @deprecated Use useBusinesses() hook instead */
export const getBusinessById = (id: string): BusinessDefinition | undefined =>
  BUSINESSES.find(b => b.id === id);

/** @deprecated Use useBusinesses() hook instead */
export const getBusinessBySlug = (slug: string): BusinessDefinition | undefined =>
  BUSINESSES.find(b => b.slug === slug);
