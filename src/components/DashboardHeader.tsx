import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  FileText,
  Image,
  Headphones,
  Mail,
  Shield,
  Bell,
  Settings,
  Menu,
  CalendarDays,
  Rocket,
  Bot,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { BusinessSwitcher } from "./BusinessSwitcher"
import LogoutButton from "./LogoutButton"
import sparkwaveIcon from "@/assets/sparkwave-icon.png"
import { supabase } from "@/integrations/supabase/client"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Content Center", href: "/content-center", icon: FileText },
  { label: "Media Library", href: "/media-library", icon: Image },
  { label: "Service Requests", href: "/service-requests", icon: Headphones },
  { label: "Email", href: "/email-marketing", icon: Mail },
  { label: "Mission Control", href: "/mission-control", icon: Rocket },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Admin", href: "/admin", icon: Shield, adminOnly: true },
]

interface DashboardHeaderProps {
  selectedBusinessId?: string
  onBusinessChange?: (businessId: string) => void
}

export function DashboardHeader({ selectedBusinessId, onBusinessChange }: DashboardHeaderProps) {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        const { data, error } = await supabase.rpc("is_super_admin")
        if (!error && data === true) {
          setIsSuperAdmin(true)
        }
      } catch (error) {
        console.error("Error checking admin status:", error)
      }
    }
    checkSuperAdmin()
  }, [])

  const isActiveRoute = (href: string) => {
    if (href === "/") {
      return location.pathname === "/"
    }
    return location.pathname === href || location.pathname.startsWith(href + "/")
  }

  const visibleNavItems = navItems.filter(item => !item.adminOnly || isSuperAdmin)

  return (
    <header className="sticky top-0 md:fixed md:top-0 md:left-0 md:right-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 min-h-[100px] md:min-h-[72px] w-full">
      <div className="container mx-auto px-4 md:px-6 py-2 md:py-4 max-w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0">
          {/* Left side - Logo */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <img src={sparkwaveIcon} alt="Sparkwave" className="h-10 w-10 md:h-12 md:w-12" />
          </div>

          {/* Center - Business Switcher */}
          <div className="w-full md:flex-1 md:max-w-[280px] lg:max-w-sm md:mx-4 lg:mx-8">
            <BusinessSwitcher
              selectedBusinessId={selectedBusinessId}
              onBusinessChange={onBusinessChange}
            />
          </div>

          {/* Right side - Navigation & Actions */}
          <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-end">
            <nav className="hidden lg:flex items-center gap-1">
              {visibleNavItems.map((item) => {
                const isActive = isActiveRoute(item.href)
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    <Icon className={cn(
                      "h-4 w-4",
                      isActive ? "text-indigo-600" : "text-gray-500"
                    )} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="flex items-center gap-1 md:gap-2">
              {/* Notification Bell with Badge */}
              <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0 hidden lg:inline-flex text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
              </Button>

              {/* Settings Button */}
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hidden lg:inline-flex text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                <Settings className="h-4 w-4" />
              </Button>

              {/* Mobile Navigation Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-2 lg:hidden">
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white z-[60]">
                  {visibleNavItems.map((item) => {
                    const Icon = item.icon
                    const isActive = isActiveRoute(item.href)

                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          to={item.href}
                          className={cn(
                            "w-full flex items-center gap-2",
                            isActive && "bg-indigo-50 text-indigo-700"
                          )}
                        >
                          <Icon className={cn(
                            "h-4 w-4",
                            isActive ? "text-indigo-600" : "text-gray-500"
                          )} />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
