import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Target, 
  Users, 
  MessageSquare, 
  Settings, 
  Megaphone,
  Zap,
  TrendingUp,
  Share2,
  Calendar
} from "lucide-react";
import sparkwaveIcon from "@/assets/sparkwave-icon.png";

// Question data with scores
const DOMAINS = {
  lead_capture: {
    name: "Lead Capture",
    icon: Target,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    questions: [
      {
        id: "lead_source",
        text: "How do leads typically reach you?",
        options: [
          { text: "Referrals/word of mouth only", score: 1 },
          { text: "Phone calls", score: 2 },
          { text: "Social media DMs", score: 2 },
          { text: "Website contact form", score: 3 },
          { text: "Email inquiries", score: 3 },
          { text: "Multiple channels with tracking", score: 5 },
        ]
      },
      {
        id: "lead_response",
        text: "What happens when a new lead comes in?",
        options: [
          { text: "I respond when I get around to it", score: 1 },
          { text: "I try to respond same day", score: 2 },
          { text: "Someone on my team responds within hours", score: 3 },
          { text: "Auto-reply confirms receipt, I follow up within hours", score: 4 },
          { text: "Instant automated response + scheduled follow-up sequence", score: 5 },
        ]
      },
      {
        id: "lead_tracking",
        text: "Where do you track your leads?",
        options: [
          { text: "I don't really track them", score: 1 },
          { text: "Spreadsheet or notes", score: 2 },
          { text: "Basic CRM (free tier)", score: 3 },
          { text: "Full CRM with pipeline stages", score: 4 },
          { text: "CRM integrated with automations", score: 5 },
        ]
      },
      {
        id: "lead_leakage",
        text: "How many leads slip through the cracks each month?",
        options: [
          { text: "Honestly, I don't know", score: 1 },
          { text: "Probably quite a few", score: 2 },
          { text: "Some, but not many", score: 3 },
          { text: "Very few - I follow up on most", score: 4 },
          { text: "Zero - every lead is tracked and followed", score: 5 },
        ]
      },
    ]
  },
  sales_process: {
    name: "Sales Process",
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-50",
    questions: [
      {
        id: "booking_method",
        text: "How do prospects book calls or meetings with you?",
        options: [
          { text: "Back-and-forth emails/texts to find a time", score: 1 },
          { text: "They call and we figure it out", score: 2 },
          { text: "I send them my calendar link", score: 3 },
          { text: "Automated scheduling with reminders", score: 4 },
          { text: "Self-service booking with qualifying questions + auto-reminders", score: 5 },
        ]
      },
      {
        id: "proposal_method",
        text: "How do you send quotes or proposals?",
        options: [
          { text: "Verbal quotes, nothing written", score: 1 },
          { text: "Manual email with pricing", score: 2 },
          { text: "PDF proposal I create each time", score: 3 },
          { text: "Template-based proposals", score: 4 },
          { text: "Automated proposal system with e-signatures", score: 5 },
        ]
      },
      {
        id: "followup_process",
        text: "What's your follow-up process after sending a quote?",
        options: [
          { text: "I wait for them to respond", score: 1 },
          { text: "I try to remember to follow up", score: 2 },
          { text: "I have reminders but follow up manually", score: 3 },
          { text: "Scheduled follow-up emails (mostly automated)", score: 4 },
          { text: "Fully automated sequence until they respond or buy", score: 5 },
        ]
      },
      {
        id: "sales_cycle",
        text: "How long does it take from first contact to closed deal?",
        options: [
          { text: "I don't track this", score: 1 },
          { text: "Varies wildly - no consistency", score: 2 },
          { text: "I have a rough idea", score: 3 },
          { text: "I know my average close time", score: 4 },
          { text: "I track every stage and optimize continuously", score: 5 },
        ]
      },
    ]
  },
  client_communication: {
    name: "Client Communication",
    icon: MessageSquare,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    questions: [
      {
        id: "onboarding_method",
        text: "How do new clients get onboarded?",
        options: [
          { text: "I figure it out each time", score: 1 },
          { text: "I have a mental checklist", score: 2 },
          { text: "Written checklist I follow manually", score: 3 },
          { text: "Templated onboarding process", score: 4 },
          { text: "Automated onboarding sequence with tasks and check-ins", score: 5 },
        ]
      },
      {
        id: "support_handling",
        text: "How do you handle client questions or support requests?",
        options: [
          { text: "They text/call me directly, I respond when I can", score: 1 },
          { text: "Email inbox that I monitor", score: 2 },
          { text: "Shared inbox or basic ticketing", score: 3 },
          { text: "Help desk with templates and SLAs", score: 4 },
          { text: "Automated responses + chatbot + escalation workflows", score: 5 },
        ]
      },
      {
        id: "status_updates",
        text: "How do you keep clients updated on project status?",
        options: [
          { text: "They have to ask me", score: 1 },
          { text: "I update them when I remember", score: 2 },
          { text: "Regular manual updates", score: 3 },
          { text: "Scheduled update emails", score: 4 },
          { text: "Client portal with real-time status + automated notifications", score: 5 },
        ]
      },
      {
        id: "feedback_collection",
        text: "How do you collect feedback and reviews?",
        options: [
          { text: "I don't actively collect them", score: 1 },
          { text: "I ask verbally sometimes", score: 2 },
          { text: "I send manual requests occasionally", score: 3 },
          { text: "I have a process but it's manual", score: 4 },
          { text: "Automated review requests at project milestones", score: 5 },
        ]
      },
    ]
  },
  operations: {
    name: "Operations",
    icon: Settings,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    questions: [
      {
        id: "invoicing_method",
        text: "How do you handle invoicing and payments?",
        options: [
          { text: "I invoice when I remember", score: 1 },
          { text: "Manual invoices, manual tracking", score: 2 },
          { text: "Invoicing software, manual sends", score: 3 },
          { text: "Automated invoice generation", score: 4 },
          { text: "Auto-invoicing, auto-reminders, auto-reconciliation", score: 5 },
        ]
      },
      {
        id: "task_management",
        text: "How do you manage tasks and projects internally?",
        options: [
          { text: "It's all in my head", score: 1 },
          { text: "Notes, sticky notes, or basic lists", score: 2 },
          { text: "Spreadsheets or simple task apps", score: 3 },
          { text: "Project management tool (Asana, Monday, etc.)", score: 4 },
          { text: "PM tool with automations and integrations", score: 5 },
        ]
      },
      {
        id: "admin_time",
        text: "How much time do you spend on repetitive admin tasks per week?",
        options: [
          { text: "10+ hours", score: 1 },
          { text: "5-10 hours", score: 2 },
          { text: "2-5 hours", score: 3 },
          { text: "1-2 hours", score: 4 },
          { text: "Minimal - most is automated", score: 5 },
        ]
      },
      {
        id: "calendar_management",
        text: "How do you handle scheduling and calendar management?",
        options: [
          { text: "Paper calendar or memory", score: 1 },
          { text: "Digital calendar, manual entries", score: 2 },
          { text: "Shared calendar with team", score: 3 },
          { text: "Calendar synced with booking tools", score: 4 },
          { text: "Fully integrated calendar with auto-blocking and smart scheduling", score: 5 },
        ]
      },
    ]
  },
  marketing: {
    name: "Marketing",
    icon: Megaphone,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    questions: [
      {
        id: "social_frequency",
        text: "How often do you post on social media?",
        options: [
          { text: "Rarely or never", score: 1 },
          { text: "When I remember", score: 2 },
          { text: "A few times per month", score: 3 },
          { text: "Weekly with some planning", score: 4 },
          { text: "Scheduled content calendar, auto-posting", score: 5 },
        ]
      },
      {
        id: "email_marketing",
        text: "Do you have an email list? How do you use it?",
        options: [
          { text: "No email list", score: 1 },
          { text: "Have a list but rarely use it", score: 2 },
          { text: "Occasional manual emails", score: 3 },
          { text: "Regular newsletters", score: 4 },
          { text: "Automated sequences, segmentation, and campaigns", score: 5 },
        ]
      },
      {
        id: "lead_nurturing",
        text: "How do you nurture leads who aren't ready to buy yet?",
        options: [
          { text: "I don't - they're either ready or not", score: 1 },
          { text: "I might reach out occasionally", score: 2 },
          { text: "I add them to my email list", score: 3 },
          { text: "Regular touchpoints and content", score: 4 },
          { text: "Automated nurture sequences based on behavior", score: 5 },
        ]
      },
      {
        id: "marketing_roi",
        text: "How do you track marketing ROI?",
        options: [
          { text: "I don't track it", score: 1 },
          { text: "I have a general sense", score: 2 },
          { text: "I track some metrics manually", score: 3 },
          { text: "I use analytics tools", score: 4 },
          { text: "Full attribution tracking from ad to sale", score: 5 },
        ]
      },
    ]
  },
};

