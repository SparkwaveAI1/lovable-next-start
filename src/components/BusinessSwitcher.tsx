import { useState } from "react"
import { Check, ChevronsUpDown, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useBusinesses } from "@/hooks/useBusinesses"

interface BusinessSwitcherProps {
  selectedBusinessId?: string
  onBusinessChange?: (businessId: string) => void
}

export function BusinessSwitcher({ selectedBusinessId, onBusinessChange }: BusinessSwitcherProps) {
  const [open, setOpen] = useState(false)
  const { data: businesses = [], isLoading: loading } = useBusinesses()
  
  const selectedBusiness = businesses.find(business => business.id === selectedBusinessId)

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
            <Building2 className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {loading 
                ? "Loading..." 
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
            <CommandGroup>
              {businesses.map((business) => (
                <CommandItem
                  key={business.id}
                  value={business.name}
                  onSelect={() => {
                    onBusinessChange?.(business.id)
                    setOpen(false)
                  }}
                  className="flex items-center gap-2 hover:bg-accent cursor-pointer"
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