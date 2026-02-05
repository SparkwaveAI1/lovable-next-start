import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus, Play, Save, Loader2 } from 'lucide-react';
import {
  ScreenerProfile,
  ScreenerRule,
  ScreenerField,
  ScreenerOperator,
  AssetType,
  LogicMode,
  SCREENER_FIELDS,
  SCREENER_OPERATORS,
  SCREENER_PRESETS,
  createDefaultRule,
} from '@/hooks/useScreener';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ScreenerBuilderProps {
  onRunScreener: (profile: ScreenerProfile) => void;
  onSaveScreener?: (name: string, profile: ScreenerProfile) => void;
  isRunning?: boolean;
  isSaving?: boolean;
}

interface RuleRowProps {
  rule: ScreenerRule;
  onUpdate: (rule: ScreenerRule) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function RuleRow({ rule, onUpdate, onRemove, canRemove }: RuleRowProps) {
  const fieldConfig = SCREENER_FIELDS[rule.field];
  const isBetween = rule.operator === 'between';

  const handleFieldChange = (field: ScreenerField) => {
    const config = SCREENER_FIELDS[field];
    onUpdate({
      ...rule,
      field,
      period: config.hasPeriod ? config.defaultPeriod : undefined,
    });
  };

  const handleOperatorChange = (operator: ScreenerOperator) => {
    onUpdate({
      ...rule,
      operator,
      value2: operator === 'between' ? rule.value + 10 : undefined,
    });
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      {/* Field selector with optional period */}
      <div className="flex-1 min-w-[140px]">
        <Select value={rule.field} onValueChange={handleFieldChange}>
          <SelectTrigger className="w-full bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SCREENER_FIELDS).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
                {config.hasPeriod && rule.field === key && rule.period
                  ? ` (${rule.period})`
                  : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Period input for indicators */}
      {fieldConfig.hasPeriod && (
        <div className="w-16">
          <Input
            type="number"
            min={1}
            max={200}
            value={rule.period || fieldConfig.defaultPeriod}
            onChange={(e) => onUpdate({ ...rule, period: parseInt(e.target.value) || fieldConfig.defaultPeriod })}
            className="text-center bg-white"
            placeholder="Period"
          />
        </div>
      )}

      {/* Operator selector */}
      <div className="flex-1 min-w-[140px]">
        <Select value={rule.operator} onValueChange={handleOperatorChange}>
          <SelectTrigger className="w-full bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SCREENER_OPERATORS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Value input(s) */}
      <div className={`${isBetween ? 'flex items-center gap-2' : ''}`}>
        <Input
          type="number"
          value={rule.value}
          onChange={(e) => onUpdate({ ...rule, value: parseFloat(e.target.value) || 0 })}
          className="w-24 bg-white"
          placeholder="Value"
        />
        {isBetween && (
          <>
            <span className="text-gray-500 text-sm">and</span>
            <Input
              type="number"
              value={rule.value2 || 0}
              onChange={(e) => onUpdate({ ...rule, value2: parseFloat(e.target.value) || 0 })}
              className="w-24 bg-white"
              placeholder="Value"
            />
          </>
        )}
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={!canRemove}
        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ScreenerBuilder({
  onRunScreener,
  onSaveScreener,
  isRunning = false,
  isSaving = false,
}: ScreenerBuilderProps) {
  const [assetTypes, setAssetTypes] = useState<AssetType[]>(['stock', 'crypto']);
  const [logic, setLogic] = useState<LogicMode>('all');
  const [rules, setRules] = useState<ScreenerRule[]>([createDefaultRule()]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [screenerName, setScreenerName] = useState('');

  const toggleAssetType = (type: AssetType) => {
    setAssetTypes((prev) => {
      if (prev.includes(type)) {
        // Don't allow removing the last type
        if (prev.length === 1) return prev;
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  };

  const addRule = useCallback(() => {
    setRules((prev) => [...prev, createDefaultRule()]);
  }, []);

  const updateRule = useCallback((index: number, updatedRule: ScreenerRule) => {
    setRules((prev) => prev.map((r, i) => (i === index ? updatedRule : r)));
  }, []);

  const removeRule = useCallback((index: number) => {
    setRules((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const applyPreset = useCallback((presetKey: string) => {
    const preset = SCREENER_PRESETS[presetKey];
    if (preset) {
      setAssetTypes(preset.assetTypes);
      setLogic(preset.logic);
      setRules(preset.rules.map((r) => ({ ...r }))); // Clone rules
    }
  }, []);

  const getProfile = useCallback((): ScreenerProfile => ({
    assetTypes,
    logic,
    rules,
  }), [assetTypes, logic, rules]);

  const handleRun = () => {
    onRunScreener(getProfile());
  };

  const handleSave = () => {
    if (onSaveScreener && screenerName.trim()) {
      onSaveScreener(screenerName.trim(), getProfile());
      setSaveDialogOpen(false);
      setScreenerName('');
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Screener Builder</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Build rules to find securities matching your criteria
              </p>
            </div>
            <div className="flex items-center gap-2">
              {onSaveScreener && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSaveDialogOpen(true)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              )}
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={handleRun}
                disabled={isRunning || rules.length === 0}
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run Screener
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Asset Types and Logic */}
          <div className="flex flex-wrap items-start gap-8">
            {/* Asset Types */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Asset Types</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="asset-stocks"
                    checked={assetTypes.includes('stock')}
                    onCheckedChange={() => toggleAssetType('stock')}
                  />
                  <label
                    htmlFor="asset-stocks"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Stocks
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="asset-crypto"
                    checked={assetTypes.includes('crypto')}
                    onCheckedChange={() => toggleAssetType('crypto')}
                  />
                  <label
                    htmlFor="asset-crypto"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Crypto
                  </label>
                </div>
              </div>
            </div>

            {/* Logic Toggle */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Logic</Label>
              <RadioGroup
                value={logic}
                onValueChange={(value) => setLogic(value as LogicMode)}
                className="flex items-center gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="logic-all" />
                  <label htmlFor="logic-all" className="text-sm font-medium leading-none">
                    Match ALL rules
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="any" id="logic-any" />
                  <label htmlFor="logic-any" className="text-sm font-medium leading-none">
                    Match ANY rule
                  </label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Rules */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Rules</Label>
            <div className="space-y-2">
              {rules.map((rule, index) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  onUpdate={(updated) => updateRule(index, updated)}
                  onRemove={() => removeRule(index)}
                  canRemove={rules.length > 1}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addRule}
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>

          {/* Presets */}
          <div className="space-y-2 pt-2 border-t border-gray-200">
            <Label className="text-sm font-medium text-gray-700">Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('oversold')}
                className="text-green-700 border-green-200 hover:bg-green-50"
              >
                Oversold
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('overbought')}
                className="text-red-700 border-red-200 hover:bg-red-50"
              >
                Overbought
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('highVolume')}
                className="text-blue-700 border-blue-200 hover:bg-blue-50"
              >
                High Volume
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('goldenCross')}
                className="text-yellow-700 border-yellow-200 hover:bg-yellow-50"
              >
                Golden Cross
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Screener</DialogTitle>
            <DialogDescription>
              Give your screener a name to save it for later use.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="screener-name">Screener Name</Label>
            <Input
              id="screener-name"
              value={screenerName}
              onChange={(e) => setScreenerName(e.target.value)}
              placeholder="e.g., My Oversold Scanner"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleSave}
              disabled={!screenerName.trim()}
            >
              Save Screener
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
