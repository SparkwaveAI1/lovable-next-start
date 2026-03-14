import { SEO } from '@/components/SEO';
import { SEO_CONFIG } from '@/lib/seo-config';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import sparkwaveIcon from "@/assets/sparkwave-icon.png";
import { 
  MessageSquare, 
  Bot, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Users, 
  Zap, 
  Shield, 
  ArrowRight,
  CheckCircle2,
  Phone,
  Mail,
  Star,
  BarChart3,
  Headphones,
  Target
} from "lucide-react";

export default function Sales() {
  const [email, setEmail] = useState("");

  const handleBookCall = () => {
    window.open("https://calendly.com/sparkwaveai/demo", "_blank");
  };

  const handleSurvey = () => {
    window.open("https://tally.so/r/sparkwave-survey", "_blank");
  };

  const handleContact = () => {
    window.location.href = "mailto:hello@sparkwave-ai.com?subject=Interested%20in%20Sparkwave%20AI";
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white overflow-x-hidden">
      <SEO {...SEO_CONFIG.sales} />
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e1a]/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={sparkwaveIcon} alt="Sparkwave" className="h-8 w-8" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Sparkwave AI
              </span>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <Button 
                variant="ghost" 
                className="text-gray-300 hover:text-white hover:bg-white/10"
                onClick={handleContact}
              >
                Contact
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                onClick={handleBookCall}
              >
                Book a Demo
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Background gradient effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-8">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-gray-300">AI Automation for Small Businesses</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-tight">
            Never Miss Another Lead.
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Respond Instantly. Win More Customers.
            </span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-gray-400 max-w-3xl mx-auto mb-10">
            Your AI assistant answers every call, text, and message in seconds — then books appointments automatically. More customers, less busywork.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button 
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg font-semibold rounded-xl"
              onClick={handleBookCall}
            >
              <Calendar className="w-5 h-5 mr-2" />
              See It In Action
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-white/20 bg-white/5 hover:bg-white/10 text-white px-8 py-6 text-lg font-semibold rounded-xl"
              onClick={handleSurvey}
            >
              Get a Custom Plan
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-gray-500 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Enterprise-grade security</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>5-minute setup</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Trusted by 50+ businesses</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0a0e1a] to-[#0d1224]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Sound Familiar?
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              These problems cost businesses thousands in lost revenue every month
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Clock,
                title: "Slow Response Times",
                description: "Leads go cold while you're busy. 78% of customers buy from whoever responds first.",
                stat: "78%",
                statLabel: "buy from first responder"
              },
              {
                icon: MessageSquare,
                title: "Missed Messages",
                description: "DMs, texts, emails scattered everywhere. Important inquiries fall through the cracks.",
                stat: "40%",
                statLabel: "of leads never get a response"
              },
              {
                icon: Calendar,
                title: "Booking Chaos",
                description: "Back-and-forth scheduling eats up hours. No-shows cost you money.",
                stat: "20hrs",
                statLabel: "wasted on scheduling/month"
              }
            ].map((pain, index) => (
              <Card key={index} className="bg-white/5 border-white/10 hover:border-red-500/30 transition-colors group">
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-6 group-hover:bg-red-500/20 transition-colors">
                    <pain.icon className="w-6 h-6 text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{pain.title}</h3>
                  <p className="text-gray-400 mb-4">{pain.description}</p>
                  <div className="pt-4 border-t border-white/10">
                    <span className="text-2xl font-bold text-red-400">{pain.stat}</span>
                    <span className="text-sm text-gray-500 ml-2">{pain.statLabel}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How Sparkwave Works
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Get up and running in three simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600" />
            
            {[
              {
                step: "01",
                icon: Zap,
                title: "Connect Your Channels",
                description: "Link your website, Instagram, Facebook, SMS, and email in minutes. We handle all the integrations."
              },
              {
                step: "02",
                icon: Bot,
                title: "Train Your AI Agent",
                description: "Tell us about your business, services, and pricing. Our AI learns your voice and becomes an expert on your offerings."
              },
              {
                step: "03",
                icon: TrendingUp,
                title: "Watch Revenue Grow",
                description: "Your AI responds instantly, books appointments, and follows up automatically. You focus on delivering great service."
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-gradient-to-br from-[#12172a] to-[#0d1224] rounded-2xl p-8 border border-white/10 hover:border-blue-500/30 transition-all group">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center mb-6 relative z-10">
                    <span className="text-lg font-bold">{item.step}</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                    <item.icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features/Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0d1224] to-[#0a0e1a]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to Convert More Leads
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Powerful features that work together seamlessly
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: MessageSquare,
                title: "Unified Inbox",
                description: "All your messages from every channel in one place. Never miss a lead again."
              },
              {
                icon: Bot,
                title: "AI-Powered Responses",
                description: "Instant, personalized replies 24/7. Your AI agent sounds just like you."
              },
              {
                icon: Calendar,
                title: "Smart Scheduling",
                description: "Automated booking that syncs with your calendar. Reduce no-shows by 70%."
              },
              {
                icon: Target,
                title: "Lead Scoring",
                description: "Automatically prioritize hot leads so you focus on who's ready to buy."
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                description: "See what's working. Track conversions, response times, and revenue impact."
              },
              {
                icon: Headphones,
                title: "Human Handoff",
                description: "Complex questions get routed to you instantly. AI knows when to escalate."
              }
            ].map((feature, index) => (
              <Card key={index} className="bg-white/5 border-white/10 hover:border-blue-500/30 transition-all group hover:translate-y-[-2px]">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center mb-4 group-hover:from-blue-600/30 group-hover:to-purple-600/30 transition-colors">
                    <feature.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Trusted by Growing Businesses
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              See what our customers have to say
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Sparkwave paid for itself in the first week. We went from missing 50% of leads to responding to 100% within 30 seconds.",
                author: "Sarah M.",
                role: "Fitness Studio Owner",
                rating: 5
              },
              {
                quote: "Our booking rate doubled after switching to Sparkwave. The AI handles all the back-and-forth scheduling that used to eat up my mornings.",
                author: "Mike R.",
                role: "MMA Gym Owner",
                rating: 5
              },
              {
                quote: "I was skeptical about AI, but Sparkwave's responses are so natural that clients can't tell the difference. It's like having a 24/7 receptionist.",
                author: "Jennifer L.",
                role: "Yoga Studio Owner",
                rating: 5
              }
            ].map((testimonial, index) => (
              <Card key={index} className="bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10">
                <CardContent className="p-8">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-6 italic">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                      <span className="text-lg font-bold">{testimonial.author[0]}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-white">{testimonial.author}</p>
                      <p className="text-sm text-gray-500">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Hint Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0a0e1a] to-[#0d1224]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-8">
            <Target className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">Custom Solutions</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Pricing That Scales With Your Success
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Every business is different. We'll build a custom solution that fits your needs and budget. Most clients see ROI within the first month.
          </p>
          
          <div className="grid sm:grid-cols-3 gap-6 mb-12">
            {[
              { label: "Starting at", value: "$297/mo", note: "For small businesses" },
              { label: "Average ROI", value: "340%", note: "Within 90 days" },
              { label: "Setup time", value: "1 Day", note: "Full implementation" }
            ].map((stat, index) => (
              <div key={index} className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <p className="text-sm text-gray-500 mb-2">{stat.label}</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500 mt-2">{stat.note}</p>
              </div>
            ))}
          </div>
          
          <Button 
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-6 text-lg font-semibold rounded-xl"
            onClick={handleBookCall}
          >
            Get Custom Quote
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20" />
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/30 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-bold mb-6">
            Ready to Stop Losing Leads?
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join 50+ businesses already using Sparkwave to automate their growth. Get started today with a free demo.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Button 
              size="lg"
              className="w-full sm:w-auto bg-white text-gray-900 hover:bg-gray-100 px-8 py-6 text-lg font-semibold rounded-xl"
              onClick={handleBookCall}
            >
              <Calendar className="w-5 h-5 mr-2" />
              Book a Free Demo
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-white/30 bg-white/10 hover:bg-white/20 text-white px-8 py-6 text-lg font-semibold rounded-xl"
              onClick={handleSurvey}
            >
              Take Our Survey
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-gray-400 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span>15-minute setup call</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={sparkwaveIcon} alt="Sparkwave" className="h-8 w-8" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Sparkwave AI
              </span>
            </div>
            
            <div className="flex items-center gap-6">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gray-400 hover:text-white"
                onClick={() => window.location.href = "mailto:hello@sparkwave-ai.com"}
              >
                <Mail className="w-4 h-4 mr-2" />
                hello@sparkwave-ai.com
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gray-400 hover:text-white"
                onClick={() => window.location.href = "tel:+19197372900"}
              >
                <Phone className="w-4 h-4 mr-2" />
                (919) 737-2900
              </Button>
            </div>
            
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Sparkwave AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
