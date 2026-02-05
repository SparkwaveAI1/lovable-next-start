import { useQuery } from '@tanstack/react-query';

const SUPABASE_URL = 'https://wrsoacujxcskydlzgopa.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indyc29hY3VqeGNza3lkbHpnb3BhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDUyMTEsImV4cCI6MjA2NTE4MTIxMX0.TyzOJ0_qZ6nwHW_p9tTd4RZ8FtP7rg8u_Ow92phO7rc';

export interface HistoricalData {
  symbol: string;
  assetType: 'stock' | 'crypto';
  prices: number[];
  timestamps: string[];
  days: number;
}

export interface HistoryResponse {
  data: HistoricalData;
  meta: {
    source: string;
    cachedUntil: string;
  };
}

/**
 * Fetch historical price data for a single symbol
 * @param symbol The symbol (e.g., 'bitcoin', 'AAPL')
 * @param assetType 'stock' or 'crypto'
 * @param days Number of days of history (1-90, default 7)
 */
export function useSymbolHistory(
  symbol: string,
  assetType: 'stock' | 'crypto',
  days: number = 7
) {
  return useQuery({
    queryKey: ['market-data', 'history', symbol, assetType, days],
    queryFn: async (): Promise<HistoricalData> => {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/market-data-service/history?symbol=${encodeURIComponent(symbol)}&type=${assetType}&days=${days}`,
        {
          headers: {
            Authorization: `Bearer ${ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `Failed to fetch history for ${symbol}`);
      }

      const result: HistoryResponse = await response.json();
      return result.data;
    },
    // History data is cached for 24h on backend, so we can be aggressive with staleTime
    staleTime: 60 * 60 * 1000, // 1 hour before considered stale
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours (was cacheTime)
    refetchInterval: false, // Don't auto-refetch
    enabled: !!symbol,
    retry: 1,
  });
}

/**
 * Fetch historical data for multiple symbols at once
 * Groups by asset type and fetches in parallel
 */
export function useMixedHistory(
  items: Array<{ symbol: string; assetType: 'stock' | 'crypto' }>,
  days: number = 7
) {
  // Create individual queries for each symbol
  const queries = items.map((item) => ({
    symbol: item.symbol,
    assetType: item.assetType,
  }));

  // Use a single query that fetches all data
  return useQuery({
    queryKey: ['market-data', 'history-batch', queries, days],
    queryFn: async (): Promise<Record<string, number[]>> => {
      if (items.length === 0) return {};

      // Fetch all histories in parallel
      const results = await Promise.allSettled(
        items.map(async (item) => {
          const response = await fetch(
            `${SUPABASE_URL}/functions/v1/market-data-service/history?symbol=${encodeURIComponent(item.symbol)}&type=${item.assetType}&days=${days}`,
            {
              headers: {
                Authorization: `Bearer ${ANON_KEY}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch history for ${item.symbol}`);
          }

          const result: HistoryResponse = await response.json();
          return { symbol: item.symbol, prices: result.data.prices };
        })
      );

      // Collect successful results
      const priceMap: Record<string, number[]> = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const key = items[index].symbol.toUpperCase();
          priceMap[key] = result.value.prices;
        }
      });

      return priceMap;
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchInterval: false,
    enabled: items.length > 0,
    retry: 1,
  });
}
