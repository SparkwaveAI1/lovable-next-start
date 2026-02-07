import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  GraduationCap, 
  Briefcase, 
  Globe, 
  Bot,
  Calendar,
  ArrowRight,
  Linkedin,
  Twitter
} from "lucide-react";

export default function About() {
  const handleBookCall = () => {
    window.open('https://calendly.com/scott-sparkwave/30min', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 border-violet-500/50 text-violet-300">
            About Sparkwave
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Built by an Operator,
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              For Operators
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Sparkwave was born from decades of hands-on experience running businesses, 
            managing teams, and solving real operational problems.
          </p>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-8 md:p-12">
              <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                  <div className="w-48 h-48 mx-auto rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                    <span className="text-6xl font-bold text-white">SJ</span>
                  </div>
                  <div className="text-center mt-4">
                    <h3 className="text-xl font-semibold text-white">Scott Johnson</h3>
                    <p className="text-gray-400">Founder & CEO</p>
                    <div className="flex justify-center gap-3 mt-3">
                      <a href="https://linkedin.com/in/scottjohnson" target="_blank" rel="noopener noreferrer" 
                         className="text-gray-400 hover:text-violet-400 transition-colors">
                        <Linkedin className="w-5 h-5" />
                      </a>
                      <a href="https://twitter.com/scottsparkwave" target="_blank" rel="noopener noreferrer"
                         className="text-gray-400 hover:text-violet-400 transition-colors">
                        <Twitter className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <p className="text-gray-300 text-lg">
                    I've spent 25+ years building and running businesses — from a 300-person publishing 
                    production company serving McGraw-Hill, Pearson, and Wiley, to consulting engagements 
                    across learning, marketing, and technology.
                  </p>
                  <p className="text-gray-300 text-lg">
                    Along the way, I've seen the same pattern repeat: small businesses drowning in 
                    manual work that should be automated. Leads slipping through cracks. Follow-ups 
                    forgotten. Opportunities lost because no one had time to respond.
                  </p>
                  <p className="text-gray-300 text-lg">
                    Sparkwave is my answer to that problem. We use AI to handle the work that's 
                    critical but time-consuming — so you can focus on what actually grows your business.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Career Timeline */}
      <section className="py-16 px-4 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Experience That Matters</h2>
          
          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-violet-600/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-white">CEO, Interactive Composition Corporation</h3>
                  <Badge variant="secondary" className="text-xs">1998–2006</Badge>
                </div>
                <p className="text-gray-400">
                  Built and led a 300-person publishing production company with offices in Portland, OR 
                  and New Delhi, India. Served major publishers including McGraw-Hill, Pearson, Cengage, 
                  Houghton Mifflin, Wiley, and Harcourt. Successfully acquired by Macmillan Publishing Solutions.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-white">EVP Business Development & Operations, Macmillan</h3>
                  <Badge variant="secondary" className="text-xs">2006–2008</Badge>
                </div>
                <p className="text-gray-400">
                  Post-acquisition leadership role overseeing business development and operations 
                  integration across the combined organization.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-600/20 flex items-center justify-center">
                <Globe className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-white">Principal Consultant, Mosaico Solutions</h3>
                  <Badge variant="secondary" className="text-xs">2009–2023</Badge>
                </div>
                <p className="text-gray-400">
                  14 years of consulting across learning solutions, e-learning, market research, 
                  content strategy, and AI solutions. Based in Raleigh, NC and Fortaleza, Brazil. 
                  Worked with clients across education, technology, and professional services.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center">
                <span className="text-lg">🥋</span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-white">Owner, Fight Flow Academy</h3>
                  <Badge variant="secondary" className="text-xs">2019–Present</Badge>
                </div>
                <p className="text-gray-400">
                  Own and operate an MMA school in Raleigh-Durham. Black belt in Brazilian Jiu Jitsu. 
                  This is where I first experienced the pain of manual lead follow-up — 
                  and where Sparkwave's automation was battle-tested.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-violet-600/20 flex items-center justify-center">
                <Bot className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-white">Founder, Sparkwave AI</h3>
                  <Badge variant="secondary" className="text-xs">2023–Present</Badge>
                </div>
                <p className="text-gray-400">
                  Building the AI automation platform I wish I'd had for the past 25 years. 
                  Done-for-you lead response, follow-up, and customer communication — 
                  so small businesses can compete with enterprises without the headcount.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Education & Skills */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <GraduationCap className="w-6 h-6 text-violet-400" />
                  <h3 className="text-xl font-semibold text-white">Education</h3>
                </div>
                <p className="text-gray-300 font-medium">Cornell University</p>
                <p className="text-gray-400">BA in Government</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Globe className="w-6 h-6 text-violet-400" />
                  <h3 className="text-xl font-semibold text-white">Languages</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">English</span>
                    <span className="text-gray-400">Native</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Portuguese</span>
                    <span className="text-gray-400">Full Professional</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Spanish</span>
                    <span className="text-gray-400">Working Proficiency</span>
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
            Let's Talk About Your Business
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            I've run businesses. I understand the challenges. Let me show you how 
            Sparkwave can help you grow without adding headcount.
          </p>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8 py-6 text-lg"
            onClick={handleBookCall}
          >
            <Calendar className="w-5 h-5 mr-2" />
            Book a Call with Scott
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}
