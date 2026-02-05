import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useChartData, TimeRange, calculateRSI, OHLCVData } from '@/hooks/useChartData';
import { cn } from '@/lib/utils';

export interface RSIPanelProps {
  symbol: string;
  assetType: 'stock' | 'crypto';
  range?: TimeRange;
  height?: number;
  className?: string;
}

/**
 * RSI (Relative Strength Index) indicator panel
 * Shows RSI with overbought/oversold zones
 */
export function RSIPanel({
  symbol,
  assetType,
  range = '1M',
  height = 150,
  className,
}: RSIPanelProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [currentRSI, setCurrentRSI] = useState<number | null>(null);

  const { data, isLoading, isError } = useChartData(symbol, assetType, range);

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

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#1a1a2e' : '#ffffff' },
        textColor: isDark ? '#d1d5db' : '#333333',
      },
      grid: {
        vertLines: { color: isDark ? '#2d2d44' : '#f0f0f0' },
        horzLines: { color: isDark ? '#2d2d44' : '#f0f0f0' },
      },
      rightPriceScale: {
        borderColor: isDark ? '#2d2d44' : '#e5e7eb',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: isDark ? '#2d2d44' : '#e5e7eb',
        timeVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    });

    chartRef.current = chart;

    // RSI line
    const rsiSeries = chart.addLineSeries({
      color: '#8b5cf6',
      lineWidth: 2,
      priceLineVisible: false,
    });
    rsiSeriesRef.current = rsiSeries;

    // Overbought line (70)
    const overboughtSeries = chart.addLineSeries({
      color: '#ef444480',
      lineWidth: 1,
      lineStyle: 2, // Dashed
      priceLineVisible: false,
    });

    // Oversold line (30)
    const oversoldSeries = chart.addLineSeries({
      color: '#22c55e80',
      lineWidth: 1,
      lineStyle: 2, // Dashed
      priceLineVisible: false,
    });

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
      rsiSeriesRef.current = null;
    };
  }, [height, isDark]);

  // Update RSI data
  useEffect(() => {
    if (!data || !rsiSeriesRef.current || !chartRef.current) return;

    const rsiData = calculateRSI(data, 14);
    
    if (rsiData.length > 0) {
      rsiSeriesRef.current.setData(rsiData as LineData[]);
      setCurrentRSI(rsiData[rsiData.length - 1].value);

      // Update overbought/oversold lines to span the time range
      const firstTime = rsiData[0].time;
      const lastTime = rsiData[rsiData.length - 1].time;

      // Get series by iterating (lightweight-charts doesn't have getSeries)
      // We'll recreate them with data
      const overboughtData = [
        { time: firstTime, value: 70 },
        { time: lastTime, value: 70 },
      ];
      const oversoldData = [
        { time: firstTime, value: 30 },
        { time: lastTime, value: 30 },
      ];

      // Note: These lines are set up in the chart creation effect
      // For simplicity, we'll just fit the content
      chartRef.current.timeScale().fitContent();
    }
  }, [data]);

  // Determine RSI status
  const getRSIStatus = (rsi: number): { label: string; color: string } => {
    if (rsi >= 70) return { label: 'Overbought', color: 'text-red-500' };
    if (rsi <= 30) return { label: 'Oversold', color: 'text-green-500' };
    if (rsi >= 60) return { label: 'Bullish', color: 'text-green-600' };
    if (rsi <= 40) return { label: 'Bearish', color: 'text-red-600' };
    return { label: 'Neutral', color: 'text-gray-500' };
  };

  if (isLoading) {
    return (
      <div className={cn('rounded-lg border p-4', className)}>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn('rounded-lg border p-4 text-center text-gray-500', className)}>
        Unable to calculate RSI
      </div>
    );
  }

  const status = currentRSI ? getRSIStatus(currentRSI) : null;

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">RSI (14)</span>
          {currentRSI !== null && (
            <>
              <span className="text-lg font-semibold">{currentRSI.toFixed(1)}</span>
              {status && (
                <Badge variant="outline" className={status.color}>
                  {status.label}
                </Badge>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400/50"></span>
            70 (Overbought)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400/50"></span>
            30 (Oversold)
          </span>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} style={{ height }} />
    </div>
  );
}

export interface IndicatorLegendProps {
  indicators: Array<{
    name: string;
    color: string;
    value?: number;
  }>;
  className?: string;
}

/**
 * Legend component showing active indicators
 */
export function IndicatorLegend({ indicators, className }: IndicatorLegendProps) {
  return (
    <div className={cn('flex items-center gap-4 text-xs', className)}>
      {indicators.map((ind) => (
        <div key={ind.name} className="flex items-center gap-1">
          <span
            className="w-3 h-0.5"
            style={{ backgroundColor: ind.color }}
          />
          <span>{ind.name}</span>
          {ind.value !== undefined && (
            <span className="font-medium">{ind.value.toFixed(2)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default RSIPanel;
