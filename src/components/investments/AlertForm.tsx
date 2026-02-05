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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Loader2, CheckCircle, AlertCircle, Crown, Lock } from 'lucide-react';
import { useCreateAlert, AlertCondition, NotificationConfig, INDICATOR_LABELS, OPERATOR_LABELS } from '@/hooks/useAlerts';
import { useQuote } from '@/hooks/useMarketData';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { useSubscription } from '@/hooks/useSubscription';
import { LimitWarning, UpgradePrompt } from '@/components/investments/UpgradePrompt';
import { FormDisclaimer } from './Disclaimer';

interface AlertFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId?: string;
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

export function AlertForm({
  open,
  onOpenChange,
  businessId,
  onSuccess,
}: AlertFormProps) {
  const { toast } = useToast();
  
  // Form state
  const [symbol, setSymbol] = useState('');
  const [assetType, setAssetType] = useState<'stock' | 'crypto'>('crypto');
  const [alertName, setAlertName] = useState('');
  const [indicator, setIndicator] = useState<AlertCondition['indicator']>('price');
  const [operator, setOperator] = useState<AlertCondition['operator']>('lt');
  const [value, setValue] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(false);
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [workflowId, setWorkflowId] = useState<string>('');
  const [cooldownMinutes, setCooldownMinutes] = useState('60');
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Subscription & limits
  const subscription = useSubscription(businessId);
  const canCreateNewAlert = subscription.canCreateAlert();
  const isAtLimit = !canCreateNewAlert;
  const isApproachingLimit = subscription.isApproachingLimit('alerts');
  const hasAdvancedIndicators = subscription.hasFeature('hasAdvancedIndicators');
  const hasWorkflowTriggers = subscription.hasFeature('hasWorkflowTriggers');

  const createAlertMutation = useCreateAlert();
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
  const validationStatus = (() => {
    if (!debouncedSymbol || debouncedSymbol.length < 2) return 'idle';
    if (isValidating) return 'validating';
    if (quoteData) return 'valid';
    if (validationError) return 'invalid';
    return 'idle';
  })();

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSymbol('');
      setAssetType('crypto');
      setAlertName('');
      setIndicator('price');
      setOperator('lt');
      setValue('');
      setNotifyEmail(true);
      setNotifyPush(false);
      setNotifyInApp(true);
      setWorkflowId('');
      setCooldownMinutes('60');
    }
  }, [open]);

  // Auto-generate alert name
  useEffect(() => {
    if (symbol && indicator && operator && value) {
      const opLabel = OPERATOR_LABELS[operator].toLowerCase();
      setAlertName(`${symbol.toUpperCase()} ${INDICATOR_LABELS[indicator]} ${opLabel} ${value}`);
    }
  }, [symbol, indicator, operator, value]);

  const handleSubmit = async () => {
    if (!symbol.trim() || !value.trim()) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      toast({
        title: 'Invalid value',
        description: 'Please enter a valid number for the condition value.',
        variant: 'destructive',
      });
      return;
    }

    const condition: AlertCondition = {
      indicator,
      operator,
      value: numValue,
    };

    const notificationConfig: NotificationConfig = {
      email: notifyEmail,
      push: notifyPush,
      in_app: notifyInApp,
    };

    try {
      await createAlertMutation.mutateAsync({
        symbol: normalizedSymbol,
        assetType,
        name: alertName || undefined,
        condition,
        notificationConfig,
        workflowId: workflowId || null,
        cooldownMinutes: parseInt(cooldownMinutes) || 60,
        businessId,
      });
      
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error creating alert',
        description: error instanceof Error ? error.message : 'Failed to create alert',
        variant: 'destructive',
      });
    }
  };

  const canSubmit = 
    symbol.trim().length >= 2 && 
    value.trim() && 
    !isNaN(parseFloat(value)) &&
    (validationStatus === 'valid' || validationStatus === 'idle') &&
    (notifyEmail || notifyPush || notifyInApp || workflowId) &&
    !createAlertMutation.isPending &&
    canCreateNewAlert;
  
  // Check if selected indicator requires pro
  const isAdvancedIndicator = indicator !== 'price' && indicator !== 'change_pct';
  const indicatorRequiresPro = isAdvancedIndicator && !hasAdvancedIndicators;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Alert</DialogTitle>
          <DialogDescription>
            Set up a price or indicator alert for stocks or crypto.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {/* Asset Type */}
          <div className="space-y-2">
            <Label>Asset Type</Label>
            <Select
              value={assetType}
              onValueChange={(v) => {
                setAssetType(v as 'stock' | 'crypto');
                setSymbol('');
              }}
            >
              <SelectTrigger>
                <SelectValue />
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
          </div>

          {/* Symbol Input */}
          <div className="space-y-2">
            <Label>{assetType === 'crypto' ? 'Coin Name or Symbol' : 'Stock Symbol'}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={assetType === 'crypto' ? 'e.g., bitcoin, BTC' : 'e.g., AAPL'}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="pl-9 pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {validationStatus === 'validating' && (
                  <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                )}
                {validationStatus === 'valid' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {validationStatus === 'invalid' && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            {validationStatus === 'valid' && quoteData && (
              <p className="text-sm text-green-600">
                Found: {quoteData.symbol} — Current price: ${quoteData.price.toLocaleString()}
              </p>
            )}
            {validationStatus === 'invalid' && (
              <p className="text-sm text-red-600">
                Symbol not found. Try the full name for crypto.
              </p>
            )}
          </div>

          {/* Condition Builder */}
          <div className="space-y-2">
            <Label>Condition</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={indicator}
                onValueChange={(v) => setIndicator(v as AlertCondition['indicator'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">{INDICATOR_LABELS.price}</SelectItem>
                  <SelectItem value="change_pct">{INDICATOR_LABELS.change_pct}</SelectItem>
                  <SelectItem value="rsi_14" disabled={!hasAdvancedIndicators}>
                    <div className="flex items-center gap-2">
                      {INDICATOR_LABELS.rsi_14}
                      {!hasAdvancedIndicators && <Lock className="h-3 w-3 text-gray-400" />}
                    </div>
                  </SelectItem>
                  <SelectItem value="volume_ratio" disabled={!hasAdvancedIndicators}>
                    <div className="flex items-center gap-2">
                      {INDICATOR_LABELS.volume_ratio}
                      {!hasAdvancedIndicators && <Lock className="h-3 w-3 text-gray-400" />}
                    </div>
                  </SelectItem>
                  <SelectItem value="sma_20" disabled={!hasAdvancedIndicators}>
                    <div className="flex items-center gap-2">
                      {INDICATOR_LABELS.sma_20}
                      {!hasAdvancedIndicators && <Lock className="h-3 w-3 text-gray-400" />}
                    </div>
                  </SelectItem>
                  <SelectItem value="sma_50" disabled={!hasAdvancedIndicators}>
                    <div className="flex items-center gap-2">
                      {INDICATOR_LABELS.sma_50}
                      {!hasAdvancedIndicators && <Lock className="h-3 w-3 text-gray-400" />}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={operator}
                onValueChange={(v) => setOperator(v as AlertCondition['operator'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gt">{OPERATOR_LABELS.gt}</SelectItem>
                  <SelectItem value="lt">{OPERATOR_LABELS.lt}</SelectItem>
                  <SelectItem value="crosses_above">{OPERATOR_LABELS.crosses_above}</SelectItem>
                  <SelectItem value="crosses_below">{OPERATOR_LABELS.crosses_below}</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder={indicator === 'rsi_14' ? '30' : indicator === 'change_pct' ? '-5' : '100'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500">
              {indicator === 'rsi_14' && 'RSI below 30 = oversold, above 70 = overbought'}
              {indicator === 'change_pct' && 'Percentage change from previous close'}
              {indicator === 'volume_ratio' && 'Ratio vs 20-day average volume'}
              {indicator === 'sma_20' && 'Simple moving average (20 periods)'}
              {indicator === 'sma_50' && 'Simple moving average (50 periods)'}
              {indicator === 'price' && 'Current market price in USD'}
            </p>
          </div>

          {/* Alert Name */}
          <div className="space-y-2">
            <Label>Alert Name (optional)</Label>
            <Input
              placeholder="Auto-generated if empty"
              value={alertName}
              onChange={(e) => setAlertName(e.target.value)}
            />
          </div>

          {/* Notification Settings */}
          <div className="space-y-3">
            <Label>Notifications</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notify-email"
                  checked={notifyEmail}
                  onCheckedChange={(checked) => setNotifyEmail(checked as boolean)}
                />
                <Label htmlFor="notify-email" className="font-normal cursor-pointer">
                  Email notification
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notify-push"
                  checked={notifyPush}
                  onCheckedChange={(checked) => setNotifyPush(checked as boolean)}
                  disabled
                />
                <Label htmlFor="notify-push" className="font-normal cursor-pointer text-gray-400">
                  Push notification (coming soon)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notify-inapp"
                  checked={notifyInApp}
                  onCheckedChange={(checked) => setNotifyInApp(checked as boolean)}
                />
                <Label htmlFor="notify-inapp" className="font-normal cursor-pointer">
                  In-app notification
                </Label>
              </div>
            </div>
          </div>

          {/* Workflow Trigger (placeholder) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Workflow Trigger (optional)</Label>
              {!hasWorkflowTriggers && (
                <span className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  <Crown className="h-3 w-3" />
                  Pro
                </span>
              )}
            </div>
            <Select
              value={workflowId}
              onValueChange={setWorkflowId}
              disabled={!hasWorkflowTriggers}
            >
              <SelectTrigger className={!hasWorkflowTriggers ? 'text-gray-400' : ''}>
                <SelectValue placeholder={hasWorkflowTriggers ? 'Select workflow...' : 'Pro feature'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No workflow</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {hasWorkflowTriggers 
                ? 'Trigger a Sparkwave workflow when the alert fires.'
                : 'Upgrade to Pro to trigger workflows from alerts.'}
            </p>
          </div>

          {/* Cooldown */}
          <div className="space-y-2">
            <Label>Cooldown (minutes)</Label>
            <Input
              type="number"
              min="1"
              max="1440"
              value={cooldownMinutes}
              onChange={(e) => setCooldownMinutes(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Minimum time between repeated triggers of this alert.
            </p>
          </div>
        </div>

        {/* Limit warning */}
        {(isApproachingLimit || isAtLimit) && !subscription.isPro && (
          <div className="pt-2">
            <LimitWarning
              currentUsage={subscription.usage.alerts}
              limit={subscription.limits.maxAlerts}
              feature="alerts"
              onUpgrade={() => setShowUpgrade(true)}
            />
          </div>
        )}

        {/* Disclaimer */}
        <FormDisclaimer />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {isAtLimit ? (
            <Button
              onClick={() => setShowUpgrade(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Create More
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || indicatorRequiresPro}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createAlertMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Alert'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Upgrade prompt dialog */}
      <UpgradePrompt
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature="alerts"
        currentUsage={subscription.usage.alerts}
        limit={subscription.limits.maxAlerts}
      />
    </Dialog>
  );
}
