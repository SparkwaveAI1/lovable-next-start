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
    conversationId?: string;
    aiResponse?: string;
    smsResult?: any;
    data?: any;
  } | null>(null);

  // Test scenarios for different conversation types
  const testScenarios = [
    {
      name: "Trial Class Request",
      message: "Hi! I'm interested in a free trial class at Fight Flow Academy. When are you available?"
    },
    {
      name: "Class Inquiry",
      message: "What martial arts classes do you offer? I'm a complete beginner."
    },
    {
      name: "Pricing Question",
      message: "How much does membership cost? Do you have monthly rates?"
    }
  ];

  const [smsData, setSmsData] = useState({
    from: '+19195551234',
    to: '+19195556789',
    message: testScenarios[0].message,
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
          message: '✅ Complete SMS conversation flow successful!',
          conversationId: result.conversationId,
          aiResponse: result.aiResponse,
          data: result
        });
      } else {
        setTestResult({
          success: false,
          message: `❌ SMS webhook test failed: ${result.error || 'Unknown error'}`,
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
          <Label>Quick Test Scenarios</Label>
          <div className="flex flex-wrap gap-2">
            {testScenarios.map((scenario) => (
              <Button
                key={scenario.name}
                variant="outline"
                size="sm"
                onClick={() => setSmsData(prev => ({ ...prev, message: scenario.message }))}
                className="text-xs"
              >
                {scenario.name}
              </Button>
            ))}
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
                
                {testResult.success && testResult.aiResponse && (
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="font-medium text-blue-900 text-sm">AI Response Generated:</p>
                    <p className="text-blue-800 text-sm italic">"{testResult.aiResponse}"</p>
                  </div>
                )}
                
                {testResult.conversationId && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Conversation ID:</strong> {testResult.conversationId}
                  </div>
                )}
                
                {testResult.data && (
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium">View Full Response</summary>
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
            <strong>Complete SMS Flow Test:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
              <li>📱 Inbound SMS processed & logged</li>
              <li>🤖 OpenAI generates contextual response</li>
              <li>📤 Response sent via GoHighLevel SMS API</li>
              <li>📊 Both messages appear in Activity Log</li>
              <li>💬 Conversation state maintained in database</li>
            </ol>
            <p className="mt-2 text-xs text-muted-foreground">
              Check Activity Log after testing to verify conversation pairs (📱 inbound, 📤 outbound)
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}