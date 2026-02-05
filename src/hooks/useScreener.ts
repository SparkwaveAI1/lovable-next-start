import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types for screener functionality
export type ScreenerOperator = '>' | '<' | '>=' | '<=' | '=' | 'between';
export type ScreenerField = 'rsi' | 'sma' | 'ema' | 'macd' | 'price' | 'volume' | 'change_percent';
export type AssetType = 'stock' | 'crypto';
export type LogicMode = 'all' | 'any';

export interface ScreenerRule {
  id: string;
  field: ScreenerField;
  operator: ScreenerOperator;
  value: number;
  value2?: number; // For 'between' operator
  period?: number; // For indicators like RSI, SMA, EMA
}

export interface ScreenerProfile {
  id?: string;
  name?: string;
  assetTypes: AssetType[];
  logic: LogicMode;
  rules: ScreenerRule[];
}

export interface ScreenerResult {
  symbol: string;
  name: string;
  type: AssetType;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  matchedIndicators: Record<string, number>;
}

// Field configurations with display names and default periods
export const SCREENER_FIELDS: Record<ScreenerField, { label: string; hasPeriod: boolean; defaultPeriod?: number }> = {
  rsi: { label: 'RSI', hasPeriod: true, defaultPeriod: 14 },
  sma: { label: 'SMA', hasPeriod: true, defaultPeriod: 50 },
  ema: { label: 'EMA', hasPeriod: true, defaultPeriod: 20 },
  macd: { label: 'MACD', hasPeriod: false },
  price: { label: 'Price', hasPeriod: false },
  volume: { label: 'Volume', hasPeriod: false },
  change_percent: { label: 'Change %', hasPeriod: false },
};

export const SCREENER_OPERATORS: Record<ScreenerOperator, string> = {
  '>': 'is greater than',
  '<': 'is less than',
  '>=': 'is at least',
  '<=': 'is at most',
  '=': 'equals',
  'between': 'is between',
};

// Preset screener profiles
export const SCREENER_PRESETS: Record<string, Omit<ScreenerProfile, 'id' | 'name'>> = {
  oversold: {
    assetTypes: ['stock', 'crypto'],
    logic: 'all',
    rules: [
      { id: 'preset-1', field: 'rsi', operator: '<', value: 30, period: 14 },
    ],
  },
  overbought: {
    assetTypes: ['stock', 'crypto'],
    logic: 'all',
    rules: [
      { id: 'preset-1', field: 'rsi', operator: '>', value: 70, period: 14 },
    ],
  },
  highVolume: {
    assetTypes: ['stock', 'crypto'],
    logic: 'all',
    rules: [
      { id: 'preset-1', field: 'volume', operator: '>', value: 1000000 },
    ],
  },
  goldenCross: {
    assetTypes: ['stock', 'crypto'],
    logic: 'all',
    rules: [
      { id: 'preset-1', field: 'sma', operator: '>', value: 0, period: 50 },
      { id: 'preset-2', field: 'ema', operator: '>', value: 0, period: 200 },
    ],
  },
};

const SUPABASE_URL = 'https://wrsoacujxcskydlzgopa.supabase.co';

/**
 * Run a screener with the given profile
 */
export function useRunScreener() {
  return useMutation({
    mutationFn: async (profile: ScreenerProfile): Promise<ScreenerResult[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/screener-engine/run`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(profile),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Screener failed' }));
        throw new Error(error.message || 'Screener failed');
      }

      const data = await response.json();
      return data.results || [];
    },
  });
}

/**
 * Fetch saved screener profiles for the user
 */
export function useScreenerProfiles(businessId?: string) {
  return useQuery({
    queryKey: ['screener-profiles', businessId],
    queryFn: async (): Promise<Array<ScreenerProfile & { id: string; name: string }>> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('screener_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching screener profiles:', error);
        throw error;
      }

      // Transform database format to component format
      return (data || []).map(profile => ({
        id: profile.id,
        name: profile.name,
        assetTypes: profile.asset_types as AssetType[],
        logic: profile.logic as LogicMode,
        rules: profile.rules as ScreenerRule[],
      }));
    },
    staleTime: 60000,
  });
}

/**
 * Save a screener profile
 */
export function useSaveScreener() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      profile,
      businessId,
    }: {
      name: string;
      profile: ScreenerProfile;
      businessId?: string;
    }): Promise<{ id: string }> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('screener_profiles')
        .insert({
          user_id: user.id,
          business_id: businessId || null,
          name,
          asset_types: profile.assetTypes,
          logic: profile.logic,
          rules: profile.rules,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error saving screener profile:', error);
        throw error;
      }

      return { id: data.id };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['screener-profiles', variables.businessId] });
    },
  });
}

/**
 * Delete a screener profile
 */
export function useDeleteScreenerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string): Promise<void> => {
      const { error } = await supabase
        .from('screener_profiles')
        .delete()
        .eq('id', profileId);

      if (error) {
        console.error('Error deleting screener profile:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screener-profiles'] });
    },
  });
}

/**
 * Generate a unique ID for rules
 */
export function generateRuleId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a default empty rule
 */
export function createDefaultRule(): ScreenerRule {
  return {
    id: generateRuleId(),
    field: 'rsi',
    operator: '<',
    value: 30,
    period: 14,
  };
}
