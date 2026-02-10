import { useQuery } from '@tanstack/react-query';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Quote data from the market-data-service
export interface QuoteData {
  symbol: string;
  assetType: 'stock' | 'crypto';
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: string;
}

export interface BatchQuoteResponse {
  data: Record<string, QuoteData | { error: string }>;
  meta: {
    requested: number;
    successful: number;
  };
}

export interface SingleQuoteResponse {
  data: QuoteData;
  meta: {
    source: string;
    cachedUntil: string;
    warning?: string;
  };
}

/**
 * Fetch a single quote from the market-data-service
 */
export function useQuote(symbol: string, assetType: 'stock' | 'crypto') {
  return useQuery({
    queryKey: ['market-data', 'quote', symbol, assetType],
    queryFn: async (): Promise<QuoteData> => {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/market-data-service/quote?symbol=${encodeURIComponent(symbol)}&type=${assetType}`,
        {
          headers: {
            Authorization: `Bearer ${ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `Failed to fetch quote for ${symbol}`);
      }

      const result: SingleQuoteResponse = await response.json();
      return result.data;
    },
    refetchInterval: 60000, // Refresh every minute
    enabled: !!symbol,
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 2,
  });
}

/**
 * Fetch batch quotes for watchlist symbols
 * Groups symbols by type and fetches them together
 */
export function useWatchlistQuotes(
  symbols: string[],
  assetType: 'stock' | 'crypto'
) {
  return useQuery({
    queryKey: ['market-data', 'batch', symbols, assetType],
    queryFn: async (): Promise<Record<string, QuoteData>> => {
      if (symbols.length === 0) {
        return {};
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/market-data-service/batch?symbols=${symbols.join(',')}&type=${assetType}`,
        {
          headers: {
            Authorization: `Bearer ${ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to fetch batch quotes');
      }

      const result: BatchQuoteResponse = await response.json();
      
      // Filter out errors and return only successful quotes
      const successfulQuotes: Record<string, QuoteData> = {};
      for (const [symbol, data] of Object.entries(result.data)) {
        if (!('error' in data)) {
          successfulQuotes[symbol] = data;
        }
      }
      
      return successfulQuotes;
    },
    refetchInterval: 60000, // Refresh every minute
    enabled: symbols.length > 0,
    staleTime: 30000,
    retry: 2,
  });
}

/**
 * Hook to fetch quotes for mixed asset types
 * Separates symbols by type and fetches in parallel
 */
export function useMixedQuotes(
  items: Array<{ symbol: string; assetType: 'stock' | 'crypto' }>
) {
  const stockSymbols = items
    .filter((item) => item.assetType === 'stock')
    .map((item) => item.symbol);
  const cryptoSymbols = items
    .filter((item) => item.assetType === 'crypto')
    .map((item) => item.symbol);

  const stockQuotes = useWatchlistQuotes(stockSymbols, 'stock');
  const cryptoQuotes = useWatchlistQuotes(cryptoSymbols, 'crypto');

  // Combine results
  const data: Record<string, QuoteData> = {
    ...stockQuotes.data,
    ...cryptoQuotes.data,
  };

  const isLoading = stockQuotes.isLoading || cryptoQuotes.isLoading;
  const error = stockQuotes.error || cryptoQuotes.error;
  const isError = stockQuotes.isError || cryptoQuotes.isError;

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: () => {
      stockQuotes.refetch();
      cryptoQuotes.refetch();
    },
  };
}
