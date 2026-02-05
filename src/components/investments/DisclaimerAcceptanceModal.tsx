import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle, TrendingUp, Clock, Search } from 'lucide-react';

const DISCLAIMER_ACCEPTED_KEY = 'investment_disclaimer_accepted';
const DISCLAIMER_VERSION = '1.0'; // Bump this to show modal again after terms change

interface DisclaimerAcceptanceModalProps {
  onAccepted?: () => void;
}

export function useDisclaimerAcceptance() {
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(DISCLAIMER_ACCEPTED_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setHasAccepted(parsed.version === DISCLAIMER_VERSION && parsed.accepted === true);
      } catch {
        setHasAccepted(false);
      }
    } else {
      setHasAccepted(false);
    }
  }, []);

  const acceptDisclaimer = () => {
    localStorage.setItem(DISCLAIMER_ACCEPTED_KEY, JSON.stringify({
      version: DISCLAIMER_VERSION,
      accepted: true,
      acceptedAt: new Date().toISOString(),
    }));
    setHasAccepted(true);
  };

  return { hasAccepted, acceptDisclaimer };
}

export function DisclaimerAcceptanceModal({ onAccepted }: DisclaimerAcceptanceModalProps) {
  const { hasAccepted, acceptDisclaimer } = useDisclaimerAcceptance();
  const [checked, setChecked] = useState(false);

  // Don't render until we've checked localStorage
  if (hasAccepted === null || hasAccepted === true) {
    return null;
  }

  const handleAccept = () => {
    acceptDisclaimer();
    onAccepted?.();
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <DialogTitle className="text-xl">Investment Module Terms</DialogTitle>
          </div>
          <DialogDescription>
            Before using the Investment Module, please read and acknowledge the following:
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Not Financial Advice</p>
                <p className="text-sm text-muted-foreground">
                  The information provided is for informational purposes only. We are not 
                  registered investment advisors.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">No Investment Responsibility</p>
                <p className="text-sm text-muted-foreground">
                  Sparkwave is not responsible for any investment decisions you make. 
                  Always do your own research.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Data May Be Delayed</p>
                <p className="text-sm text-muted-foreground">
                  Market data may be delayed up to 15 minutes. Real-time data requires 
                  exchange agreements.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Search className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Verify with Official Sources</p>
                <p className="text-sm text-muted-foreground">
                  Always verify prices and data with official exchange sources before 
                  making trading decisions.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-2 border-t">
            <Checkbox 
              id="accept-terms" 
              checked={checked}
              onCheckedChange={(c) => setChecked(c === true)}
            />
            <Label 
              htmlFor="accept-terms" 
              className="text-sm font-normal cursor-pointer leading-relaxed"
            >
              I understand and acknowledge that this module provides informational data only, 
              and I am solely responsible for my own investment decisions.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleAccept}
            disabled={!checked}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            Continue to Investment Module
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
