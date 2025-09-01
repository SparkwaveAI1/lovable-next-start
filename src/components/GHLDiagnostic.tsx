import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface DiagnosticResult {
  success: boolean;
  test?: string;
  status?: number;
  error?: string;
  response?: string;
  details?: string;
  message?: string;
  tests?: {
    location: { status: number; passed: boolean };
    contacts: { status: number; passed: boolean };
    opportunities: { status: number; passed: boolean };
    conversations: { status: number; passed: boolean };
  };
  locationInfo?: any;
  apiKeyPrefix?: string;
}

interface GHLDiagnosticProps {
  locationId: string;
}

export function GHLDiagnostic({ locationId }: GHLDiagnosticProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const runDiagnostic = async () => {
    if (!locationId) {
      setResult({
        success: false,
        error: 'Location ID is required',
        details: 'Please provide a valid GoHighLevel location ID'
      });
      return;
    }

    setIsRunning(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('ghl-diagnostic', {
        body: { locationId }
      });

      if (error) {
        setResult({
          success: false,
          error: 'Diagnostic function failed',
          details: error.message
        });
      } else {
        setResult(data);
      }
    } catch (err) {
      setResult({
        success: false,
        error: 'Diagnostic test failed',
        details: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (passed?: boolean) => {
    if (passed === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (passed === false) return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusBadge = (status?: number) => {
    if (!status) return null;
    if (status >= 200 && status < 300) return <Badge variant="default" className="bg-green-100 text-green-800">HTTP {status}</Badge>;
    if (status >= 400 && status < 500) return <Badge variant="destructive">HTTP {status}</Badge>;
    if (status >= 500) return <Badge variant="destructive">HTTP {status}</Badge>;
    return <Badge variant="secondary">HTTP {status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          GoHighLevel API Diagnostic
        </CardTitle>
        <CardDescription>
          Test API key permissions and access to verify what's causing the integration failures
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button 
            onClick={runDiagnostic} 
            disabled={isRunning || !locationId}
            className="w-full"
          >
            {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Comprehensive API Diagnostic
          </Button>
        </div>

        {result && (
          <div className="space-y-4">
            <Alert variant={result.success ? "default" : "destructive"}>
              <AlertDescription className="font-semibold">
                {result.success ? "✅ All Tests Passed" : "❌ API Integration Failed"}
              </AlertDescription>
            </Alert>

            {!result.success && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600">Error Details:</h4>
                <div className="bg-red-50 p-3 rounded border">
                  <p><strong>Test:</strong> {result.test || 'General'}</p>
                  {result.status && <p><strong>HTTP Status:</strong> {result.status}</p>}
                  <p><strong>Error:</strong> {result.error}</p>
                  <p><strong>Details:</strong> {result.details}</p>
                  {result.response && (
                    <div className="mt-2">
                      <p><strong>API Response:</strong></p>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                        {result.response}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {result.success && result.tests && (
              <div className="space-y-3">
                <h4 className="font-semibold text-green-600">API Access Tests:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span className="flex items-center gap-2">
                      {getStatusIcon(result.tests.location.passed)}
                      Location Access
                    </span>
                    {getStatusBadge(result.tests.location.status)}
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span className="flex items-center gap-2">
                      {getStatusIcon(result.tests.contacts.passed)}
                      Contacts API
                    </span>
                    {getStatusBadge(result.tests.contacts.status)}
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span className="flex items-center gap-2">
                      {getStatusIcon(result.tests.opportunities.passed)}
                      Opportunities API
                    </span>
                    {getStatusBadge(result.tests.opportunities.status)}
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span className="flex items-center gap-2">
                      {getStatusIcon(result.tests.conversations.passed)}
                      SMS/Conversations API
                    </span>
                    {getStatusBadge(result.tests.conversations.status)}
                  </div>
                </div>

                {result.apiKeyPrefix && (
                  <div className="mt-4 p-3 bg-blue-50 rounded border">
                    <p><strong>API Key:</strong> {result.apiKeyPrefix}</p>
                  </div>
                )}

                {result.locationInfo && (
                  <div className="mt-4 p-3 bg-gray-50 rounded border">
                    <p><strong>Location Info:</strong></p>
                    <pre className="text-xs mt-1 overflow-auto">
                      {JSON.stringify(result.locationInfo, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}