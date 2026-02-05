import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  FileText,
  Image,
  Headphones,
  Mail,
  Shield,
  CalendarDays,
  Rocket,
  Bot,
  Plus,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  BookOpen,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import sparkwaveIcon from "@/assets/sparkwave-icon.png"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Mission Control", href: "/mission-control", icon: Rocket },
  { label: "Reports", href: "/reports", icon: ClipboardList },
  { label: "Investments", href: "/investments", icon: TrendingUp },
  { label: "Docs", href: "/docs", icon: BookOpen },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Content Center", href: "/content-center", icon: FileText },
  { label: "Media Library", href: "/media-library", icon: Image },
  { label: "Email", href: "/email-marketing", icon: Mail },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Service Requests", href: "/service-requests", icon: Headphones },
]

const adminNavItems: NavItem[] = [
  { label: "Admin", href: "/admin", icon: Shield, adminOnly: true },
]

interface SidebarProps {
  isSuperAdmin: boolean
  collapsed?: boolean
  onToggleCollapse?: () => void
  businessName?: string
}

export function Sidebar({ isSuperAdmin, collapsed = false, onToggleCollapse, businessName }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const isActiveRoute = (href: string) => {
    if (href === "/") {
      return location.pathname === "/"
    }
    return location.pathname === href || location.pathname.startsWith(href + "/")
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-indigo-950 transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo / Branding Area */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-indigo-800/50",
        collapsed && "justify-center px-2"
      )}>
        <img 
          src={sparkwaveIcon} 
          alt="Sparkwave" 
          className={cn(
            "transition-all duration-300",
            collapsed ? "h-8 w-8" : "h-10 w-10"
          )} 
        />
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-white font-semibold text-lg leading-tight">
              {businessName || "Sparkwave"}
            </span>
            <span className="text-indigo-300 text-xs">Automation Center</span>
          </div>
        )}
      </div>

      {/* Create New Button */}
      <div className={cn("px-3 pt-4 pb-2", collapsed && "px-2")}>
        <Button
          onClick={() => navigate("/content-center")}
          className={cn(
            "w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors",
            collapsed ? "px-0 justify-center" : "justify-start gap-2"
          )}
          size={collapsed ? "icon" : "default"}
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span>Create New</span>}
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {mainNavItems.map((item) => {
            const isActive = isActiveRoute(item.href)
            const Icon = item.icon

            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-slate-300 hover:text-white hover:bg-white/5",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isActive ? "text-white" : "text-slate-400"
                  )} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Admin Section */}
        {isSuperAdmin && (
          <>
            <div className={cn(
              "mt-6 mb-2 px-3",
              collapsed && "px-0 text-center"
            )}>
              {!collapsed && (
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  Admin
                </span>
              )}
              {collapsed && (
                <div className="w-8 h-px bg-indigo-700 mx-auto" />
              )}
            </div>
            <ul className="space-y-1">
              {adminNavItems.map((item) => {
                const isActive = isActiveRoute(item.href)
                const Icon = item.icon

                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-slate-300 hover:text-white hover:bg-white/5",
                        collapsed && "justify-center px-2"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className={cn(
                        "h-5 w-5 flex-shrink-0",
                        isActive ? "text-white" : "text-slate-400"
                      )} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-indigo-800/50 p-3">
        <button
          onClick={onToggleCollapse}
          className={cn(
            "flex items-center gap-2 px-3 py-2 w-full rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm",
            collapsed && "justify-center px-2"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
