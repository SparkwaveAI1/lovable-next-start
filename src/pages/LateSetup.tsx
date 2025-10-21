import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useBusinesses } from "@/hooks/useBusinesses";

interface AccountMapping {
  account: any;
  businessSlug: string | null;
  businessName: string | null;
}

interface SetupResult {
  success: boolean;
  platform: string;
  businessSlug?: string;
  error?: string;
}

export default function LateSetup() {
  const { data: businesses = [], isLoading: loadingBusinesses } = useBusinesses();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [mappings, setMappings] = useState<AccountMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupResults, setSetupResults] = useState<SetupResult[]>([]);
  const [testContent, setTestContent] = useState('');
  const [testBusiness, setTestBusiness] = useState('');
  const [testPlatform, setTestPlatform] = useState('');
  const [testImageUrl, setTestImageUrl] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  const mapAccountToBusiness = (account: any): { slug: string | null; name: string | null } => {
    const username = (account.username || account.name || '').toLowerCase();
    
    if (username.includes('fightflow') || username.includes('ffa')) {
      return { slug: 'fight-flow-academy', name: 'Fight Flow Academy' };
    }
    if (username.includes('charx')) {
      return { slug: 'charx-world', name: 'CharX World' };
    }
    if (username.includes('persona')) {
      return { slug: 'persona-ai', name: 'PersonaAI' };
    }
    if (username.includes('sparkwave')) {
      return { slug: 'sparkwave-ai', name: 'SparkWave AI' };
    }
    
    return { slug: null, name: null };
  };

  const fetchAccounts = async () => {
    setLoading(true);
    setSetupResults([]);

    try {
      console.log('📡 Starting profile-based account fetch...');

      // Fetch all businesses to get their profile IDs
      const { data: businessesData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, slug, late_profile_id');

      if (businessError) throw businessError;

      console.log('✅ Fetched businesses:', businessesData);

      // Fetch accounts for each business's profile
      const accountsByBusiness: Record<string, any[]> = {};
      const allFetchedAccounts: any[] = [];

      for (const business of businessesData || []) {
        if (!business.late_profile_id) {
          console.warn(`⚠️ Business ${business.name} has no profile ID, skipping`);
          continue;
        }

        console.log(`📡 Fetching accounts for ${business.name} (profile: ${business.late_profile_id})`);

        const response = await fetch(
          `https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/fetch-late-accounts?profileId=${business.late_profile_id}`,
          {
            headers: {
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indyc29hY3VqeGNza3lkbHpnb3BhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDUyMTEsImV4cCI6MjA2NTE4MTIxMX0.TyzOJ0_qZ6nwHW_p9tTd4RZ8FtP7rg8u_Ow92phO7rc`,
              'Content-Type': 'application/json'
            }
          }
        );

        const data = await response.json();

        if (data?.success && data?.accounts) {
          accountsByBusiness[business.name] = data.accounts.map((acc: any) => ({
            ...acc,
            _businessSlug: business.slug,
            _businessName: business.name
          }));
          allFetchedAccounts.push(...accountsByBusiness[business.name]);
          console.log(`✅ Found ${data.accounts.length} accounts for ${business.name}`);
        }
      }

      setAccounts(allFetchedAccounts);

      // Auto-map accounts to businesses
      const accountMappings = allFetchedAccounts.map((account: any) => ({
        account,
        businessSlug: account._businessSlug,
        businessName: account._businessName,
      }));

      setMappings(accountMappings);

      console.log('✅ Total accounts fetched:', allFetchedAccounts.length);
      toast.success(`Successfully fetched ${allFetchedAccounts.length} accounts from ${Object.keys(accountsByBusiness).length} profiles`);

    } catch (err: any) {
      console.error('❌ Error in fetchAccounts:', err);
      toast.error(`Failed to fetch accounts: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAutomaticSetup = async () => {
    const validMappings = mappings.filter(m => m.businessSlug);
    
    if (validMappings.length === 0) {
      toast.error("No valid business mappings found");
      return;
    }

    setSetupLoading(true);
    setSetupResults([]);
    const results: SetupResult[] = [];

    try {
      console.log('🔧 Starting automatic profile-based setup...');

      // Fetch all businesses with their profile IDs
      const { data: businessesData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, slug, late_profile_id');

      if (businessError) throw businessError;

      console.log('📊 Businesses to configure:', businessesData?.map(b => b.name));

      let totalUpdates = 0;

      // For each business, fetch its profile's accounts and update
      for (const business of businessesData || []) {
        if (!business.late_profile_id) {
          console.warn(`⚠️ Skipping ${business.name} - no profile ID`);
          continue;
        }

        console.log(`\n🔧 ========== Setting up ${business.name} ==========`);
        console.log(`   Profile ID: ${business.late_profile_id}`);

        // Fetch accounts for this business's specific profile
        const response = await fetch(
          `https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/fetch-late-accounts?profileId=${business.late_profile_id}`,
          {
            headers: {
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indyc29hY3VqeGNza3lkbHpnb3BhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDUyMTEsImV4cCI6MjA2NTE4MTIxMX0.TyzOJ0_qZ6nwHW_p9tTd4RZ8FtP7rg8u_Ow92phO7rc`,
              'Content-Type': 'application/json'
            }
          }
        );

        const data = await response.json();

        if (!data?.success) {
          console.error(`❌ Failed to fetch accounts for ${business.name}:`, data);
          results.push({
            success: false,
            platform: 'all',
            businessSlug: business.slug,
            error: 'Failed to fetch accounts from Late API'
          });
          continue;
        }

        const accounts = data.accounts || [];
        console.log(`✅ Fetched ${accounts.length} accounts for ${business.name}:`);
        accounts.forEach((acc: any) => {
          console.log(`   - ${acc.platform}: ${acc._id} (@${acc.username})`);
        });

        // Build update object with account IDs for each platform
        const updates: any = {};

        console.log(`\n📝 Building updates object for ${business.name}...`);
        accounts.forEach((account: any) => {
          const platform = account.platform.toLowerCase();
          const fieldName = `late_${platform}_account_id`;
          updates[fieldName] = account._id;
          console.log(`   ✓ ${fieldName} = ${account._id}`);
        });

        console.log(`\n📦 Final updates object for ${business.name}:`, JSON.stringify(updates, null, 2));

        // Update the business with new account IDs
        if (Object.keys(updates).length > 0) {
          console.log(`\n💾 Updating database for ${business.name}...`);
          
          const { data: updateResult, error: updateError } = await supabase
            .from('businesses')
            .update(updates)
            .eq('id', business.id)
            .select();

          if (updateError) {
            console.error(`❌ Database update FAILED for ${business.name}:`, updateError);
            results.push({
              success: false,
              platform: 'all',
              businessSlug: business.slug,
              error: updateError.message
            });
          } else {
            totalUpdates++;
            console.log(`✅ Database update SUCCESS for ${business.name}`);
            console.log(`   Updated record:`, updateResult);
            
            // Add individual success results for each platform
            accounts.forEach((account: any) => {
              results.push({
                success: true,
                platform: account.platform.toLowerCase(),
                businessSlug: business.slug
              });
            });
          }
        } else {
          console.warn(`⚠️ No updates to perform for ${business.name} (no accounts found)`);
        }

        console.log(`========== Finished ${business.name} ==========\n`);
      }

      setSetupResults(results);
      console.log(`\n✅ Setup complete: ${totalUpdates} businesses updated`);
      console.log(`📊 Total successful account mappings: ${results.filter(r => r.success).length}`);
      toast.success(`Successfully configured ${totalUpdates} businesses with their Late accounts`);

    } catch (err: any) {
      console.error('❌ Error in handleAutomaticSetup:', err);
      toast.error(`Setup failed: ${err.message}`);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleTestPost = async () => {
    if (!testBusiness || !testPlatform || !testContent) {
      toast.error('Please fill in business, platform, and content');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Fetch the Late account ID for this platform
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('late_twitter_account_id, late_instagram_account_id, late_tiktok_account_id, late_linkedin_account_id, late_facebook_account_id')
        .eq('id', testBusiness)
        .single();

      if (businessError) throw businessError;

      const accountIdMap: Record<string, string | null> = {
        twitter: businessData.late_twitter_account_id,
        instagram: businessData.late_instagram_account_id,
        tiktok: businessData.late_tiktok_account_id,
        linkedin: businessData.late_linkedin_account_id,
        facebook: businessData.late_facebook_account_id,
      };

      const accountId = accountIdMap[testPlatform];

      if (!accountId) {
        toast.error(`No ${testPlatform} account connected for this business`);
        setTestResult({ error: `No ${testPlatform} account connected` });
        setIsTesting(false);
        return;
      }

      // Build mediaUrls array
      const mediaUrls = testImageUrl ? [testImageUrl] : undefined;

      const { data, error } = await supabase.functions.invoke('post-via-late', {
        body: {
          businessId: testBusiness,
          platform: testPlatform,
          content: testContent,
          mediaUrls: mediaUrls,
          accountId: accountId
        }
      });

      if (error) throw error;

      // Check if edge function returned an error
      if (data && !data.success) {
        setTestResult(data);
        toast.error(data.error || data.details || 'Failed to post');
        return;
      }

      setTestResult(data);
      toast.success(data.message || 'Post created successfully!');
    } catch (error: any) {
      console.error('Test post error:', error);
      setTestResult({ error: error.message });
      toast.error(error.message || 'Failed to post');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Late API Setup</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 1: Fetch Accounts by Profile</CardTitle>
          <CardDescription>
            Automatically fetch accounts for each business from their Late profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={fetchAccounts} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching Accounts...
                </>
              ) : (
                "Fetch Connected Accounts from All Profiles"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {mappings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Account Mappings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mappings.map((mapping, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="font-semibold capitalize">
                      {mapping.account.platform}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      @{mapping.account.username || mapping.account.name}
                    </p>
                    {mapping.businessName ? (
                      <p className="text-sm text-primary font-medium mt-1">
                        → {mapping.businessName}
                      </p>
                    ) : (
                      <p className="text-sm text-destructive mt-1">
                        ⚠️ No business match found
                      </p>
                    )}
                  </div>
                  <div className="bg-muted px-3 py-1 rounded">
                    <code className="text-xs">
                      {mapping.account._id || mapping.account.id}
                    </code>
                  </div>
                </div>
              ))}

              <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="font-semibold mb-2">Ready to Configure</p>
                <p className="text-sm text-muted-foreground">
                  Click the button below to automatically link these accounts to your businesses.
                </p>
              </div>

              <Button 
                onClick={handleAutomaticSetup} 
                disabled={setupLoading || mappings.filter(m => m.businessSlug).length === 0}
                className="w-full"
                size="lg"
              >
                {setupLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Configuring Accounts...
                  </>
                ) : (
                  "🚀 Configure All Accounts Automatically"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {setupResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Setup Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {setupResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg flex items-center gap-3 ${
                    result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium capitalize">
                      {result.platform}
                    </p>
                    {result.success ? (
                      <p className="text-sm text-muted-foreground">
                        Linked to {result.businessSlug}
                      </p>
                    ) : (
                      <p className="text-sm text-red-600">
                        {result.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {setupResults.every(r => r.success) && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-semibold text-green-900 mb-1">✅ All Done!</p>
                  <p className="text-sm text-green-700">
                    Your Late accounts are now configured and ready to use for posting content.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {setupResults.length > 0 && setupResults.every(r => r.success) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Test Posting</CardTitle>
            <CardDescription>
              Send a test post to verify your Late integration is working
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="test-business">Business</Label>
              <select 
                id="test-business"
                className="w-full p-2 border rounded-md bg-background"
                value={testBusiness}
                onChange={(e) => setTestBusiness(e.target.value)}
              >
                <option value="">Select business...</option>
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="test-platform">Platform</Label>
              <select 
                id="test-platform"
                className="w-full p-2 border rounded-md bg-background"
                value={testPlatform}
                onChange={(e) => setTestPlatform(e.target.value)}
              >
                <option value="">Select platform...</option>
                <option value="twitter">Twitter</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="linkedin">LinkedIn</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>

            <div>
              <Label htmlFor="test-content">Content</Label>
              <Textarea 
                id="test-content"
                placeholder="Enter your test post content..."
                value={testContent}
                onChange={(e) => setTestContent(e.target.value)}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="test-image">Image URL (optional)</Label>
              <Input 
                id="test-image"
                type="text"
                placeholder="https://example.com/image.jpg"
                value={testImageUrl}
                onChange={(e) => setTestImageUrl(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleTestPost}
              disabled={isTesting || !testBusiness || !testPlatform || !testContent}
              className="w-full"
            >
              {isTesting ? 'Posting...' : 'Send Test Post'}
            </Button>

            {testResult && (
              <div className={`p-4 rounded-md ${testResult.error ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
