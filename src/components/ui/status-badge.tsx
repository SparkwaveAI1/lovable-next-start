import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors shadow-sm",
  {
    variants: {
      variant: {
        new: "bg-violet-100 text-violet-800 border border-violet-300",
        qualified: "bg-emerald-100 text-emerald-800 border border-emerald-300",
        success: "bg-emerald-100 text-emerald-800 border border-emerald-300",
        warning: "bg-amber-100 text-amber-800 border border-amber-300",
        error: "bg-red-100 text-red-800 border border-red-300",
        info: "bg-blue-100 text-blue-800 border border-blue-300",
        neutral: "bg-gray-100 text-gray-700 border border-gray-300",
        pending: "bg-orange-100 text-orange-800 border border-orange-300",
        booked: "bg-green-100 text-green-800 border border-green-300",
        needs_human: "bg-red-100 text-red-800 border border-red-300",
        waiting: "bg-yellow-100 text-yellow-800 border border-yellow-300",
      },
      size: {
        sm: "px-2.5 py-0.5 text-xs",
        default: "px-3 py-1.5 text-sm",
        lg: "px-4 py-2 text-base",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "default",
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  showDot?: boolean
  pulse?: boolean
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, variant, size, showDot = false, pulse = false, children, ...props }, ref) => {
    const dotColors = {
      new: "bg-violet-500",
      qualified: "bg-emerald-500",
      success: "bg-emerald-500",
      warning: "bg-amber-500",
      error: "bg-red-500",
      info: "bg-blue-500",
      neutral: "bg-gray-500",
      pending: "bg-orange-500",
      booked: "bg-green-500",
      needs_human: "bg-red-500",
      waiting: "bg-yellow-500",
    }

    return (
      <span
        ref={ref}
        className={cn(statusBadgeVariants({ variant, size }), className)}
        {...props}
      >
        {showDot && (
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              dotColors[variant || "neutral"],
              pulse && "animate-pulse"
            )}
          />
        )}
        {children}
      </span>
    )
  }
)
StatusBadge.displayName = "StatusBadge"

export { StatusBadge, statusBadgeVariants }
