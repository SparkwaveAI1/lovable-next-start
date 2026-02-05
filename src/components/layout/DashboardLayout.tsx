import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  Bell,
  Settings,
  Menu,
  X,
  MessageCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { BusinessSwitcher } from "@/components/BusinessSwitcher"
import LogoutButton from "@/components/LogoutButton"
import { Sidebar } from "@/components/Sidebar"
import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import sparkwaveIcon from "@/assets/sparkwave-icon.png"
import { supabase } from "@/integrations/supabase/client"
import { RicoChatModal } from "@/components/mission-control"

interface DashboardLayoutProps {
  children: React.ReactNode
  selectedBusinessId?: string
  onBusinessChange?: (businessId: string) => void
  businessName?: string
  showAllOption?: boolean
  /** Hide breadcrumbs on specific pages */
  hideBreadcrumbs?: boolean
}

export function DashboardLayout({ 
  children, 
  selectedBusinessId, 
  onBusinessChange,
  businessName,
  showAllOption = false,
  hideBreadcrumbs = false
}: DashboardLayoutProps) {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [chatModalOpen, setChatModalOpen] = useState(false)
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

  // Persist sidebar collapsed state
  useEffect(() => {
    const saved = localStorage.getItem("sparkwave-sidebar-collapsed")
    if (saved) {
      setSidebarCollapsed(JSON.parse(saved))
    }
  }, [])

  const handleToggleCollapse = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem("sparkwave-sidebar-collapsed", JSON.stringify(newState))
  }

  return (
    <div className="min-h-screen bg-[hsl(220,20%,97%)]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          isSuperAdmin={isSuperAdmin}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
          businessName={businessName}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent 
          side="left" 
          className="p-0 w-72 bg-indigo-950 border-indigo-800"
        >
          <div className="relative h-full">
            {/* Close button for mobile */}
            <SheetClose className="absolute right-3 top-5 z-50">
              <X className="h-5 w-5 text-slate-400 hover:text-white transition-colors" />
            </SheetClose>
            <Sidebar
              isSuperAdmin={isSuperAdmin}
              collapsed={false}
              businessName={businessName}
            />
          </div>
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
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Link to="/" className="lg:hidden flex items-center gap-2">
                <img 
                  src={sparkwaveIcon} 
                  alt="Sparkwave" 
                  className="h-8 w-8" 
                />
                <span className="font-semibold text-gray-900 hidden sm:inline">
                  Sparkwave
                </span>
              </Link>
            </div>

            {/* Center - Business Switcher */}
            <div className="flex-1 max-w-xs mx-4 hidden sm:block">
              <BusinessSwitcher
                selectedBusinessId={selectedBusinessId}
                onBusinessChange={onBusinessChange}
                showAllOption={showAllOption}
              />
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
              </Button>

              <Button 
                variant="ghost" 
                size="icon"
                className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 hidden sm:flex"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </Button>

              <LogoutButton />
            </div>
          </div>

          {/* Mobile Business Switcher - below header on small screens */}
          <div className="sm:hidden px-4 pb-3 border-t border-gray-100 pt-3 bg-white">
            <BusinessSwitcher
              selectedBusinessId={selectedBusinessId}
              onBusinessChange={onBusinessChange}
              showAllOption={showAllOption}
            />
          </div>
        </header>

        {/* Breadcrumbs - show below header for deep navigation */}
        {!hideBreadcrumbs && (
          <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-2">
            <Breadcrumbs />
          </div>
        )}

        {/* Page Content */}
        <main>
          {children}
        </main>
      </div>

      {/* Rico Chat Floating Bubble - appears on all pages */}
      <button
        onClick={() => setChatModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center z-50"
        title="Chat with Rico"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Rico Chat Modal */}
      <RicoChatModal 
        isOpen={chatModalOpen} 
        onClose={() => setChatModalOpen(false)} 
      />
    </div>
  )
}
