import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

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
  const [apiKey, setApiKey] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [mappings, setMappings] = useState<AccountMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupResults, setSetupResults] = useState<SetupResult[]>([]);

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
    if (!apiKey) {
      toast.error("Please enter your Late API key");
      return;
    }

    setLoading(true);
    setSetupResults([]);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-late-accounts', {
        body: { apiKey }
      });

      if (error) {
        throw error;
      }

      const fetchedAccounts = data.accounts || [];
      setAccounts(fetchedAccounts);
      
      // Auto-map accounts to businesses
      const accountMappings = fetchedAccounts.map((account: any) => {
        const mapping = mapAccountToBusiness(account);
        return {
          account,
          businessSlug: mapping.slug,
          businessName: mapping.name,
        };
      });
      
      setMappings(accountMappings);
      toast.success(`Found ${fetchedAccounts.length} connected accounts`);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch accounts");
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

    try {
      const mappingsPayload = validMappings.map(m => ({
        businessSlug: m.businessSlug,
        platform: m.account.platform.toLowerCase(),
        accountId: m.account._id || m.account.id,
      }));

      const { data, error } = await supabase.functions.invoke('update-late-accounts', {
        body: { mappings: mappingsPayload }
      });

      if (error) {
        throw error;
      }

      setSetupResults(data.results || []);
      
      const successCount = data.successCount || 0;
      const totalCount = data.totalCount || 0;
      
      if (successCount === totalCount) {
        toast.success(`Successfully configured all ${successCount} accounts!`);
      } else {
        toast.warning(`Configured ${successCount} of ${totalCount} accounts`);
      }
    } catch (error) {
      console.error("Error setting up accounts:", error);
      toast.error(error instanceof Error ? error.message : "Failed to setup accounts");
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Late API Setup</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 1: Enter Your Late API Key</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="apiKey">Late API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Get this from your Late dashboard
              </p>
            </div>
            <Button onClick={fetchAccounts} disabled={loading}>
              {loading ? "Fetching..." : "Fetch Connected Accounts"}
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
    </div>
  );
}
