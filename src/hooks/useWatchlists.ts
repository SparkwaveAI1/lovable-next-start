import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types for watchlist data
export interface WatchlistItem {
  id: string;
  watchlist_id: string;
  symbol: string;
  asset_type: 'stock' | 'crypto';
  added_at: string;
  notes: string | null;
}

export interface Watchlist {
  id: string;
  user_id: string;
  business_id: string | null;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  items?: WatchlistItem[];
}

/**
 * Fetch all watchlists for a business (or user if no business)
 */
export function useWatchlists(businessId?: string) {
  return useQuery({
    queryKey: ['watchlists', businessId],
    queryFn: async (): Promise<Watchlist[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('investment_watchlists')
        .select(`
          *,
          items:watchlist_items(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching watchlists:', error);
        throw error;
      }

      return (data || []) as Watchlist[];
    },
    staleTime: 30000,
  });
}

/**
 * Create a new watchlist
 */
export function useCreateWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      businessId,
      isDefault = false,
    }: {
      name: string;
      businessId?: string;
      isDefault?: boolean;
    }): Promise<Watchlist> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('investment_watchlists')
        .insert({
          user_id: user.id,
          business_id: businessId || null,
          name,
          is_default: isDefault,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating watchlist:', error);
        throw error;
      }

      return data as Watchlist;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['watchlists', variables.businessId] });
    },
  });
}

/**
 * Update a watchlist (name, etc.)
 */
export function useUpdateWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      isDefault,
    }: {
      id: string;
      name?: string;
      isDefault?: boolean;
    }): Promise<Watchlist> => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (isDefault !== undefined) updates.is_default = isDefault;

      const { data, error } = await supabase
        .from('investment_watchlists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating watchlist:', error);
        throw error;
      }

      return data as Watchlist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });
}

/**
 * Delete a watchlist
 */
export function useDeleteWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (watchlistId: string): Promise<void> => {
      const { error } = await supabase
        .from('investment_watchlists')
        .delete()
        .eq('id', watchlistId);

      if (error) {
        console.error('Error deleting watchlist:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });
}

/**
 * Add a symbol to a watchlist
 */
export function useAddSymbol() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      watchlistId,
      symbol,
      assetType,
      notes,
    }: {
      watchlistId: string;
      symbol: string;
      assetType: 'stock' | 'crypto';
      notes?: string;
    }): Promise<WatchlistItem> => {
      // Normalize symbol based on asset type
      const normalizedSymbol = assetType === 'stock' 
        ? symbol.toUpperCase() 
        : symbol.toLowerCase();

      const { data, error } = await supabase
        .from('watchlist_items')
        .insert({
          watchlist_id: watchlistId,
          symbol: normalizedSymbol,
          asset_type: assetType,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          throw new Error(`${symbol} is already in this watchlist`);
        }
        console.error('Error adding symbol:', error);
        throw error;
      }

      return data as WatchlistItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });
}

/**
 * Remove a symbol from a watchlist
 */
export function useRemoveSymbol() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      watchlistId,
      symbol,
    }: {
      watchlistId: string;
      symbol: string;
    }): Promise<void> => {
      const { error } = await supabase
        .from('watchlist_items')
        .delete()
        .eq('watchlist_id', watchlistId)
        .eq('symbol', symbol);

      if (error) {
        console.error('Error removing symbol:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });
}

/**
 * Update notes for a symbol in a watchlist
 */
export function useUpdateSymbolNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      notes,
    }: {
      itemId: string;
      notes: string | null;
    }): Promise<WatchlistItem> => {
      const { data, error } = await supabase
        .from('watchlist_items')
        .update({ notes })
        .eq('id', itemId)
        .select()
        .single();

      if (error) {
        console.error('Error updating notes:', error);
        throw error;
      }

      return data as WatchlistItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });
}
