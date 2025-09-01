import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, Send, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function WebhookTester() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const { toast } = useToast()

  const testWebhook = async () => {
    setIsLoading(true)
    setLastResult(null)

    const testData = {
      name: "Test Lead",
      email: "test@example.com", 
      phone: "555-0123",
      formType: "free_trial_signup",
      source: "wix_form_test"
    }

    try {
      // Call the webhook endpoint directly
      const response = await fetch('https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/webhook-handler/fight-flow-wix-forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      })

      const result = await response.json()
      setLastResult({ ...result, status: response.status })

      if (response.ok) {
        toast({
          title: "Webhook Test Successful",
          description: "Test data sent and processed successfully",
        })
      } else {
        toast({
          title: "Webhook Test Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        status: 0
      }
      setLastResult(errorResult)
      
      toast({
        title: "Webhook Test Failed",
        description: "Network error - check console for details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <CardTitle className="text-foreground">Webhook Tester</CardTitle>
          <p className="text-sm text-muted-foreground">
            Test the Fight Flow Academy webhook endpoint
          </p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Button 
          onClick={testWebhook}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending Test Data...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Test Webhook
            </>
          )}
        </Button>

        {lastResult && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <Badge variant={lastResult.success ? "default" : "destructive"}>
                Status {lastResult.status}
              </Badge>
            </div>
            
            <div className="bg-muted rounded-md p-3 text-sm">
              <pre className="text-muted-foreground overflow-x-auto">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
          <strong>Test Data:</strong> Sends sample form data to webhook endpoint to verify integration is working.
        </div>
      </CardContent>
    </Card>
  )
}