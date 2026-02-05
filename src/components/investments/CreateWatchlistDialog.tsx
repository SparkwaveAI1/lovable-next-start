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
import { Loader2 } from 'lucide-react';

interface CreateWatchlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
  isLoading?: boolean;
}

export function CreateWatchlistDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: CreateWatchlistDialogProps) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit(name.trim());
      setName('');
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setName('');
    }
    onOpenChange(isOpen);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim() && !isLoading) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Create Watchlist</DialogTitle>
          <DialogDescription>
            Create a new watchlist to track your favorite stocks and cryptocurrencies.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Watchlist Name</Label>
            <Input
              id="name"
              placeholder="e.g., Tech Stocks, Crypto Holdings"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isLoading}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Watchlist'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
