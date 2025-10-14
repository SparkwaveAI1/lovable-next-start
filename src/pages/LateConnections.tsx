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
  Copy
} from 'lucide-react';
import { toast } from 'sonner';

interface PlatformConnection {
  platform: string;
  displayName: string;
  icon: React.ReactNode;
  accountId: string | null;
  connected: boolean;
  color: string;
}

export default function LateConnections() {
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const [platforms, setPlatforms] = useState<PlatformConnection[]>([]);
  const [loading, setLoading] = useState(false);

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

      if (error) throw error;

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (!selectedBusiness) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader 
          selectedBusinessId={undefined}
          onBusinessChange={handleBusinessChange}
        />
        <div className="container mx-auto p-8">
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
      
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Platforms for {selectedBusiness.name}</h1>
          <p className="text-muted-foreground">Connected social media accounts via Late</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading connections...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platforms.map((platform) => (
              <Card key={platform.platform} className="relative">
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
