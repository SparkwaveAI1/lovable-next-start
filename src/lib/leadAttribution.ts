export type LeadAttribution = {
  source_url: string | null;
  referrer: string | null;
  user_agent: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
};

const getParam = (params: URLSearchParams, key: string): string | null => {
  const value = params.get(key);
  return value && value.trim() ? value.trim() : null;
};

export const getLeadAttribution = (): LeadAttribution => {
  if (typeof window === 'undefined') {
    return {
      source_url: null,
      referrer: null,
      user_agent: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
    };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    source_url: window.location.href,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent || null,
    utm_source: getParam(params, 'utm_source'),
    utm_medium: getParam(params, 'utm_medium'),
    utm_campaign: getParam(params, 'utm_campaign'),
    utm_term: getParam(params, 'utm_term'),
    utm_content: getParam(params, 'utm_content'),
  };
};
