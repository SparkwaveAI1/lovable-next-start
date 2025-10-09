import { Zap, Settings, Bell, Image as ImageIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { BusinessSwitcher } from "./BusinessSwitcher"
import LogoutButton from "./LogoutButton"

interface DashboardHeaderProps {
  selectedBusinessId?: string
  onBusinessChange?: (businessId: string) => void
}

export function DashboardHeader({ selectedBusinessId, onBusinessChange }: DashboardHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">
                Sparkwave Automation Center
              </h1>
            </div>
          </div>

          {/* Center - Business Switcher */}
          <div className="flex-1 max-w-sm mx-8">
            <BusinessSwitcher 
              selectedBusinessId={selectedBusinessId}
              onBusinessChange={onBusinessChange}
            />
          </div>

          {/* Right side - Navigation & Actions */}
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-4">
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
            </nav>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}