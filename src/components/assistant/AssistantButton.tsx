import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssistantChat } from './AssistantChat';

interface AssistantButtonProps {
  unreadCount?: number;
}

export function AssistantButton({ unreadCount = 0 }: AssistantButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-40',
          'h-14 w-14 rounded-full',
          'flex items-center justify-center',
          'shadow-lg shadow-blue-500/25',
          'transition-all duration-300 ease-out',
          'hover:scale-105 active:scale-95',
          isOpen
            ? 'bg-gray-900 hover:bg-gray-800'
            : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
        )}
        aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}

        {/* Unread badge */}
        {!isOpen && unreadCount > 0 && (
          <span
            className={cn(
              'absolute -top-1 -right-1',
              'min-w-[20px] h-5 px-1.5',
              'bg-red-500 text-white text-xs font-bold',
              'rounded-full flex items-center justify-center',
              'animate-in zoom-in duration-200'
            )}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Pulse animation when closed */}
        {!isOpen && (
          <span
            className={cn(
              'absolute inset-0 rounded-full',
              'bg-blue-400 opacity-30',
              'animate-ping'
            )}
            style={{ animationDuration: '2s' }}
          />
        )}
      </button>

      {/* Chat Panel */}
      <AssistantChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
