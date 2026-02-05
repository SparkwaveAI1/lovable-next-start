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
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { BusinessSwitcher } from "@/components/BusinessSwitcher"
import LogoutButton from "@/components/LogoutButton"
import { Sidebar } from "@/components/Sidebar"
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
  { label: "Service Requests", href: "/service-requests", icon: Headphones },
  { label: "Content Center", href: "/content-center", icon: FileText },
  { label: "Media Library", href: "/media-library", icon: Image },
  { label: "Email", href: "/email-marketing", icon: Mail },
  { label: "Mission Control", href: "/mission-control", icon: Rocket },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Admin", href: "/admin", icon: Shield, adminOnly: true },
]

interface DashboardLayoutProps {
  children: React.ReactNode
  selectedBusinessId?: string
  onBusinessChange?: (businessId: string) => void
  businessName?: string
  showAllOption?: boolean
}

export function DashboardLayout({ 
  children, 
  selectedBusinessId, 
  onBusinessChange,
  businessName,
  showAllOption = false
}: DashboardLayoutProps) {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const isActiveRoute = (href: string) => {
    if (href === "/") {
      return location.pathname === "/"
    }
    return location.pathname === href || location.pathname.startsWith(href + "/")
  }

  const visibleNavItems = navItems.filter(item => !item.adminOnly || isSuperAdmin)

  return (
    <div className="min-h-screen bg-[hsl(220,20%,97%)]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          isSuperAdmin={isSuperAdmin}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          businessName={businessName}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-indigo-950 border-indigo-800">
          <Sidebar
            isSuperAdmin={isSuperAdmin}
            collapsed={false}
            businessName={businessName}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}
      >
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="flex items-center justify-between h-16 px-4 md:px-6">
            {/* Left - Mobile Menu + Logo (mobile only) */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <img 
                src={sparkwaveIcon} 
                alt="Sparkwave" 
                className="h-8 w-8 lg:hidden" 
              />
            </div>

            {/* Center - Business Switcher */}
            <div className="flex-1 max-w-xs mx-4">
              <BusinessSwitcher
                selectedBusinessId={selectedBusinessId}
                onBusinessChange={onBusinessChange}
                showAllOption={showAllOption}
              />
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
              </Button>

              <Button 
                variant="ghost" 
                size="icon"
                className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              >
                <Settings className="h-5 w-5" />
              </Button>

              <LogoutButton />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  )
}
