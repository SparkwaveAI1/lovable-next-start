import { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent } from "@/components/layout/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, RefreshCw, Bot, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

interface AgentMessage {
  id: string;
  schema_version: string;
  from_agent: "rico" | "iris";
  to_agent: "rico" | "iris";
  subject: string;
  content: string;
  priority: "urgent" | "normal" | "when-available";
  status: "unread" | "read" | "processed" | "failed";
  created_at: string;
  processed_at: string | null;
  error: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  unread: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  read: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  processed: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  normal: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  "when-available": "bg-slate-600/20 text-slate-500 border-slate-600/30",
};

export default function AgentChat() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    setError(null);
    try {
      const { data, error: fetchError } = await (supabase as any)
        .from("agent_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);

      if (fetchError) throw fetchError;
      setMessages((data as AgentMessage[]) || []);
      setLastRefresh(new Date());
    } catch (err: any) {
      console.error("[AgentChat] Failed to fetch messages:", err);
      setError(err.message || "Failed to load messages");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Auto-refresh every 30 seconds
    intervalRef.current = setInterval(() => fetchMessages(), 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleRefresh = () => fetchMessages(true);

  const ricoCount = messages.filter((m) => m.from_agent === "rico").length;
  const irisCount = messages.filter((m) => m.from_agent === "iris").length;
  const unreadCount = messages.filter((m) => m.status === "unread").length;

  return (
    <DashboardLayout>
      <PageContent>
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <MessageSquare className="h-6 w-6 text-indigo-400" />
            <h1 className="text-2xl font-bold text-white">Agent Chat</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Real-time Rico ↔ Iris inter-agent communication channel
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-slate-400 mb-1">Total Messages</p>
              <p className="text-2xl font-bold text-white">{messages.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-slate-400 mb-1">Unread</p>
              <p className={cn("text-2xl font-bold", unreadCount > 0 ? "text-yellow-400" : "text-white")}>
                {unreadCount}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-slate-400 mb-1">From Rico</p>
              <p className="text-2xl font-bold text-blue-400">{ricoCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-slate-400 mb-1">From Iris</p>
              <p className="text-2xl font-bold text-purple-400">{irisCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Chat window */}
        <Card className="bg-slate-900/60 border-slate-700">
          <CardHeader className="pb-3 border-b border-slate-700/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-3 text-base">
                <div className="flex items-center gap-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full px-2.5 py-0.5 text-xs font-medium">
                  <Bot className="h-3 w-3" />
                  Rico
                </div>
                <span className="text-slate-500 text-xs">↔</span>
                <div className="flex items-center gap-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full px-2.5 py-0.5 text-xs font-medium">
                  <Bot className="h-3 w-3" />
                  Iris
                </div>
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  Refreshed {formatDistanceToNow(lastRefresh, { addSuffix: true })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="text-slate-400 hover:text-white h-7 px-2"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5 mr-1", isRefreshing && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64 text-slate-400">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Loading messages...
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <WifiOff className="h-8 w-8 text-red-400" />
                <p className="text-red-400 text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={handleRefresh} className="border-slate-600 text-slate-300">
                  Try Again
                </Button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
                <MessageSquare className="h-8 w-8 opacity-30" />
                <p className="text-sm">No messages yet. Channel is live — waiting for agents...</p>
              </div>
            ) : (
              <ScrollArea className="h-[520px]">
                <div className="flex flex-col gap-3 p-4" ref={scrollAreaRef}>
                  {messages.map((msg) => {
                    const isRico = msg.from_agent === "rico";
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex flex-col max-w-[78%] gap-1",
                          isRico ? "self-end items-end" : "self-start items-start"
                        )}
                      >
                        {/* Sender label + timestamp */}
                        <div className="flex items-center gap-1.5 px-1">
                          <span className={cn(
                            "text-xs font-semibold",
                            isRico ? "text-blue-400" : "text-purple-400"
                          )}>
                            {isRico ? "Rico" : "Iris"}
                          </span>
                          <span className="text-xs text-slate-500">→</span>
                          <span className="text-xs text-slate-400">{msg.to_agent}</span>
                          <span className="text-xs text-slate-600">·</span>
                          <span className="text-xs text-slate-500">
                            {format(new Date(msg.created_at), "MMM d, h:mm a")}
                          </span>
                        </div>

                        {/* Message bubble */}
                        <div className={cn(
                          "rounded-2xl px-4 py-3 border",
                          isRico
                            ? "bg-blue-600/20 border-blue-500/30 rounded-tr-sm"
                            : "bg-purple-600/20 border-purple-500/30 rounded-tl-sm"
                        )}>
                          {/* Subject */}
                          <p className={cn(
                            "text-xs font-semibold mb-1.5 uppercase tracking-wide",
                            isRico ? "text-blue-300" : "text-purple-300"
                          )}>
                            {msg.subject}
                          </p>
                          {/* Content */}
                          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        </div>

                        {/* Status + priority badges */}
                        <div className="flex items-center gap-1.5 px-1">
                          <span className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                            STATUS_COLORS[msg.status]
                          )}>
                            {msg.status}
                          </span>
                          {msg.priority !== "normal" && (
                            <span className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                              PRIORITY_COLORS[msg.priority]
                            )}>
                              {msg.priority}
                            </span>
                          )}
                          {msg.error && (
                            <span className="text-xs text-red-400 cursor-help" title={msg.error}>
                              ⚠ error
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Status footer */}
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
          <Wifi className="h-3.5 w-3.5 text-green-500" />
          <span>Auto-refreshes every 30 seconds · Requires service_role access to view messages</span>
        </div>
      </PageContent>
    </DashboardLayout>
  );
}
