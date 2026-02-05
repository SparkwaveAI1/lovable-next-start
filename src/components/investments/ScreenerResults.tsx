import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { InvestmentDisclaimer } from './Disclaimer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Search,
} from 'lucide-react';
import type { ScreenerResult } from '@/hooks/useScreener';

interface ScreenerResultsProps {
  results: ScreenerResult[];
  isLoading?: boolean;
  onAddToWatchlist?: (symbol: string, type: 'stock' | 'crypto') => void;
}

type SortField = 'symbol' | 'price' | 'changePercent' | 'volume';
type SortDirection = 'asc' | 'desc';

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
  if (price < 1) {
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
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
  if (volume >= 1_000_000_000) {
    return `${(volume / 1_000_000_000).toFixed(2)}B`;
  }
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(2)}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(2)}K`;
  }
  return volume.toString();
}

function formatIndicator(key: string, value: number): string {
  if (key.toLowerCase().includes('rsi')) {
    return value.toFixed(2);
  }
  if (key.toLowerCase().includes('volume')) {
    return formatVolume(value);
  }
  if (key.toLowerCase().includes('price') || key.toLowerCase().includes('sma') || key.toLowerCase().includes('ema')) {
    return `$${value.toFixed(2)}`;
  }
  if (key.toLowerCase().includes('change') || key.toLowerCase().includes('percent')) {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }
  return value.toFixed(2);
}

function SortableHeader({
  label,
  field,
  currentField,
  currentDirection,
  onSort,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentField === field;

  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:text-gray-900 transition-colors"
    >
      {label}
      {isActive && (
        currentDirection === 'asc' ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )
      )}
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-32 flex-1" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-gray-100 p-3 mb-4">
        <Search className="h-6 w-6 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No results yet</h3>
      <p className="text-gray-500 max-w-sm">
        Configure your screener rules above and click "Run Screener" to find matching securities.
      </p>
    </div>
  );
}

function NoMatchesState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-yellow-50 p-3 mb-4">
        <Search className="h-6 w-6 text-yellow-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
      <p className="text-gray-500 max-w-sm">
        No securities match your current criteria. Try adjusting your rules or expanding asset types.
      </p>
    </div>
  );
}

export function ScreenerResults({
  results,
  isLoading = false,
  onAddToWatchlist,
}: ScreenerResultsProps) {
  const [sortField, setSortField] = useState<SortField>('changePercent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'changePercent':
          comparison = a.changePercent - b.changePercent;
          break;
        case 'volume':
          comparison = a.volume - b.volume;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [results, sortField, sortDirection]);

  // Collect all unique indicator keys from results
  const indicatorKeys = useMemo(() => {
    const keys = new Set<string>();
    results.forEach((result) => {
      Object.keys(result.matchedIndicators || {}).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [results]);

  // Check if we've run a search (results array exists vs undefined behavior)
  const hasRun = results.length > 0 || isLoading;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Screener Results</CardTitle>
            {results.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {results.length} {results.length === 1 ? 'match' : 'matches'} found
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <LoadingSkeleton />
        ) : !hasRun ? (
          <EmptyState />
        ) : results.length === 0 ? (
          <NoMatchesState />
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">
                    <SortableHeader
                      label="Symbol"
                      field="symbol"
                      currentField={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold text-right">
                    <SortableHeader
                      label="Price"
                      field="price"
                      currentField={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="font-semibold text-right">
                    <SortableHeader
                      label="Change %"
                      field="changePercent"
                      currentField={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="font-semibold text-right">
                    <SortableHeader
                      label="Volume"
                      field="volume"
                      currentField={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  {indicatorKeys.length > 0 && (
                    <TableHead className="font-semibold">Indicators</TableHead>
                  )}
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedResults.map((result) => {
                  const isPositive = result.changePercent >= 0;

                  return (
                    <TableRow key={`${result.type}-${result.symbol}`} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{result.symbol}</span>
                          {result.name && (
                            <span className="text-sm text-gray-500 truncate max-w-[150px]">
                              {result.name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            result.type === 'crypto'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {result.type === 'crypto' ? 'Crypto' : 'Stock'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(result.price, result.type)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className={`flex items-center justify-end gap-1 ${
                            isPositive ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          <span className="font-medium">
                            {isPositive ? '+' : ''}
                            {result.changePercent.toFixed(2)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-gray-600">
                        {formatVolume(result.volume)}
                      </TableCell>
                      {indicatorKeys.length > 0 && (
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {indicatorKeys.map((key) => {
                              const value = result.matchedIndicators?.[key];
                              if (value === undefined) return null;
                              return (
                                <Badge
                                  key={key}
                                  variant="outline"
                                  className="text-xs bg-gray-50"
                                >
                                  {key}: {formatIndicator(key, value)}
                                </Badge>
                              );
                            })}
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        {onAddToWatchlist && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => onAddToWatchlist(result.symbol, result.type)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add to Watchlist
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Disclaimer shown when results are present */}
        {results.length > 0 && (
          <InvestmentDisclaimer variant="compact" className="mt-4" />
        )}
      </CardContent>
    </Card>
  );
}
