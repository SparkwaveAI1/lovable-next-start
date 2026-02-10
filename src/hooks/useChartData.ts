import { useQuery } from '@tanstack/react-query';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

// TradingView format for candlestick data
export interface OHLCVData {
  time: string; // YYYY-MM-DD format for TradingView
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartDataResponse {
  symbol: string;
  assetType: 'stock' | 'crypto';
  data: OHLCVData[];
  range: TimeRange;
}

// Convert range to days for API
export function rangeToDays(range: TimeRange): number {
  switch (range) {
    case '1D': return 1;
    case '1W': return 7;
    case '1M': return 30;
    case '3M': return 90;
    case '1Y': return 365;
    case 'ALL': return 730; // 2 years max
    default: return 30;
  }
}

/**
 * Hook to fetch OHLCV (candlestick) data for TradingView charts
 */
export function useChartData(
  symbol: string,
  assetType: 'stock' | 'crypto',
  range: TimeRange = '1M'
) {
  return useQuery({
    queryKey: ['chart-data', 'ohlcv', symbol, assetType, range],
    queryFn: async (): Promise<OHLCVData[]> => {
      const days = rangeToDays(range);
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/market-data-service/ohlcv?symbol=${encodeURIComponent(symbol)}&type=${assetType}&range=${range}&days=${days}`,
        {
          headers: {
            Authorization: `Bearer ${ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `Failed to fetch OHLCV data for ${symbol}`);
      }

      const result = await response.json();
      return result.data || [];
    },
    staleTime: range === '1D' ? 60000 : 5 * 60000, // 1 min for 1D, 5 min for others
    refetchInterval: range === '1D' ? 60000 : false, // Auto-refresh only for 1D
    enabled: !!symbol,
    retry: 2,
  });
}

/**
 * Calculate technical indicators from OHLCV data
 */
export function calculateSMA(data: OHLCVData[], period: number): { time: string; value: number }[] {
  if (data.length < period) return [];
  
  const result: { time: string; value: number }[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const avg = slice.reduce((sum, d) => sum + d.close, 0) / period;
    result.push({
      time: data[i].time,
      value: parseFloat(avg.toFixed(2)),
    });
  }
  
  return result;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calculateRSI(data: OHLCVData[], period: number = 14): { time: string; value: number }[] {
  if (data.length < period + 1) return [];
  
  const result: { time: string; value: number }[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Calculate initial gains and losses
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  let avgGain = gains.reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.reduce((a, b) => a + b, 0) / period;
  
  // First RSI value
  const firstRSI = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  result.push({ time: data[period].time, value: parseFloat(firstRSI.toFixed(2)) });
  
  // Calculate subsequent RSI values using smoothed averages
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    
    const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    result.push({ time: data[i].time, value: parseFloat(rsi.toFixed(2)) });
  }
  
  return result;
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
export function calculateEMA(data: OHLCVData[], period: number): { time: string; value: number }[] {
  if (data.length < period) return [];
  
  const result: { time: string; value: number }[] = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA is SMA
  const firstSlice = data.slice(0, period);
  let ema = firstSlice.reduce((sum, d) => sum + d.close, 0) / period;
  result.push({ time: data[period - 1].time, value: parseFloat(ema.toFixed(2)) });
  
  // Calculate subsequent EMA values
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    result.push({ time: data[i].time, value: parseFloat(ema.toFixed(2)) });
  }
  
  return result;
}
