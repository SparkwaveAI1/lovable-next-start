import { Link, useLocation } from "react-router-dom"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
}

// Route to breadcrumb mapping
const routeLabels: Record<string, string> = {
  "/": "Dashboard",
  "/mission-control": "Mission Control",
  "/contacts": "Contacts",
  "/bookings": "Bookings",
  "/service-requests": "Service Requests",
  "/content-center": "Content Center",
  "/media-library": "Media Library",
  "/email-marketing": "Email Marketing",
  "/agents": "Agents",
  "/reports": "Reports",
  "/docs": "Documentation",
  "/investments": "Investments",
  "/admin": "Admin",
  "/admin-setup": "Admin Setup",
  "/permissions": "Permissions",
  "/late-setup": "Setup",
  "/late-connections": "Connections",
}

// Parent routes for hierarchy
const routeParents: Record<string, string> = {
  "/agents": "/mission-control",
  "/reports": "/mission-control",
  "/media-library": "/content-center",
  "/admin-setup": "/admin",
  "/permissions": "/admin",
  "/late-connections": "/late-setup",
}

export function Breadcrumbs({ className }: { className?: string }) {
  const location = useLocation()
  const pathname = location.pathname

  // Don't show breadcrumbs on dashboard
  if (pathname === "/") return null

  const buildBreadcrumbs = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [{ label: "Dashboard", href: "/" }]
    
    // Handle docs sub-routes
    if (pathname.startsWith("/docs")) {
      items.push({ label: "Documentation", href: "/docs" })
      
      const subPath = pathname.replace("/docs", "").replace(/^\//, "")
      if (subPath) {
        const parts = subPath.split("/").filter(Boolean)
        let currentPath = "/docs"
        
        parts.forEach((part, index) => {
          currentPath += `/${part}`
          const isLast = index === parts.length - 1
          items.push({
            label: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " "),
            href: isLast ? undefined : currentPath
          })
        })
      }
      
      return items
    }

    // Check for parent route
    const parent = routeParents[pathname]
    if (parent && routeLabels[parent]) {
      items.push({ label: routeLabels[parent], href: parent })
    }

    // Add current route
    const label = routeLabels[pathname]
    if (label) {
      items.push({ label })
    } else {
      // Handle unknown routes gracefully
      const pathParts = pathname.split("/").filter(Boolean)
      if (pathParts.length > 0) {
        items.push({ 
          label: pathParts[pathParts.length - 1]
            .split("-")
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
        })
      }
    }

    return items
  }

  const breadcrumbs = buildBreadcrumbs()

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center text-sm text-gray-500", className)}
    >
      <ol className="flex items-center space-x-1">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1
          
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 mx-1 text-gray-400" />
              )}
              
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className="hover:text-indigo-600 transition-colors flex items-center gap-1"
                >
                  {index === 0 && <Home className="h-3.5 w-3.5" />}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span className={cn(
                  "flex items-center gap-1",
                  isLast && "text-gray-900 font-medium"
                )}>
                  {index === 0 && <Home className="h-3.5 w-3.5" />}
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
