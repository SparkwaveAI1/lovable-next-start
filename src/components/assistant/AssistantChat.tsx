import { useRef, useEffect } from 'react';
import { X, Sparkles, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AssistantMessage } from './AssistantMessage';
import { AssistantInput } from './AssistantInput';
import { ActionConfirmation } from './ActionConfirmation';
import { useAssistant } from '@/hooks/useAssistant';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { cn } from '@/lib/utils';

interface AssistantChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AssistantChat({ isOpen, onClose }: AssistantChatProps) {
  const { selectedBusiness } = useBusinessContext();
  const {
    messages,
    isLoading,
    error,
    pendingConfirmation,
    sendMessage,
    confirmAction,
    clearConversation,
  } = useAssistant();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/30 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Chat panel */}
      <div
        className={cn(
          'fixed z-50 bg-white shadow-2xl flex flex-col',
          // Mobile: full screen
          'inset-0 md:inset-auto',
          // Desktop: positioned bottom-right
          'md:bottom-24 md:right-6 md:w-[400px] md:h-[600px] md:max-h-[calc(100vh-120px)]',
          'md:rounded-2xl md:border md:border-gray-200',
          // Animation
          'animate-in slide-in-from-bottom-5 duration-300'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white md:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-500 rounded-lg">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">AI Assistant</h2>
              <p className="text-xs text-gray-400">
                {selectedBusiness?.name || 'No business selected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
                onClick={clearConversation}
                title="Clear conversation"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages area */}
        <ScrollArea
          ref={scrollAreaRef}
          className="flex-1 px-4"
        >
          <div className="py-4">
            {messages.length === 0 ? (
              <WelcomeMessage />
            ) : (
              <>
                {messages.map((message) => (
                  <AssistantMessage key={message.id} message={message} />
                ))}
                
                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start mb-3">
                    <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Error message */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-100">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Input area */}
        <AssistantInput
          onSend={sendMessage}
          isLoading={isLoading}
          disabled={!selectedBusiness || !!pendingConfirmation}
          placeholder={
            !selectedBusiness
              ? 'Select a business first...'
              : 'Ask me anything...'
          }
        />

        {/* Action confirmation overlay */}
        {pendingConfirmation && (
          <ActionConfirmation
            pendingConfirmation={pendingConfirmation}
            onConfirm={confirmAction}
            isLoading={isLoading}
          />
        )}
      </div>
    </>
  );
}

function WelcomeMessage() {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Hi! I'm your AI Assistant
      </h3>
      <p className="text-sm text-gray-500 mb-6 max-w-[280px] mx-auto">
        I can help you manage contacts, send messages, schedule bookings, and more.
      </p>
      
      <div className="space-y-2 text-left max-w-[280px] mx-auto">
        <SuggestionChip>📇 Look up a contact</SuggestionChip>
        <SuggestionChip>📧 Send an email</SuggestionChip>
        <SuggestionChip>📅 Check today's bookings</SuggestionChip>
        <SuggestionChip>✅ Create a task</SuggestionChip>
      </div>
    </div>
  );
}

function SuggestionChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 hover:bg-gray-100 transition-colors rounded-xl px-4 py-2.5 text-sm text-gray-700 cursor-default">
      {children}
    </div>
  );
}
