import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { generateContent, GameContentResponse } from '@/lib/game/game-client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const GameTestInterface: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GameContentResponse | null>(null);
  const [formData, setFormData] = useState({
    business: 'PersonaAI',
    contentType: 'twitter_post',
    topic: 'AI agents and crypto'
  });

  const testGameIntegration = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await generateContent(
        formData.business,
        formData.contentType,
        formData.topic
      );

      setResult(response);

      if (response.success) {
        toast({
          title: "GAME Integration Success",
          description: "Agent initialized and tested successfully!",
        });
      } else {
        toast({
          title: "GAME Integration Failed",
          description: response.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResult({
        success: false,
        message: "Failed to test GAME integration",
        error: errorMessage
      });

      toast({
        title: "Integration Test Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎮 GAME SDK Integration Test
        </CardTitle>
        <CardDescription>
          Test the PersonaAI GAME agent integration with secure Edge Function architecture
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="business">Business</Label>
            <Input
              id="business"
              value={formData.business}
              onChange={(e) => setFormData(prev => ({ ...prev, business: e.target.value }))}
              placeholder="PersonaAI"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contentType">Content Type</Label>
            <Input
              id="contentType"
              value={formData.contentType}
              onChange={(e) => setFormData(prev => ({ ...prev, contentType: e.target.value }))}
              placeholder="twitter_post"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="topic">Topic</Label>
          <Textarea
            id="topic"
            value={formData.topic}
            onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
            placeholder="AI agents and crypto"
            rows={3}
          />
        </div>

        <Button 
          onClick={testGameIntegration}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing GAME Integration...
            </>
          ) : (
            'Test GAME Agent Integration'
          )}
        </Button>

        {result && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <h3 className="font-semibold">
                {result.success ? 'Success' : 'Failed'}
              </h3>
            </div>
            
            <div className="space-y-2 text-sm">
              <p><strong>Message:</strong> {result.message}</p>
              {result.apiKeyConfigured && (
                <p><strong>API Key:</strong> ✅ Configured</p>
              )}
              {result.agentInitialized && (
                <p><strong>Agent:</strong> ✅ Initialized</p>
              )}
              {result.requestId && (
                <p><strong>Request ID:</strong> {result.requestId}</p>
              )}
              {result.error && (
                <p className="text-red-600"><strong>Error:</strong> {result.error}</p>
              )}
              {result.testResult && (
                <div>
                  <strong>Test Result:</strong>
                  <pre className="mt-1 p-2 bg-background rounded text-xs overflow-x-auto">
                    {JSON.stringify(result.testResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GameTestInterface;