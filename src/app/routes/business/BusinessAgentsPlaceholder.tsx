/**
 * BusinessAgentsPlaceholder - Agent Team View for business namespace
 *
 * DISPLAY-ONLY SCAFFOLD - NO LIVE AGENT EXECUTION
 * These are Walter-server/Elisa-side display roles only.
 * No local Rico-side Walter/Luna profiles are created or implied.
 * No agent activation, outbound messaging, publishing, lead contact,
 * ad spend, or workflow automation is wired.
 *
 * Real agent isolation requires business_id + RLS on Supabase.
 */

import { getBusinessBySlug } from '@/businesses/registry';
import {
  getBusinessAgents,
  agentStatusConfig,
  type BusinessAgentDefinition,
} from '@/businesses/agents';
import { useBusinessSlug } from './BusinessShell';
import { Bot, CheckCircle, Clock, Shield, AlertTriangle } from 'lucide-react';

interface BusinessAgentsPlaceholderProps {
  businessSlug?: string;
}

function AgentStatusBadge({ status }: { status: BusinessAgentDefinition['status'] }) {
  const config = agentStatusConfig[status];
  return (
    <span className={`px-2 py-0.5 text-xs rounded ${config.bgColor} ${config.textColor}`}>
      {config.label}
    </span>
  );
}

function AgentCard({ agent }: { agent: BusinessAgentDefinition }) {
  const Icon = agent.icon;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Icon className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{agent.name}</h3>
              <AgentStatusBadge status={agent.status} />
            </div>
            <p className="text-sm text-purple-600">{agent.roleLabel}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">{agent.description}</p>
      </div>

      {/* Details */}
      <div className="p-4 space-y-4">
        {/* Responsibilities */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Bot className="w-4 h-4" />
            <span>Responsible For</span>
          </div>
          <ul className="text-sm text-gray-600 space-y-1 ml-6">
            {agent.responsibilities.map((item, i) => (
              <li key={i} className="list-disc">{item}</li>
            ))}
          </ul>
        </div>

        {/* Current Capabilities */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Current Capabilities</span>
          </div>
          <ul className="text-sm text-gray-600 space-y-1 ml-6">
            {agent.currentCapabilities.map((item, i) => (
              <li key={i} className="list-disc">{item}</li>
            ))}
          </ul>
        </div>

        {/* Requires Approval */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Shield className="w-4 h-4 text-orange-600" />
            <span>Requires Human Approval</span>
          </div>
          <ul className="text-sm text-gray-600 space-y-1 ml-6">
            {agent.requiresApproval.map((item, i) => (
              <li key={i} className="list-disc">{item}</li>
            ))}
          </ul>
        </div>

        {/* Last Verified */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{agent.lastVerified}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BusinessAgentsPlaceholder({ businessSlug: businessSlugProp }: BusinessAgentsPlaceholderProps) {
  // Use prop if provided, otherwise get from outlet context (set by BusinessShell)
  const outletContext = useBusinessSlug();
  const businessSlug = businessSlugProp ?? outletContext?.businessSlug;
  const config = businessSlug ? getBusinessBySlug(businessSlug) : undefined;
  const agents = businessSlug ? getBusinessAgents(businessSlug) : [];

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
          Scaffold
        </span>
      </div>

      {/* Scaffold Notice */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Display-Only Scaffold — No Live Automation</p>
            <p className="mt-1">
              These are Walter-server/Elisa-side display roles only. No local Rico-side
              Walter/Luna profiles are created here. No agent activation, outbound messaging,
              publishing, lead contact, ad spend, or workflow automation is wired.
            </p>
            <p className="mt-1 text-amber-700">
              Real agent isolation requires business_id + RLS on Supabase.
            </p>
          </div>
        </div>
      </div>

      {/* Agent Cards */}
      {agents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Agents Configured</h3>
          <p className="text-gray-600 mt-1">
            Agent roster not yet defined for this business.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {agents.map((agent) => (
            <AgentCard key={agent.key} agent={agent} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">About This View</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Agent data is display-only scaffold configuration</li>
          <li>• No live agent execution or API connections</li>
          <li>• Approval requirements shown are planned, not enforced</li>
          <li>• Real implementation requires Walter-server integration</li>
        </ul>
      </div>
    </div>
  );
}
