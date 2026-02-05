import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export interface SparklineChartProps {
  data: number[]; // Last 7-30 price points
  color?: 'green' | 'red' | 'neutral';
  width?: number;
  height?: number;
  isLoading?: boolean;
}

const colorMap = {
  green: '#22c55e',   // Tailwind green-500
  red: '#ef4444',     // Tailwind red-500
  neutral: '#9ca3af', // Tailwind gray-400
};

/**
 * A minimal sparkline chart for showing price trends
 * Uses recharts for smooth, responsive rendering
 */
export function SparklineChart({
  data,
  color = 'neutral',
  width = 50,
  height = 20,
  isLoading = false,
}: SparklineChartProps) {
  if (isLoading) {
    return <Skeleton className="rounded" style={{ width, height }} />;
  }

  if (!data || data.length < 2) {
    return (
      <div
        className="bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs"
        style={{ width, height }}
      >
        —
      </div>
    );
  }

  // Convert array of numbers to recharts format
  const chartData = data.map((value, index) => ({ value, index }));

  // Determine color based on trend if not specified
  const strokeColor = colorMap[color];

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Determines sparkline color based on price trend
 * @param data Array of prices (oldest to newest)
 * @returns 'green' if trending up, 'red' if trending down, 'neutral' if flat
 */
export function getSparklineColor(data: number[]): 'green' | 'red' | 'neutral' {
  if (!data || data.length < 2) return 'neutral';

  const first = data[0];
  const last = data[data.length - 1];
  const percentChange = ((last - first) / first) * 100;

  // Consider anything within ±1% as neutral
  if (Math.abs(percentChange) < 1) return 'neutral';
  return percentChange > 0 ? 'green' : 'red';
}
