import * as React from "react"
import { HelpCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface HelpTooltipProps {
  /** Help text to display in the tooltip */
  text: string
  /** Optional link to documentation */
  docsLink?: string
  /** Optional className for the trigger button */
  className?: string
  /** Size of the help icon */
  size?: "sm" | "default"
}

/**
 * A reusable help tooltip component with a "?" icon.
 * Shows tooltip on hover/click with optional docs link.
 * 
 * @example
 * <HelpTooltip 
 *   text="Agents are AI workers that handle tasks automatically." 
 *   docsLink="/docs/agents" 
 * />
 */
export function HelpTooltip({ 
  text, 
  docsLink, 
  className,
  size = "default" 
}: HelpTooltipProps) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full",
              "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300",
              "focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
              "transition-colors",
              className
            )}
            aria-label="Help"
          >
            <HelpCircle className={iconSize} />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          className="max-w-xs text-sm"
          side="top"
          sideOffset={5}
        >
          <p>{text}</p>
          {docsLink && (
            <a
              href={docsLink}
              className="mt-1 block text-xs text-blue-400 hover:text-blue-300 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more →
            </a>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default HelpTooltip
