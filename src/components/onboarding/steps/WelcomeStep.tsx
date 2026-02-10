import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles, Zap, BarChart3, Users, ArrowRight } from 'lucide-react';
import sparkwaveIcon from '@/assets/sparkwave-icon.png';

interface WelcomeStepProps {
  onContinue: () => void;
}

const features = [
  {
    icon: Zap,
    title: 'AI-Powered Automation',
    description: 'Set up intelligent workflows in minutes',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Track performance and ROI effortlessly',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Work together seamlessly',
  },
];

export function WelcomeStep({ onContinue }: WelcomeStepProps) {
  return (
    <>
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <img src={sparkwaveIcon} alt="Sparkwave" className="h-16 w-16" />
            <div className="absolute -top-1 -right-1">
              <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
            </div>
          </div>
        </div>
        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          Welcome to Sparkwave!
        </CardTitle>
        <CardDescription className="text-base mt-2">
          Let's get you set up in just a few minutes
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1">
          <p className="text-gray-600 text-center mb-8">
            Sparkwave helps you automate your business operations with AI-powered tools. 
            We'll help you get started with a quick setup.
          </p>
          
          {/* Feature highlights */}
          <div className="space-y-4 mb-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={feature.title}
                  className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{feature.title}</h3>
                    <p className="text-sm text-gray-500">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <Button 
          onClick={onContinue}
          size="lg"
          className="w-full gap-2 text-base"
        >
          Let's Get Started
          <ArrowRight className="h-5 w-5" />
        </Button>
      </CardContent>
    </>
  );
}
