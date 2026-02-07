import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users,
  MessageSquare,
  Brain,
  Target,
  BarChart3,
  Sparkles,
  Calendar,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

export default function PersonaAIPage() {
  const handleBookCall = () => {
    window.open('https://calendly.com/scott-sparkwave/30min', '_blank');
  };

  const handleVisitPersonaAI = () => {
    window.open('https://personaresearch.ai', '_blank');
  };

  const useCases = [
    {
      icon: Target,
      title: "Product Research",
      description: "Test messaging, pricing, and features with AI personas that match your target demographic before spending on real focus groups.",
      color: "text-blue-400",
      bg: "bg-blue-600/20"
    },
    {
      icon: MessageSquare,
      title: "Content Testing",
      description: "Get instant feedback on ad copy, landing pages, and marketing materials from diverse AI perspectives.",
      color: "text-emerald-400",
      bg: "bg-emerald-600/20"
    },
    {
      icon: Users,
      title: "Customer Simulation",
      description: "Simulate customer conversations to train your team, test support responses, and identify gaps in your service.",
      color: "text-violet-400",
      bg: "bg-violet-600/20"
    },
    {
      icon: Brain,
      title: "Market Research",
      description: "Explore market segments quickly by conversing with personas representing different demographics and psychographics.",
      color: "text-amber-400",
      bg: "bg-amber-600/20"
    }
  ];

  const features = [
    "Demographically diverse AI personas",
    "Realistic conversation patterns",
    "Political and ideological diversity",
    "Customizable persona attributes",
    "API access for scale",
    "Conversation export and analysis"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 border-violet-500/50 text-violet-300">
            <Sparkles className="w-4 h-4 mr-2" />
            PersonaAI Research Platform
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            AI Personas for
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Real-World Research
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Test ideas, gather feedback, and simulate customer conversations with 
            demographically diverse AI personas — before you spend on real research.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8 py-6 text-lg font-semibold rounded-xl"
              onClick={handleVisitPersonaAI}
            >
              <Users className="w-5 h-5 mr-2" />
              Try PersonaAI
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="w-full sm:w-auto border-white/20 bg-white/5 hover:bg-white/10 text-white px-8 py-6 text-lg font-semibold rounded-xl"
              onClick={handleBookCall}
            >
              <Calendar className="w-5 h-5 mr-2" />
              Book a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 px-4 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Traditional Research Is Slow and Expensive</h2>
          <p className="text-xl text-gray-400 text-center max-w-3xl mx-auto mb-12">
            Focus groups cost thousands. Surveys take weeks. And by the time you have answers, 
            the market has moved on.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-bold text-red-400 mb-2">$5,000+</div>
                <p className="text-gray-400">Average cost per focus group</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-bold text-red-400 mb-2">2-4 weeks</div>
                <p className="text-gray-400">Typical survey turnaround</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-bold text-red-400 mb-2">Limited</div>
                <p className="text-gray-400">Sample diversity</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">What You Can Do With PersonaAI</h2>
          <p className="text-xl text-gray-400 text-center max-w-3xl mx-auto mb-12">
            Get instant feedback from AI personas that represent your target audience.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {useCases.map((useCase, i) => (
              <Card key={i} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${useCase.bg} flex items-center justify-center`}>
                      <useCase.icon className={`w-6 h-6 ${useCase.color}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">{useCase.title}</h3>
                      <p className="text-gray-400 text-sm">{useCase.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Built for Real Research</h2>
              <p className="text-gray-400 mb-8">
                PersonaAI isn't just chatbots with names. It's a research platform 
                designed to provide meaningful, diverse perspectives that help you 
                make better decisions.
              </p>
              
              <div className="space-y-4">
                {features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="font-medium text-white">1,000+ Personas</div>
                      <div className="text-sm text-gray-400">Diverse demographics</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-600/20 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <div className="font-medium text-white">Instant Results</div>
                      <div className="text-sm text-gray-400">Minutes, not weeks</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center">
                      <Target className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-medium text-white">Targeted Sampling</div>
                      <div className="text-sm text-gray-400">Match your audience</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Start Researching Smarter
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            See how PersonaAI can accelerate your research and give you 
            insights in minutes instead of weeks.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8 py-6 text-lg"
              onClick={handleVisitPersonaAI}
            >
              <Users className="w-5 h-5 mr-2" />
              Try PersonaAI Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
