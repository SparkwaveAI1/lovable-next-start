import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  AgentRegistry,
  AgentRegistryStatusRecord,
  AgentRegistryActivity,
  AgentWithStatus,
} from '@/types/agent-registry';

interface UseAgentStatusOptions {
  businessId?: string | null;
  agentId?: string;
  activityLimit?: number;
}

interface UseAgentStatusReturn {
  agents: AgentWithStatus[];
  statuses: Record<string, AgentRegistryStatusRecord>;
  activities: AgentRegistryActivity[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAgentStatus(options: UseAgentStatusOptions = {}): UseAgentStatusReturn {
  const { businessId, agentId, activityLimit = 50 } = options;

  const [agents, setAgents] = useState<AgentRegistry[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AgentRegistryStatusRecord>>({});
  const [activities, setActivities] = useState<AgentRegistryActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!businessId && !agentId) {
      setAgents([]);
      setStatuses({});
      setActivities([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build agents query
      let agentsQuery = supabase
        .from('agent_registry')
        .select('*')
        .order('name', { ascending: true });

      if (businessId) {
        agentsQuery = agentsQuery.eq('business_id', businessId);
      }
      if (agentId) {
        agentsQuery = agentsQuery.eq('id', agentId);
      }

      const { data: agentsData, error: agentsError } = await agentsQuery;
      if (agentsError) throw agentsError;

      // Get agent IDs for status/activity queries
      const agentIds = (agentsData || []).map(a => a.id);

      // Fetch statuses for these agents
      let statusesData: any[] = [];
      if (agentIds.length > 0) {
        const { data, error: statusError } = await supabase
          .from('agent_registry_status')
          .select('*')
          .in('agent_id', agentIds);
        
        if (statusError) throw statusError;
        statusesData = data || [];
      }

      // Fetch activities
      let activitiesQuery = supabase
        .from('agent_registry_activity')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(activityLimit);

      if (agentIds.length > 0) {
        activitiesQuery = activitiesQuery.in('agent_id', agentIds);
      }

      const { data: activitiesData, error: activitiesError } = await activitiesQuery;
      if (activitiesError) throw activitiesError;

      // Transform statuses to a map by agent_id
      const statusMap: Record<string, AgentRegistryStatusRecord> = {};
      statusesData.forEach(s => {
        statusMap[s.agent_id] = s as AgentRegistryStatusRecord;
      });

      setAgents((agentsData as AgentRegistry[]) || []);
      setStatuses(statusMap);
      setActivities((activitiesData as AgentRegistryActivity[]) || []);
    } catch (err) {
      console.error('Error fetching agent registry data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load agent data');
    } finally {
      setIsLoading(false);
    }
  }, [businessId, agentId, activityLimit]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!businessId && !agentId) return;

    const channelId = agentId || businessId || 'global';

    // Subscribe to status changes
    const statusChannel = supabase
      .channel(`agent_registry_status_${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_registry_status',
        },
        (payload) => {
          console.log('Agent status change:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as AgentRegistryStatusRecord;
            setStatuses(prev => ({
              ...prev,
              [record.agent_id]: record,
            }));
          } else if (payload.eventType === 'DELETE') {
            const oldRecord = payload.old as AgentRegistryStatusRecord;
            setStatuses(prev => {
              const updated = { ...prev };
              delete updated[oldRecord.agent_id];
              return updated;
            });
          }
        }
      )
      .subscribe();

    // Subscribe to activity changes
    const activityChannel = supabase
      .channel(`agent_registry_activity_${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_registry_activity',
        },
        (payload) => {
          console.log('Agent activity:', payload);
          const record = payload.new as AgentRegistryActivity;
          setActivities(prev => [record, ...prev].slice(0, activityLimit));
        }
      )
      .subscribe();

    // Subscribe to agent registry changes
    const agentChannel = supabase
      .channel(`agent_registry_${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_registry',
        },
        (payload) => {
          console.log('Agent registry change:', payload);
          if (payload.eventType === 'INSERT') {
            setAgents(prev => [...prev, payload.new as AgentRegistry]);
          } else if (payload.eventType === 'UPDATE') {
            setAgents(prev =>
              prev.map(a =>
                a.id === (payload.new as AgentRegistry).id ? (payload.new as AgentRegistry) : a
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setAgents(prev => prev.filter(a => a.id !== (payload.old as AgentRegistry).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(activityChannel);
      supabase.removeChannel(agentChannel);
    };
  }, [businessId, agentId, activityLimit]);

  // Combine agents with their status
  const agentsWithStatus: AgentWithStatus[] = agents.map(agent => ({
    ...agent,
    runtime_status: statuses[agent.id],
  }));

  return {
    agents: agentsWithStatus,
    statuses,
    activities,
    isLoading,
    error,
    refetch: fetchData,
  };
}

// Hook for a single agent
export function useSingleAgentStatus(agentId: string) {
  const result = useAgentStatus({ agentId });
  return {
    agent: result.agents[0] || null,
    status: result.statuses[agentId] || null,
    activities: result.activities,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
  };
}

export default useAgentStatus;
