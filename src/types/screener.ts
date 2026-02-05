/**
 * Screener Engine Types
 * INV-036: Rule Schema for market screening
 */

// Operators for comparing values
export type ScreenerOperator = 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'between';

// Available fields for screening
export type ScreenerField = 
  | 'rsi_14'          // Relative Strength Index (14-period)
  | 'price'           // Current price
  | 'sma_20'          // Simple Moving Average (20-period)
  | 'sma_50'          // Simple Moving Average (50-period)
  | 'sma_200'         // Simple Moving Average (200-period)
  | 'volume'          // Trading volume
  | 'volume_ratio'    // Volume vs average (>1 = above avg)
  | 'change_percent'  // 24h price change percentage
  | 'high_24h'        // 24h high price
  | 'low_24h';        // 24h low price

// Asset types supported
export type AssetType = 'stock' | 'crypto';

/**
 * A single screening rule
 * Example: { field: 'rsi_14', operator: 'lt', value: 30 }
 */
export interface ScreenerRule {
  field: ScreenerField | string;  // Allow custom fields
  operator: ScreenerOperator;
  value: number | [number, number];  // Single value or [min, max] for 'between'
}

/**
 * A complete screener profile with multiple rules
 */
export interface ScreenerProfile {
  id: string;
  name: string;
  description?: string;
  rules: ScreenerRule[];
  logic: 'AND' | 'OR';  // How to combine rules
  assetTypes: AssetType[];
  isPreset?: boolean;
  userId?: string;
  businessId?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Request to run a screener
 */
export interface ScreenerRunRequest {
  rules: ScreenerRule[];
  logic: 'AND' | 'OR';
  assetTypes: AssetType[];
  limit?: number;  // Max results to return (default 50)
  offset?: number; // For pagination
}

/**
 * A single match from the screener
 */
export interface ScreenerMatch {
  symbol: string;
  assetType: AssetType;
  price: number;
  matchedValues: Record<string, number>;  // Field -> value mapping
  matchedRules: number;  // How many rules matched (useful for OR logic)
}

/**
 * Response from running a screener
 */
export interface ScreenerRunResponse {
  matches: ScreenerMatch[];
  totalScanned: number;
  totalMatched: number;
  executedAt: string;
  executionTimeMs: number;
}

/**
 * Request to test screener against a single symbol
 */
export interface ScreenerTestRequest {
  symbol: string;
  assetType: AssetType;
  rules: ScreenerRule[];
  logic: 'AND' | 'OR';
}

/**
 * Response from testing a screener
 */
export interface ScreenerTestResponse {
  symbol: string;
  assetType: AssetType;
  matches: boolean;
  evaluatedValues: Record<string, number>;
  ruleResults: {
    rule: ScreenerRule;
    actualValue: number | null;
    passed: boolean;
  }[];
}

/**
 * Preset screener profiles
 */
export const PRESET_SCREENERS: Omit<ScreenerProfile, 'id' | 'createdAt'>[] = [
  {
    name: 'Oversold (RSI < 30)',
    description: 'Find assets that may be oversold based on RSI indicator',
    rules: [
      { field: 'rsi_14', operator: 'lt', value: 30 }
    ],
    logic: 'AND',
    assetTypes: ['stock', 'crypto'],
    isPreset: true,
  },
  {
    name: 'Overbought (RSI > 70)',
    description: 'Find assets that may be overbought based on RSI indicator',
    rules: [
      { field: 'rsi_14', operator: 'gt', value: 70 }
    ],
    logic: 'AND',
    assetTypes: ['stock', 'crypto'],
    isPreset: true,
  },
  {
    name: 'High Volume Breakout',
    description: 'Assets with above-average volume and positive momentum',
    rules: [
      { field: 'volume_ratio', operator: 'gt', value: 2.0 },
      { field: 'change_percent', operator: 'gt', value: 3 }
    ],
    logic: 'AND',
    assetTypes: ['stock', 'crypto'],
    isPreset: true,
  },
  {
    name: 'Golden Cross (SMA 50 > SMA 200)',
    description: 'Bullish signal where short-term trend crosses above long-term',
    rules: [
      { field: 'sma_50', operator: 'gt', value: 0 },  // Placeholder - actual comparison done in engine
    ],
    logic: 'AND',
    assetTypes: ['stock', 'crypto'],
    isPreset: true,
  },
  {
    name: 'Bargain Hunter',
    description: 'Oversold assets with high volume - potential reversal candidates',
    rules: [
      { field: 'rsi_14', operator: 'lt', value: 35 },
      { field: 'volume_ratio', operator: 'gt', value: 1.5 },
      { field: 'change_percent', operator: 'lt', value: -2 }
    ],
    logic: 'AND',
    assetTypes: ['stock', 'crypto'],
    isPreset: true,
  },
  {
    name: 'Momentum Play',
    description: 'Strong upward momentum with RSI confirmation',
    rules: [
      { field: 'rsi_14', operator: 'between', value: [50, 70] },
      { field: 'change_percent', operator: 'gt', value: 5 }
    ],
    logic: 'AND',
    assetTypes: ['stock', 'crypto'],
    isPreset: true,
  }
];
