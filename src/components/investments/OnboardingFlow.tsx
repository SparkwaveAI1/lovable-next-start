import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  TrendingUp,
  ListPlus,
  Search,
  Bell,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ONBOARDING_KEY = 'investment_onboarding_complete';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface OnboardingFlowProps {
  hasWatchlists: boolean;
  onCreateWatchlist: (name: string) => Promise<void>;
  onComplete: () => void;
}

export function useOnboardingState(hasWatchlists: boolean) {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    // Show onboarding if:
    // 1. User hasn't completed it AND
    // 2. User has no watchlists
    setShowOnboarding(!completed && !hasWatchlists);
  }, [hasWatchlists]);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, new Date().toISOString());
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setShowOnboarding(true);
  };

  return { showOnboarding, completeOnboarding, resetOnboarding };
}

function StepIndicator({ 
  currentStep, 
  totalSteps 
}: { 
  currentStep: number; 
  totalSteps: number; 
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            index === currentStep 
              ? "w-8 bg-indigo-600" 
              : index < currentStep 
                ? "w-2 bg-indigo-400" 
                : "w-2 bg-gray-200"
          )}
        />
      ))}
    </div>
  );
}

export function OnboardingFlow({
  hasWatchlists,
  onCreateWatchlist,
  onComplete,
}: OnboardingFlowProps) {
  const { showOnboarding, completeOnboarding } = useOnboardingState(hasWatchlists);
  const [currentStep, setCurrentStep] = useState(0);
  const [watchlistName, setWatchlistName] = useState('My Watchlist');
  const [isCreating, setIsCreating] = useState(false);

  // Don't show until we've checked localStorage
  if (showOnboarding === null || showOnboarding === false) {
    return null;
  }

  const handleComplete = () => {
    completeOnboarding();
    onComplete();
  };

  const handleCreateWatchlist = async () => {
    if (!watchlistName.trim()) return;
    setIsCreating(true);
    try {
      await onCreateWatchlist(watchlistName.trim());
      setCurrentStep(2); // Move to next step
    } catch (error) {
      console.error('Failed to create watchlist:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Investments',
      description: 'Track your investments alongside your business automation',
      icon: <TrendingUp className="h-12 w-12 text-indigo-600" />,
      content: (
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center">
            <TrendingUp className="h-10 w-10 text-indigo-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              Welcome to the Investment Module
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Track stocks and cryptocurrencies, set up price alerts, and integrate 
              market insights into your Sparkwave workflows.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center">
              <div className="mx-auto w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                <ListPlus className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-xs text-muted-foreground">Create Watchlists</p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                <Bell className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-xs text-muted-foreground">Set Alerts</p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <Sparkles className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-xs text-muted-foreground">Automate</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'create-watchlist',
      title: 'Create Your First Watchlist',
      description: 'Organize the assets you want to track',
      icon: <ListPlus className="h-12 w-12 text-indigo-600" />,
      content: (
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <ListPlus className="h-8 w-8 text-blue-600" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Create Your First Watchlist</h3>
            <p className="text-muted-foreground text-sm">
              Watchlists help you organize and track the stocks and crypto you're interested in.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <Label htmlFor="watchlist-name">Watchlist Name</Label>
            <Input
              id="watchlist-name"
              value={watchlistName}
              onChange={(e) => setWatchlistName(e.target.value)}
              placeholder="e.g., My Portfolio, Tech Stocks, Crypto"
            />
          </div>
        </div>
      ),
    },
    {
      id: 'add-symbols',
      title: 'Add Your First Symbols',
      description: 'Search and add stocks or crypto to track',
      icon: <Search className="h-12 w-12 text-indigo-600" />,
      content: (
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
            <Search className="h-8 w-8 text-purple-600" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Add Your Symbols</h3>
            <p className="text-muted-foreground text-sm">
              Click the "+" button on your watchlist to search and add assets.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">Popular symbols to get started:</p>
            <div className="flex flex-wrap gap-2">
              {['AAPL', 'MSFT', 'BTC', 'ETH', 'GOOGL', 'TSLA'].map((symbol) => (
                <span
                  key={symbol}
                  className="px-3 py-1 bg-white rounded-full text-sm border"
                >
                  {symbol}
                </span>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'set-alert',
      title: 'Set Up Price Alerts',
      description: 'Get notified when conditions are met',
      icon: <Bell className="h-12 w-12 text-indigo-600" />,
      content: (
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <Bell className="h-8 w-8 text-orange-600" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Set Up Alerts</h3>
            <p className="text-muted-foreground text-sm">
              Use the "Alerts" tab to create price and indicator alerts.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Example alerts:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Notify when BTC drops below $60,000</li>
              <li>• Alert when RSI is oversold (below 30)</li>
              <li>• Track when volume spikes 2x average</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'done',
      title: "You're All Set!",
      description: 'Start tracking your investments',
      icon: <CheckCircle2 className="h-12 w-12 text-green-600" />,
      content: (
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">You're All Set!</h3>
            <p className="text-muted-foreground text-sm">
              You're ready to start tracking your investments and setting up alerts.
            </p>
          </div>
          <div className="pt-4 space-y-2 text-sm text-muted-foreground">
            <p>💡 <strong>Pro tip:</strong> Check out the Screener tab to find new opportunities</p>
            <p>🔔 <strong>Tip:</strong> Connect alerts to Sparkwave workflows for automation</p>
          </div>
        </div>
      ),
    },
  ];

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const isCreateStep = currentStep === 1;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[480px]" 
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{currentStepData.title}</DialogTitle>
          <DialogDescription>{currentStepData.description}</DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {currentStepData.content}
        </div>

        <div className="pt-2">
          <StepIndicator currentStep={currentStep} totalSteps={steps.length} />
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={isFirstStep}
            className={isFirstStep ? 'invisible' : ''}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="flex gap-2">
            {!isLastStep && (
              <Button
                variant="ghost"
                onClick={handleComplete}
                className="text-muted-foreground"
              >
                Skip
              </Button>
            )}

            {isCreateStep ? (
              <Button
                onClick={handleCreateWatchlist}
                disabled={!watchlistName.trim() || isCreating}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isCreating ? 'Creating...' : 'Create & Continue'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : isLastStep ? (
              <Button
                onClick={handleComplete}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Get Started
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentStep((s) => s + 1)}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
