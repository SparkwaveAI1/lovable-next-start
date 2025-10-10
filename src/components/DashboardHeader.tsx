import { Zap, Settings, Bell, Menu } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { BusinessSwitcher } from "./BusinessSwitcher"
import LogoutButton from "./LogoutButton"

interface DashboardHeaderProps {
  selectedBusinessId?: string
  onBusinessChange?: (businessId: string) => void
}

export function DashboardHeader({ selectedBusinessId, onBusinessChange }: DashboardHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 min-h-[100px] md:min-h-[72px]">
      <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0">
          {/* Left side - Logo and Title */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-foreground">
                Sparkwave Automation Center
              </h1>
            </div>
          </div>

          {/* Center - Business Switcher */}
          <div className="w-full md:flex-1 md:max-w-sm md:mx-8">
            <BusinessSwitcher 
              selectedBusinessId={selectedBusinessId}
              onBusinessChange={onBusinessChange}
            />
          </div>

          {/* Right side - Navigation & Actions */}
          <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-end">
          <nav className="hidden md:flex items-center gap-2 md:gap-4">
              <Link
                to="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
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
            </nav>
            <div className="flex items-center gap-1 md:gap-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hidden md:inline-flex">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hidden md:inline-flex">
                <Settings className="h-4 w-4" />
              </Button>
              
              {/* Mobile Navigation Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-2 md:hidden">
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-popover z-[60]">
                  <DropdownMenuItem asChild>
                    <Link to="/" className="w-full">Dashboard</Link>
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