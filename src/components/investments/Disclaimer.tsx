import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvestmentDisclaimerProps {
  variant?: 'default' | 'compact' | 'inline';
  className?: string;
}

export function InvestmentDisclaimer({ 
  variant = 'default',
  className 
}: InvestmentDisclaimerProps) {
  if (variant === 'inline') {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        <Info className="inline h-3 w-3 mr-1" />
        For informational purposes only. Not financial advice.
      </p>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn(
        "flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-2",
        className
      )}>
        <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <p>
          Not financial advice. Do your own research before making investment decisions.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "text-xs text-muted-foreground border-t pt-4 mt-4",
      className
    )}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-yellow-600" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">Disclaimer</p>
          <p>
            The information provided by Sparkwave's Investment Module is for informational 
            purposes only and should not be considered financial advice. Always do your own 
            research and consult with a qualified financial advisor before making investment 
            decisions. Past performance is not indicative of future results.
          </p>
          <p className="text-muted-foreground/80">
            Market data may be delayed up to 15 minutes. Always verify prices with official sources.
          </p>
        </div>
      </div>
    </div>
  );
}

// Shorter disclaimer for form footers
export function FormDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground mt-4", className)}>
      <AlertTriangle className="inline h-3 w-3 mr-1 text-yellow-600" />
      Alerts are for informational purposes only and do not constitute financial advice.
    </p>
  );
}

// Chart modal disclaimer
export function ChartDisclaimer({ className }: { className?: string }) {
  return (
    <div className={cn(
      "text-xs text-muted-foreground border-t pt-3 mt-3 flex items-center gap-2",
      className
    )}>
      <Info className="h-3 w-3 flex-shrink-0" />
      <span>
        Historical data for reference only. Past performance does not guarantee future results.
      </span>
    </div>
  );
}
