import { useState, useRef, useCallback } from "react"
import { Check, ChevronsUpDown, Building2, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useBusinesses } from "@/hooks/useBusinesses"

// Special value for "All Businesses" option
export const ALL_BUSINESSES_ID = "__all__"

interface BusinessSwitcherProps {
  selectedBusinessId?: string
  onBusinessChange?: (businessId: string) => void
  showAllOption?: boolean
}

export function BusinessSwitcher({ selectedBusinessId, onBusinessChange, showAllOption = false }: BusinessSwitcherProps) {
  const [open, setOpen] = useState(false)
  const { data: businesses = [], isLoading: loading } = useBusinesses()
  
  // Track last selection to debounce/dedupe race conditions between onSelect and onPointerDown
  const lastSelectionRef = useRef<{ id: string; time: number } | null>(null)
  
  // Centralized selection handler with debounce
  const handleSelect = useCallback((businessId: string) => {
    const now = Date.now()
    // Ignore if same selection within 100ms (prevents double-firing)
    if (lastSelectionRef.current?.id === businessId && 
        now - lastSelectionRef.current.time < 100) {
      return
    }
    lastSelectionRef.current = { id: businessId, time: now }
    
    onBusinessChange?.(businessId)
    setOpen(false)
  }, [onBusinessChange])
  
  const selectedBusiness = businesses.find(business => business.id === selectedBusinessId)
  const isAllSelected = selectedBusinessId === ALL_BUSINESSES_ID

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full sm:w-[280px] justify-between bg-card shadow-card hover:shadow-card-hover transition-smooth"
          disabled={loading}
        >
          <div className="flex items-center gap-2">
            {isAllSelected ? (
              <Globe className="h-4 w-4 text-violet-500" />
            ) : (
              <Building2 className="h-4 w-4 text-primary" />
            )}
            <span className="font-medium">
              {loading 
                ? "Loading..." 
                : isAllSelected
                  ? "All Businesses"
                  : selectedBusiness 
                    ? selectedBusiness.name 
                    : "Select business..."
              }
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full sm:w-[280px] p-0 bg-popover border-border shadow-card-hover z-[60]">
        <Command>
          <CommandInput placeholder="Search businesses..." />
          <CommandList>
            <CommandEmpty>No business found.</CommandEmpty>
            {showAllOption && (
              <>
                <CommandGroup>
                  <CommandItem
                    value={`${ALL_BUSINESSES_ID}::All Businesses`}
                    onSelect={() => handleSelect(ALL_BUSINESSES_ID)}
                    onPointerDown={(e) => {
                      // iOS Safari fix: handle touch events directly with debounce
                      e.preventDefault()
                      handleSelect(ALL_BUSINESSES_ID)
                    }}
                    className="flex items-center gap-2 hover:bg-accent cursor-pointer touch-manipulation"
                  >
                    <Globe className="h-4 w-4 text-violet-500" />
                    <div className="flex-1">
                      <div className="font-medium">All Businesses</div>
                      <div className="text-xs text-muted-foreground">View everything across all businesses</div>
                    </div>
                    <Check
                      className={cn(
                        "h-4 w-4",
                        isAllSelected ? "opacity-100 text-primary" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandGroup heading={showAllOption ? "Businesses" : undefined}>
              {businesses.map((business) => (
                <CommandItem
                  key={business.id}
                  value={`${business.id}::${business.name}`}
                  onSelect={() => handleSelect(business.id)}
                  onPointerDown={(e) => {
                    // iOS Safari fix: handle touch events directly with debounce
                    e.preventDefault()
                    handleSelect(business.id)
                  }}
                  className="flex items-center gap-2 hover:bg-accent cursor-pointer touch-manipulation"
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{business.name}</div>
                    <div className="text-xs text-muted-foreground">{business.description}</div>
                  </div>
                  <Check
                    className={cn(
                      "h-4 w-4",
                      selectedBusinessId === business.id ? "opacity-100 text-primary" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}