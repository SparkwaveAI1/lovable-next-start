import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AutomationLog {
  id: string;
  automation_type: string;
  status: string;
  source_data: any;
  processed_data: any;
  execution_time_ms: number | null;
  error_message: string | null;
  created_at: string;
  business_id: string;
}

export function useActivityLogs(businessId?: string) {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        setIsLoading(true);
        setError(null);

        let query = supabase
          .from('automation_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (businessId) {
          query = query.eq('business_id', businessId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.error('Supabase query error:', fetchError);
          throw fetchError;
        }

        console.log('Activity logs fetched:', data?.length || 0, 'records');
        setLogs(data || []);
      } catch (err) {
        console.error('Error fetching activity logs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      } finally {
        setIsLoading(false);
      }
    }

    fetchLogs();

    // Set up real-time subscription for activity logs
    const channel = supabase
      .channel('activity-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'automation_logs',
          filter: businessId ? `business_id=eq.${businessId}` : undefined
        },
        (payload) => {
          console.log('Real-time activity log update:', payload);
          fetchLogs(); // Refetch logs when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  const refetch = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('automation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Supabase refetch error:', fetchError);
        throw fetchError;
      }

      console.log('Activity logs refetched:', data?.length || 0, 'records');
      setLogs(data || []);
    } catch (err) {
      console.error('Error refetching activity logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setIsLoading(false);
    }
  };

  return { logs, isLoading, error, refetch };
}