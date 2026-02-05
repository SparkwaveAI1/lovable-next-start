import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader, PageContent } from '@/components/layout/PageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { WatchlistCard } from '@/components/investments/WatchlistCard';
import { WatchlistTable } from '@/components/investments/WatchlistTable';
import { AddSymbolDialog } from '@/components/investments/AddSymbolDialog';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { Plus, LayoutGrid, List } from 'lucide-react';

// Mock data for initial development
const mockWatchlists = [
  {
    id: '1',
    name: 'Tech Giants',
    items: [
      { symbol: 'AAPL', name: 'Apple Inc.', price: 178.52, change: 2.34, changePercent: 1.33, volume: 52400000, type: 'stock' as const },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 141.80, change: -0.85, changePercent: -0.60, volume: 21300000, type: 'stock' as const },
      { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.91, change: 4.12, changePercent: 1.10, volume: 18700000, type: 'stock' as const },
      { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 721.28, change: 15.44, changePercent: 2.19, volume: 45200000, type: 'stock' as const },
    ],
  },
  {
    id: '2',
    name: 'Crypto Holdings',
    items: [
      { symbol: 'BTC', name: 'Bitcoin', price: 43250.00, change: 850.00, changePercent: 2.00, volume: 28000000000, type: 'crypto' as const },
      { symbol: 'ETH', name: 'Ethereum', price: 2280.50, change: -45.20, changePercent: -1.94, volume: 12000000000, type: 'crypto' as const },
      { symbol: 'SOL', name: 'Solana', price: 98.75, change: 5.25, changePercent: 5.62, volume: 2100000000, type: 'crypto' as const },
    ],
  },
  {
    id: '3',
    name: 'Dividend Stocks',
    items: [
      { symbol: 'JNJ', name: 'Johnson & Johnson', price: 156.32, change: 0.78, changePercent: 0.50, volume: 6800000, type: 'stock' as const },
      { symbol: 'PG', name: 'Procter & Gamble', price: 162.45, change: 1.23, changePercent: 0.76, volume: 5400000, type: 'stock' as const },
      { symbol: 'KO', name: 'Coca-Cola Co.', price: 59.87, change: -0.32, changePercent: -0.53, volume: 12100000, type: 'stock' as const },
    ],
  },
];

export type WatchlistItem = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  type: 'stock' | 'crypto';
};

export type Watchlist = {
  id: string;
  name: string;
  items: WatchlistItem[];
};

export default function Investments() {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const [activeTab, setActiveTab] = useState('watchlist');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [watchlists, setWatchlists] = useState<Watchlist[]>(mockWatchlists);
  const [selectedWatchlist, setSelectedWatchlist] = useState<Watchlist | null>(null);
  const [addSymbolOpen, setAddSymbolOpen] = useState(false);
  const [targetWatchlistId, setTargetWatchlistId] = useState<string | null>(null);

  const handleAddSymbol = (watchlistId: string) => {
    setTargetWatchlistId(watchlistId);
    setAddSymbolOpen(true);
  };

  const handleSymbolAdded = (symbol: string, type: 'stock' | 'crypto') => {
    if (!targetWatchlistId) return;

    // Mock adding a new symbol (in real app, would fetch from API)
    const newItem: WatchlistItem = {
      symbol: symbol.toUpperCase(),
      name: symbol.toUpperCase(), // Would be fetched from API
      price: Math.random() * 500 + 50,
      change: (Math.random() - 0.5) * 20,
      changePercent: (Math.random() - 0.5) * 10,
      volume: Math.floor(Math.random() * 50000000),
      type,
    };

    setWatchlists(prev =>
      prev.map(wl =>
        wl.id === targetWatchlistId
          ? { ...wl, items: [...wl.items, newItem] }
          : wl
      )
    );
    setAddSymbolOpen(false);
    setTargetWatchlistId(null);
  };

  const handleRemoveSymbol = (watchlistId: string, symbol: string) => {
    setWatchlists(prev =>
      prev.map(wl =>
        wl.id === watchlistId
          ? { ...wl, items: wl.items.filter(item => item.symbol !== symbol) }
          : wl
      )
    );
  };

  // Flatten all items for table view
  const allItems = watchlists.flatMap(wl =>
    wl.items.map(item => ({ ...item, watchlistId: wl.id, watchlistName: wl.name }))
  );

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={(id) => {
        // Business change handling would go here
      }}
      businessName={selectedBusiness?.name}
    >
      <PageContent>
        <PageHeader
          title="Investments"
          description="Track your stocks, crypto, and investment watchlists"
          actions={
            <div className="flex items-center gap-2">
              {/* View Toggle */}
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
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                New Watchlist
              </Button>
            </div>
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
            <TabsTrigger value="screener" disabled className="opacity-50">
              Screener
            </TabsTrigger>
            <TabsTrigger value="alerts" disabled className="opacity-50">
              Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="watchlist" className="mt-0">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {watchlists.map((watchlist) => (
                  <WatchlistCard
                    key={watchlist.id}
                    watchlist={watchlist}
                    onAddSymbol={() => handleAddSymbol(watchlist.id)}
                    onRemoveSymbol={(symbol) => handleRemoveSymbol(watchlist.id, symbol)}
                  />
                ))}
              </div>
            ) : (
              <WatchlistTable
                items={allItems}
                onRemoveSymbol={(watchlistId, symbol) => handleRemoveSymbol(watchlistId, symbol)}
              />
            )}
          </TabsContent>

          <TabsContent value="screener">
            <div className="text-center py-12 text-gray-500">
              Stock screener coming soon...
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <div className="text-center py-12 text-gray-500">
              Price alerts coming soon...
            </div>
          </TabsContent>
        </Tabs>
      </PageContent>

      <AddSymbolDialog
        open={addSymbolOpen}
        onOpenChange={setAddSymbolOpen}
        onSubmit={handleSymbolAdded}
      />
    </DashboardLayout>
  );
}
