import { SEO } from '@/components/SEO';
import { SEO_CONFIG } from '@/lib/seo-config';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Play,
  Users,
  Quote
} from "lucide-react";
import { PricingTiers } from "@/components/landing/PricingTiers";

export default function AutomationApp() {
  const handleBookCall = () => {
    window.open('https://calendly.com/scott-sparkwave/30min', '_blank');
  };

  const stats = [
    { value: "14+", label: "Local businesses trust us" },
    { value: "94%", label: "Response accuracy" },
    { value: "<30s", label: "Response time" },
    { value: "2x", label: "More leads converted" }
  ];

  const howItWorksSteps = [
    {
      step: 1,
      title: "Connect Your Leads",
      description: "You plug in your website form, Facebook ads, or CRM. Takes 15 minutes.",
      icon: Zap
    },
    {
      step: 2,
      title: "AI Takes Over",
      description: "Every inquiry gets an instant, personalized response. Your AI books qualified leads directly into your calendar—no back-and-forth.",
      icon: Bot
    },
    {
      step: 3,
      title: "You Close Deals",
      description: "Show up to appointments with warm, qualified leads. Your AI handled the grunt work. You do what you're best at.",
      icon: CheckCircle2
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <SEO {...SEO_CONFIG.automation} />
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 border-violet-500/50 text-violet-300">
            <Bot className="w-4 h-4 mr-2" />
            AI Automation Platform
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
            Never Miss Another Lead.
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Even When You're Busy Living Your Life.
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Your AI assistant responds to every inquiry in under 30 seconds, 
            books appointments automatically, and follows up until they buy—
            so you can coach, consult, or just sleep.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8 py-6 text-lg font-semibold rounded-xl"
              onClick={handleBookCall}
            >
              <Play className="w-5 h-5 mr-2" />
              See It Handle Your Leads
            </Button>
          </div>

          {/* Stats Bar */}
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

      {/* Problem Section - Rewritten with narrative */}
      <section className="py-16 px-4 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4">
            You're Losing <span className="text-red-400">$12,000/Month</span> to Slow Response Time
          </h2>
          
          {/* Narrative */}
          <div className="max-w-3xl mx-auto mb-12">
            <div className="prose prose-invert prose-lg text-gray-400 text-center">
              <p className="mb-4">Here's what's happening right now:</p>
              <p className="mb-4">
                Someone just found your website. They're interested. <span className="text-white">Ready to buy.</span><br />
                They fill out your contact form.
              </p>
              <p className="text-2xl text-gray-300 my-6">And wait.</p>
              <p className="mb-4">
                You're coaching a class. On a job site. In a meeting. Asleep.
              </p>
              <p className="mb-4">
                By the time you see the notification, they've already messaged 
                your competitor. They responded in 2 minutes. <span className="text-red-400">You didn't.</span>
              </p>
              <p className="mb-4">
                This isn't about working harder. You're already working hard enough.<br />
                This is about being in 10 places at once.
              </p>
              <p className="mb-4 text-white font-medium">
                That's not humanly possible.<br />
                That's exactly what your AI assistant does.
              </p>
            </div>
          </div>

          {/* Problem Cards */}
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-slate-900/50 border-slate-800 border-red-500/20">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4">😫</div>
                <h3 className="text-lg font-semibold text-white mb-2">"Lead Went Cold"</h3>
                <p className="text-gray-400 text-sm">
                  They inquired at 9pm. You responded at 9am. They bought from someone else.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 border-red-500/20">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4">🤯</div>
                <h3 className="text-lg font-semibold text-white mb-2">"Follow-Up Never Happened"</h3>
                <p className="text-gray-400 text-sm">
                  You meant to call back. Life got in the way. Another $3,000 walked away.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 border-red-500/20">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4">⏰</div>
                <h3 className="text-lg font-semibold text-white mb-2">"First to Respond Wins"</h3>
                <p className="text-gray-400 text-sm">
                  78% of customers buy from whoever responds FIRST. Are you first?
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section - Simplified to 3 Steps */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4">
            Your 24/7 Sales Team in 3 Steps
          </h2>
          <p className="text-xl text-gray-400 text-center max-w-3xl mx-auto mb-12">
            No complicated setup. No learning curve. Just results.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {howItWorksSteps.map((item) => (
              <div key={item.step} className="text-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">{item.step}</span>
                  </div>
                  {item.step < 3 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-violet-600/50 to-transparent" />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-16 px-4 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Real Businesses. Real Results.
          </h2>

          {/* Featured Case Study */}
          <Card className="bg-slate-900/50 border-violet-500/30 mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row gap-8 items-center">
                <div className="flex-1">
                  <Quote className="w-10 h-10 text-violet-400 mb-4" />
                  <blockquote className="text-xl text-gray-300 italic mb-6">
                    "I was losing leads because I couldn't get to my phone while coaching. 
                    Now every inquiry gets handled instantly—even at 2 AM. I went from 
                    weekly newsletters to contacting prospects at 10x the rate."
                  </blockquote>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center">
                      <span className="text-white font-bold">SJ</span>
                    </div>
                    <div>
                      <p className="text-white font-semibold">Scott Johnson</p>
                      <p className="text-gray-400 text-sm">Fight Flow Academy • MMA Gym, Durham NC</p>
                    </div>
                  </div>
                </div>
                <div className="w-full lg:w-80">
                  <div className="bg-slate-800/50 rounded-xl p-6">
                    <h4 className="text-emerald-400 font-semibold mb-4 text-center">📈 Results</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Trial bookings</span>
                        <span className="text-emerald-400 font-bold">+175%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Outreach capacity</span>
                        <span className="text-emerald-400 font-bold">10x</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Response time</span>
                        <span className="text-emerald-400 font-bold">&lt;30 seconds</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Availability</span>
                        <span className="text-emerald-400 font-bold">24/7</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trust Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Shield, text: "94% First-Pass Accuracy" },
              { icon: Clock, text: "<3 Second Response Time" },
              { icon: Calendar, text: "24/7 Availability" },
              { icon: Zap, text: "Works With Your Tools" }
            ].map((badge, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                <badge.icon className="w-5 h-5 text-emerald-400" />
                <span className="text-gray-300 text-sm">{badge.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder's Message Section (NEW) */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardContent className="p-8 md:p-12">
              <h2 className="text-2xl font-bold text-white mb-6">Why I Built This</h2>
              
              <div className="prose prose-invert prose-lg">
                <p className="text-gray-300 mb-4">
                  I built Sparkwave because I watched my friend lose his business.
                </p>
                <p className="text-gray-300 mb-4">
                  Not because his service was bad. Not because he lacked skill.
                  Because he couldn't respond fast enough.
                </p>
                <p className="text-gray-300 mb-4">
                  He'd be coaching a class at 7pm when leads came in. By the time 
                  he got home at 10pm, they'd already signed up with his competitor 
                  across town.
                </p>
                <p className="text-gray-300 mb-4">
                  Good business owners lose every day—not because they're bad at 
                  what they do, but because they can't be everywhere at once.
                </p>
                <p className="text-gray-400 mb-4 italic">
                  That's not a character flaw. That's physics.
                </p>
                <p className="text-white mb-4 font-medium">
                  So I built something that could.
                </p>
                <p className="text-gray-300 mb-6">
                  Sparkwave isn't about replacing you. It's about <span className="text-violet-400">multiplying you.</span><br />
                  Being in 10 places at once. Responding at 2 AM when you're asleep.
                  Following up on day 5 when you forgot.
                </p>
                <p className="text-white font-semibold mb-0">
                  You do what you're great at. Your AI handles the rest.
                </p>
              </div>

              <div className="flex items-center gap-4 mt-8 pt-6 border-t border-slate-700">
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">SJ</span>
                </div>
                <div>
                  <p className="text-white font-semibold">Scott Johnson</p>
                  <p className="text-gray-400">Founder, Sparkwave</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4">
            Your AI Employee Costs Less Than Your Worst Month of Lost Leads
          </h2>
          <p className="text-xl text-gray-400 text-center max-w-3xl mx-auto mb-12">
            Pick your plan. Start this week. See ROI in 30 days or get your money back.
          </p>

          <PricingTiers 
            onBookAudit={handleBookCall}
            onBookDiscovery={handleBookCall}
            onApplyFounding={handleBookCall}
          />
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Every Hour You Wait, You're Losing Leads
          </h2>
          <div className="prose prose-invert prose-lg mx-auto mb-8">
            <p className="text-gray-400">
              Right now, somewhere, someone is looking for exactly what you offer.
              They're going to reach out to you—and two of your competitors.
            </p>
            <p className="text-gray-400">
              <span className="text-white font-medium">Whoever responds first wins.</span>
            </p>
            <p className="text-gray-400">
              Your AI responds in 30 seconds. 24 hours a day. 7 days a week.
              Even while you sleep.
            </p>
          </div>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-10 py-7 text-lg rounded-xl"
            onClick={handleBookCall}
          >
            <Play className="w-5 h-5 mr-2" />
            See It In Action
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-gray-500 text-sm mt-4">
            No credit card. No sales pressure. Just a conversation.
          </p>
        </div>
      </section>

      {/* Sticky Footer CTA for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/95 border-t border-slate-800 md:hidden z-50">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <span className="text-white text-sm font-medium">Ready to stop losing leads?</span>
          <Button 
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
            onClick={handleBookCall}
          >
            Book Demo
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Spacer for mobile sticky footer */}
      <div className="h-20 md:hidden" />
    </div>
  );
}
