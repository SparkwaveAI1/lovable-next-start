import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Bot,
  Zap,
  MessageSquare,
  Mail,
  Calendar,
  FileText,
  Settings,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
} from "lucide-react";
import { AgentStatusIndicator } from "./AgentStatusIndicator";
import { LiveActivityFeed } from "./LiveActivityFeed";
import { useSingleAgentStatus } from "@/hooks/useAgentStatus";
import {
  type AgentWithStatus,
  type AgentRuntimeStatus,
  REGISTRY_STATUS_CONFIG,
} from "@/types/agent-registry";

interface AgentDetailProps {
  agentId: string;
  onBack?: () => void;
  onPause?: (agent: AgentWithStatus) => void;
  onResume?: (agent: AgentWithStatus) => void;
  className?: string;
}

// Map icon names to components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  bot: Bot,
  zap: Zap,
  message: MessageSquare,
  mail: Mail,
  calendar: Calendar,
  file: FileText,
  settings: Settings,
};

// Color theme map
const colorMap: Record<string, { bg: string; text: string; gradient: string }> = {
  violet: { bg: 'bg-violet-100', text: 'text-violet-600', gradient: 'from-violet-500 to-indigo-600' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', gradient: 'from-blue-500 to-cyan-600' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', gradient: 'from-emerald-500 to-teal-600' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-600', gradient: 'from-amber-500 to-orange-600' },
  rose: { bg: 'bg-rose-100', text: 'text-rose-600', gradient: 'from-rose-500 to-pink-600' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', gradient: 'from-indigo-500 to-purple-600' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600', gradient: 'from-slate-500 to-slate-700' },
};

export function AgentDetail({
  agentId,
  onBack,
  onPause,
  onResume,
  className,
}: AgentDetailProps) {
  const { agent, status, activities, isLoading, error } = useSingleAgentStatus(agentId);
  const [activeTab, setActiveTab] = useState("documentation");

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-96", className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading agent details...</p>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className={cn("flex items-center justify-center h-96", className)}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-slate-700 font-medium">Failed to load agent</p>
          <p className="text-sm text-slate-500 mt-1">{error || "Agent not found"}</p>
        </div>
      </div>
    );
  }

  const IconComponent = iconMap[agent.icon] || Bot;
  const colors = colorMap[agent.color] || colorMap.violet;
  const registryStatus = REGISTRY_STATUS_CONFIG[agent.status];
  const runtimeStatus: AgentRuntimeStatus = status?.status || 'idle';
  const currentTask = status?.current_task;
  const capabilities = Array.isArray(agent.capabilities) ? agent.capabilities : [];

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          <div className={cn(
            "flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br",
            colors.gradient
          )}>
            <IconComponent className="h-7 w-7 text-white" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">{agent.name}</h1>
              <Badge
                variant="outline"
                className={cn("text-xs font-semibold", registryStatus.className)}
              >
                {registryStatus.label}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1">
              <AgentStatusIndicator
                status={runtimeStatus}
                currentTask={currentTask}
                size="sm"
                showLabel
              />
              {currentTask && (
                <span className="text-sm text-slate-500 truncate max-w-md">
                  {currentTask}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {agent.status === 'active' && onPause && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPause(agent)}
                className="gap-2"
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}
            {agent.status === 'paused' && onResume && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResume(agent)}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Resume
              </Button>
            )}
          </div>
        </div>

        {agent.description && (
          <p className="text-slate-600 mt-3 ml-[4.5rem]">{agent.description}</p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b border-slate-200 bg-white px-6">
            <TabsList className="h-12 bg-transparent p-0 gap-6">
              <TabsTrigger
                value="documentation"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-violet-600 rounded-none h-12 px-0"
              >
                <FileText className="h-4 w-4 mr-2" />
                Documentation
              </TabsTrigger>
              <TabsTrigger
                value="capabilities"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-violet-600 rounded-none h-12 px-0"
              >
                <Zap className="h-4 w-4 mr-2" />
                Capabilities
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-violet-600 rounded-none h-12 px-0"
              >
                <Clock className="h-4 w-4 mr-2" />
                Activity
              </TabsTrigger>
              <TabsTrigger
                value="config"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-violet-600 rounded-none h-12 px-0"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configuration
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="documentation" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-6">
                  {agent.full_documentation ? (
                    <div className="prose prose-slate max-w-none prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-slate-600 prose-li:text-slate-600 prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-violet-600 prose-pre:bg-slate-900 prose-pre:text-slate-100">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {agent.full_documentation}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">No documentation available for this agent.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="capabilities" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-6">
                  {capabilities.length > 0 ? (
                    <div className="grid gap-4">
                      {capabilities.map((capability, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100"
                        >
                          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-100">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{capability}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Zap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">No capabilities listed for this agent.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="activity" className="h-full m-0">
              <LiveActivityFeed
                activities={activities}
                agentId={agentId}
                className="h-full"
              />
            </TabsContent>

            <TabsContent value="config" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-6">
                  {Object.keys(agent.config || {}).length > 0 ? (
                    <div className="bg-slate-900 rounded-xl p-4 overflow-auto">
                      <pre className="text-sm text-slate-100 font-mono">
                        {JSON.stringify(agent.config, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Settings className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">No configuration set for this agent.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export default AgentDetail;
