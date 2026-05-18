/**
 * BusinessApprovalsPlaceholder - Approvals scaffold for business namespace
 *
 * PLANNED/SCAFFOLD ONLY - No live data connections
 * No publishing, content approval, or workflow automation is wired
 */

import { useParams } from 'react-router-dom';
import { getBusinessBySlug } from '@/businesses/registry';
import { CheckCircle, Clock, XCircle, FileText } from 'lucide-react';

// Mock approval items for display only
const mockApprovals = [
  {
    id: '1',
    title: 'Demo Approval Item A',
    type: 'Content',
    status: 'pending',
    submittedBy: 'Demo User',
  },
  {
    id: '2',
    title: 'Demo Approval Item B',
    type: 'Campaign',
    status: 'approved',
    submittedBy: 'Demo User',
  },
  {
    id: '3',
    title: 'Demo Approval Item C',
    type: 'Social Post',
    status: 'rejected',
    submittedBy: 'Demo User',
  },
];

const statusConfig = {
  pending: {
    icon: Clock,
    label: 'Pending',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
  },
  approved: {
    icon: CheckCircle,
    label: 'Approved',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
  },
  rejected: {
    icon: XCircle,
    label: 'Rejected',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
  },
};

export default function BusinessApprovalsPlaceholder() {
  const { businessSlug } = useParams<{ businessSlug: string }>();
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
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
          </div>
          <p className="text-gray-600 mt-1">
            Content and campaign approvals for {config.name}
          </p>
        </div>
        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
          Planned
        </span>
      </div>

      {/* Notice */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-800">
          <strong>Planned Feature:</strong> This scaffold displays a mock approval
          queue. No live approval workflows, publishing, content mutations, or
          notification side effects are wired. Real implementation requires
          business_id scope and proper authorization.
        </p>
      </div>

      {/* Approval queue */}
      <div className="space-y-3">
        {mockApprovals.map((item) => {
          const status = statusConfig[item.status as keyof typeof statusConfig];
          const StatusIcon = status.icon;

          return (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-100 rounded">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-500">
                    {item.type} &bull; Submitted by {item.submittedBy}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${status.bgColor} ${status.textColor}`}
                >
                  <StatusIcon className="w-4 h-4" />
                  {status.label}
                </span>
                <span className="text-xs text-gray-400">Demo only</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-gray-500">
        Mock approval data shown. No live queries, approval actions, or publishing
        side effects are performed in this scaffold.
      </p>
    </div>
  );
}
