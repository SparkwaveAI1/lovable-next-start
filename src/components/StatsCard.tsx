import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: "default" | "warning" | "error" | "success"
  className?: string
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: StatsCardProps) {
  const variantStyles = {
    default: "",
    warning: "border-l-4 border-l-amber-500",
    error: "border-l-4 border-l-red-500 bg-red-50/30",
    success: "border-l-4 border-l-emerald-500",
  }

  const iconColors = {
    default: "text-indigo-600 bg-indigo-50",
    warning: "text-amber-600 bg-amber-50",
    error: "text-red-600 bg-red-50",
    success: "text-emerald-600 bg-emerald-50",
  }

  return (
    <Card
      variant="elevated"
      className={cn(variantStyles[variant], className)}
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              {trend && (
                <span
                  className={cn(
                    "text-sm font-medium",
                    trend.isPositive ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {trend.isPositive ? "+" : ""}{trend.value}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div className={cn(
              "p-3 rounded-xl",
              iconColors[variant]
            )}>
              <Icon className="h-6 w-6" />
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
