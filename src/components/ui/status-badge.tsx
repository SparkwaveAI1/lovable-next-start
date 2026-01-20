import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        new: "bg-violet-100 text-violet-700 border border-violet-200",
        qualified: "bg-emerald-100 text-emerald-700 border border-emerald-200",
        success: "bg-emerald-100 text-emerald-700 border border-emerald-200",
        warning: "bg-amber-100 text-amber-700 border border-amber-200",
        error: "bg-red-100 text-red-700 border border-red-200",
        info: "bg-blue-100 text-blue-700 border border-blue-200",
        neutral: "bg-gray-100 text-gray-700 border border-gray-200",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        default: "px-3 py-1 text-xs",
        lg: "px-4 py-1.5 text-sm",
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
