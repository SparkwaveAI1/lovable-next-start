import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMixedQuotes, QuoteData } from '@/hooks/useMarketData';

interface MarketIndex {
  symbol: string;
  displayName: string;
  assetType: 'stock' | 'crypto';
  icon?: string;
}

// Major market indices and crypto to display
const MARKET_INDICES: MarketIndex[] = [
  { symbol: 'SPY', displayName: 'S&P 500', assetType: 'stock' },
  { symbol: 'QQQ', displayName: 'NASDAQ', assetType: 'stock' },
  { symbol: 'bitcoin', displayName: 'BTC', assetType: 'crypto', icon: '₿' },
  { symbol: 'ethereum', displayName: 'ETH', assetType: 'crypto', icon: 'Ξ' },
];

interface MarketCardProps {
  name: string;
  quote: QuoteData | undefined;
  isLoading: boolean;
  icon?: string;
}

function MarketCard({ name, quote, isLoading, icon }: MarketCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-6 w-24 mb-1" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const price = quote?.price ?? 0;
  const change = quote?.change ?? 0;
  const changePercent = quote?.changePercent ?? 0;
  
  const isPositive = changePercent > 0;
  const isNegative = changePercent < 0;
  const isNeutral = changePercent === 0;

  const formatPrice = (p: number) => {
    if (p >= 1000) {
      return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const formatChange = (c: number) => {
    const sign = c >= 0 ? '+' : '';
    if (Math.abs(c) >= 1) {
      return `${sign}${c.toFixed(2)}`;
    }
    return `${sign}${c.toFixed(4)}`;
  };

  return (
    <Card className={cn(
      "bg-white shadow-sm border transition-all hover:shadow-md",
      isPositive && "border-l-4 border-l-green-500",
      isNegative && "border-l-4 border-l-red-500",
      isNeutral && "border-l-4 border-l-gray-300"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {icon && <span className="text-lg font-semibold text-gray-600">{icon}</span>}
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                {name}
              </span>
            </div>
            <div className="mt-1">
              <span className="text-xl font-bold text-gray-900">
                ${formatPrice(price)}
              </span>
            </div>
            <div className={cn(
              "flex items-center gap-1 mt-1 text-sm font-medium",
              isPositive && "text-green-600",
              isNegative && "text-red-600",
              isNeutral && "text-gray-500"
            )}>
              {isPositive && <TrendingUp className="h-4 w-4" />}
              {isNegative && <TrendingDown className="h-4 w-4" />}
              {isNeutral && <Minus className="h-4 w-4" />}
              <span>{formatChange(change)}</span>
              <span className="text-gray-400">|</span>
              <span>{changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%</span>
            </div>
          </div>
          <div className={cn(
            "flex items-center justify-center h-12 w-12 rounded-full",
            isPositive && "bg-green-100",
            isNegative && "bg-red-100",
            isNeutral && "bg-gray-100"
          )}>
            {isPositive && <TrendingUp className="h-6 w-6 text-green-600" />}
            {isNegative && <TrendingDown className="h-6 w-6 text-red-600" />}
            {isNeutral && <Minus className="h-6 w-6 text-gray-500" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MarketOverviewCardsProps {
  className?: string;
}

export function MarketOverviewCards({ className }: MarketOverviewCardsProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const items = MARKET_INDICES.map(idx => ({
    symbol: idx.symbol,
    assetType: idx.assetType,
  }));

  const { data: quotes, isLoading } = useMixedQuotes(items);

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Check if market is open (simplified - doesn't account for holidays)
  const isMarketOpen = () => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    const timeInMinutes = hour * 60 + minute;
    
    // NYSE hours: 9:30 AM - 4:00 PM ET (14:30 - 21:00 UTC)
    const marketOpenUTC = 14 * 60 + 30; // 14:30 UTC
    const marketCloseUTC = 21 * 60; // 21:00 UTC
    
    // Weekend check
    if (day === 0 || day === 6) return false;
    
    return timeInMinutes >= marketOpenUTC && timeInMinutes < marketCloseUTC;
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Market Overview</h2>
          <div className={cn(
            "px-2 py-0.5 rounded text-xs font-medium",
            isMarketOpen() 
              ? "bg-green-100 text-green-700" 
              : "bg-gray-100 text-gray-600"
          )}>
            {isMarketOpen() ? 'Market Open' : 'Market Closed'}
          </div>
        </div>
        <span className="text-sm text-gray-500">
          {formatDateTime(currentTime)}
        </span>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {MARKET_INDICES.map((index) => {
          // Lookup quote - try both uppercase and lowercase
          const quote = quotes?.[index.symbol.toUpperCase()] || quotes?.[index.symbol.toLowerCase()] || quotes?.[index.symbol];
          
          return (
            <MarketCard
              key={index.symbol}
              name={index.displayName}
              quote={quote}
              isLoading={isLoading}
              icon={index.icon}
            />
          );
        })}
      </div>
    </div>
  );
}
