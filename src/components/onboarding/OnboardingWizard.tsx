import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { 
  Sparkles, 
  Building2, 
  Zap, 
  LayoutDashboard,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2
} from 'lucide-react';
import { WelcomeStep } from './steps/WelcomeStep';
import { BusinessInfoStep, BusinessInfo } from './steps/BusinessInfoStep';
import { FirstAutomationStep, AutomationConfig } from './steps/FirstAutomationStep';
import { CompletionStep } from './steps/CompletionStep';

export interface OnboardingData {
  businessInfo: BusinessInfo | null;
  automationConfig: AutomationConfig | null;
}

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Sparkles },
  { id: 'business', title: 'Your Business', icon: Building2 },
  { id: 'automation', title: 'First Automation', icon: Zap },
  { id: 'complete', title: 'Get Started', icon: LayoutDashboard },
];

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    businessInfo: null,
    automationConfig: null,
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthContext();
  
  const progress = ((currentStep + 1) / STEPS.length) * 100;
  
  const handleBusinessInfoSubmit = useCallback((data: BusinessInfo) => {
    setOnboardingData(prev => ({ ...prev, businessInfo: data }));
    setCurrentStep(2);
  }, []);
  
  const handleAutomationSubmit = useCallback((data: AutomationConfig) => {
    setOnboardingData(prev => ({ ...prev, automationConfig: data }));
    setCurrentStep(3);
  }, []);
  
  const handleCompleteOnboarding = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to complete onboarding.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Save onboarding data to the user's profile or a dedicated table
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          business_type: onboardingData.businessInfo?.businessType,
          team_size: onboardingData.businessInfo?.teamSize,
          primary_goals: onboardingData.businessInfo?.primaryGoals,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        });
      
      if (profileError) {
        console.error('Profile update error:', profileError);
        // Continue even if profile update fails - we'll try the automation setup
      }
      
      // If automation was configured, create it
      if (onboardingData.automationConfig) {
        const { error: automationError } = await supabase
          .from('automations')
          .insert({
            user_id: user.id,
            name: onboardingData.automationConfig.name,
            type: onboardingData.automationConfig.type,
            trigger_type: onboardingData.automationConfig.triggerType,
            is_active: true,
            config: {
              description: onboardingData.automationConfig.description,
              createdDuringOnboarding: true,
            },
          });
        
        if (automationError) {
          console.error('Automation creation error:', automationError);
        }
      }
      
      toast({
        title: 'Welcome to Sparkwave! 🎉',
        description: 'Your account is all set up. Let\'s get started!',
      });
      
      // Navigate to dashboard
      navigate('/');
      
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({
        title: 'Setup Complete',
        description: 'Welcome to Sparkwave! Some settings may need to be configured manually.',
      });
      navigate('/');
    } finally {
      setIsSubmitting(false);
    }
  }, [user, onboardingData, navigate, toast]);
  
  const goToNextStep = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);
  
  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);
  
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep onContinue={goToNextStep} />;
      case 1:
        return (
          <BusinessInfoStep 
            onSubmit={handleBusinessInfoSubmit}
            initialData={onboardingData.businessInfo}
          />
        );
      case 2:
        return (
          <FirstAutomationStep 
            onSubmit={handleAutomationSubmit}
            onSkip={() => setCurrentStep(3)}
            businessType={onboardingData.businessInfo?.businessType}
          />
        );
      case 3:
        return (
          <CompletionStep 
            onComplete={handleCompleteOnboarding}
            isSubmitting={isSubmitting}
            businessInfo={onboardingData.businessInfo}
            automationConfig={onboardingData.automationConfig}
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between mb-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div 
                  key={step.id}
                  className={`flex flex-col items-center ${
                    index < STEPS.length - 1 ? 'flex-1' : ''
                  }`}
                >
                  <div 
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                      ${isCompleted 
                        ? 'bg-green-500 text-white' 
                        : isActive 
                          ? 'bg-primary text-white ring-4 ring-primary/20' 
                          : 'bg-gray-200 text-gray-500'
                      }
                    `}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span 
                    className={`
                      mt-2 text-xs font-medium hidden sm:block
                      ${isActive ? 'text-primary' : 'text-gray-500'}
                    `}
                  >
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        {/* Main content card */}
        <Card variant="elevated" className="overflow-hidden">
          <div className="min-h-[400px] flex flex-col">
            {renderStep()}
          </div>
          
          {/* Navigation buttons */}
          {currentStep > 0 && currentStep < 3 && (
            <div className="px-6 pb-6 flex justify-between border-t pt-4">
              <Button 
                variant="outline" 
                onClick={goToPreviousStep}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              
              {currentStep === 2 && (
                <Button 
                  variant="ghost"
                  onClick={() => setCurrentStep(3)}
                >
                  Skip for now
                </Button>
              )}
            </div>
          )}
        </Card>
        
        {/* Help text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Need help? Contact us at{' '}
          <a href="mailto:support@sparkwaveai.app" className="text-primary hover:underline">
            support@sparkwaveai.app
          </a>
        </p>
      </div>
    </div>
  );
}

export default OnboardingWizard;
