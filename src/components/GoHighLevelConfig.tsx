import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CheckCircle, AlertCircle, Settings, Search } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface GoHighLevelConfigProps {
  businessId?: string
}

interface GHLConfig {
  id?: string
  locationId: string
  pipelineId: string
  stageId: string
}

interface ConnectionTestResult {
  success: boolean
  message: string
  availableLocations?: Array<{ id: string; name: string }>
  pipelineValid?: boolean
  stageValid?: boolean
}

interface Pipeline {
  id: string
  name: string
  stages: Array<{ id: string; name: string }>
}

interface DiscoveryResult {
  success: boolean
  message: string
  pipelines?: Pipeline[]
}

export function GoHighLevelConfig({ businessId }: GoHighLevelConfigProps) {
  const [config, setConfig] = useState<GHLConfig>({
    locationId: '',
    pipelineId: '',
    stageId: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null)
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const { toast } = useToast()

  // Load existing configuration
  useEffect(() => {
    if (businessId) {
      loadConfiguration()
    }
  }, [businessId])

  const loadConfiguration = async () => {
    setIsLoading(true)
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
        setConfig({
          id: data.id,
          locationId: data.location_id,
          pipelineId: data.pipeline_id,
          stageId: data.stage_id
        })
      }
    } catch (error) {
      console.error('Error loading configuration:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const testConnection = async () => {
    if (!config.locationId) {
      toast({
        title: "Missing Location ID",
        description: "Please enter a Location ID before testing the connection.",
        variant: "destructive"
      })
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      const { data, error } = await supabase.functions.invoke('test-ghl-connection', {
        body: {
          locationId: config.locationId,
          pipelineId: config.pipelineId,
          stageId: config.stageId
        }
      })

      if (error) throw error

      setTestResult(data)
      
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: "GoHighLevel API credentials are working correctly.",
        })
      } else {
        toast({
          title: "Connection Failed",
          description: data.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Connection test error:', error)
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      })
      toast({
        title: "Connection Test Failed",
        description: "Unable to test GoHighLevel connection.",
        variant: "destructive"
      })
    } finally {
      setIsTesting(false)
    }
  }

  const discoverPipelinesAndStages = async () => {
    if (!config.locationId) {
      toast({
        title: "Missing Location ID",
        description: "Please enter a Location ID before discovering pipelines.",
        variant: "destructive"
      })
      return
    }

    setIsDiscovering(true)
    setDiscoveryResult(null)

    try {
      const { data, error } = await supabase.functions.invoke('test-ghl-connection', {
        body: {
          locationId: config.locationId,
          discoverMode: true
        }
      })

      if (error) throw error

      setDiscoveryResult(data)
      
      if (data.success && data.pipelines) {
        toast({
          title: "Discovery Successful",
          description: `Found ${data.pipelines.length} pipelines with their stages.`,
        })
      } else {
        toast({
          title: "Discovery Failed",
          description: data.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Discovery error:', error)
      setDiscoveryResult({
        success: false,
        message: error instanceof Error ? error.message : 'Pipeline discovery failed'
      })
      toast({
        title: "Discovery Failed",
        description: "Unable to discover pipelines and stages.",
        variant: "destructive"
      })
    } finally {
      setIsDiscovering(false)
    }
  }

  const selectPipelineAndStage = (pipelineId: string, stageId: string) => {
    const pipeline = discoveryResult?.pipelines?.find(p => p.id === pipelineId)
    if (pipeline) {
      setConfig(prev => ({
        ...prev,
        pipelineId: pipelineId,
        stageId: stageId
      }))
      setSelectedPipeline(pipeline)
      toast({
        title: "Configuration Updated",
        description: `Selected "${pipeline.name}" pipeline and stage.`,
      })
    }
  }

  const saveConfiguration = async () => {
    if (!businessId) {
      toast({
        title: "No Business Selected",
        description: "Please select a business before saving configuration.",
        variant: "destructive"
      })
      return
    }

    if (!config.locationId || !config.pipelineId || !config.stageId) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all configuration fields.",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)

    try {
      const configData = {
        business_id: businessId,
        location_id: config.locationId,
        pipeline_id: config.pipelineId,
        stage_id: config.stageId,
        is_active: true
      }

      let result
      if (config.id) {
        // Update existing configuration
        result = await supabase
          .from('ghl_configurations')
          .update(configData)
          .eq('id', config.id)
      } else {
        // Create new configuration
        result = await supabase
          .from('ghl_configurations')
          .insert(configData)
          .select()
          .single()
      }

      if (result.error) throw result.error

      if (!config.id && result.data) {
        setConfig(prev => ({ ...prev, id: result.data.id }))
      }

      toast({
        title: "Configuration Saved",
        description: "GoHighLevel settings have been saved successfully.",
      })
    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: "Save Failed",
        description: "Unable to save GoHighLevel configuration.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!businessId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            GoHighLevel Configuration
          </CardTitle>
          <CardDescription>
            Select a business above to configure GoHighLevel integration
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          GoHighLevel Configuration
        </CardTitle>
        <CardDescription>
          Configure your GoHighLevel integration for lead processing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading configuration...</span>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="locationId">Location ID</Label>
                <Input
                  id="locationId"
                  placeholder="Enter your GoHighLevel Location ID"
                  value={config.locationId}
                  onChange={(e) => setConfig(prev => ({ ...prev, locationId: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground">
                  Required for all GoHighLevel API calls
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pipelineId">Pipeline ID</Label>
                <Input
                  id="pipelineId"
                  placeholder="Enter Pipeline ID for new leads"
                  value={config.pipelineId}
                  onChange={(e) => setConfig(prev => ({ ...prev, pipelineId: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground">
                  Which sales pipeline should new leads be added to
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stageId">Stage ID</Label>
                <Input
                  id="stageId"
                  placeholder="Enter initial Stage ID (e.g., New Lead)"
                  value={config.stageId}
                  onChange={(e) => setConfig(prev => ({ ...prev, stageId: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground">
                  Initial stage for new leads in the pipeline
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={discoverPipelinesAndStages} 
                variant="outline"
                disabled={isDiscovering || !config.locationId}
              >
                {isDiscovering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Search className="mr-2 h-4 w-4" />
                Discover IDs
              </Button>

              <Button 
                onClick={testConnection} 
                variant="outline"
                disabled={isTesting || !config.locationId}
              >
                {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test GoHighLevel Connection
              </Button>

              <Button 
                onClick={saveConfiguration}
                disabled={isSaving || !config.locationId || !config.pipelineId || !config.stageId}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Configuration
              </Button>
            </div>

            {discoveryResult && discoveryResult.success && discoveryResult.pipelines && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h3 className="font-medium">Available Pipelines & Stages</h3>
                <div className="space-y-3">
                  {discoveryResult.pipelines.map((pipeline) => (
                    <div key={pipeline.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{pipeline.name}</h4>
                        <Badge variant="outline" className="text-xs">{pipeline.id}</Badge>
                      </div>
                      <div className="grid gap-2 pl-4">
                        {pipeline.stages.map((stage) => (
                          <div key={stage.id} className="flex items-center justify-between text-sm">
                            <span>{stage.name}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">{stage.id}</Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => selectPipelineAndStage(pipeline.id, stage.id)}
                                className="h-6 px-2 text-xs"
                              >
                                Select
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {testResult && (
              <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={testResult.success ? "text-green-800" : "text-red-800"}>
                    {testResult.message}
                  </AlertDescription>
                </div>
                
                {testResult.availableLocations && testResult.availableLocations.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-2">Available Locations:</p>
                    <div className="flex flex-wrap gap-2">
                      {testResult.availableLocations.map((location) => (
                        <Badge key={location.id} variant="outline" className="text-xs">
                          {location.name} ({location.id})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {testResult.success && (
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant={testResult.pipelineValid ? "default" : "destructive"}>
                        Pipeline {testResult.pipelineValid ? "Valid" : "Invalid"}
                      </Badge>
                      <Badge variant={testResult.stageValid ? "default" : "destructive"}>
                        Stage {testResult.stageValid ? "Valid" : "Invalid"}
                      </Badge>
                    </div>
                  </div>
                )}
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}