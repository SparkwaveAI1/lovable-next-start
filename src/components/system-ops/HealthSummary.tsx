import { CheckCircle, XCircle, Clock, HelpCircle } from "lucide-react"

interface HealthSummaryProps {
  summary: {
    total: number
    success: number
    failed: number
    stale: number
    unknown: number
    lastSync?: string
  }
}

export function HealthSummary({ summary }: HealthSummaryProps) {
  const getOverallStatus = () => {
    if (summary.failed > 0) return 'critical'
    if (summary.stale > 0) return 'warning'
    if (summary.unknown > 0) return 'unknown'
    return 'healthy'
  }

  const status = getOverallStatus()

  const statusConfig = {
    healthy: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      icon: CheckCircle,
      title: 'All Systems Operational',
      description: 'All monitored systems are running normally'
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-800',
      icon: Clock,
      title: 'Some Systems Stale',
      description: 'Some systems have not run recently but no failures detected'
    },
    critical: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: XCircle,
      title: 'System Failures Detected',
      description: 'One or more systems are experiencing failures'
    },
    unknown: {
      bg: 'bg-gray-50 border-gray-200',
      text: 'text-gray-800',
      icon: HelpCircle,
      title: 'Status Unknown',
      description: 'Unable to determine status for some systems'
    }
  }

  const config = statusConfig[status]
  const StatusIcon = config.icon

  return (
    <div className={`${config.bg} ${config.text} border rounded-lg p-6`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <StatusIcon className="h-8 w-8 mr-4" />
          <div>
            <h2 className="text-xl font-semibold">{config.title}</h2>
            <p className="mt-1 opacity-90">{config.description}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold">{summary.total}</div>
          <div className="text-sm opacity-75">Total Processes</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-2xl font-bold text-green-700">{summary.success}</span>
          </div>
          <div className="text-sm font-medium text-green-600">Success</div>
        </div>

        <div className="bg-white/50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <XCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-2xl font-bold text-red-700">{summary.failed}</span>
          </div>
          <div className="text-sm font-medium text-red-600">Failed</div>
        </div>

        <div className="bg-white/50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Clock className="h-5 w-5 text-yellow-600 mr-2" />
            <span className="text-2xl font-bold text-yellow-700">{summary.stale}</span>
          </div>
          <div className="text-sm font-medium text-yellow-600">Stale (&gt;12h)</div>
        </div>

        <div className="bg-white/50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <HelpCircle className="h-5 w-5 text-gray-600 mr-2" />
            <span className="text-2xl font-bold text-gray-700">{summary.unknown}</span>
          </div>
          <div className="text-sm font-medium text-gray-600">Unknown</div>
        </div>
      </div>

      {summary.lastSync && (
        <div className="mt-4 pt-4 border-t border-current/20">
          <p className="text-sm opacity-75">
            Last status check: {new Date(summary.lastSync).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}