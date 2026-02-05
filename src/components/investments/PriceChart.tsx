import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  LineData,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  useChartData,
  TimeRange,
  OHLCVData,
  calculateSMA,
  calculateRSI,
} from '@/hooks/useChartData';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, BarChart3, Activity, Maximize2 } from 'lucide-react';

export interface PriceChartProps {
  symbol: string;
  assetType: 'stock' | 'crypto';
  initialRange?: TimeRange;
  height?: number;
  showVolume?: boolean;
  showIndicators?: boolean;
  onExpand?: () => void;
  className?: string;
}

const ranges: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

// Theme configurations
const lightTheme = {
  layout: {
    background: { type: ColorType.Solid as const, color: '#ffffff' },
    textColor: '#333333',
  },
  grid: {
    vertLines: { color: '#f0f0f0' },
    horzLines: { color: '#f0f0f0' },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: { color: '#9ca3af', width: 1 as const, style: 3 as const },
    horzLine: { color: '#9ca3af', width: 1 as const, style: 3 as const },
  },
};

const darkTheme = {
  layout: {
    background: { type: ColorType.Solid as const, color: '#1a1a2e' },
    textColor: '#d1d5db',
  },
  grid: {
    vertLines: { color: '#2d2d44' },
    horzLines: { color: '#2d2d44' },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: { color: '#6b7280', width: 1 as const, style: 3 as const },
    horzLine: { color: '#6b7280', width: 1 as const, style: 3 as const },
  },
};

/**
 * Interactive TradingView-style price chart with candlesticks, volume, and indicators
 */
