export interface FightFlowBusinessContextInput {
  id?: string;
  name?: string;
  slug?: string;
}

export const FIGHT_FLOW_FALLBACK_BUSINESS_ID = '456dc53b-d9d9-41b0-bc33-4f4c4a791eff';

export function getFightFlowBusinessContext(selectedBusiness?: FightFlowBusinessContextInput) {
  return {
    businessId: selectedBusiness?.id || FIGHT_FLOW_FALLBACK_BUSINESS_ID,
    businessName: selectedBusiness?.name || 'Fight Flow Academy',
    businessSlug: selectedBusiness?.slug || 'fight-flow-academy',
    isFallback: !selectedBusiness?.id,
  };
}
