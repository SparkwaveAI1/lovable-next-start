import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import type { AssistantMessage as AssistantMessageType, AssistantAction } from '@/types/assistant';
import { FUNCTION_DISPLAY_INFO } from '@/types/assistant';

interface AssistantMessageProps {
  message: AssistantMessageType;
}

export function AssistantMessage({ message }: AssistantMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full mb-3',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5',
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        )}
      >
        {/* Message content */}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </div>

        {/* Action indicator (if present) */}
        {message.action && (
          <ActionIndicator action={message.action} />
        )}

        {/* Timestamp */}
        <div
          className={cn(
            'text-[10px] mt-1',
            isUser ? 'text-blue-200' : 'text-gray-400'
          )}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

interface ActionIndicatorProps {
  action: AssistantAction;
}

function ActionIndicator({ action }: ActionIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const functionInfo = FUNCTION_DISPLAY_INFO[action.function_name] || {
    name: action.function_name,
    icon: '⚡',
    description: 'Execute action',
  };

  const statusConfig = {
    pending: {
      icon: Clock,
      label: 'Awaiting approval',
      color: 'text-amber-600 bg-amber-50',
    },
    approved: {
      icon: CheckCircle2,
      label: 'Approved',
      color: 'text-blue-600 bg-blue-50',
    },
    denied: {
      icon: XCircle,
      label: 'Denied',
      color: 'text-gray-600 bg-gray-100',
    },
    executed: {
      icon: CheckCircle2,
      label: 'Completed',
      color: 'text-green-600 bg-green-50',
    },
    failed: {
      icon: AlertCircle,
      label: 'Failed',
      color: 'text-red-600 bg-red-50',
    },
  };

  const status = statusConfig[action.status];
  const StatusIcon = status.icon;

  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      {/* Action header */}
      <div
        className={cn(
          'flex items-center justify-between rounded-lg px-3 py-2',
          status.color
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{functionInfo.icon}</span>
          <div>
            <div className="font-medium text-sm">{functionInfo.name}</div>
            <div className="flex items-center gap-1 text-xs">
              <StatusIcon className="h-3 w-3" />
              <span>{status.label}</span>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-2 bg-gray-50 rounded-lg p-3 text-xs">
          <div className="font-medium text-gray-600 mb-1">Parameters:</div>
          <pre className="bg-white rounded p-2 overflow-x-auto text-gray-700">
            {JSON.stringify(action.function_args, null, 2)}
          </pre>

          {action.result && (
            <>
              <div className="font-medium text-gray-600 mt-2 mb-1">Result:</div>
              <pre className="bg-white rounded p-2 overflow-x-auto text-gray-700">
                {JSON.stringify(action.result, null, 2)}
              </pre>
            </>
          )}

          {action.error && (
            <>
              <div className="font-medium text-red-600 mt-2 mb-1">Error:</div>
              <div className="bg-red-50 text-red-700 rounded p-2">
                {action.error}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}
