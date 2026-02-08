// Documentation manifest - defines all docs and their metadata
// Rico can update this file to add/remove documentation

export interface DocPage {
  id: string;
  title: string;
  path: string;
  category: string;
  lastUpdated: string;
  description?: string;
}

export interface DocCategory {
  id: string;
  title: string;
  icon: string;
  pages: DocPage[];
}

export const docCategories: DocCategory[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: 'BookOpen',
    pages: [
      {
        id: 'what-is-sparkwave',
        title: 'What is Sparkwave?',
        path: 'overview/what-is-sparkwave',
        category: 'overview',
        lastUpdated: '2026-02-05',
        description: 'Introduction to Sparkwave and its key features'
      },
      {
        id: 'key-features',
        title: 'Key Features',
        path: 'overview/key-features',
        category: 'overview',
        lastUpdated: '2026-02-05',
        description: 'Overview of all major Sparkwave capabilities'
      }
    ]
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: 'Rocket',
    pages: [
      {
        id: 'quick-start',
        title: 'Quick Start Guide',
        path: 'getting-started/quick-start',
        category: 'getting-started',
        lastUpdated: '2026-02-05',
        description: 'Get up and running with Sparkwave in 5 minutes'
      },
      {
        id: 'onboarding',
        title: 'Onboarding Flow',
        path: 'getting-started/onboarding',
        category: 'getting-started',
        lastUpdated: '2026-02-05',
        description: 'Complete walkthrough of the setup process'
      }
    ]
  },
  {
    id: 'features',
    title: 'Features',
    icon: 'Zap',
    pages: [
      {
        id: 'agents',
        title: 'AI Agents',
        path: 'features/agents',
        category: 'features',
        lastUpdated: '2026-02-05',
        description: 'How AI agents work and how to configure them'
      },
      {
        id: 'agent-framework',
        title: 'Agent Framework',
        path: 'features/agent-framework',
        category: 'features',
        lastUpdated: '2026-02-08',
        description: 'Documentation standard and framework for all agents'
      },
      {
        id: 'tasks',
        title: 'Task Management',
        path: 'features/tasks',
        category: 'features',
        lastUpdated: '2026-02-05',
        description: 'Managing and tracking automated tasks'
      },
      {
        id: 'health-monitoring',
        title: 'Health Monitoring',
        path: 'features/health-monitoring',
        category: 'features',
        lastUpdated: '2026-02-05',
        description: 'Monitor your automation health in real-time'
      },
      {
        id: 'reports',
        title: 'Reports & Analytics',
        path: 'features/reports',
        category: 'features',
        lastUpdated: '2026-02-05',
        description: 'Analytics dashboards and reporting'
      },
      {
        id: 'rico-chat',
        title: 'Rico AI Assistant',
        path: 'features/rico-chat',
        category: 'features',
        lastUpdated: '2026-02-05',
        description: 'Using the Rico AI chat assistant'
      }
    ]
  },
  {
    id: 'how-to',
    title: 'How-To Guides',
    icon: 'FileText',
    pages: [
      {
        id: 'create-first-automation',
        title: 'Create Your First Automation',
        path: 'how-to/create-first-automation',
        category: 'how-to',
        lastUpdated: '2026-02-05',
        description: 'Step-by-step guide to setting up automation'
      },
      {
        id: 'connect-integrations',
        title: 'Connect Integrations',
        path: 'how-to/connect-integrations',
        category: 'how-to',
        lastUpdated: '2026-02-05',
        description: 'How to connect external services'
      },
      {
        id: 'customize-agents',
        title: 'Customize Agent Behavior',
        path: 'how-to/customize-agents',
        category: 'how-to',
        lastUpdated: '2026-02-05',
        description: 'Fine-tune how your agents respond and act'
      }
    ]
  },
  {
    id: 'faq',
    title: 'FAQ',
    icon: 'HelpCircle',
    pages: [
      {
        id: 'general-faq',
        title: 'General Questions',
        path: 'faq/general',
        category: 'faq',
        lastUpdated: '2026-02-05',
        description: 'Frequently asked questions about Sparkwave'
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: 'Wrench',
    pages: [
      {
        id: 'common-issues',
        title: 'Common Issues',
        path: 'troubleshooting/common-issues',
        category: 'troubleshooting',
        lastUpdated: '2026-02-05',
        description: 'Solutions to common problems'
      }
    ]
  }
];

// Flatten all pages for search
export const allDocPages: DocPage[] = docCategories.flatMap(cat => cat.pages);

// Get a doc page by its path
export function getDocByPath(path: string): DocPage | undefined {
  return allDocPages.find(page => page.path === path);
}

// Search docs by query
export function searchDocs(query: string): DocPage[] {
  const lowerQuery = query.toLowerCase();
  return allDocPages.filter(page => 
    page.title.toLowerCase().includes(lowerQuery) ||
    page.description?.toLowerCase().includes(lowerQuery) ||
    page.path.toLowerCase().includes(lowerQuery)
  );
}
