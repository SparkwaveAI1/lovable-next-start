import { Card } from "@/components/ui/card"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { CheckCircle2, XCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface TwitterHealthCardProps {
  businessName: string
  status: "healthy" | "warning" | "error" | "offline"
  testPostResult: "success" | "failed" | "pending"
  lastChecked?: string
  className?: string
}

export function TwitterHealthCard({
  businessName,
  status,
  testPostResult,
  lastChecked,
  className,
}: TwitterHealthCardProps) {
  const testPostConfig = {
    success: {
      icon: CheckCircle2,
      label: "Success",
      color: "text-emerald-600",
    },
    failed: {
      icon: XCircle,
      label: "Failed",
      color: "text-red-600",
    },
    pending: {
      icon: Clock,
      label: "Pending",
      color: "text-amber-600",
    },
  }

  const TestIcon = testPostConfig[testPostResult].icon

  return (
    <Card
      variant={status === "error" ? "error" : "elevated"}
      className={cn("overflow-hidden", className)}
    >
      <div className="p-6">
        {/* Header with Status */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {businessName}
            </h3>
            <p className="text-sm text-gray-500">Twitter OAuth Status</p>
          </div>
          <StatusIndicator
            status={status}
            size="lg"
            showLabel={false}
          />
        </div>

        {/* Status Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status:</span>
            <StatusIndicator status={status} size="sm" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Test Post:</span>
            <div className="flex items-center gap-1.5">
              <TestIcon className={cn("h-4 w-4", testPostConfig[testPostResult].color)} />
              <span className={cn("text-sm font-medium", testPostConfig[testPostResult].color)}>
                {testPostConfig[testPostResult].label}
              </span>
            </div>
          </div>

          {lastChecked && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-400">Last checked:</span>
              <span className="text-xs text-gray-500">{lastChecked}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
