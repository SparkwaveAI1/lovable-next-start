import { cn } from "@/lib/utils"

interface PageLayoutProps {
  children: React.ReactNode
  className?: string
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen bg-[hsl(220,20%,97%)]",
      className
    )}>
      {children}
    </div>
  )
}

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 md:mb-8", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{title}</h1>
          {description && (
            <p className="text-sm sm:text-base text-gray-500 mt-1">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

interface PageContentProps {
  children: React.ReactNode
  className?: string
  /** Remove max-width container constraint for full-width layouts */
  fullWidth?: boolean
}

export function PageContent({ children, className, fullWidth = false }: PageContentProps) {
  return (
    <main className={cn(
      "px-3 sm:px-4 md:px-6 py-4 sm:py-6",
      !fullWidth && "max-w-7xl mx-auto",
      className
    )}>
      {children}
    </main>
  )
}
