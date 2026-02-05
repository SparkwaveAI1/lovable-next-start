import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageLayout, PageContent } from "@/components/layout/PageLayout";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AgentCard, AgentDetail, LiveActivityFeed } from "@/components/agents";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { useBusinesses } from "@/hooks/useBusinesses";
import { useAgentStatus } from "@/hooks/useAgentStatus";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RefreshCw,
  Plus,
  Search,
  Bot,
  Activity,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentWithStatus } from "@/types/agent-registry";

export default function AgentRegistry() {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const { data: businesses = [] } = useBusinesses();
  const { toast } = useToast();

  const { agents, activities, isLoading, error, refetch } = useAgentStatus({
    businessId: selectedBusiness?.id,
    activityLimit: 100,
  });

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter agents by search and status
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = agent.name.toLowerCase().includes(query);
        const matchesDescription = agent.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription) return false;
      }
      // Status filter
      if (statusFilter !== "all" && agent.status !== statusFilter) return false;
      return true;
    });
  }, [agents, searchQuery, statusFilter]);

  // Create agent names map for activity feed
  const agentNames = useMemo(() => {
    const names: Record<string, string> = {};
    agents.forEach((agent) => {
      names[agent.id] = agent.name;
    });
    return names;
  }, [agents]);

  // Handle pause agent
  const handlePauseAgent = async (agent: AgentWithStatus) => {
    try {
      const { error: updateError } = await supabase
        .from('agent_registry')
        .update({ status: 'paused' })
        .eq('id', agent.id);

      if (updateError) throw updateError;

      toast({
        title: "Agent paused",
        description: `${agent.name} has been paused.`,
      });
    } catch (err) {
      console.error('Failed to pause agent:', err);
      toast({
        title: "Failed to pause agent",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  // Handle resume agent
  const handleResumeAgent = async (agent: AgentWithStatus) => {
    try {
      const { error: updateError } = await supabase
        .from('agent_registry')
        .update({ status: 'active' })
        .eq('id', agent.id);

      if (updateError) throw updateError;

      toast({
        title: "Agent resumed",
        description: `${agent.name} is now active.`,
      });
    } catch (err) {
      console.error('Failed to resume agent:', err);
      toast({
        title: "Failed to resume agent",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = agents.length;
    const active = agents.filter((a) => a.status === 'active').length;
    const working = agents.filter((a) => a.runtime_status?.status === 'working').length;
    const errors = agents.filter((a) => a.runtime_status?.status === 'error').length;
    return { total, active, working, errors };
  }, [agents]);

  // If an agent is selected, show detail view
  if (selectedAgentId) {
    return (
      <PageLayout>
        <DashboardHeader
          selectedBusinessId={selectedBusiness?.id}
          onBusinessChange={(id) => {
            const business = businesses.find((b) => b.id === id);
            if (business) setSelectedBusiness(business);
          }}
        />
        <PageContent className="pt-2 md:pt-28 h-[calc(100vh-72px)]">
          <AgentDetail
            agentId={selectedAgentId}
            onBack={() => setSelectedAgentId(null)}
            onPause={handlePauseAgent}
            onResume={handleResumeAgent}
            className="h-full bg-white rounded-xl border border-slate-200 overflow-hidden"
          />
        </PageContent>
      </PageLayout>
    );
  }

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={(id) => {
        const business = businesses.find((b) => b.id === id);
        if (business) setSelectedBusiness(business);
      }}
      businessName={selectedBusiness?.name}
    >
      <PageContent>
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Bot className="h-7 w-7 text-violet-600" />
              Agent Registry
            </h1>
            <p className="text-slate-500 mt-1">
              Monitor and manage your AI automation agents
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              Refresh
            </Button>
            {/* Add Agent button hidden until feature is wired up */}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <p className="font-medium">Failed to load agents</p>
            <p className="text-sm mt-1">{error}</p>
            <button onClick={() => refetch()} className="mt-2 text-sm underline hover:no-underline">
              Try again
            </button>
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-slate-100">
                <Bot className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Agents</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-100">
                <Activity className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
                <p className="text-xs text-slate-500">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100">
                <RefreshCw className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.working}</p>
                <p className="text-xs text-slate-500">Working Now</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-red-100">
                <Activity className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.errors}</p>
                <p className="text-xs text-slate-500">Errors</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Agent Grid */}
          <div className="col-span-12 lg:col-span-8">
            {/* Search and Filters */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    statusFilter === "all"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("active")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    statusFilter === "active"
                      ? "bg-emerald-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter("paused")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    statusFilter === "paused"
                      ? "bg-amber-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  Paused
                </button>
              </div>
            </div>

            {/* Agent Cards Grid */}
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-48 bg-slate-100 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Bot className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  {searchQuery || statusFilter !== "all"
                    ? "No agents match your filters"
                    : "No agents registered yet"}
                </h3>
                <p className="text-slate-500 mb-4">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Create your first AI agent to get started"}
                </p>
                {/* Add Agent button hidden until feature is wired up */}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onClick={() => setSelectedAgentId(agent.id)}
                    onPause={() => handlePauseAgent(agent)}
                    onResume={() => handleResumeAgent(agent)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed Sidebar */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-[600px] sticky top-28">
              <LiveActivityFeed
                activities={activities}
                agentNames={agentNames}
                className="h-full"
              />
            </div>
          </div>
        </div>
      </PageContent>
    </DashboardLayout>
  );
}
