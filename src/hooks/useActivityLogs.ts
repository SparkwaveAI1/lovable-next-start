import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
          throw fetchError;
        }

        setLogs(data || []);
      } catch (err) {
        console.error('Error fetching activity logs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      } finally {
        setIsLoading(false);
      }
    }

    fetchLogs();
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
        throw fetchError;
      }

      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setIsLoading(false);
    }
  };

  return { logs, isLoading, error, refetch };
}