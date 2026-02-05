import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PRO_FEATURES } from '@/lib/featureFlags';
import { Crown, Sparkles, Check, ArrowRight, AlertTriangle } from 'lucide-react';

interface UpgradePromptProps {
  /** What feature/limit the user hit */
  feature: string;
  /** Current usage count */
  currentUsage?: number;
  /** Maximum allowed for free tier */
  limit?: number;
  /** Whether dialog is open */
  open: boolean;
  /** Close handler */
  onOpenChange: (open: boolean) => void;
  /** Optional: show as inline banner instead of dialog */
  variant?: 'dialog' | 'banner' | 'inline';
}

/**
 * Upgrade prompt shown when users hit tier limits
 */
export function UpgradePrompt({
  feature,
  currentUsage,
  limit,
  open,
  onOpenChange,
  variant = 'dialog',
}: UpgradePromptProps) {
  const usagePercent = limit && currentUsage !== undefined 
    ? Math.min(100, Math.round((currentUsage / limit) * 100))
    : undefined;

  const handleUpgrade = () => {
    // TODO: Implement Stripe checkout
    // For now, just show a message
    window.open('mailto:support@sparkwaveai.com?subject=Upgrade to Pro', '_blank');
    onOpenChange(false);
  };

  // Inline warning (shown in forms)
  if (variant === 'inline') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              {currentUsage !== undefined && limit
                ? `You've used ${currentUsage} of ${limit} ${feature}`
                : `You've reached your ${feature} limit`}
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Upgrade to Pro for unlimited {feature}.
            </p>
            {usagePercent !== undefined && (
              <Progress value={usagePercent} className="mt-2 h-2" />
            )}
            <Button
              size="sm"
              variant="outline"
              className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={handleUpgrade}
            >
              <Crown className="h-4 w-4 mr-1" />
              Upgrade to Pro
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Banner (shown at top of page)
  if (variant === 'banner') {
    if (!open) return null;
    
    return (
      <div className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6" />
            <div>
              <p className="font-semibold">
                Upgrade to Investments Pro
              </p>
              <p className="text-sm text-indigo-100">
                Unlock unlimited {feature} and premium features.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleUpgrade}
              className="bg-white text-indigo-600 hover:bg-indigo-50"
            >
              <Crown className="h-4 w-4 mr-1" />
              Upgrade Now
            </Button>
            <button
              onClick={() => onOpenChange(false)}
              className="text-indigo-200 hover:text-white text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-center text-xl">
            Upgrade to Investments Pro
          </DialogTitle>
          <DialogDescription className="text-center">
            {currentUsage !== undefined && limit
              ? `You've used ${currentUsage} of ${limit} ${feature} on the free plan.`
              : `Unlock ${feature} and more with Pro.`}
          </DialogDescription>
        </DialogHeader>

        {/* Usage indicator */}
        {usagePercent !== undefined && (
          <div className="px-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Current usage</span>
              <span className="font-medium">{currentUsage} / {limit}</span>
            </div>
            <Progress value={usagePercent} className="h-2" />
          </div>
        )}

        {/* Features list */}
        <div className="px-6 py-4">
          <p className="text-sm font-medium text-gray-700 mb-3">
            What you get with Pro:
          </p>
          <ul className="space-y-3">
            {PRO_FEATURES.map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-3 w-3 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{f.title}</p>
                  <p className="text-xs text-gray-500">{f.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Maybe Later
          </Button>
          <Button 
            onClick={handleUpgrade}
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Pro
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Subscription tier badge for display in headers
 */
interface TierBadgeProps {
  tier: 'free' | 'pro';
  usage?: {
    current: number;
    max: number;
  };
  onClick?: () => void;
}

export function TierBadge({ tier, usage, onClick }: TierBadgeProps) {
  if (tier === 'pro') {
    return (
      <Badge
        variant="secondary"
        className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 cursor-pointer hover:from-indigo-600 hover:to-purple-700"
        onClick={onClick}
      >
        <Sparkles className="h-3 w-3 mr-1" />
        Pro Plan
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="cursor-pointer hover:bg-gray-100"
      onClick={onClick}
    >
      Free Plan
      {usage && isFinite(usage.max) && (
        <span className="ml-1 text-gray-500">
          • {usage.current}/{usage.max} items
        </span>
      )}
    </Badge>
  );
}

/**
 * Limit warning shown when approaching limits
 */
interface LimitWarningProps {
  currentUsage: number;
  limit: number;
  feature: string;
  onUpgrade: () => void;
}

export function LimitWarning({ currentUsage, limit, feature, onUpgrade }: LimitWarningProps) {
  const remaining = limit - currentUsage;
  const isAtLimit = remaining <= 0;
  const isApproaching = remaining <= Math.ceil(limit * 0.2);

  if (!isApproaching && !isAtLimit) return null;

  return (
    <div className={`text-sm flex items-center gap-2 ${isAtLimit ? 'text-red-600' : 'text-amber-600'}`}>
      <AlertTriangle className="h-4 w-4" />
      {isAtLimit ? (
        <span>
          You've reached your {feature} limit.{' '}
          <button onClick={onUpgrade} className="underline font-medium">
            Upgrade to Pro
          </button>
        </span>
      ) : (
        <span>
          {remaining} {feature} remaining.{' '}
          <button onClick={onUpgrade} className="underline font-medium">
            Upgrade for unlimited
          </button>
        </span>
      )}
    </div>
  );
}
