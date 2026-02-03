import { cn } from "@/lib/utils"
import { StatusBadge } from "./status-badge"

// Table wrapper with proper styling
export function TableWrapper({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(
      "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden",
      className
    )}>
      {children}
    </div>
  )
}

// Enhanced table row with comfortable padding
export function TableRow({
  children,
  className,
  isHoverable = true,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  isHoverable?: boolean
  onClick?: () => void
}) {
  return (
    <tr 
      className={cn(
        "border-b border-gray-100 last:border-b-0",
        isHoverable && "hover:bg-gray-50/50 transition-colors",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

// Enhanced table cell with comfortable padding
export function TableCell({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td className={cn(
      "px-6 py-4 text-sm text-gray-700",
      className
    )}>
      {children}
    </td>
  )
}

// Table header cell
export function TableHeaderCell({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th className={cn(
      "px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50",
      className
    )}>
      {children}
    </th>
  )
}

// Contact status badge mapper
export function ContactStatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, "new" | "qualified" | "success" | "warning" | "error" | "neutral"> = {
    "new": "new",
    "new lead": "new",
    "qualified": "qualified",
    "active": "success",
    "inactive": "neutral",
    "churned": "error",
  }

  const variant = statusMap[status.toLowerCase()] || "neutral"

  return (
    <StatusBadge variant={variant}>
      {status}
    </StatusBadge>
  )
}
