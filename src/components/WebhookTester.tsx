import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Zap, Send, CheckCircle, XCircle, Loader2, Shield, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

interface WebhookTesterProps {
  businessId?: string
}

export function WebhookTester({ businessId }: WebhookTesterProps = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const [testMode, setTestMode] = useState(false) // Live mode by default
  const [ghlEnabled, setGhlEnabled] = useState(true) // Enable GHL by default
  const [pipelineId, setPipelineId] = useState("")
  const [stageId, setStageId] = useState("")
  const [opportunityValue, setOpportunityValue] = useState("129")
  const [configLoaded, setConfigLoaded] = useState(false)
  const { toast } = useToast()

  // Load GoHighLevel configuration if available
  useEffect(() => {
    if (businessId && !configLoaded) {
      loadGhlConfiguration()
    }
  }, [businessId, configLoaded])

  const loadGhlConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('ghl_configurations')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {
        console.error('Error loading GHL config:', error)
        return
      }

      if (data) {
        setPipelineId(data.pipeline_id)
        setStageId(data.stage_id)
        setConfigLoaded(true)
        toast({
          title: "Configuration Loaded",
          description: "Using saved GoHighLevel configuration for testing.",
        })
      }
    } catch (error) {
      console.error('Error loading configuration:', error)
    }
  }

  const testWebhook = async () => {
    setIsLoading(true)
    setLastResult(null)

    const testData = {
      name: "Sarah Johnson",
      email: "sarah@test.com", 
      phone: "555-9876",
      formType: "free_trial_signup",
      comments: "Interested in free trial classes",
      source: "wix_form_test",
      // Safety parameters
      testMode: testMode,
      ghlEnabled: ghlEnabled,
      // GoHighLevel configuration
      pipelineId: pipelineId,
      stageId: stageId,
      opportunityValue: parseInt(opportunityValue) || 129
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
        {/* Safety Controls */}
        <div className="space-y-4 bg-muted/30 rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium text-foreground">Safety Controls</Label>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="test-mode" className="text-sm font-medium">Test Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Skips GoHighLevel API calls, shows what would be sent
                </p>
              </div>
              <Switch
                id="test-mode"
                checked={testMode}
                onCheckedChange={setTestMode}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ghl-enabled" className="text-sm font-medium">GoHighLevel Integration</Label>
                <p className="text-xs text-muted-foreground">
                  Enable actual GoHighLevel contact and opportunity creation
                </p>
              </div>
              <Switch
                id="ghl-enabled"
                checked={ghlEnabled}
                onCheckedChange={setGhlEnabled}
                disabled={testMode} // Disabled when in test mode
              />
            </div>
            
            {/* GoHighLevel Configuration */}
            <div className="space-y-3 pt-3 border-t border-border/30">
              <Label className="text-sm font-medium text-foreground">GoHighLevel Configuration</Label>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="pipeline-id" className="text-xs text-muted-foreground">Pipeline ID</Label>
                  <Input
                    id="pipeline-id"
                    value={pipelineId}
                    onChange={(e) => setPipelineId(e.target.value)}
                    placeholder="Enter pipeline ID"
                    className="text-xs"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stage-id" className="text-xs text-muted-foreground">Stage ID</Label>
                  <Input
                    id="stage-id"
                    value={stageId}
                    onChange={(e) => setStageId(e.target.value)}
                    placeholder="Enter stage ID"
                    className="text-xs"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="opportunity-value" className="text-xs text-muted-foreground">Opportunity Value ($)</Label>
                <Input
                  id="opportunity-value"
                  value={opportunityValue}
                  onChange={(e) => setOpportunityValue(e.target.value)}
                  placeholder="129"
                  type="number"
                  className="text-xs"
                />
              </div>
            </div>
          </div>
          
          {testMode && (
            <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md border border-primary/20">
              <Shield className="h-3 w-3 text-primary" />
              <p className="text-xs text-primary font-medium">
                Safe Mode: No external API calls will be made
              </p>
            </div>
          )}
        </div>
        
        <Separator />

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
          <strong>Test Data:</strong> Sends sample form data to webhook endpoint to verify integration is working. Creates both Contact and Opportunity in GoHighLevel when enabled.
        </div>
      </CardContent>
    </Card>
  )
}