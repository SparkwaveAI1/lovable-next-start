import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { runTokenHealthChecks } from '@/lib/tokenHealthChecker';
import { AlertCircle, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  function getStatusIcon(status: string) {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'failed':
      case 'expired':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      healthy: 'default',
      warning: 'secondary',
      failed: 'destructive',
      expired: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.toUpperCase()}
      </Badge>
    );
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
            <h2 className="text-2xl font-bold">Twitter Token Health</h2>
            <p className="text-muted-foreground">Loading token health data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Twitter Token Health</h2>
          <p className="text-muted-foreground">Monitor OAuth token status across all businesses</p>
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
          <Card key={business.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{business.name}</CardTitle>
                {business.health && getStatusIcon(business.health.status)}
              </div>
              <CardDescription>Twitter OAuth Status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {business.health ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    {getStatusBadge(business.health.status)}
                  </div>

                  {business.health.days_until_expiry !== null && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Expires in:</span>
                      <span className={`text-sm font-medium ${
                        business.health.days_until_expiry < 0 ? 'text-red-500' :
                        business.health.days_until_expiry <= 7 ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {business.health.days_until_expiry < 0 
                          ? 'EXPIRED' 
                          : `${business.health.days_until_expiry} days`}
                      </span>
                    </div>
                  )}

                  {business.health.test_post_attempted && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Test Post:</span>
                      <span className={`text-sm font-medium ${
                        business.health.test_post_successful ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {business.health.test_post_successful ? 'Success' : 'Failed'}
                      </span>
                    </div>
                  )}

                  {business.health.error_message && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertDescription className="text-xs">
                        {business.health.error_message}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      Last checked: {new Date(business.health.check_timestamp).toLocaleString()}
                    </p>
                  </div>

                  {(business.health.status === 'warning' || 
                    business.health.status === 'failed' || 
                    business.health.status === 'expired') && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => window.open('https://app.getlate.dev/accounts', '_blank')}
                    >
                      Reconnect in Late.so
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No health data available. Run a health check.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
