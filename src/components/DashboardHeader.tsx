import { useState, useEffect } from "react"
import { Settings, Bell, Menu, Shield, Mail, Users } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { BusinessSwitcher } from "./BusinessSwitcher"
import LogoutButton from "./LogoutButton"
import sparkwaveIcon from "@/assets/sparkwave-icon.png"
import { supabase } from "@/integrations/supabase/client"

interface DashboardHeaderProps {
  selectedBusinessId?: string
  onBusinessChange?: (businessId: string) => void
}

export function DashboardHeader({ selectedBusinessId, onBusinessChange }: DashboardHeaderProps) {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

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
  return (
    <header className="sticky top-0 md:fixed md:top-0 md:left-0 md:right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 min-h-[100px] md:min-h-[72px] w-full">
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
          <nav className="hidden lg:flex items-center gap-2 md:gap-4">
              <Link
                to="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/contacts"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Users className="h-3 w-3" />
                Contacts
              </Link>
              <Link
                to="/content-center"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Content Center
              </Link>
              <Link
                to="/media-library"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Media Library
              </Link>
              <Link
                to="/service-requests"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Service Requests
              </Link>
              <Link
                to="/email-marketing"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Mail className="h-3 w-3" />
                Email
              </Link>
              {isSuperAdmin && (
                <Link
                  to="/admin"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Shield className="h-3 w-3" />
                  Admin
                </Link>
              )}
            </nav>
            <div className="flex items-center gap-1 md:gap-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hidden lg:inline-flex">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hidden lg:inline-flex">
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
                <DropdownMenuContent align="end" className="w-48 bg-popover z-[60]">
                  <DropdownMenuItem asChild>
                    <Link to="/" className="w-full">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/contacts" className="w-full flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      Contacts
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/content-center" className="w-full">Content Center</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/media-library" className="w-full">Media Library</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/service-requests" className="w-full">Service Requests</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/email-marketing" className="w-full flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      Email Marketing
                    </Link>
                  </DropdownMenuItem>
                  {isSuperAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="w-full flex items-center gap-2">
                        <Shield className="h-3 w-3" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
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