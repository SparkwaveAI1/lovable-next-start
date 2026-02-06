import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader, PageContent } from '@/components/layout/PageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { WatchlistCard } from '@/components/investments/WatchlistCard';
import { WatchlistTable } from '@/components/investments/WatchlistTable';
import { AddSymbolDialog } from '@/components/investments/AddSymbolDialog';
import { CreateWatchlistDialog } from '@/components/investments/CreateWatchlistDialog';
import { ScreenerBuilder } from '@/components/investments/ScreenerBuilder';
import { ScreenerResults } from '@/components/investments/ScreenerResults';
import { AlertManager } from '@/components/investments/AlertManager';
import { TierBadge, UpgradePrompt } from '@/components/investments/UpgradePrompt';
import { InvestmentDisclaimer } from '@/components/investments/Disclaimer';
import { DisclaimerAcceptanceModal } from '@/components/investments/DisclaimerAcceptanceModal';
import { OnboardingFlow } from '@/components/investments/OnboardingFlow';
import { TemplateGallery } from '@/components/investments/TemplateGallery';
import { ChartModal } from '@/components/investments/ChartModal';
import { MarketOverviewCards } from '@/components/investments/MarketOverviewCards';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useWatchlists, useRemoveSymbol, useCreateWatchlist, useAddSymbol } from '@/hooks/useWatchlists';
import { useMixedQuotes, QuoteData } from '@/hooks/useMarketData';
import { useMixedHistory } from '@/hooks/useSymbolHistory';
import { useRunScreener, useSaveScreener, ScreenerProfile, ScreenerResult } from '@/hooks/useScreener';
import { Plus, LayoutGrid, List, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { WorkflowTemplate } from '@/data/workflowTemplates';

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
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [chartModal, setChartModal] = useState<{
    symbol: string;
    assetType: 'stock' | 'crypto';
  } | null>(null);

  // Subscription tier & limits
  const subscription = useSubscription(selectedBusiness?.id);

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
  const addSymbolMutation = useAddSymbol();

  // Screener state and mutations
  const [screenerResults, setScreenerResults] = useState<ScreenerResult[]>([]);
  const [hasRunScreener, setHasRunScreener] = useState(false);
  const runScreenerMutation = useRunScreener();
  const saveScreenerMutation = useSaveScreener();

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

  const handleViewChart = (symbol: string, assetType: 'stock' | 'crypto') => {
    setChartModal({ symbol, assetType });
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

  // Screener handlers
  const handleRunScreener = async (profile: ScreenerProfile) => {
    try {
      setHasRunScreener(true);
      const results = await runScreenerMutation.mutateAsync(profile);
      setScreenerResults(results);
      toast({
        title: 'Screener complete',
        description: `Found ${results.length} ${results.length === 1 ? 'match' : 'matches'}.`,
      });
    } catch (error) {
      toast({
        title: 'Screener failed',
        description: error instanceof Error ? error.message : 'Failed to run screener',
        variant: 'destructive',
      });
    }
  };

  const handleSaveScreener = async (name: string, profile: ScreenerProfile) => {
    try {
      await saveScreenerMutation.mutateAsync({
        name,
        profile,
        businessId: selectedBusiness?.id,
      });
      toast({
        title: 'Screener saved',
        description: `"${name}" has been saved.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save screener',
        variant: 'destructive',
      });
    }
  };

  const handleAddToWatchlistFromScreener = async (symbol: string, type: 'stock' | 'crypto') => {
    // If there's only one watchlist, add to it directly
    // Otherwise, open the add symbol dialog
    if (watchlists.length === 1) {
      try {
        await addSymbolMutation.mutateAsync({
          watchlistId: watchlists[0].id,
          symbol,
          assetType: type,
        });
        toast({
          title: 'Symbol added',
          description: `${symbol} has been added to ${watchlists[0].name}.`,
        });
        refetchWatchlists();
        refetchQuotes();
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to add symbol',
          variant: 'destructive',
        });
      }
    } else if (watchlists.length > 1) {
      // For multiple watchlists, use the first one (could enhance with a selector)
      setTargetWatchlistId(watchlists[0].id);
      setAddSymbolOpen(true);
      toast({
        title: 'Select a watchlist',
        description: `Choose which watchlist to add ${symbol} to.`,
      });
    } else {
      toast({
        title: 'No watchlists',
        description: 'Create a watchlist first to add symbols.',
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
            <div className="flex items-center gap-3">
              {/* Tier Badge */}
              <TierBadge 
                tier={subscription.tier}
                usage={!subscription.isPro ? {
                  current: subscription.usage.watchlistItems,
                  max: subscription.limits.maxWatchlistItems,
                } : undefined}
                onClick={() => setShowUpgradeDialog(true)}
              />
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
                disabled={!subscription.canCreateWatchlist()}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Watchlist
              </Button>
            </div>
          }
        />

        {/* Market Overview Cards - Major indices at the top */}
        <MarketOverviewCards className="mb-6" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
            <TabsTrigger value="screener">Screener</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
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
                    onViewChart={handleViewChart}
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
                onViewChart={handleViewChart}
                isLoadingQuotes={quotesLoading}
                historyData={historyData || {}}
                isLoadingHistory={historyLoading}
              />
            )}
          </TabsContent>

          <TabsContent value="screener" className="mt-0 space-y-6">
            <ScreenerBuilder
              onRunScreener={handleRunScreener}
              onSaveScreener={handleSaveScreener}
              isRunning={runScreenerMutation.isPending}
              isSaving={saveScreenerMutation.isPending}
            />
            <ScreenerResults
              results={hasRunScreener ? screenerResults : []}
              isLoading={runScreenerMutation.isPending}
              onAddToWatchlist={handleAddToWatchlistFromScreener}
            />
          </TabsContent>

          <TabsContent value="alerts" className="mt-0">
            <AlertManager businessId={selectedBusiness?.id} />
          </TabsContent>

          <TabsContent value="templates" className="mt-0">
            <TemplateGallery 
              onUseTemplate={(template: WorkflowTemplate) => {
                // For now, show a toast - workflow creation can be implemented later
                toast({
                  title: 'Template selected',
                  description: `"${template.name}" template selected. Workflow automation coming soon!`,
                });
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Footer disclaimer */}
        <InvestmentDisclaimer />
      </PageContent>

      {/* Disclaimer acceptance modal - shows on first use */}
      <DisclaimerAcceptanceModal />

      {/* Onboarding flow - shows for new users with no watchlists */}
      <OnboardingFlow
        hasWatchlists={watchlists.length > 0}
        onCreateWatchlist={async (name: string) => {
          await handleCreateWatchlist(name);
        }}
        onComplete={() => {
          // Onboarding complete - user can now use the module
        }}
      />

      <AddSymbolDialog
        open={addSymbolOpen}
        onOpenChange={setAddSymbolOpen}
        watchlistId={targetWatchlistId}
        onSuccess={handleSymbolAdded}
        businessId={selectedBusiness?.id}
      />

      <CreateWatchlistDialog
        open={createWatchlistOpen}
        onOpenChange={setCreateWatchlistOpen}
        onSubmit={handleCreateWatchlist}
        isLoading={createWatchlistMutation.isPending}
      />

      {/* Upgrade prompt dialog */}
      <UpgradePrompt
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        feature="features"
        currentUsage={subscription.usage.watchlistItems}
        limit={subscription.limits.maxWatchlistItems}
      />

      {/* Chart Modal */}
      {chartModal && (
        <ChartModal
          symbol={chartModal.symbol}
          assetType={chartModal.assetType}
          open={true}
          onClose={() => setChartModal(null)}
        />
      )}
    </DashboardLayout>
  );
}
