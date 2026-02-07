import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot,
  MessageSquare,
  Calendar,
  Mail,
  Clock,
  CheckCircle2,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Users
} from "lucide-react";

export default function AutomationApp() {
  const handleBookCall = () => {
    window.open('https://calendly.com/scott-sparkwave/30min', '_blank');
  };

  const features = [
    {
      icon: MessageSquare,
      title: "Instant Lead Response",
      description: "AI responds to every inquiry in seconds — SMS, email, web forms. No lead waits, no lead gets forgotten.",
      color: "text-blue-400",
      bg: "bg-blue-600/20"
    },
    {
      icon: Calendar,
      title: "Automatic Booking",
      description: "Qualified leads get booked directly into your calendar. No back-and-forth, no scheduling headaches.",
      color: "text-emerald-400",
      bg: "bg-emerald-600/20"
    },
    {
      icon: Mail,
      title: "Smart Follow-Up",
      description: "Persistent, personalized follow-up sequences that adapt based on customer responses and behavior.",
      color: "text-violet-400",
      bg: "bg-violet-600/20"
    },
    {
      icon: Clock,
      title: "24/7 Availability",
      description: "Your AI assistant never sleeps. Night owls, early birds, weekends — every inquiry gets handled.",
      color: "text-amber-400",
      bg: "bg-amber-600/20"
    },
    {
      icon: Shield,
      title: "Quality Control",
      description: "Every AI response runs through evaluation criteria before sending. Errors get caught, not customers.",
      color: "text-red-400",
      bg: "bg-red-600/20"
    },
    {
      icon: BarChart3,
      title: "Self-Improving",
      description: "The system learns from every interaction. Response quality goes up automatically over time.",
      color: "text-cyan-400",
      bg: "bg-cyan-600/20"
    }
  ];

  const stats = [
    { value: "94%", label: "First-pass accuracy" },
    { value: "<3s", label: "Average response time" },
    { value: "24/7", label: "Always available" },
    { value: "2x", label: "More leads converted" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 border-violet-500/50 text-violet-300">
            <Bot className="w-4 h-4 mr-2" />
            AI Automation Platform
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Your AI Employee That
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Never Drops the Ball
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Sparkwave handles your lead response, follow-up, and customer communication 
            automatically — so you can focus on running your business.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8 py-6 text-lg font-semibold rounded-xl"
              onClick={handleBookCall}
            >
              <Calendar className="w-5 h-5 mr-2" />
              See It In Action
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 px-4 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">The Problem We Solve</h2>
          <p className="text-xl text-gray-400 text-center max-w-3xl mx-auto mb-12">
            Small businesses lose customers every day because they can't respond fast enough. 
            Studies show 78% of customers buy from whoever responds first.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-slate-900/50 border-slate-800 border-red-500/20">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4">😫</div>
                <h3 className="text-lg font-semibold text-white mb-2">Leads Go Cold</h3>
                <p className="text-gray-400 text-sm">
                  By the time you respond hours later, they've already called your competitor.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 border-red-500/20">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4">🤯</div>
                <h3 className="text-lg font-semibold text-white mb-2">Follow-Up Falls Apart</h3>
                <p className="text-gray-400 text-sm">
                  You meant to follow up, but life got in the way. Another opportunity lost.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 border-red-500/20">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4">😴</div>
                <h3 className="text-lg font-semibold text-white mb-2">After-Hours Inquiries</h3>
                <p className="text-gray-400 text-sm">
                  People browse at night. Your leads come in when you're asleep. They don't wait.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">How Sparkwave Works</h2>
          <p className="text-xl text-gray-400 text-center max-w-3xl mx-auto mb-12">
            Done-for-you automation that handles customer communication from first touch to booked appointment.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It's Different */}
      <section className="py-16 px-4 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Not Just Another Chatbot</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Generic AI Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 text-gray-400">
                  <span className="text-red-400">✗</span>
                  <span>Generic responses that feel robotic</span>
                </div>
                <div className="flex items-start gap-2 text-gray-400">
                  <span className="text-red-400">✗</span>
                  <span>No quality control — errors go to customers</span>
                </div>
                <div className="flex items-start gap-2 text-gray-400">
                  <span className="text-red-400">✗</span>
                  <span>You set it up, you maintain it</span>
                </div>
                <div className="flex items-start gap-2 text-gray-400">
                  <span className="text-red-400">✗</span>
                  <span>Doesn't improve over time</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-violet-500/30 border-2">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-violet-400" />
                  Sparkwave Automation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Responses trained on your business, your voice</span>
                </div>
                <div className="flex items-start gap-2 text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Every response evaluated before sending</span>
                </div>
                <div className="flex items-start gap-2 text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Done-for-you setup and ongoing optimization</span>
                </div>
                <div className="flex items-start gap-2 text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Self-improving — gets smarter automatically</span>
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
            Ready to Stop Losing Leads?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            See how Sparkwave can handle your customer communication — 
            automatically, accurately, 24/7.
          </p>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8 py-6 text-lg"
            onClick={handleBookCall}
          >
            <Calendar className="w-5 h-5 mr-2" />
            Book a Demo
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}
