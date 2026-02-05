import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, TrendingDown, MoreHorizontal, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Watchlist, WatchlistItem } from '@/pages/Investments';

interface WatchlistCardProps {
  watchlist: Watchlist;
  onAddSymbol: () => void;
  onRemoveSymbol: (symbol: string) => void;
}

function formatPrice(price: number, type: 'stock' | 'crypto'): string {
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
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
}

function WatchlistItemRow({
  item,
  onRemove,
}: {
  item: WatchlistItem;
  onRemove: () => void;
}) {
  const isPositive = item.change >= 0;

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
        <div className="text-right">
          <div className="font-semibold text-gray-900">
            {formatPrice(item.price, item.type)}
          </div>
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
}: WatchlistCardProps) {
  // Calculate total change for the watchlist
  const totalChange = watchlist.items.reduce(
    (sum, item) => sum + item.changePercent,
    0
  );
  const avgChange = watchlist.items.length > 0 ? totalChange / watchlist.items.length : 0;
  const isPositive = avgChange >= 0;

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
        </div>
      </CardHeader>

      <CardContent>
        <div className="divide-y divide-gray-100">
          {watchlist.items.map((item) => (
            <WatchlistItemRow
              key={item.symbol}
              item={item}
              onRemove={() => onRemoveSymbol(item.symbol)}
            />
          ))}
        </div>

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
