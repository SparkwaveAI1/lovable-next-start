import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Bot, Zap, Star } from "lucide-react";

interface PricingTiersProps {
  onBookAudit?: () => void;
  onBookDiscovery?: () => void;
  onApplyFounding?: () => void;
  showGuarantee?: boolean;
  showFoundingProgram?: boolean;
}

export function PricingTiers({ 
  onBookAudit = () => window.open('https://calendly.com/scott-sparkwave/30min', '_blank'),
  onBookDiscovery = () => window.open('https://calendly.com/scott-sparkwave/30min', '_blank'),
  onApplyFounding = () => window.open('https://calendly.com/scott-sparkwave/30min', '_blank'),
  showGuarantee = true,
  showFoundingProgram = true
}: PricingTiersProps) {
  return (
    <div className="space-y-8">
      {/* Guarantee Banner */}
      {showGuarantee && (
        <div className="text-center mb-4">
          <p className="text-lg text-emerald-400 font-semibold">
            90-Day ROI Guarantee: If you don't see measurable ROI, we refund your setup.
          </p>
        </div>
      )}

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
                $997<span className="text-lg text-gray-400">/month</span>
              </div>
            </div>

            {/* ROI Math Box */}
            <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-lg mb-6">
              <h4 className="text-emerald-400 font-semibold text-sm mb-2">THE ROI MATH</h4>
              <p className="text-gray-300 text-sm mb-2">
                Average client closes <span className="text-white font-semibold">3 extra deals/month</span> from faster response
              </p>
              <p className="text-emerald-400 font-semibold">→ $9,000-15,000 in new revenue</p>
              <div className="mt-3 pt-3 border-t border-emerald-500/20">
                <p className="text-gray-400 text-xs">Cost: $997/month · Typical return: <span className="text-emerald-400">9-15x</span></p>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {[
                "LLM-powered Marketing Agent",
                "Connects to GoHighLevel, HubSpot, or your CRM",
                "Instant lead response (sub-30-second)",
                "AI-written email & SMS sequences",
                "Simple control dashboard",
                "Weekly performance reports"
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="p-3 bg-slate-800/50 rounded-lg mb-6 text-sm text-gray-400">
              <strong className="text-white">Built for:</strong> The owner coaching classes at 7 PM while leads hit the website. The contractor on a job site who can't check their phone. You're already working hard enough. This works while you do.
            </div>

            <Button 
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-6"
              onClick={onBookAudit}
            >
              Start Your Marketing Agent
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-gray-500 text-xs text-center mt-2">90-day ROI guarantee</p>
          </CardContent>
        </Card>

        {/* Tier 2: Full Clawdbot System */}
        <Card className="bg-slate-900/50 border-violet-500/30 relative overflow-hidden">
          <div className="absolute top-4 right-4">
            <Badge className="bg-violet-600/20 text-violet-400 border-violet-500/30">
              FOR SERIOUS OPERATORS
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
            </div>

            {/* Value Comparison Box */}
            <div className="p-4 bg-violet-900/20 border border-violet-500/30 rounded-lg mb-6">
              <h4 className="text-violet-400 font-semibold text-sm mb-2">WHAT YOU'RE ACTUALLY BUYING</h4>
              <p className="text-gray-300 text-sm mb-2">
                A full-time marketing + ops person costs <span className="text-white font-semibold">$4,500/month+</span>
              </p>
              <p className="text-violet-400 font-semibold">This does more, never sleeps, costs less.</p>
              <div className="mt-3 pt-3 border-t border-violet-500/20">
                <p className="text-gray-400 text-xs">Fight Flow result: <span className="text-violet-400">175% more trial bookings</span></p>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {[
                "Everything in AI Marketing Agent",
                "Complete autonomous Clawdbot (like Rico)",
                "Customized to YOUR workflows",
                "Multi-channel (email, SMS, social, calls)",
                "AI agents that coordinate and hand off",
                "Priority support (same-day)",
                "Quarterly strategy calls"
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="p-3 bg-slate-800/50 rounded-lg mb-6 text-sm text-gray-400">
              <strong className="text-white">Built for:</strong> The operator who wants a competitive weapon. You've automated the basics. Now you want an AI that thinks, adapts, and runs entire workflows autonomously. This is the system that runs while you sleep.
            </div>

            <Button 
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white py-6"
              onClick={onBookDiscovery}
            >
              Book a Discovery Call
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-gray-500 text-xs text-center mt-2">We'll show you exactly what we'd build</p>
          </CardContent>
        </Card>
      </div>

      {/* Founding 20 Program - Per Quality Gate Recommendations */}
      {showFoundingProgram && (
        <Card className="mt-8 bg-gradient-to-r from-amber-900/30 to-amber-800/20 border-amber-500/30">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-amber-600/20 flex items-center justify-center mb-4">
                <Star className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">🏆 FOUNDING 20</h3>
              <p className="text-gray-300 mb-6 max-w-2xl">
                We're taking 20 founding customers. You get more than a discount.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4 mb-6 text-left max-w-xl">
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span><strong className="text-white">25% off FOREVER</strong> (price never increases)</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Direct Slack channel with founders</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Vote on features we build next</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Your use case shapes the product</span>
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-4">
                We want customers who want to build <span className="text-white">WITH</span> us, not just buy <span className="text-white">FROM</span> us.
              </p>
              
              <p className="text-amber-400 font-bold text-lg mb-6">8 spots remaining.</p>
              
              <Button 
                className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-6 text-lg"
                onClick={onApplyFounding}
              >
                Apply for Founding Access
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PricingTiers;
