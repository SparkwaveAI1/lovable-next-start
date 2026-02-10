import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  CheckCircle, 
  LayoutDashboard, 
  Building2, 
  Zap,
  Rocket,
  Loader2,
  PartyPopper
} from 'lucide-react';
import { BusinessInfo } from './BusinessInfoStep';
import { AutomationConfig } from './FirstAutomationStep';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface CompletionStepProps {
  onComplete: () => void;
  isSubmitting: boolean;
  businessInfo: BusinessInfo | null;
  automationConfig: AutomationConfig | null;
}

export function CompletionStep({ 
  onComplete, 
  isSubmitting, 
  businessInfo, 
  automationConfig 
}: CompletionStepProps) {
  
  // Trigger confetti on mount
  useEffect(() => {
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#3b82f6', '#8b5cf6', '#10b981']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#3b82f6', '#8b5cf6', '#10b981']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    // Small delay to ensure component is mounted
    const timer = setTimeout(() => {
      frame();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  const summaryItems = [
    {
      icon: Building2,
      label: 'Business',
      value: businessInfo?.businessType 
        ? businessInfo.businessType.charAt(0).toUpperCase() + businessInfo.businessType.slice(1).replace('_', ' ')
        : 'Not specified',
    },
    {
      icon: Zap,
      label: 'First Automation',
      value: automationConfig?.name || 'None (you can add one later)',
    },
  ];
  
  return (
    <>
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <div className="absolute -top-2 -right-2">
              <PartyPopper className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">You're all set!</CardTitle>
        <CardDescription className="text-base mt-2">
          Your Sparkwave account is ready to go
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1">
          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Setup Summary</h3>
            <div className="space-y-3">
              {summaryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                      <Icon className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">{item.label}</div>
                      <div className="text-sm font-medium text-gray-900">{item.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* What's next */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">What's next?</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Explore your personalized dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Import your contacts or connect integrations</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Create more automations to save time</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Check out our documentation and tutorials</span>
              </li>
            </ul>
          </div>
        </div>
        
        <Button 
          onClick={onComplete}
          disabled={isSubmitting}
          size="lg"
          className="w-full gap-2 text-base mt-6"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              <Rocket className="h-5 w-5" />
              Go to Dashboard
            </>
          )}
        </Button>
      </CardContent>
    </>
  );
}
