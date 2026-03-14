import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://sparkwave-ai.com';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string; // relative path like "/about" or absolute URL
  ogType?: 'website' | 'article';
  ogImage?: string;
  noIndex?: boolean;
}

export function SEO({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage = DEFAULT_IMAGE,
  noIndex = false,
}: SEOProps) {
  const siteName = 'Sparkwave AI';
  const fullTitle = title ? `${title} | ${siteName}` : `${siteName} - 10x Your Output, Zero Extra Hours`;
  const metaDescription =
    description ||
    '10x your output, zero extra hours. Custom AI automation that multiplies your productivity—not just saves time.';

  // Resolve canonical: absolute URLs pass through, relative paths get BASE_URL prepended
  let canonicalUrl = `${BASE_URL}/`;
  if (canonical) {
    canonicalUrl = canonical.startsWith('http') ? canonical : `${BASE_URL}${canonical}`;
  }

  return (
    <Helmet>
      {/* Core */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={canonicalUrl} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@SparkwaveAI" />
      <meta name="twitter:creator" content="@ScottSparkwave" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
