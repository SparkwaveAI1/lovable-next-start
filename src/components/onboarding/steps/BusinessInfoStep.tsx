import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, Users, Target, ArrowRight } from 'lucide-react';

export interface BusinessInfo {
  businessType: string;
  teamSize: string;
  primaryGoals: string[];
}

interface BusinessInfoStepProps {
  onSubmit: (data: BusinessInfo) => void;
  initialData: BusinessInfo | null;
}

const BUSINESS_TYPES = [
  { value: 'ecommerce', label: 'E-commerce / Retail' },
  { value: 'saas', label: 'SaaS / Technology' },
  { value: 'agency', label: 'Marketing / Agency' },
  { value: 'consulting', label: 'Consulting / Professional Services' },
  { value: 'healthcare', label: 'Healthcare / Medical' },
  { value: 'education', label: 'Education / Training' },
  { value: 'finance', label: 'Finance / Fintech' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'fitness', label: 'Fitness / Wellness' },
  { value: 'other', label: 'Other' },
];

const TEAM_SIZES = [
  { value: '1', label: 'Just me' },
  { value: '2-5', label: '2-5 people' },
  { value: '6-10', label: '6-10 people' },
  { value: '11-25', label: '11-25 people' },
  { value: '26-50', label: '26-50 people' },
  { value: '51+', label: '51+ people' },
];

const PRIMARY_GOALS = [
  { id: 'marketing', label: 'Marketing automation' },
  { id: 'sales', label: 'Sales pipeline management' },
  { id: 'customer_support', label: 'Customer support' },
  { id: 'social_media', label: 'Social media management' },
  { id: 'email', label: 'Email campaigns' },
  { id: 'analytics', label: 'Analytics & reporting' },
  { id: 'content', label: 'Content creation' },
  { id: 'scheduling', label: 'Appointment scheduling' },
];

export function BusinessInfoStep({ onSubmit, initialData }: BusinessInfoStepProps) {
  const [businessType, setBusinessType] = useState(initialData?.businessType || '');
  const [teamSize, setTeamSize] = useState(initialData?.teamSize || '');
  const [selectedGoals, setSelectedGoals] = useState<string[]>(initialData?.primaryGoals || []);
  
  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    );
  };
  
  const handleSubmit = () => {
    if (!businessType || !teamSize) return;
    
    onSubmit({
      businessType,
      teamSize,
      primaryGoals: selectedGoals,
    });
  };
  
  const isValid = businessType && teamSize;
  
  return (
    <>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Tell us about your business</CardTitle>
            <CardDescription>This helps us personalize your experience</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 space-y-6">
          {/* Business Type */}
          <div className="space-y-2">
            <Label htmlFor="business-type" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              What type of business do you run?
            </Label>
            <Select value={businessType} onValueChange={setBusinessType}>
              <SelectTrigger id="business-type">
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Team Size */}
          <div className="space-y-2">
            <Label htmlFor="team-size" className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              How big is your team?
            </Label>
            <Select value={teamSize} onValueChange={setTeamSize}>
              <SelectTrigger id="team-size">
                <SelectValue placeholder="Select team size" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_SIZES.map(size => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Primary Goals */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4 text-gray-500" />
              What are your primary goals? (optional)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {PRIMARY_GOALS.map(goal => (
                <label
                  key={goal.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                    ${selectedGoals.includes(goal.id) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <Checkbox 
                    checked={selectedGoals.includes(goal.id)}
                    onCheckedChange={() => toggleGoal(goal.id)}
                  />
                  <span className="text-sm">{goal.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        
        <Button 
          onClick={handleSubmit}
          disabled={!isValid}
          size="lg"
          className="w-full gap-2 text-base mt-6"
        >
          Continue
          <ArrowRight className="h-5 w-5" />
        </Button>
      </CardContent>
    </>
  );
}
