/**
 * BusinessAgentsPlaceholder - Agent team scaffold for business namespace
 *
 * PLANNED/SCAFFOLD ONLY - No live data connections
 * Display roles (Walter, Luna, EVResearcher, Learner) are Walter-server/Elisa-side only
 * No local Rico-side profiles are created or implied
 */

import { getBusinessBySlug } from '@/businesses/registry';
import { useBusinessSlug } from './BusinessShell';
import { Bot, Zap, Brain, Search as SearchIcon } from 'lucide-react';

// Display-only agent cards - these represent Walter-server/Elisa-side roles
const displayAgents = [
  {
    name: 'Walter',
    role: 'Primary Assistant',
    description: 'Main conversational agent for client interactions',
    icon: Bot,
    status: 'planned',
  },
  {
    name: 'Luna',
    role: 'Creative Director',
    description: 'Content and creative strategy guidance',
    icon: Zap,
    status: 'planned',
  },
  {
    name: 'EVResearcher',
    role: 'Research Agent',
    description: 'Market and property research assistant',
    icon: SearchIcon,
    status: 'planned',
  },
  {
    name: 'Learner',
    role: 'Training Agent',
    description: 'Learning and knowledge base updates',
    icon: Brain,
    status: 'planned',
  },
];

interface BusinessAgentsPlaceholderProps {
  businessSlug?: string;
}

export default function BusinessAgentsPlaceholder({ businessSlug: businessSlugProp }: BusinessAgentsPlaceholderProps) {
  // Use prop if provided, otherwise get from outlet context (set by BusinessShell)
  const outletContext = useBusinessSlug();
  const businessSlug = businessSlugProp ?? outletContext?.businessSlug;
  const config = businessSlug ? getBusinessBySlug(businessSlug) : undefined;

  if (!config) {
    return <div className="p-8">Business not found</div>;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">Agent Team</h1>
          </div>
          <p className="text-gray-600 mt-1">
            AI agents for {config.name}
          </p>
        </div>
        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
          Planned
        </span>
      </div>

      {/* Notice */}
      <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-sm text-purple-800">
          <strong>Planned Feature:</strong> This scaffold shows display roles for
          the {config.name} agent team. These are Walter-server/Elisa-side display
          roles only - no local Rico-side Walter/Luna profiles are created here.
          Agent activation requires backend integration.
        </p>
      </div>

      {/* Agent cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {displayAgents.map((agent) => {
          const Icon = agent.icon;
          return (
            <div
              key={agent.name}
              className="p-6 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Icon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                      {agent.status}
                    </span>
                  </div>
                  <p className="text-sm text-purple-600 mt-0.5">{agent.role}</p>
                  <p className="text-sm text-gray-600 mt-2">{agent.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-gray-500">
        Display roles shown for planning purposes. No agent activations, messaging,
        or automation are wired in this scaffold.
      </p>
    </div>
  );
}
