/**
 * Business Agent Configuration
 *
 * Typed, reusable agent definitions for SW App business namespaces.
 * Each business can define its agent roster using these types.
 *
 * DISPLAY-ONLY SCAFFOLD DATA - NOT LIVE AGENTS
 * These are Walter-server/Elisa-side display roles only.
 * No local Rico-side Walter/Luna profiles are created or implied.
 * No agent activation, outbound messaging, publishing, lead contact,
 * ad spend, or workflow automation is wired.
 *
 * Real agent isolation requires business_id + RLS on Supabase.
 */

import { Bot, Zap, Brain, Search, type LucideIcon } from 'lucide-react';

/**
 * Agent status for display purposes.
 * - ready: Agent is configured and ready (but not live-wired in scaffold)
 * - demo: UI available with mock behavior
 * - planned: Coming soon, placeholder only
 * - disabled: Explicitly turned off
 */
export type AgentStatus = 'ready' | 'demo' | 'planned' | 'disabled';

/**
 * Agent role template - defines the type of agent.
 */
export type AgentRoleTemplate =
  | 'lead-agent'
  | 'creative'
  | 'researcher'
  | 'trainer'
  | 'support'
  | 'analyst';

/**
 * Individual agent definition for a business.
 */
export interface BusinessAgentDefinition {
  /** Unique agent key within the business */
  key: string;
  /** Display name */
  name: string;
  /** Role template */
  roleTemplate: AgentRoleTemplate;
  /** Human-readable role label */
  roleLabel: string;
  /** Icon component */
  icon: LucideIcon;
  /** Current status */
  status: AgentStatus;
  /** What this agent is responsible for */
  responsibilities: string[];
  /** What this agent can currently do (in scaffold/demo) */
  currentCapabilities: string[];
  /** What requires human approval before agent can act */
  requiresApproval: string[];
  /** Last verified status text */
  lastVerified: string;
  /** Short description */
  description: string;
}

/**
 * Role template display metadata.
 */
export const roleTemplateLabels: Record<AgentRoleTemplate, string> = {
  'lead-agent': 'Lead Agent',
  'creative': 'Creative',
  'researcher': 'Researcher',
  'trainer': 'Trainer',
  'support': 'Support',
  'analyst': 'Analyst',
};

/**
 * Status badge styles and labels.
 */
export const agentStatusConfig: Record<AgentStatus, { label: string; bgColor: string; textColor: string }> = {
  ready: { label: 'Ready', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  demo: { label: 'Demo', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
  planned: { label: 'Planned', bgColor: 'bg-gray-100', textColor: 'text-gray-600' },
  disabled: { label: 'Disabled', bgColor: 'bg-red-100', textColor: 'text-red-800' },
};

/**
 * Elisa Veras Imóveis Agent Roster
 *
 * DISPLAY-ONLY SCAFFOLD DATA
 * These represent Walter-server/Elisa-side display roles.
 * No live agent execution is wired.
 */
export const elisaVerasAgents: BusinessAgentDefinition[] = [
  {
    key: 'walter',
    name: 'Walter',
    roleTemplate: 'lead-agent',
    roleLabel: 'Lead Agent / Primary Assistant',
    icon: Bot,
    status: 'planned',
    description: 'Primary conversational agent for client interactions and coordination.',
    responsibilities: [
      'Client conversation handling',
      'Lead qualification and routing',
      'Appointment scheduling coordination',
      'Cross-agent task delegation',
    ],
    currentCapabilities: [
      'Display-only scaffold (no live execution)',
    ],
    requiresApproval: [
      'Sending messages to leads/clients',
      'Scheduling appointments',
      'Updating CRM records',
      'Triggering workflows',
    ],
    lastVerified: 'Not connected yet — scaffold only',
  },
  {
    key: 'luna',
    name: 'Luna',
    roleTemplate: 'creative',
    roleLabel: 'Creative Director',
    icon: Zap,
    status: 'planned',
    description: 'Content strategy and creative direction for marketing materials.',
    responsibilities: [
      'Content ideation and planning',
      'Brand voice consistency',
      'Social media content direction',
      'Marketing campaign strategy',
    ],
    currentCapabilities: [
      'Display-only scaffold (no live execution)',
    ],
    requiresApproval: [
      'Publishing any content',
      'Posting to social media',
      'Sending marketing emails',
      'Campaign activation',
    ],
    lastVerified: 'Not connected yet — scaffold only',
  },
  {
    key: 'ev-researcher',
    name: 'EVResearcher',
    roleTemplate: 'researcher',
    roleLabel: 'Real Estate Research Agent',
    icon: Search,
    status: 'planned',
    description: 'Market analysis and property research for Elisa Veras Imóveis.',
    responsibilities: [
      'Property market research',
      'Comparable sales analysis',
      'Neighborhood insights',
      'Listing opportunity identification',
    ],
    currentCapabilities: [
      'Display-only scaffold (no live execution)',
    ],
    requiresApproval: [
      'Updating property data',
      'Sending research reports',
      'Modifying listings',
    ],
    lastVerified: 'Not connected yet — scaffold only',
  },
  {
    key: 'learner',
    name: 'Learner',
    roleTemplate: 'trainer',
    roleLabel: 'Knowledge & Training Agent',
    icon: Brain,
    status: 'planned',
    description: 'Maintains and updates the business knowledge base.',
    responsibilities: [
      'Knowledge base maintenance',
      'FAQ updates',
      'Training data curation',
      'Response quality improvement',
    ],
    currentCapabilities: [
      'Display-only scaffold (no live execution)',
    ],
    requiresApproval: [
      'Knowledge base modifications',
      'Training data updates',
      'Response template changes',
    ],
    lastVerified: 'Not connected yet — scaffold only',
  },
];

/**
 * Business agent rosters indexed by business slug.
 * Add new businesses here as they are onboarded.
 */
export const businessAgentRosters: Record<string, BusinessAgentDefinition[]> = {
  ElisaVeras: elisaVerasAgents,
};

/**
 * Get agent roster for a business.
 */
export function getBusinessAgents(businessSlug: string): BusinessAgentDefinition[] {
  return businessAgentRosters[businessSlug] ?? [];
}

/**
 * Get a specific agent by key within a business.
 */
export function getBusinessAgent(
  businessSlug: string,
  agentKey: string
): BusinessAgentDefinition | undefined {
  const roster = getBusinessAgents(businessSlug);
  return roster.find((agent) => agent.key === agentKey);
}
