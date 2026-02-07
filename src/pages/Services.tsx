import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare,
  Calendar,
  Mail,
  Phone,
  Bot,
  Settings,
  CheckCircle2,
  ArrowRight,
  Zap,
  Clock,
  Shield
} from "lucide-react";

export default function Services() {
  const handleBookCall = () => {
    window.open('https://calendly.com/scott-sparkwave/30min', '_blank');
  };

  const services = [
    {
      icon: MessageSquare,
      title: "Instant Lead Response",
      description: "AI responds to every inquiry within seconds via SMS, email, or web form. No lead waits, no lead gets forgotten.",
      features: [
        "Sub-3-second response times",
        "24/7 availability",
        "Multi-channel (SMS, email, web)",
        "Personalized to each inquiry"
      ],
      color: "text-blue-400",
      bg: "bg-blue-600/20",
      border: "border-blue-500/30"
    },
    {
      icon: Calendar,
      title: "Automatic Booking",
      description: "Qualified leads get booked directly into your calendar. No back-and-forth, no scheduling headaches.",
      features: [
        "Calendar integration",
        "Qualification questions",
        "Confirmation messages",
        "Reminder sequences"
      ],
      color: "text-emerald-400",
      bg: "bg-emerald-600/20",
      border: "border-emerald-500/30"
    },
    {
      icon: Mail,
      title: "Smart Follow-Up",
      description: "Persistent, personalized follow-up sequences that adapt based on customer responses and behavior.",
      features: [
        "Multi-touch sequences",
        "Behavior-based triggers",
        "A/B tested messaging",
        "Optimal timing"
      ],
      color: "text-violet-400",
      bg: "bg-violet-600/20",
      border: "border-violet-500/30"
    },
    {
      icon: Phone,
      title: "After-Hours Capture",
      description: "Never lose a lead to voicemail again. AI captures and qualifies inquiries 24/7, even when you're closed.",
      features: [
        "24/7 availability",
        "Urgency detection",
        "Callback scheduling",
        "Emergency escalation"
      ],
      color: "text-amber-400",
      bg: "bg-amber-600/20",
      border: "border-amber-500/30"
    }
  ];

  const addOns = [
    {
      icon: Shield,
      title: "Quality Assurance",
      description: "Every AI response runs through our self-improvement loop. 94% accuracy rate, errors caught before customers see them."
    },
    {
      icon: Bot,
      title: "Custom Training",
      description: "AI trained on your business, your voice, your FAQs. Responses feel like they're coming from you."
    },
    {
      icon: Settings,
      title: "Full Setup",
      description: "We handle everything — integration, training, testing, and ongoing optimization. Done-for-you."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero */}
      <section className="relative pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 border-violet-500/50 text-violet-300">
            <Zap className="w-4 h-4 mr-2" />
            Done-For-You AI Automation
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Services That
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Work While You Sleep
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            We build and manage your entire lead response system. 
            You focus on running your business — we make sure no lead falls through the cracks.
          </p>

          <Button 
            size="lg" 
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8 py-6 text-lg font-semibold rounded-xl"
            onClick={handleBookCall}
          >
            <Calendar className="w-5 h-5 mr-2" />
            Book a Discovery Call
          </Button>
        </div>
      </section>

      {/* Core Services */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Core Services</h2>
          <p className="text-xl text-gray-400 text-center max-w-3xl mx-auto mb-12">
            Everything you need to capture, qualify, and convert more leads — automatically.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {services.map((service, i) => (
              <Card key={i} className={`bg-slate-900/50 border-slate-800 hover:${service.border} transition-colors`}>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${service.bg} flex items-center justify-center`}>
                      <service.icon className={`w-6 h-6 ${service.color}`} />
                    </div>
                    <CardTitle className="text-white text-xl">{service.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 mb-4">{service.description}</p>
                  <ul className="space-y-2">
                    {service.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-gray-300 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 px-4 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">What's Included</h2>
          <p className="text-xl text-gray-400 text-center max-w-3xl mx-auto mb-12">
            This isn't DIY software — it's a done-for-you service. Here's what you get:
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {addOns.map((addon, i) => (
              <Card key={i} className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-violet-600/20 flex items-center justify-center mx-auto mb-4">
                    <addon.icon className="w-6 h-6 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{addon.title}</h3>
                  <p className="text-gray-400 text-sm">{addon.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">How It Works</h2>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Discovery Call", desc: "We learn about your business, your leads, and your goals." },
              { step: "2", title: "Custom Setup", desc: "We build and configure your AI system, trained on your business." },
              { step: "3", title: "Launch & Test", desc: "We deploy, monitor, and optimize until response quality is dialed in." },
              { step: "4", title: "Ongoing Support", desc: "We continuously improve and handle any issues that come up." }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
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
            Let's talk about how Sparkwave can work for your business.
            No pressure, no pitch — just a conversation.
          </p>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8 py-6 text-lg"
            onClick={handleBookCall}
          >
            <Calendar className="w-5 h-5 mr-2" />
            Book Your Free Call
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}
