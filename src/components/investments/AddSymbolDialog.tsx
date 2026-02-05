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
import { Search, Loader2 } from 'lucide-react';

interface AddSymbolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (symbol: string, type: 'stock' | 'crypto') => void;
}

// Mock search results for demonstration
const mockSearchResults = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' as const },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock' as const },
  { symbol: 'AMD', name: 'Advanced Micro Devices', type: 'stock' as const },
  { symbol: 'AAVE', name: 'Aave', type: 'crypto' as const },
  { symbol: 'ADA', name: 'Cardano', type: 'crypto' as const },
];

export function AddSymbolDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddSymbolDialogProps) {
  const [symbol, setSymbol] = useState('');
  const [assetType, setAssetType] = useState<'stock' | 'crypto'>('stock');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<typeof mockSearchResults>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = (value: string) => {
    setSymbol(value);
    
    if (value.length >= 1) {
      setIsSearching(true);
      // Simulate API search delay
      setTimeout(() => {
        const filtered = mockSearchResults.filter(
          (item) =>
            item.symbol.toLowerCase().includes(value.toLowerCase()) ||
            item.name.toLowerCase().includes(value.toLowerCase())
        );
        setSearchResults(filtered);
        setShowResults(true);
        setIsSearching(false);
      }, 300);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const handleSelectResult = (result: typeof mockSearchResults[0]) => {
    setSymbol(result.symbol);
    setAssetType(result.type);
    setShowResults(false);
  };

  const handleSubmit = () => {
    if (symbol.trim()) {
      onSubmit(symbol.trim(), assetType);
      // Reset form
      setSymbol('');
      setAssetType('stock');
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset form on close
      setSymbol('');
      setAssetType('stock');
      setSearchResults([]);
      setShowResults(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Symbol</DialogTitle>
          <DialogDescription>
            Search for a stock or cryptocurrency to add to your watchlist.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Symbol Search Input */}
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="symbol"
                placeholder="Search by symbol or name..."
                value={symbol}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
                autoComplete="off"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
              )}
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.symbol}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                    onClick={() => handleSelectResult(result)}
                  >
                    <div>
                      <span className="font-medium text-gray-900">
                        {result.symbol}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {result.name}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        result.type === 'crypto'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {result.type === 'crypto' ? 'Crypto' : 'Stock'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {showResults && searchResults.length === 0 && symbol.length >= 1 && !isSearching && (
              <div className="text-sm text-gray-500 mt-1">
                No results found. You can still add "{symbol}" manually.
              </div>
            )}
          </div>

          {/* Asset Type Selector */}
          <div className="space-y-2">
            <Label htmlFor="type">Asset Type</Label>
            <Select
              value={assetType}
              onValueChange={(value) => setAssetType(value as 'stock' | 'crypto')}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select asset type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Stock
                  </div>
                </SelectItem>
                <SelectItem value="crypto">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Cryptocurrency
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!symbol.trim()}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Add Symbol
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
