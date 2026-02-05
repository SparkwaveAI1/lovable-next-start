import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PriceChart } from './PriceChart';
import { RSIPanel } from './ChartIndicators';
import { useQuote } from '@/hooks/useMarketData';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  X, 
  ExternalLink,
  BarChart3,
  Activity,
} from 'lucide-react';

export interface ChartModalProps {
  symbol: string;
  assetType: 'stock' | 'crypto';
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen chart modal with detailed analysis
 */
export function ChartModal({ symbol, assetType, open, onClose }: ChartModalProps) {
  const [showRSI, setShowRSI] = useState(false);
  const { data: quote, isLoading } = useQuote(symbol, assetType);

  const isUp = quote && quote.changePercent >= 0;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl font-bold">{symbol}</span>
              <Badge variant="outline">
                {assetType === 'crypto' ? 'Crypto' : 'Stock'}
              </Badge>
            </DialogTitle>

            {quote && (
              <div className="flex items-center gap-4">
                <span className="text-2xl font-semibold">
                  ${quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <div className={cn(
                  'flex items-center gap-1 text-lg font-medium',
                  isUp ? 'text-green-600' : 'text-red-600'
                )}>
                  {isUp ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                  <span>{isUp ? '+' : ''}{quote.change.toFixed(2)}</span>
                  <span>({quote.changePercent.toFixed(2)}%)</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={showRSI ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowRSI(!showRSI)}
              title="Toggle RSI panel"
            >
              <Activity className="h-4 w-4 mr-1" />
              RSI
            </Button>
            
            {assetType === 'crypto' && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://www.coingecko.com/en/coins/${symbol.toLowerCase()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  CoinGecko
                </a>
              </Button>
            )}

            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="chart" className="h-full">
            <TabsList className="mx-4 mt-2">
              <TabsTrigger value="chart">
                <BarChart3 className="h-4 w-4 mr-1" />
                Chart
              </TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
            </TabsList>

            <TabsContent value="chart" className="h-full px-4 pb-4">
              <div className="space-y-4">
                {/* Main chart */}
                <PriceChart
                  symbol={symbol}
                  assetType={assetType}
                  height={showRSI ? 400 : 550}
                  showVolume={true}
                  showIndicators={true}
                  className="shadow-none border-0"
                />

                {/* RSI Panel */}
                {showRSI && (
                  <RSIPanel
                    symbol={symbol}
                    assetType={assetType}
                    height={150}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="overview" className="p-4">
              {quote && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Open" value={`$${quote.open.toLocaleString()}`} />
                  <StatCard label="High" value={`$${quote.high.toLocaleString()}`} />
                  <StatCard label="Low" value={`$${quote.low.toLocaleString()}`} />
                  <StatCard label="Previous Close" value={`$${quote.previousClose.toLocaleString()}`} />
                  <StatCard 
                    label="Volume" 
                    value={formatVolume(quote.volume)} 
                  />
                  <StatCard 
                    label="24h Change" 
                    value={`${isUp ? '+' : ''}${quote.changePercent.toFixed(2)}%`}
                    className={isUp ? 'text-green-600' : 'text-red-600'}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  className?: string;
}

function StatCard({ label, value, className }: StatCardProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className={cn('text-lg font-semibold mt-1', className)}>{value}</div>
    </div>
  );
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(2)}K`;
  return vol.toLocaleString();
}

export default ChartModal;
