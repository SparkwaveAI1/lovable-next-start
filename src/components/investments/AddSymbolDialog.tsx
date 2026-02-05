import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAddSymbol } from '@/hooks/useWatchlists';
import { useQuote } from '@/hooks/useMarketData';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

interface AddSymbolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watchlistId: string | null;
  onSuccess?: () => void;
}

// Common crypto symbols mapped to CoinGecko IDs
const CRYPTO_SYMBOL_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'ADA': 'cardano',
  'XRP': 'ripple',
  'DOT': 'polkadot',
  'DOGE': 'dogecoin',
  'SHIB': 'shiba-inu',
  'MATIC': 'polygon',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'LTC': 'litecoin',
  'BCH': 'bitcoin-cash',
};

export function AddSymbolDialog({
  open,
  onOpenChange,
  watchlistId,
  onSuccess,
}: AddSymbolDialogProps) {
  const { toast } = useToast();
  const [symbol, setSymbol] = useState('');
  const [assetType, setAssetType] = useState<'stock' | 'crypto'>('crypto');
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

  const addSymbolMutation = useAddSymbol();
  const debouncedSymbol = useDebounce(symbol, 500);

  // For crypto, map common symbols to CoinGecko IDs
  const normalizedSymbol = assetType === 'crypto' 
    ? (CRYPTO_SYMBOL_MAP[symbol.toUpperCase()] || symbol.toLowerCase())
    : symbol.toUpperCase();

  // Validate the symbol exists by fetching a quote
  const { 
    data: quoteData, 
    isLoading: isValidating,
    error: validationError,
  } = useQuote(
    debouncedSymbol.length >= 2 ? normalizedSymbol : '',
    assetType
  );

  // Determine validation status
  const currentValidationStatus = (() => {
    if (!debouncedSymbol || debouncedSymbol.length < 2) return 'idle';
    if (isValidating) return 'validating';
    if (quoteData) return 'valid';
    if (validationError) return 'invalid';
    return 'idle';
  })();

  const handleSubmit = async () => {
    if (!watchlistId || !symbol.trim()) return;

    try {
      await addSymbolMutation.mutateAsync({
        watchlistId,
        symbol: normalizedSymbol,
        assetType,
      });

      toast({
        title: 'Symbol added',
        description: `${symbol.toUpperCase()} has been added to your watchlist.`,
      });

      // Reset form
      setSymbol('');
      setAssetType('crypto');
      
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error adding symbol',
        description: error instanceof Error ? error.message : 'Failed to add symbol',
        variant: 'destructive',
      });
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset form on close
      setSymbol('');
      setAssetType('crypto');
    }
    onOpenChange(isOpen);
  };

  const canSubmit = symbol.trim().length >= 2 && 
    (currentValidationStatus === 'valid' || currentValidationStatus === 'idle') &&
    !addSymbolMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Symbol</DialogTitle>
          <DialogDescription>
            Add a stock or cryptocurrency to your watchlist. We'll fetch live prices automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Asset Type Selector - First for better UX */}
          <div className="space-y-2">
            <Label htmlFor="type">Asset Type</Label>
            <Select
              value={assetType}
              onValueChange={(value) => {
                setAssetType(value as 'stock' | 'crypto');
                setSymbol(''); // Clear symbol when type changes
              }}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select asset type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="crypto">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Cryptocurrency
                  </div>
                </SelectItem>
                <SelectItem value="stock">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Stock
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {assetType === 'stock' && (
              <p className="text-xs text-amber-600">
                Note: Stock data requires a Polygon.io API key to be configured.
              </p>
            )}
          </div>

          {/* Symbol Input */}
          <div className="space-y-2">
            <Label htmlFor="symbol">
              {assetType === 'crypto' ? 'Coin Name or Symbol' : 'Stock Symbol'}
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="symbol"
                placeholder={assetType === 'crypto' ? 'e.g., bitcoin, ethereum, BTC' : 'e.g., AAPL, GOOGL, MSFT'}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="pl-9 pr-10"
                autoComplete="off"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {currentValidationStatus === 'validating' && (
                  <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                )}
                {currentValidationStatus === 'valid' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {currentValidationStatus === 'invalid' && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>

            {/* Validation feedback */}
            {currentValidationStatus === 'valid' && quoteData && (
              <div className="text-sm text-green-600 flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                Found: {quoteData.symbol} — ${quoteData.price.toLocaleString()}
              </div>
            )}
            {currentValidationStatus === 'invalid' && (
              <div className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="h-3 w-3" />
                {assetType === 'crypto' 
                  ? 'Coin not found. Try using the full name (e.g., "bitcoin" instead of "BTC")'
                  : 'Symbol not found or market data unavailable'}
              </div>
            )}

            {/* Helpful hints for crypto */}
            {assetType === 'crypto' && symbol.length === 0 && (
              <div className="text-xs text-gray-500">
                Popular options: bitcoin, ethereum, solana, cardano, dogecoin
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {addSymbolMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Symbol'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
