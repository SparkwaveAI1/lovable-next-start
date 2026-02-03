import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, X } from 'lucide-react';
import type { PendingConfirmation } from '@/types/assistant';
import { FUNCTION_DISPLAY_INFO } from '@/types/assistant';
import { cn } from '@/lib/utils';

interface ActionConfirmationProps {
  pendingConfirmation: PendingConfirmation;
  onConfirm: (approved: boolean) => void;
  isLoading: boolean;
}

export function ActionConfirmation({
  pendingConfirmation,
  onConfirm,
  isLoading,
}: ActionConfirmationProps) {
  const { action } = pendingConfirmation;
  const functionInfo = FUNCTION_DISPLAY_INFO[action.function_name] || {
    name: action.function_name,
    icon: '⚡',
    description: 'Execute action',
  };

  // Format the action details for display
  const formatActionDetails = () => {
    const args = action.function_args;
    const details: string[] = [];

    // Common fields to display
    if (args.contact_id) details.push(`Contact ID: ${args.contact_id}`);
    if (args.query) details.push(`Search: "${args.query}"`);
    if (args.subject) details.push(`Subject: ${args.subject}`);
    if (args.message) details.push(`Message: "${String(args.message).slice(0, 100)}${String(args.message).length > 100 ? '...' : ''}"`);
    if (args.body) details.push(`Content: "${String(args.body).slice(0, 100)}${String(args.body).length > 100 ? '...' : ''}"`);
    if (args.title) details.push(`Title: ${args.title}`);
    if (args.platform) details.push(`Platform: ${args.platform}`);
    if (args.content) details.push(`Content: "${String(args.content).slice(0, 100)}${String(args.content).length > 100 ? '...' : ''}"`);
    if (args.promotion) details.push(`Promotion: ${args.promotion}`);
    if (args.date) details.push(`Date: ${args.date}`);
    if (args.priority) details.push(`Priority: ${args.priority}`);
    if (args.due_date) details.push(`Due: ${args.due_date}`);

    return details;
  };

  const actionDetails = formatActionDetails();

  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div
        className={cn(
          'bg-white rounded-2xl shadow-xl max-w-md w-full',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="p-2 bg-amber-100 rounded-full">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Confirm Action</h3>
            <p className="text-sm text-gray-500">Review before proceeding</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Action type */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
            <span className="text-2xl">{functionInfo.icon}</span>
            <div>
              <div className="font-medium text-gray-900">{functionInfo.name}</div>
              <div className="text-sm text-gray-500">{functionInfo.description}</div>
            </div>
          </div>

          {/* Details */}
          {actionDetails.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-600 mb-2">Details:</div>
              <ul className="space-y-1.5">
                {actionDetails.map((detail, index) => (
                  <li
                    key={index}
                    className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg"
                  >
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warning */}
          <div className="text-xs text-gray-500 mb-4 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              This action will be performed on your behalf. Please confirm you want to proceed.
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={() => onConfirm(false)}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Deny
            </Button>
            <Button
              className="flex-1 h-11 bg-green-600 hover:bg-green-700"
              onClick={() => onConfirm(true)}
              disabled={isLoading}
            >
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
