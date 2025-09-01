import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export const GHLDebugTest = () => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testDebugFunction = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/debug-env',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ test: true })
        }
      );

      console.log('Response status:', response.status);
      const data = await response.json();
      setResult({
        status: response.status,
        data: data
      });
    } catch (error) {
      console.error('Error:', error);
      setResult({
        status: 'Error',
        data: { error: error.message }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>🔍 GoHighLevel Debug Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testDebugFunction}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Testing...' : 'Test Environment & API Key'}
        </Button>

        {result && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Debug Results:</h3>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
              <p><strong>Status:</strong> {result.status}</p>
              <pre className="mt-2 text-sm overflow-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>This will test:</p>
          <ul className="list-disc ml-5 mt-1">
            <li>Whether GOHIGHLEVEL_API_KEY is available to the edge function</li>
            <li>Direct API call to GoHighLevel to verify the key works</li>
            <li>Environment variable status</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};