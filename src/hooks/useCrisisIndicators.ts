import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CrisisIndicator {
  indicator_key: string;
  indicator_name: string;
  value: number | null;
  unit: string | null;
  source: string | null;
  last_updated: string | null;
}

export function useCrisisIndicators() {
  const [indicators, setIndicators] = useState<CrisisIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchIndicators = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('crisis_indicators')
        .select('*');

      if (error) throw error;

      setIndicators(data || []);
      
      // Get the most recent update time
      if (data && data.length > 0) {
        const dates = data
          .map(d => d.last_updated ? new Date(d.last_updated) : null)
          .filter((d): d is Date => d !== null);
        if (dates.length > 0) {
          setLastUpdated(new Date(Math.max(...dates.map(d => d.getTime()))));
        }
      }
    } catch (err) {
      console.error('Error fetching crisis indicators:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch indicators');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-crisis-data');
      if (error) throw error;
      console.log('Crisis data refreshed:', data);
      await fetchIndicators();
    } catch (err) {
      console.error('Error refreshing crisis data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
      setLoading(false);
    }
  }, [fetchIndicators]);

  useEffect(() => {
    fetchIndicators();
  }, [fetchIndicators]);

  const getIndicatorValue = (key: string): number | null => {
    const ind = indicators.find(i => i.indicator_key === key);
    return ind?.value ?? null;
  };

  return {
    indicators,
    loading,
    lastUpdated,
    error,
    refreshData,
    getIndicatorValue
  };
}