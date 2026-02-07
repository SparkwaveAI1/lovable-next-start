import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp,
  Clock,
  Users,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Quote
} from "lucide-react";

export default function CaseStudies() {
  const handleBookCall = () => {
    window.open('https://calendly.com/scott-sparkwave/30min', '_blank');
  };

  const caseStudies = [
    {
      company: "Fight Flow Academy",
      industry: "Fitness / Martial Arts",
      logo: "🥋",
      challenge: "Leads were slipping through the cracks. The owner was too busy coaching to respond to inquiries quickly, and potential members were signing up with competitors.",
      solution: "Sparkwave AI now responds to every lead within seconds, 24/7. Automated follow-up sequences keep prospects engaged until they book a trial class.",
      results: [
        { metric: "Response Time", before: "4-6 hours", after: "<30 seconds", improvement: "99%" },
        { metric: "Lead Response Rate", before: "60%", after: "100%", improvement: "67%" },
        { metric: "Trial Bookings", before: "8/month", after: "22/month", improvement: "175%" }
      ],
      quote: "I was losing leads because I couldn't get to my phone while coaching. Now every inquiry gets handled instantly, even at 2 AM.",
      quoteName: "Scott Johnson",
      quoteTitle: "Owner, Fight Flow Academy"
    },
    {
      company: "Local HVAC Company",
      industry: "Home Services",
      logo: "🔧",
      challenge: "Emergency calls were going to voicemail after hours. Customers with urgent heating/cooling issues would call the next company on their list.",
      solution: "Sparkwave captures after-hours inquiries, qualifies the urgency, and schedules callbacks or dispatches emergency service automatically.",
      results: [
        { metric: "After-Hours Capture", before: "20%", after: "95%", improvement: "375%" },
        { metric: "Emergency Response", before: "Next day", after: "2 hours", improvement: "90%" },
        { metric: "Monthly Revenue", before: "$45K", after: "$62K", improvement: "38%" }
      ],
      quote: "We were leaving money on the table every night. Sparkwave turned our after-hours into our most profitable time.",
      quoteName: "Mike R.",
      quoteTitle: "Owner, Local HVAC"
    },
    {
      company: "Boutique Law Firm",
      industry: "Legal Services",
      logo: "⚖️",
      challenge: "Intake calls required immediate attention, but attorneys were often in court or with clients. Potential cases were lost to firms that answered faster.",
      solution: "Sparkwave handles initial intake, gathers case details, and schedules consultations — all while maintaining the professional tone expected in legal services.",
      results: [
        { metric: "Intake Completion", before: "45%", after: "92%", improvement: "104%" },
        { metric: "Consultation Bookings", before: "12/month", after: "28/month", improvement: "133%" },
        { metric: "Time Saved", before: "0", after: "15 hrs/week", improvement: "∞" }
      ],
      quote: "The AI handles intake better than most humans. It asks the right questions and never forgets to get contact information.",
      quoteName: "Sarah L.",
      quoteTitle: "Managing Partner"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero */}
      <section className="relative pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 border-emerald-500/50 text-emerald-300">
            <TrendingUp className="w-4 h-4 mr-2" />
            Real Results
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            See How Businesses
            <span className="block bg-gradient-to-r from-emerald-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              Win More Customers
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Real stories from real businesses using Sparkwave to capture more leads, 
            respond faster, and grow their revenue.
          </p>
        </div>
      </section>

      {/* Case Studies */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto space-y-12">
          {caseStudies.map((study, index) => (
            <Card key={index} className="bg-slate-900/50 border-slate-800 overflow-hidden">
              <CardHeader className="border-b border-slate-800 bg-slate-900/30">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{study.logo}</div>
                  <div>
                    <CardTitle className="text-white text-xl">{study.company}</CardTitle>
                    <p className="text-gray-400">{study.industry}</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 space-y-6">
                {/* Challenge & Solution */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-2">The Challenge</h3>
                    <p className="text-gray-300">{study.challenge}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">The Solution</h3>
                    <p className="text-gray-300">{study.solution}</p>
                  </div>
                </div>

                {/* Results */}
                <div>
                  <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-4">Results</h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {study.results.map((result, i) => (
                      <div key={i} className="bg-slate-800/50 rounded-lg p-4 text-center">
                        <div className="text-sm text-gray-400 mb-1">{result.metric}</div>
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <span className="text-red-400 line-through">{result.before}</span>
                          <ArrowRight className="w-4 h-4 text-gray-500" />
                          <span className="text-emerald-400 font-semibold">{result.after}</span>
                        </div>
                        <Badge className="mt-2 bg-emerald-600/20 text-emerald-300 border-emerald-500/30">
                          +{result.improvement}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quote */}
                <div className="bg-slate-800/30 rounded-lg p-4 border-l-4 border-violet-500">
                  <Quote className="w-6 h-6 text-violet-400 mb-2" />
                  <p className="text-gray-300 italic mb-3">"{study.quote}"</p>
                  <div className="text-sm">
                    <span className="text-white font-medium">{study.quoteName}</span>
                    <span className="text-gray-400"> — {study.quoteTitle}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Be Our Next Success Story?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            See how Sparkwave can transform your lead response and help you 
            win more customers.
          </p>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8 py-6 text-lg"
            onClick={handleBookCall}
          >
            <Calendar className="w-5 h-5 mr-2" />
            Book Your Demo
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}
