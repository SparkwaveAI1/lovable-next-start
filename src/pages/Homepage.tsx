import { useState } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  TrendingUp,
  Settings,
  Lightbulb,
  Users,
  ArrowRight,
  CheckCircle2,
  Menu,
  X,
  Zap,
  BarChart3,
  Target,
  MessageSquare,
  Twitter,
  Linkedin,
  Mail,
} from "lucide-react";

export default function Homepage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleBookAudit = () => {
    window.open("https://calendly.com/scott-sparkwave/30min", "_blank");
  };

  const handleBookDemo = () => {
    window.open("https://calendly.com/scott-sparkwave/30min", "_blank");
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const services = [
    {
      icon: TrendingUp,
      title: "AI Sales Automation",
      description:
        "Respond to every lead in 60 seconds. Custom AI systems that prospect, qualify, and follow up automatically. Win more deals just by being first.",
      outcome: "Respond in <60 seconds, win 21x more deals",
      color: "text-blue-400",
      bg: "bg-blue-600/20",
      border: "border-blue-500/30",
    },
    {
      icon: BarChart3,
      title: "AI Marketing Systems",
      description:
        "Automated content strategy, social media posting, email campaigns. Your entire funnel running without you.",
      outcome: "Posts 15+ times daily across platforms automatically",
      color: "text-purple-400",
      bg: "bg-purple-600/20",
      border: "border-purple-500/30",
    },
    {
      icon: Settings,
      title: "Custom Workflow Automation",
      description:
        "We map your business processes and automate them. Repetitive work disappears.",
      outcome: "Cut admin overhead by 60%+ per client",
      color: "text-emerald-400",
      bg: "bg-emerald-600/20",
      border: "border-emerald-500/30",
    },
    {
      icon: Lightbulb,
      title: "AI Strategy Consulting",
      description:
        "We audit where AI fits in your business, design the system, and hand you a working solution.",
      outcome: "Strategic clarity + working product, delivered in 4–8 weeks",
      color: "text-orange-400",
      bg: "bg-orange-600/20",
      border: "border-orange-500/30",
    },
  ];

  const processSteps = [
    {
      step: "01",
      title: "Discovery",
      description:
        "We audit your business, identify automation opportunities, and quantify the ROI.",
    },
    {
      step: "02",
      title: "Design",
      description:
        "We specify the AI system, show you mockups, get your approval before building.",
    },
    {
      step: "03",
      title: "Build",
      description:
        "We implement, test, and deploy the solution end-to-end. You see it working.",
    },
    {
      step: "04",
      title: "Handoff",
      description:
        "You get full documentation, training, and ongoing support. It's yours.",
    },
  ];

  const caseStudies = [
    {
      title: "CharX World",
      emoji: "🎭",
      challenge:
        "Creator needed a character engine for interactive fiction with AI-powered relationships.",
      solution:
        "Built CharX — a full character and relationship system with deep AI integration.",
      result: "Live product with a growing user base",
      link: "/case-studies",
    },
    {
      title: "DoGoodNow",
      emoji: "🌱",
      challenge:
        "Social impact platform needed AI-powered volunteer matching at scale.",
      solution:
        "Custom AI matching system plus a complete volunteer management interface.",
      result: "Deployed and live with hundreds of matches per month",
      link: "/case-studies",
    },
  ];

  const testimonial = {
    quote:
      "Sparkwave took our sales process from manual and slow to fully automated. We're reaching 10x more prospects without adding staff.",
    name: "Scott Johnson",
    title: "Owner, Fight Flow Academy",
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <SEO
        title="AI Automation That Drives Revenue"
        description="We build custom AI systems for sales, marketing, and operations. Not chatbot wrappers. Real automation that 10x your team output."
        canonical="/"
      />

      {/* ── NAVIGATION ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e1a]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Sparkwave AI</span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection("services")}
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                Services
              </button>
              <Link
                to="/persona-ai"
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                Products
              </Link>
              <Link
                to="/case-studies"
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                Case Studies
              </Link>
              <Link
                to="/about"
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                About
              </Link>
              <Link
                to="/blog"
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                Blog
              </Link>
              <Link
                to="/docs"
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                Resources
              </Link>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/about"
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                Contact
              </Link>
              <Button
                onClick={handleBookDemo}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-semibold px-5 py-2 rounded-lg"
              >
                Book a Demo
              </Button>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden text-gray-300 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a0e1a] border-t border-white/10 px-4 py-4 flex flex-col gap-4">
            <button
              onClick={() => scrollToSection("services")}
              className="text-left text-gray-300 hover:text-white py-2"
            >
              Services
            </button>
            <Link
              to="/persona-ai"
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-300 hover:text-white py-2"
            >
              Products
            </Link>
            <Link
              to="/case-studies"
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-300 hover:text-white py-2"
            >
              Case Studies
            </Link>
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-300 hover:text-white py-2"
            >
              About
            </Link>
            <Link
              to="/blog"
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-300 hover:text-white py-2"
            >
              Blog
            </Link>
            <Link
              to="/docs"
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-300 hover:text-white py-2"
            >
              Resources
            </Link>
            <div className="pt-2 border-t border-white/10">
              <Button
                onClick={handleBookDemo}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg"
              >
                Book a Demo
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-[1280px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div>
              <Badge
                variant="outline"
                className="mb-6 border-blue-500/50 text-blue-300 bg-blue-600/10"
              >
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                AI Services Company
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Respond to Leads
                <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  in 60 Seconds
                </span>
              </h1>

              <p className="text-xl text-gray-400 mb-8 leading-relaxed max-w-lg">
                50% of sales go to the first responder. Sparkwave automates lead response, qualification, and follow-up so your team never misses a deal. From first contact to closed won — in less time.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Link to="/roi-calculator">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-8 py-6 text-base rounded-xl w-full"
                  >
                    Calculate Your ROI
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  onClick={handleBookAudit}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-6 text-base rounded-xl"
                >
                  Book a Demo
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>

              {/* Social Proof */}
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  Trusted by SMB owners and operators
                </p>
                <div className="flex flex-wrap items-center gap-6">
                  {["Fight Flow Academy", "CharX World", "DoGoodNow"].map(
                    (name) => (
                      <span
                        key={name}
                        className="text-sm font-medium text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg"
                      >
                        {name}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Right: Abstract workflow visual */}
            <div className="hidden lg:block relative">
              <div className="relative w-full h-[420px] bg-[#1a202c] rounded-2xl border border-white/10 shadow-2xl overflow-hidden p-6">
                {/* Workflow diagram mock */}
                <div className="flex flex-col gap-4 h-full justify-center">
                  {[
                    {
                      icon: Target,
                      label: "Lead Captured",
                      color: "text-blue-400",
                      bg: "bg-blue-600/20",
                    },
                    {
                      icon: Bot,
                      label: "AI Qualifies & Scores",
                      color: "text-purple-400",
                      bg: "bg-purple-600/20",
                    },
                    {
                      icon: MessageSquare,
                      label: "Auto Follow-Up Sent",
                      color: "text-emerald-400",
                      bg: "bg-emerald-600/20",
                    },
                    {
                      icon: BarChart3,
                      label: "Deal Closed → Revenue",
                      color: "text-orange-400",
                      bg: "bg-orange-600/20",
                    },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {i > 0 && (
                        <div className="absolute left-[39px] w-px bg-white/10 h-8" style={{ top: `${82 + (i - 1) * 72}px` }} />
                      )}
                      <div
                        className={`w-10 h-10 ${step.bg} rounded-xl flex items-center justify-center flex-shrink-0`}
                      >
                        <step.icon className={`w-5 h-5 ${step.color}`} />
                      </div>
                      <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                        <span className="text-sm font-medium text-gray-300">
                          {step.label}
                        </span>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>

                {/* Pulse indicator */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-500">Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES SECTION ── */}
      <section id="services" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0d1220]">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-14">
            <Badge
              variant="outline"
              className="mb-4 border-blue-500/50 text-blue-300 bg-blue-600/10"
            >
              What We Do
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Custom AI Systems for
              <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Real Business Impact
              </span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              We don't sell software licenses. We build bespoke AI systems
              tailored to how your business actually operates.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service) => (
              <Card
                key={service.title}
                className={`bg-[#1a202c] border ${service.border} hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-default`}
              >
                <CardContent className="p-8">
                  <div
                    className={`w-12 h-12 ${service.bg} rounded-xl flex items-center justify-center mb-5`}
                  >
                    <service.icon className={`w-6 h-6 ${service.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">
                    {service.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed mb-4">
                    {service.description}
                  </p>
                  <div className="pt-3 border-t border-white/10">
                    <p className="text-xs text-gray-500 italic">
                      &ldquo;{service.outcome}&rdquo;
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button
              onClick={handleBookAudit}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-4 rounded-xl text-base"
            >
              Start with a Free Audit
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── PRODUCTS SECTION ── (Moved after How It Works for secondary positioning) */}

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0d1220]">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-14">
            <Badge
              variant="outline"
              className="mb-4 border-emerald-500/50 text-emerald-300 bg-emerald-600/10"
            >
              Our Process
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              From Audit to Automation
              <span className="block bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                in 4–8 Weeks
              </span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              We don't hand you a roadmap. We build you a working system.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {processSteps.map((step, i) => (
              <div key={step.step} className="relative">
                {i < processSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-white/20 to-transparent z-10 -translate-x-3" />
                )}
                <div className="bg-[#1a202c] border border-white/10 rounded-2xl p-6 h-full">
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CASE STUDIES / PORTFOLIO ── */}
      <section id="case-studies" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0a0e1a]">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-14">
            <Badge
              variant="outline"
              className="mb-4 border-orange-500/50 text-orange-300 bg-orange-600/10"
            >
              Work We've Done
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Real Systems.
              <span className="block bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                Real Results.
              </span>
            </h2>
            <p className="text-lg text-gray-400 max-w-xl mx-auto">
              These aren't demos. They're live, working products we built for
              real businesses.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {caseStudies.map((cs) => (
              <Card
                key={cs.title}
                className="bg-[#1a202c] border border-white/10 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
              >
                <CardContent className="p-8">
                  <div className="text-4xl mb-4">{cs.emoji}</div>
                  <h3 className="text-xl font-bold text-white mb-4">
                    {cs.title}
                  </h3>
                  <div className="space-y-3 mb-6">
                    <div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Challenge
                      </span>
                      <p className="text-sm text-gray-400 mt-1">
                        {cs.challenge}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Solution
                      </span>
                      <p className="text-sm text-gray-400 mt-1">
                        {cs.solution}
                      </p>
                    </div>
                    <div className="pt-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <p className="text-sm font-medium text-emerald-300">
                        {cs.result}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={cs.link}
                    className="inline-flex items-center text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    View Case Study
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/case-studies">
              <Button
                variant="outline"
                className="border-2 border-white/20 text-gray-300 hover:bg-white/10 hover:text-white font-semibold px-7 py-4 rounded-xl"
              >
                See All Case Studies
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── PERSONAAI SHOWCASE (Secondary: Product for clients) ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0a0e1a]">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div>
              <Badge
                variant="outline"
                className="mb-5 border-purple-500/50 text-purple-300 bg-purple-600/10"
              >
                Our Research Tool
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5 leading-tight">
                Use PersonaAI for{" "}
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Customer Insights
                </span>
              </h2>
              <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                Built as part of our AI research work: 4,000+ AI personas for UX testing, product feedback, and market research. No surveys. No bias. Get instant insights from demographically diverse personas.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => window.open("https://personaresearch.ai", "_blank")}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-7 py-4 rounded-xl"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Explore PersonaAI
                </Button>
              </div>
            </div>

            {/* Right: Product mock */}
            <div className="bg-[#1a202c] rounded-2xl border border-white/10 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">
                    PersonaAI Platform
                  </span>
                </div>
                <Badge className="bg-emerald-600/20 text-emerald-300 border-emerald-500/30 text-xs">
                  4,000+ Personas
                </Badge>
              </div>

              {/* Persona list mock */}
              <div className="space-y-3">
                {[
                  {
                    name: "Sarah M.",
                    desc: "Millennial, urban professional, tech-forward",
                    color: "bg-blue-500",
                  },
                  {
                    name: "James K.",
                    desc: "Gen X, suburban SMB owner, value-driven",
                    color: "bg-purple-500",
                  },
                  {
                    name: "Priya L.",
                    desc: "Gen Z, first-gen entrepreneur, mobile-first",
                    color: "bg-pink-500",
                  },
                  {
                    name: "Robert T.",
                    desc: "Boomer, enterprise exec, risk-averse",
                    color: "bg-orange-500",
                  },
                ].map((persona) => (
                  <div
                    key={persona.name}
                    className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3"
                  >
                    <div
                      className={`w-8 h-8 ${persona.color} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                    >
                      {persona.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {persona.name}
                      </p>
                      <p className="text-xs text-gray-500">{persona.desc}</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto flex-shrink-0" />
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-purple-600/10 border border-purple-500/20 rounded-lg">
                <p className="text-xs text-purple-300 text-center">
                  Simulate conversations with any demographic instantly
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0d1220]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-[#1a202c] border border-white/10 rounded-2xl p-10 shadow-xl">
            <div className="text-5xl text-blue-400/30 font-serif mb-4">&ldquo;</div>
            <p className="text-xl text-gray-300 leading-relaxed italic mb-8">
              {testimonial.quote}
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {testimonial.name.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">
                  {testimonial.name}
                </p>
                <p className="text-xs text-gray-500">{testimonial.title}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA BAND ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0a0e1a] to-[#0d1525]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight">
            Ready to{" "}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              10x Your Output?
            </span>
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            Let's talk about what automation could do for your business.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={handleBookAudit}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-10 py-6 text-lg rounded-xl"
            >
              Book Your Free Audit
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <a
              href="mailto:hello@sparkwave-ai.com"
              className="text-gray-400 hover:text-white transition-colors text-base flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              hello@sparkwave-ai.com
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#080b14] border-t border-white/10 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-white">Sparkwave AI</span>
              </div>
              <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                Custom AI systems for sales, marketing, and operations. We build
                automation that drives real revenue for SMB owners and operators.
              </p>
              <div className="flex items-center gap-4 mt-5">
                <a
                  href="https://twitter.com/scottsparkwave"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-white transition-colors"
                  aria-label="Twitter/X"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="https://linkedin.com/company/sparkwave-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-white transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
                <a
                  href="mailto:hello@sparkwave-ai.com"
                  className="text-gray-500 hover:text-white transition-colors"
                  aria-label="Email"
                >
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                Company
              </h4>
              <ul className="space-y-3">
                {[
                  { label: "About", href: "/about" },
                  { label: "Services", href: "/services" },
                  { label: "Case Studies", href: "/case-studies" },
                  { label: "Blog", href: "/blog" },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-gray-500 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                Resources
              </h4>
              <ul className="space-y-3">
                {[
                  { label: "Documentation", href: "/docs" },
                  { label: "PersonaAI", href: "/persona-ai" },
                  { label: "ROI Calculator", href: "/roi-calculator" },
                  { label: "Free Audit", href: "/audit" },
                  { label: "Privacy Policy", href: "/docs" },
                  { label: "Terms of Service", href: "/docs" },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-gray-500 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              © 2026 Sparkwave AI. All rights reserved.
            </p>
            <a
              href="mailto:hello@sparkwave-ai.com"
              className="text-sm text-gray-600 hover:text-white transition-colors"
            >
              hello@sparkwave-ai.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
