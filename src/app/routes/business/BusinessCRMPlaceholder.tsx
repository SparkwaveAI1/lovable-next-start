/**
 * BusinessCRMPlaceholder - CRM scaffold for business namespace
 *
 * DEMO/SCAFFOLD ONLY - No live data connections
 * No Supabase queries, lead contacts, messaging, or automation
 */

import { getBusinessBySlug } from '@/businesses/registry';
import { useBusinessSlug } from './BusinessShell';
import { Users, Search, Plus, Filter } from 'lucide-react';

// Mock data for demo purposes only
const mockContacts = [
  { id: '1', name: 'Demo Contact A', status: 'Lead', source: 'Website' },
  { id: '2', name: 'Demo Contact B', status: 'Qualified', source: 'Referral' },
  { id: '3', name: 'Demo Contact C', status: 'Customer', source: 'Social' },
];

interface BusinessCRMPlaceholderProps {
  businessSlug?: string;
}

export default function BusinessCRMPlaceholder({ businessSlug: businessSlugProp }: BusinessCRMPlaceholderProps) {
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
            <Users className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">CRM</h1>
          </div>
          <p className="text-gray-600 mt-1">
            Contact and lead management for {config.name}
          </p>
        </div>
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
          Demo Mode
        </span>
      </div>

      {/* Demo notice */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>Demo UI Only:</strong> This CRM scaffold displays mock data.
          No live Supabase queries, lead contact operations, messaging, or
          automation are connected. Real CRM integration requires business_id scope
          and RLS policies.
        </p>
      </div>

      {/* Toolbar - disabled/demo */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts (demo)..."
            disabled
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
          />
        </div>
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-400 cursor-not-allowed"
        >
          <Filter className="w-4 h-4" />
          Filter
        </button>
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-400 rounded-lg cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {/* Demo table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                Name
              </th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                Status
              </th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                Source
              </th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {mockContacts.map((contact) => (
              <tr key={contact.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 text-gray-900">{contact.name}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {contact.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{contact.source}</td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-400">Demo only</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <p className="mt-4 text-xs text-gray-500">
        Mock data shown above. No live queries or mutations are performed.
      </p>
    </div>
  );
}
