/**
 * Page-specific SEO configuration for sparkwaveai.app
 * Used by each page component via the <SEO /> component.
 */

export interface PageSEO {
  title: string;
  description: string;
  canonical: string;
}

export const SEO_CONFIG: Record<string, PageSEO> = {
  home: {
    title: 'Sparkwave AI Automation | Custom AI Workflows',
    description:
      'Custom AI automation for sales, marketing, and operations. Build workflows that multiply team output and turn manual work into repeatable systems.',
    canonical: '/',
  },
  about: {
    title: 'About Sparkwave AI Automation',
    description:
      'Meet Sparkwave AI, the custom automation team building practical AI workflows that help operators remove bottlenecks and scale output.',
    canonical: '/about',
  },
  services: {
    title: 'AI Automation Services for Growing Teams',
    description:
      'Explore AI workflow design, automation audits, ROI analysis, and system integration services built for founders and operators who need leverage.',
    canonical: '/services',
  },
  automation: {
    title: 'Workflow Automation with Custom AI Agents',
    description:
      'Build, monitor, and scale AI-driven workflows with Sparkwave. Connect tools, automate repeatable work, and keep operations moving.',
    canonical: '/automation',
  },
  caseStudies: {
    title: 'AI Automation Case Studies | Sparkwave',
    description:
      'Read Sparkwave case studies showing how AI automation improves sales follow-up, operations, research, and team productivity.',
    canonical: '/case-studies',
  },
  blog: {
    title: 'AI Automation Blog | Sparkwave',
    description:
      'Practical guides on AI automation, productivity, sales workflows, and building smarter business systems with the Sparkwave AI team.',
    canonical: '/blog',
  },
  audit: {
    title: 'Free AI Automation Audit | Sparkwave',
    description:
      'Get a free Sparkwave Automation Audit. Discover where AI can save you the most time and which workflows are ready to automate today.',
    canonical: '/audit',
  },
  roiCalculator: {
    title: 'AI Automation ROI Calculator | Sparkwave',
    description:
      'Calculate your potential ROI with AI automation. Enter your team size and hours spent on repetitive tasks to see your savings estimate.',
    canonical: '/roi-calculator',
  },
  book: {
    title: 'Book an AI Automation Demo | Sparkwave',
    description:
      'Book a Sparkwave AI demo to map your highest-value automation opportunities and decide which workflows should be automated first.',
    canonical: '/book',
  },
  personaAI: {
    title: 'PersonaAI: AI Buyer and Brand Personas',
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
    title: 'AI Sales Automation Demo | Sparkwave',
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
