import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  Maximize2, 
  Minimize2, 
  X, 
  Bot, 
  User,
  Sparkles,
  Loader2
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface RicoChatProps {
  className?: string;
  onExpand?: () => void;
  isExpanded?: boolean;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function RicoChat({ className, onExpand, isExpanded = false }: RicoChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hey! I'm Rico, your AI assistant. I can help you manage tasks, coordinate agents, and keep things running smoothly. What can I do for you?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 100), 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = '100px';
    }

    // Simulate AI response (will be replaced with actual OpenClaw webhook later)
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Got it! I'm processing your request. This is a placeholder response - I'll be connected to OpenClaw soon for real AI capabilities.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn(
      "flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden",
      isExpanded ? "fixed inset-4 z-50 shadow-2xl" : "h-full",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-violet-600 to-indigo-600">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Rico</h3>
            <p className="text-[10px] text-white/70">AI Assistant • Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onExpand}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title={isExpanded ? "Minimize" : "Expand"}
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4 text-white" />
            ) : (
              <Maximize2 className="h-4 w-4 text-white" />
            )}
          </button>
          {isExpanded && (
            <button
              onClick={onExpand}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Close"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "flex-row-reverse" : ""
            )}
          >
            {/* Avatar */}
            <div className={cn(
              "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
              message.role === "user" 
                ? "bg-slate-700" 
                : "bg-gradient-to-br from-violet-500 to-indigo-600"
            )}>
              {message.role === "user" ? (
                <User className="h-4 w-4 text-white" />
              ) : (
                <Bot className="h-4 w-4 text-white" />
              )}
            </div>

            {/* Message bubble */}
            <div className={cn(
              "flex flex-col max-w-[75%]",
              message.role === "user" ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "px-4 py-2.5 rounded-2xl text-sm",
                message.role === "user"
                  ? "bg-slate-700 text-white rounded-tr-sm"
                  : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm"
              )}>
                {message.content}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {formatTime(message.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center gap-1">
                <Loader2 className="h-4 w-4 text-violet-500 animate-spin" />
                <span className="text-sm text-slate-500">Rico is typing...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Rico... (Shift+Enter for new line)"
              className={cn(
                "w-full px-4 py-3 rounded-xl border border-slate-200",
                "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent",
                "placeholder:text-slate-400 text-sm resize-none",
                "min-h-[100px] max-h-[200px]"
              )}
              style={{ height: '100px' }}
            />
          </div>
          <div className="flex flex-col justify-end">
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="h-11 w-11 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 text-center">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

// Full-screen modal wrapper for expanded chat
export function RicoChatModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <RicoChat 
        isExpanded={true} 
        onExpand={onClose}
        className="w-full max-w-3xl h-[85vh]"
      />
    </div>
  );
}

export default RicoChat;
