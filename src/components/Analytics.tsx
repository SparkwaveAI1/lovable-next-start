import { useEffect } from 'react';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

export function Analytics() {
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) {
      console.log('Analytics: No GA_MEASUREMENT_ID configured');
      return;
    }

    // Load gtag script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID);

    console.log('Analytics: GA4 initialized with', GA_MEASUREMENT_ID);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return null;
}

// Track page views (call on route changes)
export function trackPageView(path: string) {
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: path,
    });
  }
}

// Track custom events
export function trackEvent(action: string, category: string, label?: string, value?: number) {
  if (window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}
