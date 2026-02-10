import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ClipboardList,
  ClipboardCheck,
  BookOpen,
  TrendingUp,
  MessageSquare,
  Twitter,
  HelpCircle,
  Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"
import sparkwaveIcon from "@/assets/sparkwave-icon.png"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
  collapsible?: boolean
}

// Organized navigation with clear hierarchy
const navGroups: NavGroup[] = [
  {
    label: "Core",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Mission Control", href: "/mission-control", icon: Rocket },
    ],
  },
  {
    label: "AI & Automation",
    items: [
      { label: "Agents", href: "/agents", icon: Bot },
      { label: "Reports", href: "/reports", icon: ClipboardList },
      { label: "Twitter Analytics", href: "/twitter-analytics", icon: Twitter },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Contacts", href: "/contacts", icon: Users },
      { label: "Communications", href: "/communications", icon: MessageSquare },
      { label: "Bookings", href: "/bookings", icon: CalendarDays },
      { label: "Service Requests", href: "/service-requests", icon: Headphones },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Content Center", href: "/content-center", icon: FileText },
      { label: "Content Review", href: "/content-review", icon: ClipboardCheck },
      { label: "Content Visibility", href: "/content-visibility", icon: Eye },
      { label: "Media Library", href: "/media-library", icon: Image },
    ],
  },
  {
    label: "Reference",
    collapsible: true,
    items: [
      { label: "Docs", href: "/docs", icon: BookOpen },
      { label: "FAQ", href: "/faq", icon: HelpCircle },
      { label: "Investments", href: "/investments", icon: TrendingUp },
    ],
  },
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
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    Reference: true, // Reference section collapsed by default
  })

  const isActiveRoute = (href: string) => {
    if (href === "/") {
      return location.pathname === "/"
    }
    return location.pathname === href || location.pathname.startsWith(href + "/")
  }

  const toggleGroup = (groupLabel: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }))
  }

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => isActiveRoute(item.href))
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

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-indigo-800 scrollbar-track-transparent">
        {navGroups.map((group) => {
          const isCollapsed = group.collapsible && collapsedGroups[group.label]
          const groupActive = isGroupActive(group)
          
          return (
            <div key={group.label} className="mb-4">
              {/* Group Label */}
              {!collapsed && (
                <div 
                  className={cn(
                    "flex items-center justify-between mb-2 px-3",
                    group.collapsible && "cursor-pointer hover:text-indigo-200"
                  )}
                  onClick={() => group.collapsible && toggleGroup(group.label)}
                >
                  <span className={cn(
                    "text-xs font-semibold uppercase tracking-wider",
                    groupActive ? "text-indigo-300" : "text-indigo-500"
                  )}>
                    {group.label}
                  </span>
                  {group.collapsible && (
                    <ChevronDown className={cn(
                      "h-3 w-3 text-indigo-500 transition-transform",
                      isCollapsed && "-rotate-90"
                    )} />
                  )}
                </div>
              )}
              
              {collapsed && (
                <div className="w-8 h-px bg-indigo-800 mx-auto mb-2" />
              )}

              {/* Group Items */}
              {(!isCollapsed || collapsed) && (
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = isActiveRoute(item.href)
                    const Icon = item.icon

                    return (
                      <li key={item.href}>
                        <Link
                          to={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                            isActive
                              ? "bg-white/10 text-white shadow-sm"
                              : "text-slate-300 hover:text-white hover:bg-white/5",
                            collapsed && "justify-center px-2"
                          )}
                          title={collapsed ? item.label : undefined}
                        >
                          <Icon className={cn(
                            "h-5 w-5 flex-shrink-0 transition-colors",
                            isActive ? "text-indigo-300" : "text-slate-400"
                          )} />
                          {!collapsed && <span>{item.label}</span>}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}

        {/* Admin Section */}
        {isSuperAdmin && (
          <div className="mt-2 pt-4 border-t border-indigo-800/50">
            {!collapsed && (
              <div className="mb-2 px-3">
                <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">
                  Admin
                </span>
              </div>
            )}
            {collapsed && (
              <div className="w-8 h-px bg-indigo-700 mx-auto mb-2" />
            )}
            <ul className="space-y-0.5">
              {adminNavItems.map((item) => {
                const isActive = isActiveRoute(item.href)
                const Icon = item.icon

                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-slate-300 hover:text-white hover:bg-white/5",
                        collapsed && "justify-center px-2"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className={cn(
                        "h-5 w-5 flex-shrink-0",
                        isActive ? "text-indigo-300" : "text-slate-400"
                      )} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* Collapse Toggle */}
      {onToggleCollapse && (
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
      )}
    </aside>
  )
}
