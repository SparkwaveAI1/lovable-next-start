import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Bot, Zap, Star } from "lucide-react";

interface PricingTiersProps {
  onBookAudit?: () => void;
  onBookDiscovery?: () => void;
}

export function PricingTiers({ 
  onBookAudit = () => window.open('https://calendly.com/scott-sparkwave/30min', '_blank'),
  onBookDiscovery = () => window.open('https://calendly.com/scott-sparkwave/30min', '_blank')
}: PricingTiersProps) {
  return (
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
            <div className="text-3xl font-bold text-white">
              Starting at $997<span className="text-lg text-gray-400">/month</span>
            </div>
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
            onClick={onBookAudit}
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
            <div className="text-3xl font-bold text-white">
              $3,000 setup + $1,497<span className="text-lg text-gray-400">/mo</span>
            </div>
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
            onClick={onBookDiscovery}
          >
            Book a Discovery Call
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default PricingTiers;
