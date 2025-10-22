import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { DashboardHeader } from '@/components/DashboardHeader';
import { 
  Twitter, 
  Instagram, 
  Facebook, 
  Linkedin,
  Video,
  CheckCircle2,
  Copy,
  RefreshCw,
  AlertCircle,
  Shield,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface PlatformConnection {
  platform: string;
  displayName: string;
  icon: React.ReactNode;
  accountId: string | null;
  connected: boolean;
  color: string;
  tokenHealth?: 'valid' | 'expired' | 'error' | 'untested' | 'testing';
  lastTested?: Date;
  healthMessage?: string;
}

export default function LateConnections() {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const [platforms, setPlatforms] = useState<PlatformConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadConnections();
  }, [selectedBusiness]);

  const loadConnections = async () => {
    if (!selectedBusiness) return;
    
    setLoading(true);
    try {
      const { data: business, error } = await supabase
        .from('businesses')
        .select('late_twitter_account_id, late_instagram_account_id, late_tiktok_account_id, late_linkedin_account_id, late_facebook_account_id')
        .eq('id', selectedBusiness.id)
        .single();

      console.log('📊 Database data for', selectedBusiness.name, ':', business);

      if (error) throw error;

      console.log('🔍 Account IDs:', {
        twitter: business?.late_twitter_account_id,
        instagram: business?.late_instagram_account_id,
        tiktok: business?.late_tiktok_account_id,
        facebook: business?.late_facebook_account_id,
        linkedin: business?.late_linkedin_account_id
      });

      const platformData: PlatformConnection[] = [
        {
          platform: 'twitter',
          displayName: 'X (Twitter)',
          icon: <Twitter className="w-6 h-6" />,
          accountId: business?.late_twitter_account_id || null,
          connected: !!business?.late_twitter_account_id,
          color: 'bg-blue-100 dark:bg-blue-950'
        },
        {
          platform: 'instagram',
          displayName: 'Instagram',
          icon: <Instagram className="w-6 h-6" />,
          accountId: business?.late_instagram_account_id || null,
          connected: !!business?.late_instagram_account_id,
          color: 'bg-pink-100 dark:bg-pink-950'
        },
        {
          platform: 'tiktok',
          displayName: 'TikTok',
          icon: <Video className="w-6 h-6" />,
          accountId: business?.late_tiktok_account_id || null,
          connected: !!business?.late_tiktok_account_id,
          color: 'bg-gray-100 dark:bg-gray-950'
        },
        {
          platform: 'facebook',
          displayName: 'Facebook',
          icon: <Facebook className="w-6 h-6" />,
          accountId: business?.late_facebook_account_id || null,
          connected: !!business?.late_facebook_account_id,
          color: 'bg-blue-100 dark:bg-blue-950'
        },
        {
          platform: 'linkedin',
          displayName: 'LinkedIn',
          icon: <Linkedin className="w-6 h-6" />,
          accountId: business?.late_linkedin_account_id || null,
          connected: !!business?.late_linkedin_account_id,
          color: 'bg-blue-100 dark:bg-blue-950'
        }
      ];

      setPlatforms(platformData);
    } catch (error) {
      console.error('Error loading connections:', error);
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessChange = (id: string) => {
    const businesses = [
      { id: '456dc53b-d9d9-41b0-bc33-4f4c4a791eff', slug: 'fight-flow-academy', name: 'Fight Flow Academy' },
      { id: '5a9bbfcf-fae5-4063-9780-bcbe366bae88', slug: 'sparkwave-ai', name: 'Sparkwave AI' },
      { id: '18d0dbb1-a82d-4477-a9f8-816a1fa2ee08', slug: 'persona-ai', name: 'PersonaAI' },
      { id: '350b8fcb-9bfe-4b53-9548-c6ffdb1d3cb5', slug: 'charx-world', name: 'CharX World' },
    ];
    const business = businesses.find(b => b.id === id);
    if (business) {
      setSelectedBusiness(business);
    }
  };

  const syncFromLate = async () => {
    if (!selectedBusiness) return;
    
    setSyncing(true);
    try {
      console.log('🔄 Syncing connections from Late.so for', selectedBusiness.name);
      
      const { data, error } = await supabase.functions.invoke('sync-late-connections', {
        body: { businessId: selectedBusiness.id }
      });
      
      console.log('📥 Sync response:', data);
      
      if (error) throw error;
      
      toast.success(`Synced ${data.synced} connection(s) from Late.so`);
      loadConnections(); // Reload to show updated connections
    } catch (error) {
      console.error('❌ Sync failed:', error);
      toast.error('Failed to sync connections from Late');
    } finally {
      setSyncing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const testConnection = async (platform: string, accountId: string) => {
    try {
      console.log(`🔍 Testing ${platform} connection...`);
      
      const { data, error } = await supabase.functions.invoke('test-late-connection', {
        body: { accountId, platform }
      });
      
      if (error) throw error;
      
      console.log(`📊 Test result for ${platform}:`, data);
      
      return {
        status: data.status,
        message: data.message,
        needsReconnection: data.needsReconnection
      };
    } catch (error: any) {
      console.error(`❌ Error testing ${platform}:`, error);
      return {
        status: 'error',
        message: error.message || 'Failed to test connection',
        needsReconnection: false
      };
    }
  };

  const testAllConnections = async () => {
    if (!selectedBusiness) return;
    
    setTesting(true);
    
    // Mark all as testing
    setPlatforms(prev => prev.map(p => ({
      ...p,
      tokenHealth: p.connected ? 'testing' : 'untested'
    })));
    
    try {
      // Test all connected platforms in parallel
      const connectedPlatforms = platforms.filter(p => p.connected && p.accountId);
      
      const testPromises = connectedPlatforms.map(async (platform) => {
        const result = await testConnection(platform.platform, platform.accountId!);
        return {
          platform: platform.platform,
          ...result
        };
      });
      
      const results = await Promise.all(testPromises);
      
      // Update platforms with test results
      setPlatforms(prev => prev.map(p => {
        const result = results.find(r => r.platform === p.platform);
        if (!result) return p;
        
        return {
          ...p,
          tokenHealth: result.status as 'valid' | 'expired' | 'error',
          lastTested: new Date(),
          healthMessage: result.message
        };
      }));
      
      // Show summary
      const expired = results.filter(r => r.status === 'expired').length;
      const errors = results.filter(r => r.status === 'error').length;
      const valid = results.filter(r => r.status === 'valid').length;
      
      if (expired > 0) {
        toast.error(`${expired} connection(s) need reconnection`);
      } else if (errors > 0) {
        toast.warning(`${errors} connection(s) had errors`);
      } else {
        toast.success(`All ${valid} connection(s) are healthy`);
      }
      
    } catch (error) {
      console.error('Error testing connections:', error);
      toast.error('Failed to test connections');
    } finally {
      setTesting(false);
    }
  };

  const reconnectPlatform = () => {
    window.open('https://app.getlate.dev/accounts', '_blank');
    toast.info('Opening Late.so dashboard...');
  };

  if (!selectedBusiness) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader 
          selectedBusinessId={undefined}
          onBusinessChange={handleBusinessChange}
        />
        <div className="container mx-auto p-8 pt-[120px] md:pt-[88px]">
          <p className="text-muted-foreground">Please select a business</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        selectedBusinessId={selectedBusiness.id}
        onBusinessChange={handleBusinessChange}
      />
      
      <div className="container mx-auto p-8 pt-[120px] md:pt-[88px]">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Platforms for {selectedBusiness.name}</h1>
              <p className="text-muted-foreground">Connected social media accounts via Late</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={testAllConnections} 
                disabled={testing || !selectedBusiness}
                variant="outline"
                className="gap-2"
              >
                <Shield className={`h-4 w-4 ${testing ? 'animate-pulse' : ''}`} />
                Test All Connections
              </Button>
              <Button 
                onClick={syncFromLate} 
                disabled={syncing || !selectedBusiness}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                Sync from Late.so
              </Button>
            </div>
          </div>
          
          {/* Warning banner for expired tokens */}
          {platforms.some(p => p.tokenHealth === 'expired') && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                  {platforms.filter(p => p.tokenHealth === 'expired').length} account(s) need reconnection
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Click "Reconnect in Late.so" on expired accounts below to restore access.
                </p>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading connections...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platforms.map((platform) => (
              <Card 
                key={platform.platform} 
                className={`relative ${
                  platform.tokenHealth === 'expired' ? 'border-yellow-500 dark:border-yellow-600' : 
                  platform.tokenHealth === 'error' ? 'border-red-500 dark:border-red-600' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${platform.color}`}>
                      {platform.icon}
                    </div>
                    <CardTitle className="text-xl">{platform.displayName}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {platform.connected ? (
                    <>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Connected</span>
                      </div>
                      
                      {/* Token Health Status */}
                      {platform.tokenHealth && platform.tokenHealth !== 'untested' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {platform.tokenHealth === 'valid' && (
                              <>
                                <Shield className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium text-green-600">Token Valid ✓</span>
                              </>
                            )}
                            {platform.tokenHealth === 'expired' && (
                              <>
                                <AlertCircle className="w-4 h-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-600">Token Expired ⚠️</span>
                              </>
                            )}
                            {platform.tokenHealth === 'error' && (
                              <>
                                <XCircle className="w-4 h-4 text-red-600" />
                                <span className="text-sm font-medium text-red-600">Error ❌</span>
                              </>
                            )}
                            {platform.tokenHealth === 'testing' && (
                              <>
                                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                                <span className="text-sm font-medium text-blue-600">Testing...</span>
                              </>
                            )}
                          </div>
                          
                          {platform.lastTested && (
                            <p className="text-xs text-muted-foreground">
                              Last tested: {new Date(platform.lastTested).toLocaleTimeString()}
                            </p>
                          )}
                          
                          {platform.tokenHealth === 'expired' && (
                            <Button
                              onClick={reconnectPlatform}
                              variant="outline"
                              size="sm"
                              className="w-full text-yellow-600 border-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                            >
                              Reconnect in Late.so
                            </Button>
                          )}
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Account ID:</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                            {platform.accountId}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyToClipboard(platform.accountId || '')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-2">
                      <Badge variant="outline" className="text-muted-foreground">
                        Not Connected
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-2">
                        Use Late Setup to connect this platform
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