export function PriceChart({
  symbol,
  assetType,
  initialRange = '1M',
  height = 400,
  showVolume = true,
  showIndicators = false,
  onExpand,
  className,
}: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const sma200SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const [range, setRange] = useState<TimeRange>(initialRange);
  const [indicatorsEnabled, setIndicatorsEnabled] = useState(showIndicators);
  const [isDark, setIsDark] = useState(false);

  const { data, isLoading, isError, error } = useChartData(symbol, assetType, range);

  // Check for dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);

  // Create chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const theme = isDark ? darkTheme : lightTheme;
    
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: showVolume ? height : height - 60,
      ...theme,
      rightPriceScale: {
        borderColor: isDark ? '#2d2d44' : '#e5e7eb',
        scaleMargins: { top: 0.1, bottom: showVolume ? 0.2 : 0.1 },
      },
      timeScale: {
        borderColor: isDark ? '#2d2d44' : '#e5e7eb',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        axisPressedMouseMove: { time: true, price: true },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });

    chartRef.current = chart;

    // Candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Volume series
    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#60a5fa',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      });
      volumeSeriesRef.current = volumeSeries;
    }

    // Resize handler
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [height, showVolume, isDark]);

  // Update chart data
  useEffect(() => {
    if (!data || !candlestickSeriesRef.current) return;

    // Convert to TradingView format
    const candlestickData: CandlestickData[] = data.map((d: OHLCVData) => ({
      time: d.time as string,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candlestickSeriesRef.current.setData(candlestickData);

    // Volume data with colors
    if (volumeSeriesRef.current) {
      const volumeData: HistogramData[] = data.map((d: OHLCVData, i: number) => ({
        time: d.time as string,
        value: d.volume,
        color: i > 0 && d.close >= data[i - 1].close ? '#22c55e80' : '#ef444480',
      }));
      volumeSeriesRef.current.setData(volumeData);
    }

    // Fit content
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  // Update indicators
  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // Remove existing indicator series
    if (sma20SeriesRef.current) {
      chartRef.current.removeSeries(sma20SeriesRef.current);
      sma20SeriesRef.current = null;
    }
    if (sma50SeriesRef.current) {
      chartRef.current.removeSeries(sma50SeriesRef.current);
      sma50SeriesRef.current = null;
    }
    if (sma200SeriesRef.current) {
      chartRef.current.removeSeries(sma200SeriesRef.current);
      sma200SeriesRef.current = null;
    }

    if (!indicatorsEnabled) return;

    // Add SMA 20
    const sma20Data = calculateSMA(data, 20);
    if (sma20Data.length > 0) {
      const sma20Series = chartRef.current.addLineSeries({
        color: '#f59e0b',
        lineWidth: 1,
        title: 'SMA 20',
      });
      sma20Series.setData(sma20Data as LineData[]);
      sma20SeriesRef.current = sma20Series;
    }

    // Add SMA 50
    const sma50Data = calculateSMA(data, 50);
    if (sma50Data.length > 0) {
      const sma50Series = chartRef.current.addLineSeries({
        color: '#8b5cf6',
        lineWidth: 1,
        title: 'SMA 50',
      });
      sma50Series.setData(sma50Data as LineData[]);
      sma50SeriesRef.current = sma50Series;
    }

    // Add SMA 200 (only for longer ranges)
    if (range === '1Y' || range === 'ALL') {
      const sma200Data = calculateSMA(data, 200);
      if (sma200Data.length > 0) {
        const sma200Series = chartRef.current.addLineSeries({
          color: '#ec4899',
          lineWidth: 1,
          title: 'SMA 200',
        });
        sma200Series.setData(sma200Data as LineData[]);
        sma200SeriesRef.current = sma200Series;
      }
    }
  }, [data, indicatorsEnabled, range]);

  // Update theme
  useEffect(() => {
    if (!chartRef.current) return;
    const theme = isDark ? darkTheme : lightTheme;
    chartRef.current.applyOptions(theme);
  }, [isDark]);

  // Calculate summary stats
  const stats = useCallback(() => {
    if (!data || data.length === 0) return null;

    const first = data[0];
    const last = data[data.length - 1];
    const change = last.close - first.open;
    const changePercent = (change / first.open) * 100;
    const high = Math.max(...data.map(d => d.high));
    const low = Math.min(...data.map(d => d.low));
    const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;

    return {
      currentPrice: last.close,
      change,
      changePercent,
      high,
      low,
      avgVolume,
      isUp: change >= 0,
    };
  }, [data]);

  const summary = stats();

  if (isError) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg', className)} style={{ height }}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Unable to load chart data</p>
          <p className="text-xs mt-1">{error?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div>
            <span className="font-semibold text-lg">{symbol}</span>
            <Badge variant="outline" className="ml-2 text-xs">
              {assetType === 'crypto' ? 'Crypto' : 'Stock'}
            </Badge>
          </div>
          {summary && (
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium">
                ${summary.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={cn(
                'flex items-center text-sm font-medium',
                summary.isUp ? 'text-green-600' : 'text-red-600'
              )}>
                {summary.isUp ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {summary.isUp ? '+' : ''}{summary.change.toFixed(2)} ({summary.changePercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Indicators toggle */}
          <Button
            variant={indicatorsEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIndicatorsEnabled(!indicatorsEnabled)}
            title="Toggle moving averages"
          >
            <Activity className="h-4 w-4" />
          </Button>

          {/* Expand button */}
          {onExpand && (
            <Button variant="outline" size="sm" onClick={onExpand} title="Full screen">
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Time range selector */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-800">
        {ranges.map((r) => (
          <Button
            key={r}
            variant={range === r ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'px-3 py-1 text-xs',
              range === r && 'bg-blue-600 hover:bg-blue-700'
            )}
            onClick={() => setRange(r)}
          >
            {r}
          </Button>
        ))}

        {/* Indicator legend */}
        {indicatorsEnabled && (
          <div className="ml-auto flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-amber-500"></span>
              SMA 20
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-violet-500"></span>
              SMA 50
            </span>
            {(range === '1Y' || range === 'ALL') && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-pink-500"></span>
                SMA 200
              </span>
            )}
          </div>
        )}
      </div>

      {/* Chart container */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center z-10">
            <div className="text-center">
              <Skeleton className="h-4 w-32 mx-auto mb-2" />
              <Skeleton className="h-3 w-24 mx-auto" />
            </div>
          </div>
        )}
        <div ref={chartContainerRef} style={{ height: showVolume ? height : height - 60 }} />
      </div>

      {/* Stats footer */}
      {summary && (
        <div className="flex items-center justify-between p-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <span>H: ${summary.high.toLocaleString()}</span>
            <span>L: ${summary.low.toLocaleString()}</span>
          </div>
          <div>
            <span>Avg Vol: {(summary.avgVolume / 1000000).toFixed(2)}M</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PriceChart;
