import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import type { WatchlistItem } from '@/pages/Investments';

interface WatchlistTableItem extends WatchlistItem {
  watchlistId: string;
  watchlistName: string;
}

interface WatchlistTableProps {
  items: WatchlistTableItem[];
  onRemoveSymbol: (watchlistId: string, symbol: string) => void;
  isLoadingQuotes?: boolean;
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

function formatVolume(volume: number): string {
  if (volume === 0) return '—';
  if (volume >= 1000000000) {
    return `${(volume / 1000000000).toFixed(1)}B`;
  }
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  }
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return volume.toString();
}

export function WatchlistTable({ items, onRemoveSymbol, isLoadingQuotes = false }: WatchlistTableProps) {
  if (items.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">No items in your watchlists yet.</p>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50">
            <TableHead className="font-semibold">Symbol</TableHead>
            <TableHead className="font-semibold">Name</TableHead>
            <TableHead className="font-semibold">Watchlist</TableHead>
            <TableHead className="font-semibold text-right">Price</TableHead>
            <TableHead className="font-semibold text-right">Change (%)</TableHead>
            <TableHead className="font-semibold text-right">Change ($)</TableHead>
            <TableHead className="font-semibold text-right">Volume</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isPositive = item.change >= 0;
            const hasData = item.price > 0;
            
            return (
              <TableRow key={`${item.watchlistId}-${item.symbol}`} className="group">
                <TableCell>
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
                </TableCell>
                <TableCell className="text-gray-600 max-w-[200px] truncate">
                  {item.name}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    {item.watchlistName}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {isLoadingQuotes ? (
                    <Skeleton className="h-5 w-20 ml-auto" />
                  ) : (
                    formatPrice(item.price, item.type)
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isLoadingQuotes ? (
                    <Skeleton className="h-5 w-16 ml-auto" />
                  ) : hasData ? (
                    <div
                      className={`flex items-center justify-end gap-1 font-medium ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span>
                        {isPositive ? '+' : ''}
                        {item.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isLoadingQuotes ? (
                    <Skeleton className="h-5 w-16 ml-auto" />
                  ) : hasData ? (
                    <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}
                      {item.change.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-gray-600">
                  {isLoadingQuotes ? (
                    <Skeleton className="h-5 w-12 ml-auto" />
                  ) : (
                    formatVolume(item.volume)
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => onRemoveSymbol(item.watchlistId, item.symbol)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
