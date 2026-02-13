// STATIC MOCKUP: Investment functionality disabled
// Original functionality backed up to Investments.tsx.backup

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader, PageContent } from '@/components/layout/PageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { Plus, LayoutGrid, List, TrendingUp, TrendingDown, BarChart3, AlertCircle, Info } from 'lucide-react';

// Static mock data for UI demonstration
const MOCK_WATCHLISTS = [
  {
    id: '1',
    name: 'Tech Stocks',
    items: [
      { symbol: 'AAPL', name: 'Apple Inc.', price: 191.45, change: 2.34, changePercent: 1.24, volume: 45678901, type: 'stock' as const },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.56, change: -1.23, changePercent: -0.86, volume: 23456789, type: 'stock' as const },
      { symbol: 'MSFT', name: 'Microsoft Corp.', price: 420.15, change: 5.67, changePercent: 1.37, volume: 34567890, type: 'stock' as const },
      { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.87, change: -3.12, changePercent: -1.24, volume: 56789012, type: 'stock' as const },
    ]
  },
  {
    id: '2', 
    name: 'Crypto Portfolio',
    items: [
      { symbol: 'BTC', name: 'Bitcoin', price: 51234.56, change: 1234.50, changePercent: 2.47, volume: 1234567890, type: 'crypto' as const },
      { symbol: 'ETH', name: 'Ethereum', price: 3456.78, change: -45.60, changePercent: -1.30, volume: 987654321, type: 'crypto' as const },
      { symbol: 'SOL', name: 'Solana', price: 98.45, change: 3.21, changePercent: 3.37, volume: 456789123, type: 'crypto' as const },
    ]
  },
  {
    id: '3',
    name: 'Blue Chip Stocks', 
    items: [
      { symbol: 'JNJ', name: 'Johnson & Johnson', price: 158.90, change: 0.78, changePercent: 0.49, volume: 12345678, type: 'stock' as const },
      { symbol: 'PG', name: 'Procter & Gamble', price: 164.32, change: -0.45, changePercent: -0.27, volume: 9876543, type: 'stock' as const },
      { symbol: 'KO', name: 'Coca Cola', price: 58.76, change: 0.23, changePercent: 0.39, volume: 15432109, type: 'stock' as const },
    ]
  }
];

const MOCK_MARKET_OVERVIEW = [
  { name: 'S&P 500', value: '4,967.23', change: '+12.45', changePercent: '+0.25%', positive: true },
  { name: 'NASDAQ', value: '15,628.95', change: '+45.23', changePercent: '+0.29%', positive: true },
  { name: 'DOW', value: '38,239.66', change: '-23.12', changePercent: '-0.06%', positive: false },
  { name: 'BTC/USD', value: '$51,234', change: '+$1,234', changePercent: '+2.47%', positive: true },
];

const MOCK_SCREENER_RESULTS = [
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.60, changePercent: 1.44, volume: 34567890, marketCap: '2.1T', pe: 65.4, type: 'stock' as const },
  { symbol: 'AMD', name: 'AMD Inc.', price: 184.30, changePercent: 2.15, volume: 23456789, marketCap: '298B', pe: 45.2, type: 'stock' as const },
  { symbol: 'INTC', name: 'Intel Corp.', price: 43.21, changePercent: -0.98, volume: 45678901, marketCap: '182B', pe: 12.8, type: 'stock' as const },
];

