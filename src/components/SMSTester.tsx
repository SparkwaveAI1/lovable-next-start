import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, Phone, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SMSTesterProps {
  businessId?: string;
}

export function SMSTester({ businessId }: SMSTesterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);

  const [smsData, setSmsData] = useState({
    from: '+19195551234',
    to: '+19195556789',
    message: "Hi! I'm interested in a free trial class at Fight Flow Academy. When are you available?",
    businessPhone: '+19195556789'
  });

  const testSmsWebhook = async () => {
    if (!businessId) {
      setTestResult({
        success: false,
        message: 'Please select a business first'
      });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const testPayload = {
        ...smsData,
        timestamp: new Date().toISOString(),
        messageId: `test_${Date.now()}`,
        type: 'inbound'
      };

      console.log('Testing SMS webhook with payload:', testPayload);

      // Send to SMS handler endpoint
      const response = await fetch(`https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/sms-handler/fight-flow-sms-inbound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indyc29hY3VqeGNza3lkbHpnb3BhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDUyMTEsImV4cCI6MjA2NTE4MTIxMX0.TyzOJ0_qZ6nwHW_p9tTd4RZ8FtP7rg8u_Ow92phO7rc`
        },
        body: JSON.stringify(testPayload)
      });

      const result = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          message: 'SMS webhook test successful! Check the activity log for the SMS entry.',
          data: result
        });
      } else {
        setTestResult({
          success: false,
          message: `SMS webhook test failed: ${result.error || 'Unknown error'}`,
          data: result
        });
      }
    } catch (error) {
      console.error('SMS webhook test error:', error);
      setTestResult({
        success: false,
        message: `Test failed: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!businessId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Webhook Tester
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Phone className="h-4 w-4" />
            <AlertDescription>
              Select a business to test SMS webhook functionality.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          SMS Webhook Tester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="from">From Phone</Label>
            <Input
              id="from"
              value={smsData.from}
              onChange={(e) => setSmsData(prev => ({ ...prev, from: e.target.value }))}
              placeholder="+1234567890"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">To Phone (Business)</Label>
            <Input
              id="to"
              value={smsData.to}
              onChange={(e) => setSmsData(prev => ({ ...prev, to: e.target.value }))}
              placeholder="+1234567890"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">SMS Message</Label>
          <Textarea
            id="message"
            value={smsData.message}
            onChange={(e) => setSmsData(prev => ({ ...prev, message: e.target.value }))}
            placeholder="Enter test SMS message..."
            rows={3}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={testSmsWebhook} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {isLoading ? 'Testing...' : 'Test SMS Webhook'}
          </Button>
          <Badge variant="outline">Endpoint: fight-flow-sms-inbound</Badge>
        </div>

        {testResult && (
          <Alert className={testResult.success ? 'border-green-500' : 'border-red-500'}>
            <MessageSquare className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                  {testResult.message}
                </p>
                {testResult.data && (
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium">View Response</summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <Phone className="h-4 w-4" />
          <AlertDescription>
            <strong>Test Instructions:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
              <li>Click "Test SMS Webhook" to send sample SMS data</li>
              <li>Check the Activity Log for a new SMS entry with 📱 indicator</li>
              <li>Verify conversation state is created in the database</li>
              <li>Confirm proper formatting: phone numbers and message preview</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}