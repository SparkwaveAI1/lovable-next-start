/**
 * BusinessHome - Home page for a business namespace
 *
 * DEMO/SCAFFOLD ONLY - No live data connections
 */

import { useParams } from 'react-router-dom';
import { getBusinessBySlug } from '@/businesses/registry';
import { Building2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BusinessHome() {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const config = businessSlug ? getBusinessBySlug(businessSlug) : undefined;

  if (!config) {
    return <div className="p-8">Business not found</div>;
  }

  const enabledFeatures = config.navigation.filter(
    (nav) => nav.path !== `/${config.slug}`
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">{config.name}</h1>
        </div>
        <p className="text-gray-600">
          Business namespace home. Select a module from the sidebar to get started.
        </p>
        <div className="mt-2 inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
          Scaffold/Demo Mode - No live data
        </div>
      </div>

      {/* Quick links to modules */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {enabledFeatures.map((nav) => {
          const status = nav.status || 'live';
          const statusStyles = {
            live: 'border-green-200 bg-green-50',
            demo: 'border-yellow-200 bg-yellow-50',
            planned: 'border-gray-200 bg-gray-50',
            'not-in-scope': 'border-red-200 bg-red-50',
          };

          return (
            <Link
              key={nav.path}
              to={nav.path}
              className={`block p-6 rounded-lg border-2 hover:shadow-md transition-shadow ${statusStyles[status]}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {nav.label}
                </h3>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {status === 'demo' && 'Demo UI available - no live data'}
                {status === 'planned' && 'Coming soon - UI placeholder'}
                {status === 'live' && 'Live module'}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Info section */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900">About this scaffold</h3>
        <ul className="mt-2 text-sm text-blue-800 space-y-1">
          <li>This is a namespace scaffold for {config.name}</li>
          <li>Display roles shown in sidebar are Walter-server/Elisa-side only</li>
          <li>No live Supabase queries, publishing, or automation is wired</li>
          <li>Real security requires business_id + RLS (not implemented yet)</li>
        </ul>
      </div>
    </div>
  );
}
