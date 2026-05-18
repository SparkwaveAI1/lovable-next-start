/**
 * BusinessShell - Layout wrapper for business namespace pages
 *
 * Provides Elisa-specific navigation, NOT the generic Sparkwave/Growth OS sidebar.
 *
 * NAMESPACE SCAFFOLD ONLY - NOT A SECURITY BOUNDARY
 * Real authorization requires business_id + RLS on Supabase.
 */

import { Outlet, useParams, Link, useLocation, useOutletContext } from 'react-router-dom';
import {
  getBusinessBySlug,
  getBusinessNavigation,
  type NavItem,
  type FeatureStatus,
} from '@/businesses/registry';
import { getModuleIcon } from '@/businesses/modules';
import { AlertTriangle } from 'lucide-react';

// Props type for explicit slug with useParams fallback
interface BusinessShellProps {
  businessSlug?: string;
}

// Context type for child routes
type BusinessOutletContext = {
  businessSlug: string;
};

// Hook for child components to get businessSlug from outlet context
export function useBusinessSlug() {
  return useOutletContext<BusinessOutletContext>();
}

function StatusBadge({ status }: { status?: FeatureStatus }) {
  if (!status || status === 'live') return null;

  const styles: Record<FeatureStatus, string> = {
    live: '',
    demo: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    planned: 'bg-gray-100 text-gray-600 border-gray-300',
    'not-in-scope': 'bg-red-100 text-red-800 border-red-300',
  };

  const labels: Record<FeatureStatus, string> = {
    live: '',
    demo: 'Demo',
    planned: 'Planned',
    'not-in-scope': 'N/A',
  };

  return (
    <span className={`ml-2 px-1.5 py-0.5 text-xs rounded border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  // Get icon component from module registry
  const Icon = getModuleIcon(item.key);

  return (
    <Link
      to={item.path}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-100 text-blue-900'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
      title={item.description}
    >
      <Icon className="w-5 h-5" />
      <span>{item.label}</span>
      <StatusBadge status={item.status} />
    </Link>
  );
}

export default function BusinessShell({ businessSlug: businessSlugProp }: BusinessShellProps) {
  const params = useParams<{ businessSlug?: string }>();
  const businessSlug = businessSlugProp ?? params.businessSlug;
  const location = useLocation();
  const config = businessSlug ? getBusinessBySlug(businessSlug) : undefined;

  // Derive navigation from module registry
  const navigation = businessSlug ? getBusinessNavigation(businessSlug) : [];

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900">Business Not Found</h1>
          <p className="text-gray-600 mt-2">
            No configuration found for "{businessSlug}"
          </p>
          <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Business-specific sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Business header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">{config.name}</h1>
          <p className="text-xs text-gray-500 mt-1">
            Namespace scaffold (not security boundary)
          </p>
        </div>

        {/* Navigation - derived from module registry */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.key}
              item={item}
              isActive={location.pathname === item.path}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
          <p>Display roles: {config.displayRoles.join(', ')}</p>
          <p className="mt-1 text-yellow-600">
            Demo/scaffold only. No live data connections.
          </p>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto">
        <Outlet context={{ businessSlug } satisfies BusinessOutletContext} />
      </main>
    </div>
  );
}
