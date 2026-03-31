import { SEO } from '@/components/SEO';
import { SEO_CONFIG } from '@/lib/seo-config';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calculator, 
  ArrowRight, 
  DollarSign, 
  Clock, 
  Users, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Mail,
  Lock
} from "lucide-react";
import sparkwaveIcon from "@/assets/sparkwave-icon.png";

type CalculatorMode = 'lead-response' | 'operational-efficiency';

interface FormData {
  // Lead Response Mode
  leadsPerMonth: string;
  responseTimeHours: string;
  avgDealValue: string;
  closeRate: string;
  // Operational Efficiency Mode
  teamSize: string;
  hoursPerWeek: string;
  hourlyRate: string;
}

interface Results {
  currentRevenue: number;
  lostFromSlowResponse: number;
  potentialRecovery: number;
  annualSavings: number;
  responseImpact: string;
}

export default function ROICalculator() {
  const [mode, setMode] = useState<CalculatorMode>('lead-response');
  const [stage, setStage] = useState<'calculator' | 'teaser' | 'email' | 'results'>('calculator');
  const [formData, setFormData] = useState<FormData>({
    leadsPerMonth: '',
    responseTimeHours: '',
    avgDealValue: '',
    closeRate: '',
    teamSize: '',
    hoursPerWeek: '',
    hourlyRate: ''
  });
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const { toast } = useToast();

  const isFormValid = mode === 'lead-response' 
    ? (formData.leadsPerMonth && 
       formData.responseTimeHours && 
       formData.avgDealValue && 
       formData.closeRate)
    : (formData.teamSize && 
       formData.hoursPerWeek && 
       formData.hourlyRate);

  const calculateOperationalEfficiency = (): Results => {
    const teamSize = parseFloat(formData.teamSize) || 0;
    const hoursPerWeek = parseFloat(formData.hoursPerWeek) || 0;
    const hourlyRate = parseFloat(formData.hourlyRate) || 0;

    // Annual calculation: hours/week * 52 weeks * team size * hourly rate
    const currentRevenue = hoursPerWeek * 52 * teamSize * hourlyRate;
    
    // Assume Sparkwave automation can eliminate 60-80% of repetitive work
    const automationElimination = 0.70; // 70% as middle estimate
    const potentialRecovery = currentRevenue * automationElimination;
    
    // Payback period: assume Sparkwave costs ~$300-500/mo per team member
    const monthlyCost = 400 * teamSize;
    const paybackMonths = (monthlyCost * 12) / potentialRecovery;
    
    const responseImpact = `With Sparkwave automation, your team could recover ${formatCurrency(potentialRecovery)}/year in operational efficiency — equivalent to having ${Math.round(potentialRecovery / (teamSize * hourlyRate * 40 * 52))} additional team members at full capacity.`;

    return {
      currentRevenue,
      lostFromSlowResponse: 0,
      potentialRecovery,
      annualSavings: potentialRecovery,
      responseImpact
    };
  };

  const calculateROI = (): Results => {
    const leads = parseFloat(formData.leadsPerMonth) || 0;
    const responseHours = parseFloat(formData.responseTimeHours) || 0;
    const dealValue = parseFloat(formData.avgDealValue) || 0;
    const closeRate = parseFloat(formData.closeRate) / 100 || 0;

    // Industry data: 50% of sales go to first responder
    // Response time impact: Every hour delay reduces conversion by ~10%
    // Source: Lead Response Management Study, InsideSales.com
    
    const currentRevenue = leads * dealValue * closeRate * 12; // annual
    
    // If response > 1 hour, significant loss. After 5 minutes, odds drop 80%
    let lossRate = 0;
    if (responseHours >= 24) {
      lossRate = 0.90; // 90% loss after 24 hours
    } else if (responseHours >= 5) {
      lossRate = 0.70; // 70% loss after 5 hours
    } else if (responseHours >= 1) {
      lossRate = 0.50; // 50% loss after 1 hour
    } else if (responseHours >= 0.5) {
      lossRate = 0.30; // 30% loss after 30 min
    } else if (responseHours >= 0.083) { // 5 minutes
      lossRate = 0.10; // 10% loss after 5 min
    } else {
      lossRate = 0; // Under 5 min = optimal
    }

    const lostFromSlowResponse = currentRevenue * lossRate;
    
    // With <60 second response, recover most of that loss
    const recoveryRate = lossRate * 0.85; // Can recover 85% of lost deals
    const potentialRecovery = currentRevenue * recoveryRate;
    
    // Annual savings
    const annualSavings = potentialRecovery;

    // Impact description
    let responseImpact = '';
    if (responseHours >= 24) {
      responseImpact = 'Critical — You\'re losing 9 out of 10 leads to faster competitors';
    } else if (responseHours >= 5) {
      responseImpact = 'Severe — Competitors responding first are winning most deals';
    } else if (responseHours >= 1) {
      responseImpact = 'Significant — 50% of leads go cold before you respond';
    } else if (responseHours >= 0.5) {
      responseImpact = 'Moderate — Speed matters, you\'re leaving money on the table';
    } else if (responseHours >= 0.083) {
      responseImpact = 'Good — But sub-minute response could boost close rates 21%';
    } else {
      responseImpact = 'Excellent — You\'re already maximizing response time ROI!';
    }

    return {
      currentRevenue,
      lostFromSlowResponse,
      potentialRecovery,
      annualSavings,
      responseImpact
    };
  };

  const handleCalculate = () => {
    const calculatedResults = mode === 'lead-response' 
      ? calculateROI() 
      : calculateOperationalEfficiency();
    setResults(calculatedResults);
    setStage('teaser');
  };

  const handleEmailSubmit = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Store lead in Supabase
      const payload = {
        event_type: "roi_calculator_lead",
        form_id: "sparkwave-roi-calculator",
        submitted_at: new Date().toISOString(),
        contact: { email },
        data: {
          leadsPerMonth: formData.leadsPerMonth,
          responseTimeHours: formData.responseTimeHours,
          avgDealValue: formData.avgDealValue,
          closeRate: formData.closeRate,
          calculatedResults: results
        }
      };

      await supabase.functions.invoke('audit-webhook', { body: payload });
    } catch (err) {
      console.error('Failed to submit lead:', err);
      // Continue anyway - don't block results
    }

    setIsSubmitting(false);
    setStage('results');
  };

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Calculator Stage
  if (stage === 'calculator') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 p-4">
        <SEO {...SEO_CONFIG.roiCalculator} />
        <Card className="w-full max-w-lg border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <img src={sparkwaveIcon} alt="Sparkwave" className="h-12 w-12" />
            </div>
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Calculator className="h-6 w-6 text-green-600" />
              ROI Calculator
            </CardTitle>
            <CardDescription className="text-base">
              See how Sparkwave saves time and money
            </CardDescription>
            
            {/* Mode Toggle */}
            <div className="flex gap-2 mt-4 justify-center">
              <Button
                variant={mode === 'lead-response' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setMode('lead-response');
                  setFormData(prev => ({
                    ...prev,
                    leadsPerMonth: '',
                    responseTimeHours: '',
                    avgDealValue: '',
                    closeRate: ''
                  }));
                  setResults(null);
                  setStage('calculator');
                }}
                className="text-xs"
              >
                Sales Teams
              </Button>
              <Button
                variant={mode === 'operational-efficiency' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setMode('operational-efficiency');
                  setFormData(prev => ({
                    ...prev,
                    teamSize: '',
                    hoursPerWeek: '',
                    hourlyRate: ''
                  }));
                  setResults(null);
                  setStage('calculator');
                }}
                className="text-xs"
              >
                Operations
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            {mode === 'lead-response' ? (
              <>
                {/* Leads per month */}
                <div className="space-y-2">
                  <Label htmlFor="leads" className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    How many leads do you get per month?
                  </Label>
                  <Input
                    id="leads"
                    type="number"
                    placeholder="e.g., 50"
                    value={formData.leadsPerMonth}
                    onChange={(e) => setFormData(prev => ({ ...prev, leadsPerMonth: e.target.value }))}
                    className="text-lg"
                  />
                </div>

                {/* Response time */}
                <div className="space-y-2">
                  <Label htmlFor="response" className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    Average response time (hours)?
                  </Label>
                  <Input
                    id="response"
                    type="number"
                    step="0.5"
                    placeholder="e.g., 4"
                    value={formData.responseTimeHours}
                    onChange={(e) => setFormData(prev => ({ ...prev, responseTimeHours: e.target.value }))}
                    className="text-lg"
                  />
                  <p className="text-xs text-slate-500">
                    Be honest! From lead comes in to first human contact
                  </p>
                </div>

                {/* Deal value */}
                <div className="space-y-2">
                  <Label htmlFor="dealValue" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    Average deal value ($)?
                  </Label>
                  <Input
                    id="dealValue"
                    type="number"
                    placeholder="e.g., 5000"
                    value={formData.avgDealValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, avgDealValue: e.target.value }))}
                    className="text-lg"
                  />
                </div>

                {/* Close rate */}
                <div className="space-y-2">
                  <Label htmlFor="closeRate" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    Current close rate (%)?
                  </Label>
                  <Input
                    id="closeRate"
                    type="number"
                    placeholder="e.g., 25"
                    value={formData.closeRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, closeRate: e.target.value }))}
                    className="text-lg"
                  />
                  <p className="text-xs text-slate-500">
                    % of leads that become paying customers
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Team size */}
                <div className="space-y-2">
                  <Label htmlFor="teamSize" className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    Team size handling admin/operations?
                  </Label>
                  <Input
                    id="teamSize"
                    type="number"
                    placeholder="e.g., 3"
                    value={formData.teamSize}
                    onChange={(e) => setFormData(prev => ({ ...prev, teamSize: e.target.value }))}
                    className="text-lg"
                  />
                </div>

                {/* Hours per week */}
                <div className="space-y-2">
                  <Label htmlFor="hoursPerWeek" className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    Hours per week on repetitive tasks?
                  </Label>
                  <Input
                    id="hoursPerWeek"
                    type="number"
                    placeholder="e.g., 15"
                    value={formData.hoursPerWeek}
                    onChange={(e) => setFormData(prev => ({ ...prev, hoursPerWeek: e.target.value }))}
                    className="text-lg"
                  />
                  <p className="text-xs text-slate-500">
                    Admin, scheduling, email, data entry, etc.
                  </p>
                </div>

                {/* Hourly rate */}
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    Average hourly rate per person?
                  </Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    placeholder="e.g., 50"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                    className="text-lg"
                  />
                  <p className="text-xs text-slate-500">
                    Include salary + benefits cost
                  </p>
                </div>
              </>
            )}

            <Button 
              size="lg" 
              className="w-full bg-green-600 hover:bg-green-700 text-lg py-6 mt-4"
              onClick={handleCalculate}
              disabled={!isFormValid}
            >
              Calculate My Lost Revenue
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <p className="text-center text-xs text-slate-400">
              Based on Harvard Business Review & InsideSales.com research
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Teaser Stage (show partial results, gate full behind email)
  if (stage === 'teaser' && results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 p-4">
        <Card className="w-full max-w-lg border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-red-600">
              You're Leaving Money on the Table
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Teaser stats */}
            <div className="bg-slate-50 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Your current annual revenue:</span>
                <span className="font-bold text-lg">{formatCurrency(results.currentRevenue)}</span>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between text-red-600">
                  <span className="font-medium">Estimated lost to slow response:</span>
                  <span className="font-bold text-xl blur-sm">
                    {formatCurrency(results.lostFromSlowResponse)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-green-600">
                <span className="font-medium">Potential annual recovery:</span>
                <span className="font-bold text-xl blur-sm">
                  {formatCurrency(results.potentialRecovery)}
                </span>
              </div>
            </div>

            {/* Email gate */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">Unlock Your Full Report</span>
              </div>
              <p className="text-sm text-green-700 mb-4">
                Enter your email to see your exact numbers and get actionable recommendations.
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleEmailSubmit}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <Zap className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <p className="text-center text-xs text-slate-400">
              No spam. Just your personalized ROI analysis.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Full Results Stage
  if (stage === 'results' && results) {
    const responseHours = parseFloat(formData.responseTimeHours) || 0;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 py-8 px-4">
        <div className="w-full max-w-2xl mx-auto space-y-6">
          {/* Main Results Card */}
          <Card className="border-0 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white text-center">
              <p className="text-red-100 mb-1">You're losing approximately</p>
              <div className="text-5xl font-bold mb-2">
                {formatCurrency(results.lostFromSlowResponse)}
              </div>
              <p className="text-red-100">per year to slow response times</p>
            </div>
            <CardContent className="p-6 space-y-6">
              {/* Breakdown */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-green-600" />
                  Your Numbers
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      {formData.leadsPerMonth}
                    </div>
                    <div className="text-sm text-slate-500">leads/month</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      {responseHours >= 1 ? `${responseHours}h` : `${Math.round(responseHours * 60)}m`}
                    </div>
                    <div className="text-sm text-slate-500">avg response</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      ${formData.avgDealValue}
                    </div>
                    <div className="text-sm text-slate-500">deal value</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      {formData.closeRate}%
                    </div>
                    <div className="text-sm text-slate-500">close rate</div>
                  </div>
                </div>
              </div>

              {/* Impact Assessment */}
              <div className={`p-4 rounded-lg ${
                responseHours >= 1 
                  ? 'bg-red-50 border border-red-200' 
                  : responseHours >= 0.083 
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-start gap-3">
                  {responseHours >= 1 ? (
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium text-slate-900">Response Time Impact</p>
                    <p className="text-sm text-slate-600">{results.responseImpact}</p>
                  </div>
                </div>
              </div>

              {/* Recovery potential */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  With Sub-60 Second Response
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700">Potential recovered revenue:</span>
                    <span className="font-bold text-green-900">
                      {formatCurrency(results.potentialRecovery)}/year
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Extra deals per month:</span>
                    <span className="font-bold text-green-900">
                      {Math.round(results.potentialRecovery / parseFloat(formData.avgDealValue) / 12)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Industry stats */}
              <div className="bg-slate-100 rounded-lg p-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  <strong>📊 Industry Data:</strong> 50% of sales go to the first responder. 
                  Responding in under 5 minutes makes you 21x more likely to qualify a lead 
                  (Harvard Business Review). After 30 minutes, odds drop by 21x.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* CTA Card */}
          <Card className="border-0 shadow-xl">
            <CardContent className="p-6 text-center">
              <h3 className="font-bold text-xl text-slate-900 mb-2">
                🎯 Ready to Stop Losing Leads?
              </h3>
              <p className="text-slate-600 mb-6">
                Get a free Automation Audit to see exactly how to achieve sub-60 second response times — automatically.
              </p>
              <Button 
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                onClick={() => window.location.href = '/audit'}
              >
                <Zap className="mr-2 h-5 w-5" />
                Take the Free Automation Audit
              </Button>
              <p className="text-xs text-slate-400 mt-4">
                3 minutes • Instant results • See where you can automate
              </p>
            </CardContent>
          </Card>

          {/* Footer note */}
          <p className="text-center text-green-200 text-sm">
            ✅ Your ROI report has been sent to <strong>{email}</strong>
          </p>
        </div>
      </div>
    );
  }

  return null;
}
