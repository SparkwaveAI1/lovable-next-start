import { useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { PageHeader, PageContent } from "@/components/layout/PageLayout"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useQuery, useQueryClient } from "@tanstack/react-query"

// Import components
import { HealthSummary } from "@/components/system-ops/HealthSummary"
import { PipelineView } from "@/components/system-ops/PipelineView"
import { CronRegistry } from "@/components/system-ops/CronRegistry"
import { FileRegistry } from "@/components/system-ops/FileRegistry"

interface SystemStatus {
  registry_id: string
  name: string
  category: string
  type: string
  pipeline: string | null
  schedule: string | null
  status: 'success' | 'failed' | 'stale' | 'unknown'
  last_run: string | null
  next_run: string | null
  error_message: string | null
  runtime_seconds: number | null
  status_checked_at: string | null
}

const SystemOperations = () => {
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch system status data
  const { data: systemStatus = [], isLoading, error } = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      console.log('Fetching system status...')
      
      const { data, error } = await supabase
        .from('system_latest_status')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching system status:', error)
        throw error
      }

      console.log('System status data:', data)
      return data as SystemStatus[]
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const handleManualRefresh = async () => {
    setRefreshing(true)
    
    try {
      console.log('Triggering manual status refresh...')
      
      // Call the system-ops-status edge function
      const { data, error } = await supabase.functions.invoke('system-ops-status', {
        method: 'POST'
      })

      if (error) {
        throw error
      }

      console.log('Status refresh result:', data)
      
      // Refresh the query to get new data
      await queryClient.invalidateQueries({ queryKey: ['system-status'] })
      
      toast({
        title: "Status Updated",
        description: data.message || "System status has been refreshed successfully",
      })
    } catch (error) {
      console.error('Error refreshing status:', error)
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh system status",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  // Calculate summary stats
  const summary = {
    total: systemStatus.length,
    success: systemStatus.filter(s => s.status === 'success').length,
    failed: systemStatus.filter(s => s.status === 'failed').length,
    stale: systemStatus.filter(s => s.status === 'stale').length,
    unknown: systemStatus.filter(s => s.status === 'unknown').length,
    lastSync: systemStatus.find(s => s.status_checked_at)?.status_checked_at
  }

  // Group data for different views
  const cronItems = systemStatus.filter(s => s.type === 'cron')
  const edgeFunctions = systemStatus.filter(s => s.type === 'edge_function')
  const scripts = systemStatus.filter(s => s.type === 'script')

  if (error) {
    return (
      <DashboardLayout>
        <PageContent>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Failed to Load System Status
              </h3>
              <p className="text-gray-600 mb-4">
                {error.message || "There was an error loading the system operations dashboard"}
              </p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </div>
        </PageContent>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <PageHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Operations</h1>
            <p className="text-gray-600 mt-1">
              Monitor all pipelines, crons, and automated processes
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {summary.lastSync && (
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                Last sync: {new Date(summary.lastSync).toLocaleString()}
              </div>
            )}
            
            <Button
              onClick={handleManualRefresh}
              disabled={refreshing || isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        {isLoading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <RefreshCw className="mx-auto h-8 w-8 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-600">Loading system status...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Health Summary */}
            <HealthSummary summary={summary} />

            {/* Pipeline Visualizations */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Pipeline Status</h2>
              <PipelineView systemStatus={systemStatus} />
            </div>

            {/* Cron Registry */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Cron Jobs ({cronItems.length})
              </h2>
              <CronRegistry cronItems={cronItems} />
            </div>

            {/* File Registry */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Scripts & Functions ({scripts.length + edgeFunctions.length})
              </h2>
              <FileRegistry 
                scripts={scripts} 
                edgeFunctions={edgeFunctions} 
              />
            </div>
          </div>
        )}
      </PageContent>
    </DashboardLayout>
  )
}

export default SystemOperations