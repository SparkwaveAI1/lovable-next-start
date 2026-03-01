import { CheckCircle, XCircle, Clock, HelpCircle, ArrowRight, ArrowDown } from "lucide-react"

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

interface PipelineViewProps {
  systemStatus: SystemStatus[]
}

interface PipelineStep {
  name: string
  displayName: string
  triggerType: string
  schedule?: string
}

const pipelines = {
  'Fight Flow': [
    { name: 'Form Capture', displayName: 'Form Capture', triggerType: 'cron', schedule: '10 min' },
    { name: 'Immediate Response', displayName: 'Immediate Response', triggerType: 'cron', schedule: '15 min' },
    { name: 'Bookings Sync', displayName: 'Bookings Sync', triggerType: 'cron', schedule: '15 min' },
    { name: 'Appointment Trigger', displayName: 'Appointment Trigger', triggerType: 'cron', schedule: '15 min' },
    { name: 'Sequence Manager', displayName: 'Sequence Manager', triggerType: 'cron', schedule: '30 min' },
    { name: 'SMS Webhook', displayName: 'SMS Webhook', triggerType: 'webhook', schedule: 'realtime' },
    { name: 'AI Response', displayName: 'AI Response', triggerType: 'edge', schedule: 'on-demand' },
    { name: 'SMS Response Alert', displayName: 'Alert Scott', triggerType: 'cron', schedule: '15 min' }
  ],
  'Twitter': [
    { name: 'Daily Context Update', displayName: 'Daily Context', triggerType: 'cron', schedule: '7 AM ET' },
    { name: 'Integrated Workflow', displayName: 'Integrated Workflow', triggerType: 'cron', schedule: '4x/day' },
    { name: 'Quality Gate', displayName: 'Quality Gate', triggerType: 'function', schedule: 'inline' },
    { name: 'Post', displayName: 'Post', triggerType: 'function', schedule: 'inline' },
    { name: 'Comments/Engage', displayName: 'Comments + Engage', triggerType: 'function', schedule: 'inline' }
  ],
  'Health': [
    { name: 'Morning Health Check', displayName: 'Morning Check', triggerType: 'cron', schedule: '8 AM ET' },
    { name: 'Twitter Metrics', displayName: 'Metrics Collection', triggerType: 'cron', schedule: '11 PM ET' },
    { name: 'Evaluation Loop', displayName: 'Eval Loop', triggerType: 'cron', schedule: '11:08 PM ET' },
    { name: 'Nightly Report', displayName: 'Nightly Report', triggerType: 'cron', schedule: '11:06 PM ET' }
  ]
}

export function PipelineView({ systemStatus }: PipelineViewProps) {
  const getStepStatus = (stepName: string, pipeline: string) => {
    // Find the system status for this step
    const status = systemStatus.find(s => 
      s.name.includes(stepName) && s.pipeline === pipeline
    )
    return status?.status || 'unknown'
  }

  const getStepDetails = (stepName: string, pipeline: string) => {
    const status = systemStatus.find(s => 
      s.name.includes(stepName) && s.pipeline === pipeline
    )
    return status
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'stale':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <HelpCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'failed':
        return 'bg-red-50 border-red-200'
      case 'stale':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const formatLastRun = (lastRun: string | null | undefined) => {
    if (!lastRun) return 'Never'
    const date = new Date(lastRun)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m ago`
    } else {
      return `${diffMins}m ago`
    }
  }

  return (
    <div className="space-y-8">
      {Object.entries(pipelines).map(([pipelineName, steps]) => (
        <div key={pipelineName} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
            {pipelineName} Pipeline
          </h3>
          
          <div className="grid gap-4">
            {/* Desktop: Horizontal flow */}
            <div className="hidden md:block">
              <div className="flex items-center gap-2 overflow-x-auto pb-4">
                {steps.map((step, index) => {
                  const status = getStepStatus(step.name, pipelineName)
                  const details = getStepDetails(step.name, pipelineName)
                  
                  return (
                    <div key={step.name} className="flex items-center">
                      <div 
                        className={`${getStatusBg(status)} border rounded-lg p-3 min-w-[140px] text-center transition-all hover:shadow-md`}
                        title={`${step.displayName}\nStatus: ${status}\nLast run: ${formatLastRun(details?.last_run)}\nTrigger: ${step.triggerType}\nSchedule: ${step.schedule || 'N/A'}`}
                      >
                        <div className="flex items-center justify-center mb-1">
                          {getStatusIcon(status)}
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {step.displayName}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {step.schedule}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatLastRun(details?.last_run)}
                        </div>
                      </div>
                      
                      {index < steps.length - 1 && (
                        <ArrowRight className="h-5 w-5 text-gray-400 mx-2 flex-shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Mobile: Vertical flow */}
            <div className="md:hidden space-y-2">
              {steps.map((step, index) => {
                const status = getStepStatus(step.name, pipelineName)
                const details = getStepDetails(step.name, pipelineName)
                
                return (
                  <div key={step.name} className="space-y-2">
                    <div className={`${getStatusBg(status)} border rounded-lg p-3`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {getStatusIcon(status)}
                          <span className="ml-2 font-medium text-gray-900">{step.displayName}</span>
                        </div>
                        <span className="text-xs text-gray-600">{step.schedule}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Last run: {formatLastRun(details?.last_run)}
                      </div>
                      {details?.error_message && (
                        <div className="text-xs text-red-600 mt-1 bg-red-50 p-1 rounded">
                          Error: {details.error_message}
                        </div>
                      )}
                    </div>
                    
                    {index < steps.length - 1 && (
                      <div className="flex justify-center">
                        <ArrowDown className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pipeline Summary */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Pipeline Health:</span>
              <div className="flex items-center gap-4">
                {['success', 'stale', 'failed', 'unknown'].map(statusType => {
                  const count = steps.filter(step => 
                    getStepStatus(step.name, pipelineName) === statusType
                  ).length
                  
                  if (count === 0) return null
                  
                  return (
                    <div key={statusType} className="flex items-center text-xs">
                      {getStatusIcon(statusType)}
                      <span className="ml-1">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}