const DOMAIN_ORDER = ['lead_capture', 'sales_process', 'client_communication', 'operations', 'marketing'] as const;

type DomainKey = typeof DOMAIN_ORDER[number];

interface Answers {
  [questionId: string]: { text: string; score: number };
}

interface DomainScores {
  [domain: string]: number;
}

const getGrade = (score: number): { grade: string; label: string; emoji: string } => {
  if (score >= 85) return { grade: 'A', label: 'Automation Leader', emoji: '🏆' };
  if (score >= 70) return { grade: 'B', label: 'Well Automated', emoji: '⭐' };
  if (score >= 55) return { grade: 'C', label: 'Room to Grow', emoji: '📈' };
  if (score >= 40) return { grade: 'D', label: 'Significant Gaps', emoji: '🔧' };
  return { grade: 'F', label: 'Manual Mode', emoji: '🚀' };
};

const getWeakestDomain = (scores: DomainScores): { key: string; name: string; score: number } => {
  let weakest = { key: '', name: '', score: Infinity };
  for (const [key, score] of Object.entries(scores)) {
    if (score < weakest.score) {
      weakest = { key, name: DOMAINS[key as DomainKey].name, score };
    }
  }
  return weakest;
};

export default function AutomationAudit() {
  const [stage, setStage] = useState<'welcome' | 'contact' | 'questions' | 'submitting' | 'results'>('welcome');
  const [contactInfo, setContactInfo] = useState({ name: '', email: '', company: '' });
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [results, setResults] = useState<{
    total: number;
    domains: DomainScores;
    weakest: { key: string; name: string; score: number };
    grade: { grade: string; label: string; emoji: string };
  } | null>(null);
  const { toast } = useToast();

  const totalQuestions = 20;
  const answeredQuestions = Object.keys(answers).length;
  const progress = stage === 'questions' 
    ? ((answeredQuestions) / totalQuestions) * 100 
    : stage === 'contact' 
    ? 0 
    : 100;

  const currentDomainKey = DOMAIN_ORDER[currentDomainIndex];
  const currentDomain = DOMAINS[currentDomainKey];
  const currentQuestion = currentDomain?.questions[currentQuestionIndex];

  const handleSelectOption = (option: { text: string; score: number }) => {
    if (!currentQuestion) return;
    
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: option
    }));

    // Auto-advance after a brief delay
    setTimeout(() => {
      if (currentQuestionIndex < currentDomain.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else if (currentDomainIndex < DOMAIN_ORDER.length - 1) {
        setCurrentDomainIndex(prev => prev + 1);
        setCurrentQuestionIndex(0);
      } else {
        handleSubmit();
      }
    }, 300);
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (currentDomainIndex > 0) {
      setCurrentDomainIndex(prev => prev - 1);
      const prevDomainKey = DOMAIN_ORDER[currentDomainIndex - 1];
      setCurrentQuestionIndex(DOMAINS[prevDomainKey].questions.length - 1);
    } else {
      setStage('contact');
    }
  };

  const calculateScores = (): { total: number; domains: DomainScores } => {
    const domainScores: DomainScores = {};
    let total = 0;

    for (const domainKey of DOMAIN_ORDER) {
      let domainTotal = 0;
      for (const q of DOMAINS[domainKey].questions) {
        const answer = answers[q.id];
        if (answer) {
          domainTotal += answer.score;
        }
      }
      domainScores[domainKey] = domainTotal;
      total += domainTotal;
    }

    return { total, domains: domainScores };
  };

  const handleSubmit = async () => {
    setStage('submitting');
    
    const { total, domains } = calculateScores();
    const weakest = getWeakestDomain(domains);
    const grade = getGrade(total);

    // Store results locally first
    setResults({ total, domains, weakest, grade });

    // Prepare payload for webhook
    const payload = {
      event_type: "form_response",
      form_id: "sparkwave-automation-audit-internal",
      submitted_at: new Date().toISOString(),
      contact: {
        name: contactInfo.name,
        email: contactInfo.email,
        company: contactInfo.company
      },
      scores: {
        total: total,
        lead_capture: domains.lead_capture,
        sales_process: domains.sales_process,
        client_communication: domains.client_communication,
        operations: domains.operations,
        marketing: domains.marketing,
        weakest_domain: weakest.key
      },
      responses: answers
    };

    try {
      const { error } = await supabase.functions.invoke('audit-webhook', {
        body: payload
      });

      if (error) {
        console.error('Webhook error:', error);
        // Still show results even if webhook fails
      }
    } catch (err) {
      console.error('Failed to submit to webhook:', err);
    }

    setStage('results');
  };

  const shareOnTwitter = () => {
    if (!results) return;
    const text = encodeURIComponent(
      `I just scored ${results.total}/100 on the Sparkwave Automation Audit! My biggest opportunity: ${results.weakest.name}. Take the free audit and compare your score 👇`
    );
    const url = encodeURIComponent('https://sparkwaveai.app/audit?ref=share');
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareOnLinkedIn = () => {
    const url = encodeURIComponent('https://sparkwaveai.app/audit?ref=share');
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  const copyLink = () => {
    navigator.clipboard.writeText('https://sparkwaveai.app/audit?ref=share');
    toast({
      title: "Link copied!",
      description: "Share it with a fellow business owner.",
    });
  };

  // Welcome Screen
  if (stage === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 p-4">
        <Card className="w-full max-w-lg text-center border-0 shadow-2xl">
          <CardContent className="pt-12 pb-12 px-8">
            <div className="flex justify-center mb-6">
              <img src={sparkwaveIcon} alt="Sparkwave" className="h-16 w-16" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">
              Sparkwave Automation Audit
            </h1>
            <p className="text-lg text-slate-600 mb-8">
              Discover your automation potential in 3 minutes
            </p>
            
            <div className="grid grid-cols-3 gap-4 mb-8 text-center">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">20</div>
                <div className="text-xs text-slate-500">Questions</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">5</div>
                <div className="text-xs text-slate-500">Domains</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">3</div>
                <div className="text-xs text-slate-500">Minutes</div>
              </div>
            </div>

            <Button 
              size="lg" 
              className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
              onClick={() => setStage('contact')}
            >
              Start My Free Audit
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <p className="text-xs text-slate-400 mt-4">
              No credit card required • Results delivered instantly
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Contact Info Screen
  if (stage === 'contact') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-green-50 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-xl">First, tell us about yourself</CardTitle>
            <CardDescription>So we can personalize your results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">What's your name?</Label>
              <Input
                id="name"
                placeholder="First name"
                value={contactInfo.name}
                onChange={(e) => setContactInfo(prev => ({ ...prev, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">What's your email?</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={contactInfo.email}
                onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">What's your company name?</Label>
              <Input
                id="company"
                placeholder="Acme Inc."
                value={contactInfo.company}
                onChange={(e) => setContactInfo(prev => ({ ...prev, company: e.target.value }))}
              />
            </div>
            <Button 
              className="w-full bg-green-600 hover:bg-green-700 mt-4"
              onClick={() => setStage('questions')}
              disabled={!contactInfo.name || !contactInfo.email || !contactInfo.company}
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Questions Screen
  if (stage === 'questions' && currentDomain && currentQuestion) {
    const DomainIcon = currentDomain.icon;
    
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-green-50 p-4">
        {/* Progress Bar */}
        <div className="w-full max-w-2xl mx-auto mb-4">
          <div className="flex justify-between text-sm text-slate-500 mb-2">
            <span>Question {answeredQuestions + 1} of {totalQuestions}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Domain Badge */}
        <div className="w-full max-w-2xl mx-auto mb-4">
          <div className={`inline-flex items-center gap-2 px-4 py-2 ${currentDomain.bgColor} rounded-full`}>
            <DomainIcon className={`h-4 w-4 ${currentDomain.color}`} />
            <span className={`text-sm font-medium ${currentDomain.color}`}>{currentDomain.name}</span>
          </div>
        </div>

        {/* Question Card */}
        <Card className="w-full max-w-2xl mx-auto flex-grow">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl leading-relaxed">{currentQuestion.text}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = answers[currentQuestion.id]?.text === option.text;
              return (
                <button
                  key={index}
                  onClick={() => handleSelectOption(option)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all hover:border-green-500 hover:bg-green-50 ${
                    isSelected 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected 
                        ? 'border-green-500 bg-green-500' 
                        : 'border-slate-300'
                    }`}>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-white" />}
                    </div>
                    <span className="text-slate-700">{option.text}</span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="w-full max-w-2xl mx-auto mt-4 flex justify-between">
          <Button 
            variant="ghost" 
            onClick={handleBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="text-sm text-slate-500 flex items-center">
            <Sparkles className="h-4 w-4 mr-1 text-green-500" />
            {totalQuestions - answeredQuestions} questions left
          </div>
        </div>
      </div>
    );
  }

  // Submitting Screen
  if (stage === 'submitting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-green-50 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-12 pb-12">
            <div className="flex justify-center mb-6">
              <div className="animate-spin p-4 bg-green-100 rounded-full">
                <Zap className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Calculating your score...</h2>
            <p className="text-slate-600">
              Analyzing your responses across all 5 domains
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results Screen
  if (stage === 'results' && results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 py-8 px-4">
        <div className="w-full max-w-2xl mx-auto space-y-6">
          {/* Score Card */}
          <Card className="border-0 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-white text-center">
              <p className="text-green-100 mb-2">Your Automation Score</p>
              <div className="text-6xl font-bold mb-2">{results.total}<span className="text-3xl">/100</span></div>
              <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                <span className="text-2xl">{results.grade.emoji}</span>
                <span className="font-semibold">Grade: {results.grade.grade} — {results.grade.label}</span>
              </div>
            </div>
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Domain Breakdown
              </h3>
              <div className="space-y-3">
                {DOMAIN_ORDER.map(domainKey => {
                  const domain = DOMAINS[domainKey];
                  const score = results.domains[domainKey];
                  const percentage = (score / 20) * 100;
                  const DomainIcon = domain.icon;
                  const isWeakest = domainKey === results.weakest.key;
                  
                  return (
                    <div key={domainKey} className={`p-3 rounded-lg ${isWeakest ? 'bg-red-50 border border-red-200' : 'bg-slate-50'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <DomainIcon className={`h-4 w-4 ${domain.color}`} />
                          <span className="font-medium text-slate-700">{domain.name}</span>
                          {isWeakest && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              Biggest Opportunity
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-slate-900">{score}/20</span>
                      </div>
                      <Progress 
                        value={percentage} 
                        className={`h-2 ${isWeakest ? '[&>div]:bg-red-500' : ''}`}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* CTA Card */}
          <Card className="border-0 shadow-xl">
            <CardContent className="p-6 text-center">
              <h3 className="font-bold text-xl text-slate-900 mb-2">
                🎯 Your #1 Automation Opportunity: {results.weakest.name}
              </h3>
              <p className="text-slate-600 mb-6">
                Let's fix this together. I'll show you exactly which automations will 10x your output.
              </p>
              <Button 
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                onClick={() => window.location.href = `https://sparkwaveai.app/book?source=audit&score=${results.total}&domain=${results.weakest.key}`}
              >
                <Calendar className="mr-2 h-5 w-5" />
                Get Your Custom Automation Map — Free, 20 minutes
              </Button>
            </CardContent>
          </Card>

          {/* Share Card */}
          <Card className="border-0 shadow-lg bg-slate-50">
            <CardContent className="p-6 text-center">
              <Share2 className="h-6 w-6 mx-auto text-slate-400 mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">📤 Share Your Score</h3>
              <p className="text-sm text-slate-600 mb-4">
                Share with a fellow business owner and compare results!
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button variant="outline" onClick={shareOnTwitter} className="gap-2">
                  🐦 Twitter
                </Button>
                <Button variant="outline" onClick={shareOnLinkedIn} className="gap-2">
                  💼 LinkedIn
                </Button>
                <Button variant="outline" onClick={copyLink} className="gap-2">
                  🔗 Copy Link
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Note */}
          <p className="text-center text-green-200 text-sm">
            ✅ Your detailed Automation Map has been sent to <strong>{contactInfo.email}</strong>
          </p>
        </div>
      </div>
    );
  }

  return null;
}
