import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Zap, 
  Mail, 
  MessageSquare, 
  CalendarCheck, 
  Share2,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export interface AutomationConfig {
  name: string;
  type: string;
  triggerType: string;
  description: string;
}

interface FirstAutomationStepProps {
  onSubmit: (data: AutomationConfig) => void;
  onSkip: () => void;
  businessType?: string;
}

const AUTOMATION_TEMPLATES = [
  {
    id: 'welcome_email',
    name: 'Welcome Email Sequence',
    description: 'Automatically send a welcome email when a new contact signs up',
    icon: Mail,
    type: 'email',
    triggerType: 'new_contact',
  },
  {
    id: 'lead_followup',
    name: 'Lead Follow-up',
    description: 'Send follow-up messages to leads after a period of inactivity',
    icon: MessageSquare,
    type: 'messaging',
    triggerType: 'inactivity',
  },
  {
    id: 'booking_reminder',
    name: 'Booking Reminder',
    description: 'Send automated reminders before scheduled appointments',
    icon: CalendarCheck,
    type: 'reminder',
    triggerType: 'scheduled',
  },
  {
    id: 'social_post',
    name: 'Social Media Posting',
    description: 'Automatically post content to your social media channels',
    icon: Share2,
    type: 'social',
    triggerType: 'scheduled',
  },
  {
    id: 'custom',
    name: 'Custom Automation',
    description: 'Create your own automation from scratch',
    icon: Sparkles,
    type: 'custom',
    triggerType: 'custom',
  },
];

export function FirstAutomationStep({ onSubmit, onSkip, businessType }: FirstAutomationStepProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  
  const selectedAutomation = AUTOMATION_TEMPLATES.find(t => t.id === selectedTemplate);
  const isCustom = selectedTemplate === 'custom';
  
  const handleSubmit = () => {
    if (!selectedTemplate) return;
    
    const template = selectedAutomation!;
    
    onSubmit({
      name: isCustom ? customName : template.name,
      type: template.type,
      triggerType: template.triggerType,
      description: isCustom ? customDescription : template.description,
    });
  };
  
  const isValid = selectedTemplate && (!isCustom || (customName && customDescription));
  
  return (
    <>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Set up your first automation</CardTitle>
            <CardDescription>
              Choose a template to get started quickly
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 space-y-4">
          {/* Template selection */}
          <RadioGroup value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <div className="space-y-3">
              {AUTOMATION_TEMPLATES.map(template => {
                const Icon = template.icon;
                const isSelected = selectedTemplate === template.id;
                
                return (
                  <label
                    key={template.id}
                    className={`
                      flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all
                      ${isSelected 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <RadioGroupItem 
                      value={template.id} 
                      id={template.id}
                      className="mt-1"
                    />
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{template.name}</div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {template.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </RadioGroup>
          
          {/* Custom automation fields */}
          {isCustom && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="automation-name">Automation Name</Label>
                <Input 
                  id="automation-name"
                  placeholder="e.g., New customer onboarding"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="automation-description">What should this automation do?</Label>
                <Textarea 
                  id="automation-description"
                  placeholder="Describe what you want to automate..."
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-3 mt-6">
          <Button 
            variant="outline"
            onClick={onSkip}
            className="flex-1"
          >
            Skip for now
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isValid}
            className="flex-1 gap-2"
          >
            Create Automation
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </>
  );
}
