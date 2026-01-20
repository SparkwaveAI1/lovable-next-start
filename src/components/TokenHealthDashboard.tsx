import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { runTokenHealthChecks } from '@/lib/tokenHealthChecker';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TwitterHealthCard } from '@/components/dashboard/TwitterHealthCard';

interface TokenHealth {
  id: string;
  business_id: string;
  platform: string;
  check_timestamp: string;
  status: string;
  token_expires_at: string | null;
  days_until_expiry: number | null;
  error_message: string | null;
  test_post_attempted: boolean;
  test_post_successful: boolean | null;
}

interface BusinessWithHealth {
  id: string;
  name: string;
  health: TokenHealth | null;
}

export function TokenHealthDashboard() {
  const [businesses, setBusinesses] = useState<BusinessWithHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTokenHealth();
  }, []);

  async function loadTokenHealth() {
    setLoading(true);
    try {
      // Get all businesses with Twitter accounts
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, late_twitter_account_id')
        .eq('status', 'active')
        .not('late_twitter_account_id', 'is', null);

      if (businessError) throw businessError;

      // Get latest health checks
      const { data: healthData, error: healthError } = await supabase
        .from('latest_token_health')
        .select('*')
        .eq('platform', 'twitter');

      if (healthError) throw healthError;

      // Combine data
      const combined = businessData?.map(business => ({
        ...business,
        health: healthData?.find(h => h.business_id === business.id) || null,
      })) || [];

      setBusinesses(combined);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load token health data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function runHealthCheck() {
    setChecking(true);
    try {
      await runTokenHealthChecks();
      toast({
        title: 'Health Check Complete',
        description: 'Token health has been checked for all businesses',
      });
      await loadTokenHealth();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to run health checks',
        variant: 'destructive',
      });
    } finally {
      setChecking(false);
    }
  }

  function mapHealthStatus(status: string): "healthy" | "warning" | "error" | "offline" {
    switch (status) {
      case 'healthy':
        return 'healthy';
      case 'warning':
        return 'warning';
      case 'failed':
      case 'expired':
        return 'error';
      default:
        return 'offline';
    }
  }

  function mapTestPostResult(health: TokenHealth | null): "success" | "failed" | "pending" {
    if (!health || !health.test_post_attempted) {
      return 'pending';
    }
    return health.test_post_successful ? 'success' : 'failed';
  }

  const hasIssues = businesses.some(b =>
    b.health?.status === 'warning' ||
    b.health?.status === 'failed' ||
    b.health?.status === 'expired'
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Twitter Token Health</h2>
            <p className="text-gray-500">Loading token health data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Twitter Token Health</h2>
          <p className="text-gray-500">Monitor OAuth token status across all businesses</p>
        </div>
        <Button onClick={runHealthCheck} disabled={checking}>
          <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
          Run Health Check
        </Button>
      </div>

      {hasIssues && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            One or more Twitter tokens need attention. Please reconnect accounts in Late.so to prevent automation failures.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {businesses.map((business) => (
          <TwitterHealthCard
            key={business.id}
            businessName={business.name}
            status={mapHealthStatus(business.health?.status || '')}
            testPostResult={mapTestPostResult(business.health)}
            lastChecked={
              business.health?.check_timestamp
                ? new Date(business.health.check_timestamp).toLocaleString()
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
