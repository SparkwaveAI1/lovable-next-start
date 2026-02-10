import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NotificationPreferences {
  email_enabled: boolean;
  email_digest_frequency: 'realtime' | 'daily' | 'weekly' | 'never';
  sms_enabled: boolean;
  push_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  alert_threshold: 'all' | 'high' | 'critical';
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email_enabled: true,
  email_digest_frequency: 'daily',
  sms_enabled: false,
  push_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  alert_threshold: 'high',
};

interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

export function useNotificationPreferences(businessId?: string): UseNotificationPreferencesReturn {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load preferences from tenant_config
  const loadPreferences = useCallback(async () => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('tenant_config')
        .select('notifications')
        .eq('business_id', businessId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (data?.notifications) {
        // Merge with defaults to ensure all fields exist
        const loadedPrefs = {
          ...DEFAULT_PREFERENCES,
          ...data.notifications,
        };
        setPreferences(loadedPrefs);
      } else {
        // No config exists yet, use defaults
        setPreferences(DEFAULT_PREFERENCES);
      }
    } catch (err) {
      console.error('Error loading notification preferences:', err);
      setError('Failed to load notification preferences');
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [businessId, toast]);

  // Save preferences to tenant_config
  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    if (!businessId) {
      toast({
        title: 'No Business Selected',
        description: 'Please select a business to save preferences.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const newPreferences = { ...preferences, ...updates };

      // Upsert the tenant_config
      const { error: upsertError } = await supabase
        .from('tenant_config')
        .upsert(
          {
            business_id: businessId,
            notifications: newPreferences,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'business_id',
          }
        );

      if (upsertError) {
        throw upsertError;
      }

      setPreferences(newPreferences);
      toast({
        title: 'Preferences Saved',
        description: 'Your notification preferences have been updated.',
      });
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      setError('Failed to save notification preferences');
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [businessId, preferences, toast]);

  // Reset to default preferences
  const resetToDefaults = useCallback(async () => {
    await updatePreferences(DEFAULT_PREFERENCES);
  }, [updatePreferences]);

  // Load preferences when businessId changes
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    isLoading,
    isSaving,
    error,
    updatePreferences,
    resetToDefaults,
  };
}
