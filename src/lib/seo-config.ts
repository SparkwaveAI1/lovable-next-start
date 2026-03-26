/**
 * Page-specific SEO configuration for sparkwave-ai.com
 * Used by each page component via the <SEO /> component.
 */

export interface PageSEO {
  title: string;
  description: string;
  canonical: string;
}

export const SEO_CONFIG: Record<string, PageSEO> = {
  home: {
    title: 'AI Automation That Drives Revenue',
    description:
      'We build custom AI systems for sales, marketing, and operations. Not chatbot wrappers. Real automation that 10x your team output. Book a free audit today.',
    canonical: '/',
  },
  about: {
    title: 'About Us',
    description:
      'Meet the team behind Sparkwave AI. We build custom AI automation solutions that multiply team productivity and drive measurable business results.',
    canonical: '/about',
  },
  services: {
    title: 'Our Services',
    description:
      'Explore Sparkwave AI services: custom AI workflows, automation audits, ROI analysis, and enterprise integration. Built for founders and operators who want real leverage.',
    canonical: '/services',
  },
  automation: {
    title: 'Automation Platform',
    description:
      'The Sparkwave automation platform—build, monitor, and scale AI-driven workflows without engineering overhead. Connect your tools and let AI do the heavy lifting.',
    canonical: '/automation',
  },
  caseStudies: {
    title: 'Case Studies',
    description:
      'See how Sparkwave AI has helped businesses 10x their output. Real results, real clients, real ROI—from solopreneurs to growing teams.',
    canonical: '/case-studies',
  },
  blog: {
    title: 'Blog',
    description:
      'Practical insights on AI automation, productivity, and building smarter workflows. Written by the Sparkwave AI team.',
    canonical: '/blog',
  },
  audit: {
    title: 'Free Automation Audit',
    description:
      'Get a free Sparkwave Automation Audit. Discover where AI can save you the most time and which workflows are ready to automate today.',
    canonical: '/audit',
  },
  roiCalculator: {
    title: 'ROI Calculator',
    description:
      'Calculate your potential ROI with AI automation. Enter your team size and hours spent on repetitive tasks to see your savings estimate.',
    canonical: '/roi-calculator',
  },
  book: {
    title: 'Book a Call',
    description:
      'Book a strategy call with the Sparkwave AI team. We will map out an automation plan tailored to your business in 30 minutes.',
    canonical: '/book',
  },
  personaAI: {
    title: 'PersonaAI',
    description:
      'PersonaAI by Sparkwave: behavioral simulation and AI persona research for product teams, marketers, and researchers.',
    canonical: '/persona-ai',
  },
  faq: {
    title: 'FAQ',
    description:
      'Frequently asked questions about Sparkwave AI, our automation services, pricing, and how we work with clients.',
    canonical: '/faq',
  },
  sales: {
    title: 'Sales Automation',
    description:
      'Automate your sales pipeline with Sparkwave AI. From lead capture to follow-up sequences, let AI keep your pipeline moving while you focus on closing.',
    canonical: '/sales',
  },
  auth: {
    title: 'Sign In',
    description: 'Sign in to your Sparkwave AI account.',
    canonical: '/auth',
  },
};
