import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, TrendingUp, TrendingDown, MoreHorizontal, Trash2, BarChart3 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SparklineChart, getSparklineColor } from './SparklineChart';
import type { Watchlist, WatchlistItem } from '@/pages/Investments';

interface WatchlistCardProps {
  watchlist: Watchlist;
  onAddSymbol: () => void;
  onRemoveSymbol: (symbol: string) => void;
  isLoadingQuotes?: boolean;
  historyData?: Record<string, number[]>;
  isLoadingHistory?: boolean;
}

function formatPrice(price: number, type: 'stock' | 'crypto'): string {
  if (price === 0) return '—';
  if (type === 'crypto' && price >= 1000) {
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  return price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatChange(change: number, changePercent: number): string {
  if (change === 0 && changePercent === 0) return '—';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
}

function WatchlistItemSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="text-right">
        <Skeleton className="h-5 w-20 mb-1" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

function WatchlistItemRow({
  item,
  onRemove,
  isLoading,
  priceHistory,
  isLoadingHistory,
}: {
  item: WatchlistItem;
  onRemove: () => void;
  isLoading?: boolean;
  priceHistory?: number[];
  isLoadingHistory?: boolean;
}) {
  const isPositive = item.change >= 0;
  const hasData = item.price > 0;

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 group">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{item.symbol}</span>
            <Badge
              variant="outline"
              className={`text-xs ${
                item.type === 'crypto'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {item.type === 'crypto' ? 'Crypto' : 'Stock'}
            </Badge>
          </div>
          <span className="text-sm text-gray-500 truncate max-w-[150px]">
            {item.name}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Sparkline chart */}
        <SparklineChart
          data={priceHistory || []}
          color={priceHistory ? getSparklineColor(priceHistory) : 'neutral'}
          width={50}
          height={20}
          isLoading={isLoadingHistory}
        />
        
        <div className="text-right">
          {isLoading ? (
            <>
              <Skeleton className="h-5 w-20 mb-1" />
              <Skeleton className="h-4 w-24" />
            </>
          ) : (
            <>
              <div className="font-semibold text-gray-900">
                {formatPrice(item.price, item.type)}
              </div>
              {hasData && (
                <div
                  className={`flex items-center justify-end gap-1 text-sm ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{formatChange(item.change, item.changePercent)}</span>
                </div>
              )}
              {!hasData && (
                <span className="text-sm text-gray-400">Loading...</span>
              )}
            </>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={onRemove}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function WatchlistCard({
  watchlist,
  onAddSymbol,
  onRemoveSymbol,
  isLoadingQuotes = false,
  historyData = {},
  isLoadingHistory = false,
}: WatchlistCardProps) {
  // Calculate total change for the watchlist (only for items with data)
  const itemsWithData = watchlist.items.filter(item => item.price > 0);
  const totalChange = itemsWithData.reduce(
    (sum, item) => sum + item.changePercent,
    0
  );
  const avgChange = itemsWithData.length > 0 ? totalChange / itemsWithData.length : 0;
  const isPositive = avgChange >= 0;
  const hasAnyData = itemsWithData.length > 0;

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{watchlist.name}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {watchlist.items.length} {watchlist.items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
          {isLoadingQuotes ? (
            <Skeleton className="h-8 w-20" />
          ) : hasAnyData ? (
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium ${
                isPositive
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{isPositive ? '+' : ''}{avgChange.toFixed(2)}%</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium bg-gray-50 text-gray-500">
              <span>—</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {watchlist.items.length === 0 ? (
          <div className="py-4 text-center text-gray-500 text-sm">
            No symbols in this watchlist yet
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {watchlist.items.map((item) => (
              <WatchlistItemRow
                key={item.symbol}
                item={item}
                onRemove={() => onRemoveSymbol(item.symbol)}
                isLoading={isLoadingQuotes}
                priceHistory={historyData[item.symbol.toUpperCase()]}
                isLoadingHistory={isLoadingHistory}
              />
            ))}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full mt-4 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          onClick={onAddSymbol}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Symbol
        </Button>
      </CardContent>
    </Card>
  );
}
