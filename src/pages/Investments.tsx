import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader, PageContent } from '@/components/layout/PageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { WatchlistCard } from '@/components/investments/WatchlistCard';
import { WatchlistTable } from '@/components/investments/WatchlistTable';
import { AddSymbolDialog } from '@/components/investments/AddSymbolDialog';
import { CreateWatchlistDialog } from '@/components/investments/CreateWatchlistDialog';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { useWatchlists, useRemoveSymbol, useCreateWatchlist } from '@/hooks/useWatchlists';
import { useMixedQuotes, QuoteData } from '@/hooks/useMarketData';
import { useMixedHistory } from '@/hooks/useSymbolHistory';
import { Plus, LayoutGrid, List, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// Extended item type for UI display
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
  const { selectedBusiness } = useBusinessContext();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('watchlist');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [addSymbolOpen, setAddSymbolOpen] = useState(false);
  const [createWatchlistOpen, setCreateWatchlistOpen] = useState(false);
  const [targetWatchlistId, setTargetWatchlistId] = useState<string | null>(null);

  // Fetch watchlists from database
  const { 
    data: dbWatchlists, 
    isLoading: watchlistsLoading, 
    error: watchlistsError,
    refetch: refetchWatchlists,
  } = useWatchlists(selectedBusiness?.id);

  // Extract all symbols for market data fetching
  const allSymbolsWithTypes = (dbWatchlists || []).flatMap(wl => 
    (wl.items || []).map(item => ({
      symbol: item.symbol,
      assetType: item.asset_type as 'stock' | 'crypto',
    }))
  );

  // Fetch market data for all symbols
  const { 
    data: marketData, 
    isLoading: quotesLoading,
    refetch: refetchQuotes,
  } = useMixedQuotes(allSymbolsWithTypes);

  // Fetch historical data for sparklines (crypto only for now, has easier API)
  const cryptoSymbolsForHistory = allSymbolsWithTypes.filter(s => s.assetType === 'crypto');
  const {
    data: historyData,
    isLoading: historyLoading,
  } = useMixedHistory(cryptoSymbolsForHistory, 7);

  // Mutations
  const removeSymbolMutation = useRemoveSymbol();
  const createWatchlistMutation = useCreateWatchlist();

  // Transform database data + market quotes into UI format
  const watchlists: Watchlist[] = (dbWatchlists || []).map(wl => ({
    id: wl.id,
    name: wl.name,
    items: (wl.items || []).map(item => {
      const quote = marketData?.[item.symbol.toUpperCase()] || marketData?.[item.symbol.toLowerCase()];
      return {
        symbol: item.symbol.toUpperCase(),
        name: quote?.symbol || item.symbol.toUpperCase(),
        price: quote?.price || 0,
        change: quote?.change || 0,
        changePercent: quote?.changePercent || 0,
        volume: quote?.volume || 0,
        type: item.asset_type as 'stock' | 'crypto',
      };
    }),
  }));

  const handleAddSymbol = (watchlistId: string) => {
    setTargetWatchlistId(watchlistId);
    setAddSymbolOpen(true);
  };

  const handleSymbolAdded = () => {
    setAddSymbolOpen(false);
    setTargetWatchlistId(null);
    // Refetch to get updated data
    refetchWatchlists();
    refetchQuotes();
  };

  const handleRemoveSymbol = async (watchlistId: string, symbol: string) => {
    try {
      await removeSymbolMutation.mutateAsync({ watchlistId, symbol });
      toast({
        title: 'Symbol removed',
        description: `${symbol} has been removed from the watchlist.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove symbol',
        variant: 'destructive',
      });
    }
  };

  const handleCreateWatchlist = async (name: string) => {
    try {
      await createWatchlistMutation.mutateAsync({
        name,
        businessId: selectedBusiness?.id,
      });
      setCreateWatchlistOpen(false);
      toast({
        title: 'Watchlist created',
        description: `"${name}" has been created.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create watchlist',
        variant: 'destructive',
      });
    }
  };

  // Flatten all items for table view
  const allItems = watchlists.flatMap(wl =>
    wl.items.map(item => ({ ...item, watchlistId: wl.id, watchlistName: wl.name }))
  );

  const isLoading = watchlistsLoading;
  const hasQuotes = !quotesLoading && Object.keys(marketData || {}).length > 0;

  // Loading skeleton
  if (isLoading) {
    return (
      <DashboardLayout
        selectedBusinessId={selectedBusiness?.id}
        onBusinessChange={() => {}}
        businessName={selectedBusiness?.name}
      >
        <PageContent>
          <PageHeader
            title="Investments"
            description="Track your stocks, crypto, and investment watchlists"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="border rounded-lg p-4 space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-20" />
                <div className="space-y-3">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="flex justify-between">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PageContent>
      </DashboardLayout>
    );
  }

  // Error state
  if (watchlistsError) {
    return (
      <DashboardLayout
        selectedBusinessId={selectedBusiness?.id}
        onBusinessChange={() => {}}
        businessName={selectedBusiness?.name}
      >
        <PageContent>
          <PageHeader
            title="Investments"
            description="Track your stocks, crypto, and investment watchlists"
          />
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Failed to load watchlists
            </h3>
            <p className="text-gray-500 mb-4">
              {watchlistsError instanceof Error ? watchlistsError.message : 'An error occurred'}
            </p>
            <Button onClick={() => refetchWatchlists()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </PageContent>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      selectedBusinessId={selectedBusiness?.id}
      onBusinessChange={() => {}}
      businessName={selectedBusiness?.name}
    >
      <PageContent>
        <PageHeader
          title="Investments"
          description="Track your stocks, crypto, and investment watchlists"
          actions={
            <div className="flex items-center gap-2">
              {/* Refresh button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchWatchlists();
                  refetchQuotes();
                }}
                disabled={quotesLoading}
              >
                {quotesLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
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
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setCreateWatchlistOpen(true)}
              >
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
            {watchlists.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-gray-50">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No watchlists yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Create your first watchlist to start tracking investments.
                </p>
                <Button 
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => setCreateWatchlistOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Watchlist
                </Button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {watchlists.map((watchlist) => (
                  <WatchlistCard
                    key={watchlist.id}
                    watchlist={watchlist}
                    onAddSymbol={() => handleAddSymbol(watchlist.id)}
                    onRemoveSymbol={(symbol) => handleRemoveSymbol(watchlist.id, symbol)}
                    isLoadingQuotes={quotesLoading}
                    historyData={historyData || {}}
                    isLoadingHistory={historyLoading}
                  />
                ))}
              </div>
            ) : (
              <WatchlistTable
                items={allItems}
                onRemoveSymbol={(watchlistId, symbol) => handleRemoveSymbol(watchlistId, symbol)}
                isLoadingQuotes={quotesLoading}
                historyData={historyData || {}}
                isLoadingHistory={historyLoading}
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
        watchlistId={targetWatchlistId}
        onSuccess={handleSymbolAdded}
      />

      <CreateWatchlistDialog
        open={createWatchlistOpen}
        onOpenChange={setCreateWatchlistOpen}
        onSubmit={handleCreateWatchlist}
        isLoading={createWatchlistMutation.isPending}
      />
    </DashboardLayout>
  );
}
