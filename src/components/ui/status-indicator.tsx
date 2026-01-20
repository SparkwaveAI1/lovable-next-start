import * as React from "react"
import { cn } from "@/lib/utils"

interface StatusIndicatorProps {
  status: "healthy" | "warning" | "error" | "offline"
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

const StatusIndicator = React.forwardRef<HTMLDivElement, StatusIndicatorProps>(
  ({ status, size = "md", showLabel = true, className }, ref) => {
    const statusConfig = {
      healthy: {
        color: "bg-emerald-500",
        pulseColor: "bg-emerald-400",
        label: "Healthy",
        textColor: "text-emerald-600",
      },
      warning: {
        color: "bg-amber-500",
        pulseColor: "bg-amber-400",
        label: "Warning",
        textColor: "text-amber-600",
      },
      error: {
        color: "bg-red-500",
        pulseColor: "bg-red-400",
        label: "Error",
        textColor: "text-red-600",
      },
      offline: {
        color: "bg-gray-400",
        pulseColor: "bg-gray-300",
        label: "Offline",
        textColor: "text-gray-600",
      },
    }

    const sizeConfig = {
      sm: { dot: "h-2 w-2", pulse: "h-2 w-2", text: "text-xs" },
      md: { dot: "h-3 w-3", pulse: "h-3 w-3", text: "text-sm" },
      lg: { dot: "h-4 w-4", pulse: "h-4 w-4", text: "text-base" },
    }

    const config = statusConfig[status]
    const sizes = sizeConfig[size]

    return (
      <div ref={ref} className={cn("flex items-center gap-2", className)}>
        <span className="relative flex">
          {(status === "healthy" || status === "error") && (
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                config.pulseColor
              )}
            />
          )}
          <span
            className={cn(
              "relative inline-flex rounded-full",
              sizes.dot,
              config.color
            )}
          />
        </span>
        {showLabel && (
          <span className={cn("font-medium", sizes.text, config.textColor)}>
            {config.label}
          </span>
        )}
      </div>
    )
  }
)
StatusIndicator.displayName = "StatusIndicator"

export { StatusIndicator }
