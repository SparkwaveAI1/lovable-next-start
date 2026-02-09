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
  Shield,
  Star,
  TrendingUp
} from "lucide-react";

export default function Services() {
  const handleBookAudit = () => {
    window.open('https://calendly.com/scott-sparkwave/30min', '_blank');
  };

  const handleBookDiscovery = () => {
    window.open('https://calendly.com/scott-sparkwave/30min', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section - 10x Positioning */}
      <section className="relative pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 border-violet-500/50 text-violet-300">
            <TrendingUp className="w-4 h-4 mr-2" />
            Productivity Multiplier
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            10x Your Output.
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Zero Extra Hours.
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Custom AI automation that multiplies your productivity—not just saves time.
            Do what took a team of 10, with just you.
          </p>

          {/* Social Proof */}
          <div className="mb-10 p-4 bg-slate-800/50 rounded-xl border border-slate-700 max-w-xl mx-auto">
            <p className="text-gray-300 italic text-sm">
              "We went from weekly newsletters to contacting prospects at 10x the rate—with zero extra work."
            </p>
            <p className="text-violet-400 text-sm mt-2 font-medium">— Fight Flow Academy</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8 py-6 text-lg font-semibold rounded-xl"
              onClick={handleBookAudit}
            >
              Get Your Free Automation Audit
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-slate-600 text-gray-300 hover:bg-slate-800 px-6 py-6 text-lg rounded-xl"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* Problem/Agitation Section */}
      <section className="py-16 px-4 bg-slate-900/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-6">
            You're Doing Work a Machine Could Do
          </h2>
          <p className="text-lg text-gray-400 text-center max-w-3xl mx-auto mb-12">
            Every hour you spend on repetitive tasks—follow-ups, scheduling, data entry—is an hour you're not growing your business.
            <br /><br />
            Most automation tools promise to "save you time." That's the wrong goal.
            <br /><br />
            <span className="text-white font-medium">The real opportunity isn't saving 5 hours. It's doing 10x more with those same hours.</span>
          </p>

          {/* Stats Row */}
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="p-6 bg-slate-800/50 rounded-xl">
              <div className="text-4xl font-bold text-red-400 mb-2">47 hours</div>
              <p className="text-gray-400 text-sm">Average lead response time (you're losing deals)</p>
            </div>
            <div className="p-6 bg-slate-800/50 rounded-xl">
              <div className="text-4xl font-bold text-amber-400 mb-2">5 minutes</div>
              <p className="text-gray-400 text-sm">After which leads go cold (HBR study)</p>
            </div>
            <div className="p-6 bg-slate-800/50 rounded-xl">
              <div className="text-4xl font-bold text-emerald-400 mb-2">10x</div>
              <p className="text-gray-400 text-sm">Output increase with Sparkwave automation</p>
            </div>
          </div>
        </div>
      </section>

      {/* Fight Flow Case Study */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            From Drowning in Tasks to 10x Capacity
          </h2>
          <p className="text-xl text-gray-400 text-center max-w-2xl mx-auto mb-12">
            Real results from a real business
          </p>

          {/* Case Study Card */}
          <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-violet-500/30 overflow-hidden">
            <CardHeader className="border-b border-slate-700/50 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🥋</span>
                <div>
                  <CardTitle className="text-white text-xl">Fight Flow Academy</CardTitle>
                  <p className="text-violet-400 text-sm">MMA Gym • Durham, NC</p>
                </div>
                <Badge className="ml-auto bg-emerald-600/20 text-emerald-400 border-emerald-500/30">
                  10x Output
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    BEFORE
                  </h4>
                  <ul className="text-gray-400 text-sm space-y-2">
                    <li>• Weekly email newsletter to prospects</li>
                    <li>• Manual follow-up (when time allowed)</li>
                    <li>• Leads slipping through cracks</li>
                    <li>• Owner coaching, can't respond to inquiries</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                    AFTER
                  </h4>
                  <ul className="text-gray-400 text-sm space-y-2">
                    <li>• Contacting prospects at 10x the rate</li>
                    <li>• AI responds in &lt;30 seconds, 24/7</li>
                    <li>• Automated sequences run while owner coaches</li>
                    <li>• 175% more trial bookings</li>
                  </ul>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                <p className="text-gray-300 italic">
                  "I was losing leads because I couldn't get to my phone while coaching. Now every inquiry gets handled instantly, even at 2 AM—and I'm doing 10x more outreach than I ever could manually."
                </p>
                <p className="text-violet-400 text-sm mt-2 font-medium">— Scott Johnson, Owner</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-16 px-4 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Choose Your Multiplier</h2>
          <p className="text-xl text-gray-400 text-center max-w-2xl mx-auto mb-12">
            Two paths to 10x productivity. Pick the one that fits your ambition.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Tier 1: AI Marketing Agent */}
            <Card className="bg-slate-900/50 border-blue-500/30 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30">
                  MOST POPULAR
                </Badge>
              </div>
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center mb-4">
                  <Bot className="w-6 h-6 text-blue-400" />
                </div>
                <CardTitle className="text-white text-2xl">AI Marketing Agent</CardTitle>
                <p className="text-gray-400">Your always-on marketing team</p>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="text-3xl font-bold text-white">Starting at $997<span className="text-lg text-gray-400">/month</span></div>
                  <p className="text-sm text-gray-500">Save 2 months with annual: $9,970/year</p>
                </div>

                <p className="text-gray-400 text-sm mb-6">
                  An AI agent that runs your marketing 24/7. Connect it to your existing tools. Watch it work.
                </p>

                <ul className="space-y-3 mb-8">
                  {[
                    "LLM-powered Marketing Agent",
                    "Connects to GoHighLevel, HubSpot, or your CRM",
                    "Instant lead response (sub-30-second)",
                    "AI-written email & SMS sequences",
                    "Simple control dashboard",
                    "Weekly performance reports",
                    "Standard support (48hr response)"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="p-3 bg-slate-800/50 rounded-lg mb-6 text-sm text-gray-400">
                  <strong className="text-white">Best for:</strong> Small businesses who want marketing on autopilot. You focus on closing—the AI handles the rest.
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-6"
                  onClick={handleBookAudit}
                >
                  Start Your Marketing Agent
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Tier 2: Full Clawdbot System */}
            <Card className="bg-slate-900/50 border-amber-500/30 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <Badge className="bg-amber-600/20 text-amber-400 border-amber-500/30">
                  <Star className="w-3 h-3 mr-1" />
                  PREMIUM
                </Badge>
              </div>
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-violet-600/20 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-violet-400" />
                </div>
                <CardTitle className="text-white text-2xl">Full Clawdbot System</CardTitle>
                <p className="text-gray-400">A complete AI employee, built for you</p>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="text-3xl font-bold text-white">$3,000 setup + $1,497<span className="text-lg text-gray-400">/mo</span></div>
                  <p className="text-sm text-gray-500">Custom quote for complex needs</p>
                </div>

                <p className="text-gray-400 text-sm mb-6">
                  Your own autonomous AI system—like having a full-time digital employee that never sleeps. Customized. Extensible. Yours.
                </p>

                <ul className="space-y-3 mb-8">
                  {[
                    "Everything in AI Marketing Agent",
                    "Complete autonomous Clawdbot (like Rico)",
                    "Customized to YOUR workflows",
                    "Multi-channel (email, SMS, social, calls)",
                    "AI agents that coordinate and hand off",
                    "Extensible—add capabilities over time",
                    "Priority support (same-day)",
                    "Quarterly strategy calls",
                    "Custom integrations"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="p-3 bg-slate-800/50 rounded-lg mb-6 text-sm text-gray-400">
                  <strong className="text-white">Best for:</strong> Businesses ready for true autonomy. An AI that thinks, adapts, and gets smarter. The future of how businesses operate.
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white py-6"
                  onClick={handleBookDiscovery}
                >
                  Book a Discovery Call
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Founding Customer Banner */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-amber-900/30 to-amber-800/20 border-amber-500/30">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-amber-600/20 flex items-center justify-center">
                    <Star className="w-8 h-8 text-amber-400" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-bold text-white mb-2">Founding Customer Program</h3>
                  <p className="text-gray-400 mb-4">
                    Be one of our first 20 customers. Get 25% off for life (locked, never increases), 
                    direct input on features, first access to new capabilities, and a direct line to founders.
                  </p>
                  <p className="text-amber-400 font-semibold">12 founding spots remaining.</p>
                </div>
                <Button 
                  className="bg-amber-600 hover:bg-amber-700 text-white px-6"
                  onClick={handleBookAudit}
                >
                  Claim Your Spot
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 px-4 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">From Audit to 10x in 4 Steps</h2>
          <p className="text-xl text-gray-400 text-center max-w-2xl mx-auto mb-12">
            Simple process, transformative results
          </p>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Free Audit", desc: "We map your workflows and identify 10x opportunities" },
              { step: "2", title: "Custom Build", desc: "We design and build your AI system, trained on YOUR business" },
              { step: "3", title: "Launch & Test", desc: "Deploy, monitor, optimize until it's running perfectly" },
              { step: "4", title: "Multiply", desc: "Watch your output scale while your hours stay the same" }
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

      {/* Free Automation Audit CTA */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            What Would 10x Look Like for Your Business?
          </h2>
          <p className="text-xl text-gray-400 text-center max-w-2xl mx-auto mb-8">
            Book a free 30-minute Automation Audit. We'll map out exactly where you're leaving productivity on the table—and show you what 10x could look like.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-violet-600/20 flex items-center justify-center mx-auto mb-3">
                <Settings className="w-5 h-5 text-violet-400" />
              </div>
              <h4 className="text-white font-semibold mb-1">Process Mapping</h4>
              <p className="text-gray-400 text-sm">We identify your biggest time-drains</p>
            </div>
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-violet-600/20 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-5 h-5 text-violet-400" />
              </div>
              <h4 className="text-white font-semibold mb-1">10x Roadmap</h4>
              <p className="text-gray-400 text-sm">Specific automations to multiply your output</p>
            </div>
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-violet-600/20 flex items-center justify-center mx-auto mb-3">
                <Shield className="w-5 h-5 text-violet-400" />
              </div>
              <h4 className="text-white font-semibold mb-1">Custom Quote</h4>
              <p className="text-gray-400 text-sm">Transparent pricing, no surprises</p>
            </div>
          </div>

          <div className="text-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-10 py-6 text-lg font-semibold rounded-xl"
              onClick={handleBookAudit}
            >
              Get Your Free Automation Audit
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-gray-500 text-sm mt-4">No credit card. No obligation. Just a conversation.</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-slate-900/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to 10x Your Output?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Stop working harder. Start working multiplied.
            Book your free Automation Audit today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8 py-6 text-lg"
              onClick={handleBookAudit}
            >
              Get Your Free Audit
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-slate-600 text-gray-300 hover:bg-slate-800 px-8 py-6 text-lg"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Compare Tiers
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
