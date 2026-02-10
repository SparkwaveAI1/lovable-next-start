import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Building2,
  Target,
  Rocket,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Mail,
  MessageSquare,
  Calendar,
  BarChart3,
  Users,
  Zap,
  Bot,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ONBOARDING_KEY = 'user_onboarding_complete';
const ONBOARDING_DATA_KEY = 'user_onboarding_data';

export interface OnboardingData {
  businessName: string;
  industry: string;
  companySize: string;
  automationGoals: string[];
  completedAt?: string;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface UserOnboardingWizardProps {
  onComplete: (data: OnboardingData) => void;
  forceShow?: boolean;
}

// Industry options
const INDUSTRIES = [
  { value: 'technology', label: 'Technology / SaaS' },
  { value: 'ecommerce', label: 'E-commerce / Retail' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance / Banking' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'marketing', label: 'Marketing / Agency' },
  { value: 'education', label: 'Education' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'hospitality', label: 'Hospitality / Restaurant' },
  { value: 'professional', label: 'Professional Services' },
  { value: 'other', label: 'Other' },
];

// Company size options
const COMPANY_SIZES = [
  { value: 'solo', label: 'Just me' },
  { value: '2-10', label: '2-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
];

// Automation goals with feature mappings
const AUTOMATION_GOALS = [
  {
    id: 'email',
    label: 'Email Marketing',
    description: 'Automated campaigns & sequences',
    icon: Mail,
    features: ['Email Campaigns', 'Drip Sequences', 'Newsletter Automation'],
  },
  {
    id: 'social',
    label: 'Social Media',
    description: 'Content scheduling & engagement',
    icon: MessageSquare,
    features: ['Post Scheduling', 'Cross-Platform Publishing', 'Analytics'],
  },
  {
    id: 'scheduling',
    label: 'Appointments',
    description: 'Booking & calendar management',
    icon: Calendar,
    features: ['Online Booking', 'Reminders', 'Calendar Sync'],
  },
  {
    id: 'analytics',
    label: 'Analytics & Reports',
    description: 'Data insights & dashboards',
    icon: BarChart3,
    features: ['Custom Dashboards', 'Performance Reports', 'ROI Tracking'],
  },
  {
    id: 'crm',
    label: 'Customer Management',
    description: 'CRM & contact organization',
    icon: Users,
    features: ['Contact Database', 'Lead Scoring', 'Pipeline Management'],
  },
  {
    id: 'workflows',
    label: 'Workflow Automation',
    description: 'Custom automated processes',
    icon: Zap,
    features: ['Trigger-Based Actions', 'Multi-Step Workflows', 'Integrations'],
  },
];

export function useOnboardingState() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [savedData, setSavedData] = useState<OnboardingData | null>(null);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    const data = localStorage.getItem(ONBOARDING_DATA_KEY);
    
    if (data) {
      try {
        setSavedData(JSON.parse(data));
      } catch {
        setSavedData(null);
      }
    }
    
    setShowOnboarding(!completed);
  }, []);

  const completeOnboarding = (data: OnboardingData) => {
    const finalData = { ...data, completedAt: new Date().toISOString() };
    localStorage.setItem(ONBOARDING_KEY, new Date().toISOString());
    localStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(finalData));
    setSavedData(finalData);
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(ONBOARDING_DATA_KEY);
    setSavedData(null);
    setShowOnboarding(true);
  };

  return { showOnboarding, savedData, completeOnboarding, resetOnboarding };
}

function StepIndicator({ 
  currentStep, 
  totalSteps 
}: { 
  currentStep: number; 
  totalSteps: number; 
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            index === currentStep 
              ? "w-8 bg-indigo-600" 
              : index < currentStep 
                ? "w-2 bg-indigo-400" 
                : "w-2 bg-gray-200"
          )}
        />
      ))}
    </div>
  );
}

function GoalCard({
  goal,
  selected,
  onToggle,
}: {
  goal: typeof AUTOMATION_GOALS[0];
  selected: boolean;
  onToggle: () => void;
}) {
  const Icon = goal.icon;
  
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full p-4 rounded-lg border-2 text-left transition-all duration-200",
        selected
          ? "border-indigo-600 bg-indigo-50"
          : "border-gray-200 hover:border-gray-300 bg-white"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
          selected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-medium",
            selected ? "text-indigo-900" : "text-gray-900"
          )}>
            {goal.label}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            {goal.description}
          </p>
        </div>
        <div className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
          selected
            ? "border-indigo-600 bg-indigo-600"
            : "border-gray-300"
        )}>
          {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
        </div>
      </div>
    </button>
  );
}

function FeatureCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{title}</p>
          <p className="text-sm text-gray-600 mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function UserOnboardingWizard({
  onComplete,
  forceShow = false,
}: UserOnboardingWizardProps) {
  const { showOnboarding, completeOnboarding } = useOnboardingState();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  // Check if should show
  const shouldShow = forceShow || (showOnboarding === true);
  
  if (showOnboarding === null || !shouldShow) {
    return null;
  }

  const handleComplete = async () => {
    setIsSubmitting(true);
    
    const data: OnboardingData = {
      businessName: businessName.trim(),
      industry,
      companySize,
      automationGoals: selectedGoals,
    };

    try {
      completeOnboarding(data);
      onComplete(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  // Get recommended features based on selected goals
  const getRecommendedFeatures = () => {
    const selectedGoalData = AUTOMATION_GOALS.filter(g => selectedGoals.includes(g.id));
    const features = selectedGoalData.flatMap(g => g.features);
    return [...new Set(features)].slice(0, 6);
  };

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Sparkwave',
      description: 'Let\'s get you set up for success',
      icon: <Sparkles className="h-12 w-12 text-indigo-600" />,
    },
    {
      id: 'business',
      title: 'Tell Us About Your Business',
      description: 'Help us personalize your experience',
      icon: <Building2 className="h-12 w-12 text-indigo-600" />,
    },
    {
      id: 'goals',
      title: 'What Would You Like to Automate?',
      description: 'Select all that apply',
      icon: <Target className="h-12 w-12 text-indigo-600" />,
    },
    {
      id: 'features',
      title: 'Your Personalized Setup',
      description: 'Based on your goals, here\'s what we recommend',
      icon: <Rocket className="h-12 w-12 text-indigo-600" />,
    },
  ];

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const isBusinessStep = currentStep === 1;
  const isGoalsStep = currentStep === 2;

  // Validation
  const canProceedFromBusiness = businessName.trim() && industry && companySize;
  const canProceedFromGoals = selectedGoals.length > 0;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Welcome
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-200">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-gray-900">
                Welcome to Sparkwave! ✨
              </h3>
              <p className="text-gray-600 max-w-sm mx-auto">
                We're excited to help you automate your business. Let's take a minute to 
                customize your experience.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-2">
                  <Bot className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-gray-700">AI-Powered</p>
                <p className="text-xs text-gray-500 mt-1">Smart automation</p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-2">
                  <Zap className="h-6 w-6 text-purple-600" />
                </div>
                <p className="text-sm font-medium text-gray-700">Fast Setup</p>
                <p className="text-xs text-gray-500 mt-1">Minutes to launch</p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-2">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-700">Results</p>
                <p className="text-xs text-gray-500 mt-1">Proven ROI</p>
              </div>
            </div>
          </div>
        );

      case 1: // Business Info
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Tell Us About Your Business
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                This helps us tailor Sparkwave to your needs
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business-name">Business Name</Label>
                <Input
                  id="business-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g., Acme Corp"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger id="industry">
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind.value} value={ind.value}>
                        {ind.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-size">Company Size</Label>
                <Select value={companySize} onValueChange={setCompanySize}>
                  <SelectTrigger id="company-size">
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 2: // Automation Goals
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Target className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                What Would You Like to Automate?
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Select all areas where you'd like help
              </p>
            </div>

            <div className="grid gap-3 max-h-[320px] overflow-y-auto pr-1">
              {AUTOMATION_GOALS.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  selected={selectedGoals.includes(goal.id)}
                  onToggle={() => toggleGoal(goal.id)}
                />
              ))}
            </div>

            {selectedGoals.length > 0 && (
              <p className="text-center text-sm text-indigo-600 font-medium">
                {selectedGoals.length} area{selectedGoals.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        );

      case 3: // Features & Complete
        const recommendedFeatures = getRecommendedFeatures();
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-200">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                You're All Set, {businessName}! 🎉
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                Based on your goals, here's what we recommend starting with:
              </p>
            </div>

            <div className="grid gap-3">
              {recommendedFeatures.length > 0 ? (
                recommendedFeatures.map((feature, idx) => (
                  <FeatureCard
                    key={idx}
                    title={feature}
                    description="Ready to set up"
                    icon={Zap}
                  />
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>Explore all our features in the dashboard</p>
                </div>
              )}
            </div>

            <div className="bg-indigo-50 rounded-lg p-4 text-center">
              <p className="text-sm text-indigo-800">
                💡 <strong>Pro tip:</strong> Start with one automation and build from there. 
                Our AI assistant can help you set up workflows quickly.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    if (isBusinessStep) return canProceedFromBusiness;
    if (isGoalsStep) return canProceedFromGoals;
    return true;
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{currentStepData.title}</DialogTitle>
          <DialogDescription>{currentStepData.description}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {renderStepContent()}
        </div>

        <div className="pt-2">
          <StepIndicator currentStep={currentStep} totalSteps={steps.length} />
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between mt-4">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={isFirstStep}
            className={isFirstStep ? 'invisible' : ''}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="flex gap-2">
            {!isLastStep && currentStep > 0 && (
              <Button
                variant="ghost"
                onClick={handleComplete}
                className="text-gray-500"
              >
                Skip for now
              </Button>
            )}

            {isLastStep ? (
              <Button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 min-w-[140px]"
              >
                {isSubmitting ? 'Getting Started...' : 'Go to Dashboard'}
                <Rocket className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentStep((s) => s + 1)}
                disabled={!canProceed()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isFirstStep ? 'Get Started' : 'Continue'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UserOnboardingWizard;
