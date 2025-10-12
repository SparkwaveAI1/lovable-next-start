import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function LateSetup() {
  const [apiKey, setApiKey] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAccounts = async () => {
    if (!apiKey) {
      toast.error("Please enter your Late API key");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-late-accounts', {
        body: { apiKey }
      });

      if (error) {
        throw error;
      }

      setAccounts(data.accounts || []);
      toast.success(`Found ${data.accounts?.length || 0} connected accounts`);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch accounts");
    } finally {
      setLoading(false);
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

      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Your Connected Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {accounts.map((account, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold capitalize">
                      {account.platform}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      @{account.username || account.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Status: {account.status}
                    </p>
                  </div>
                  <div className="bg-muted px-3 py-1 rounded">
                    <code className="text-xs">
                      ID: {account._id || account.id}
                    </code>
                  </div>
                </div>
              ))}

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-semibold mb-2">Next Steps:</p>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Copy each account ID above</li>
                  <li>Store them in your database for each business</li>
                  <li>Add the API key to Supabase secrets</li>
                  <li>Start posting!</li>
                </ol>
              </div>

              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    const sql = accounts.map((acc) => {
                      const platform = acc.platform.toLowerCase();
                      return `-- ${acc.username || acc.name} (${acc.platform})
UPDATE businesses 
SET late_${platform}_account_id = '${acc._id || acc.id}'
WHERE slug = 'your-business-slug-here';`;
                    }).join("\n\n");

                    navigator.clipboard.writeText(sql);
                    toast.success("SQL copied to clipboard!");
                  }}
                >
                  📋 Copy SQL to Store These IDs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