export default function Investments() {
  const { selectedBusiness } = useBusinessContext();
  const [activeTab, setActiveTab] = useState('watchlist');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const formatPrice = (price: number) => 
    price >= 1000 ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
    : `$${price.toFixed(2)}`;

  const formatChange = (change: number) => 
    change >= 0 ? `+$${change.toFixed(2)}` : `-$${Math.abs(change).toFixed(2)}`;

  const formatPercent = (percent: number) => 
    percent >= 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`;

  const WatchlistCard = ({ watchlist }: { watchlist: any }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          {watchlist.name}
          <span className="text-sm text-gray-500 font-normal">{watchlist.items.length} symbols</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {watchlist.items.map((item: any) => (
          <div key={item.symbol} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{item.symbol}</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {item.type.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">{formatPrice(item.price)}</div>
              <div className={`text-sm flex items-center gap-1 ${
                item.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {item.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {formatChange(item.change)} ({formatPercent(item.changePercent)})
              </div>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" className="w-full mt-4" disabled>
          <Plus className="h-4 w-4 mr-2" />
          Add Symbol (Disabled)
        </Button>
      </CardContent>
    </Card>
  );

  const WatchlistTable = () => (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 font-medium">Symbol</th>
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-right p-4 font-medium">Price</th>
                <th className="text-right p-4 font-medium">Change</th>
                <th className="text-right p-4 font-medium">Volume</th>
                <th className="text-left p-4 font-medium">Watchlist</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_WATCHLISTS.flatMap(wl =>
                wl.items.map((item, idx) => (
                  <tr key={`${wl.id}-${item.symbol}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.symbol}</span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {item.type.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">{item.name}</td>
                    <td className="p-4 text-right font-medium">{formatPrice(item.price)}</td>
                    <td className={`p-4 text-right ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <div>{formatChange(item.change)}</div>
                      <div className="text-sm">({formatPercent(item.changePercent)})</div>
                    </td>
                    <td className="p-4 text-right text-gray-600">{item.volume.toLocaleString()}</td>
                    <td className="p-4 text-gray-600">{wl.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={() => {}}
      businessName={selectedBusiness?.name}
    >
      <PageContent>
        <PageHeader
          title="Investments (Static Demo)"
          description="Investment tracking functionality disabled - showing mockup data only"
          actions={
            <div className="flex items-center gap-3">
              <div className="flex items-center border rounded-lg p-1 bg-white">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-8 p-0"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <Button disabled className="bg-gray-300">
                <Plus className="h-4 w-4 mr-2" />
                New Watchlist (Disabled)
              </Button>
            </div>
          }
        />

        {/* Disclaimer Alert */}
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <Info className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Investment functionality is currently disabled.</strong> This page shows static mockup data for design purposes only. 
            All market data API calls, database connections, and real-time updates have been removed to reduce system load.
          </AlertDescription>
        </Alert>

        {/* Market Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {MOCK_MARKET_OVERVIEW.map((market) => (
            <Card key={market.name}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">{market.name}</div>
                    <div className="text-xl font-semibold">{market.value}</div>
                  </div>
                  <div className={`text-right ${market.positive ? 'text-green-600' : 'text-red-600'}`}>
                    <div className="flex items-center gap-1">
                      {market.positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      <span>{market.change}</span>
                    </div>
                    <div className="text-sm">{market.changePercent}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="watchlist">Watchlist (Static)</TabsTrigger>
            <TabsTrigger value="screener">Screener (Static)</TabsTrigger>
            <TabsTrigger value="alerts">Alerts (Disabled)</TabsTrigger>
            <TabsTrigger value="templates">Templates (Static)</TabsTrigger>
          </TabsList>

          <TabsContent value="watchlist" className="mt-0">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {MOCK_WATCHLISTS.map((watchlist) => (
                  <WatchlistCard key={watchlist.id} watchlist={watchlist} />
                ))}
              </div>
            ) : (
              <WatchlistTable />
            )}
          </TabsContent>

          <TabsContent value="screener" className="mt-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Stock Screener (Demo)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Market Cap</label>
                    <select className="w-full p-2 border rounded-md" disabled>
                      <option>Large Cap (&gt;$10B)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Sector</label>
                    <select className="w-full p-2 border rounded-md" disabled>
                      <option>Technology</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">P/E Ratio</label>
                    <select className="w-full p-2 border rounded-md" disabled>
                      <option>&lt; 50</option>
                    </select>
                  </div>
                </div>
                <Button disabled className="bg-gray-300">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Run Screener (Disabled)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Screener Results (Mock Data)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MOCK_SCREENER_RESULTS.map((stock) => (
                    <div key={stock.symbol} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{stock.symbol}</div>
                        <div className="text-sm text-gray-600">{stock.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatPrice(stock.price)}</div>
                        <div className={`text-sm ${stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercent(stock.changePercent)}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <div>Cap: {stock.marketCap}</div>
                        <div>P/E: {stock.pe}</div>
                      </div>
                      <Button variant="outline" size="sm" disabled>
                        Add to Watchlist
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Alerts Disabled
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Investment alerts functionality has been disabled to reduce API calls and database load. 
                  This feature would normally allow you to set up price alerts, technical indicator triggers, 
                  and automated workflows.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: 'Growth Stock Alert', description: 'Get notified when growth stocks break resistance levels' },
                { name: 'Value Investor', description: 'Screen for undervalued stocks with strong fundamentals' },
                { name: 'Crypto Momentum', description: 'Track cryptocurrency momentum and volume spikes' },
                { name: 'Dividend Watch', description: 'Monitor dividend-paying stocks for income opportunities' },
                { name: 'Tech Breakout', description: 'Identify technology stocks breaking out of patterns' },
                { name: 'Market Volatility', description: 'Alert on unusual market volatility or VIX spikes' },
              ].map((template, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm mb-4">{template.description}</p>
                    <Button variant="outline" size="sm" disabled>
                      Use Template (Disabled)
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer disclaimer */}
        <Alert className="mt-6 border-gray-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm text-gray-600">
            <strong>Investment Disclaimer:</strong> This is for informational purposes only and is not investment advice. 
            All data shown is static/mock data for demonstration purposes. Investment functionality has been disabled.
          </AlertDescription>
        </Alert>
      </PageContent>
    </DashboardLayout>
  );
}