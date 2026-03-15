'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Check, Search, MapPin, Target, BarChart, Link, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabase/client';

export default function SEOLandingPage() {
  const [formData, setFormData] = useState({
    website: '',
    email: '',
    name: '',
    businessType: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('seo_audit_requests')
        .insert([{
          website: formData.website,
          email: formData.email,
          name: formData.name,
          business_type: formData.businessType,
          status: 'pending'
        }]);

      if (error) throw error;

      toast.success(`Thank you, ${formData.name}! We'll analyze ${formData.website} and send your free SEO audit within 24 hours to ${formData.email}.`);
      
      setFormData({
        website: '',
        email: '',
        name: '',
        businessType: ''
      });
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 w-full bg-slate-900 text-white z-50 shadow-lg">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold">Sparkwave AI</div>
          <Button 
            variant="destructive"
            onClick={() => document.getElementById('audit')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Get Free Audit
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-20 bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 text-white">
        <div className="container mx-auto px-6 py-24 text-center">
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Your Competitors Are Stealing Your Customers
          </h1>
          <p className="text-xl mb-12 opacity-90">
            Get a free SEO audit that shows exactly why they outrank you — and how to fix it
          </p>

          {/* Audit Form */}
          <Card className="max-w-md mx-auto p-8" id="audit">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Get Your Free SEO Audit</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yourbusiness.com"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@business.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="business-type">Business Type</Label>
                <Select
                  value={formData.businessType}
                  onValueChange={(value) => setFormData({...formData, businessType: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant/Food</SelectItem>
                    <SelectItem value="hotel">Hotel/Hospitality</SelectItem>
                    <SelectItem value="retail">Retail/E-commerce</SelectItem>
                    <SelectItem value="service">Professional Services</SelectItem>
                    <SelectItem value="health">Healthcare/Wellness</SelectItem>
                    <SelectItem value="realestate">Real Estate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                type="submit" 
                className="w-full text-lg py-6"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Get My Free Audit →'}
              </Button>
              
              <p className="text-sm text-gray-600 text-center mt-4">
                Free audit delivered in 24 hours. No credit card required.
              </p>
            </form>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-4">What We'll Analyze</h2>
          <p className="text-xl text-gray-600 text-center mb-12">
            Your comprehensive audit covers everything affecting your search rankings
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-8 text-center hover:shadow-lg transition-shadow">
              <Search className="w-16 h-16 mx-auto mb-4 text-purple-600" />
              <h3 className="text-xl font-bold mb-3">Technical SEO</h3>
              <p className="text-gray-600">Site speed, mobile responsiveness, crawl errors, and indexing issues that block your visibility</p>
            </Card>
            
            <Card className="p-8 text-center hover:shadow-lg transition-shadow">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-purple-600" />
              <h3 className="text-xl font-bold mb-3">Local SEO</h3>
              <p className="text-gray-600">Google Business Profile optimization, local citations, and map rankings for your area</p>
            </Card>
            
            <Card className="p-8 text-center hover:shadow-lg transition-shadow">
              <Target className="w-16 h-16 mx-auto mb-4 text-purple-600" />
              <h3 className="text-xl font-bold mb-3">Competitor Analysis</h3>
              <p className="text-gray-600">See exactly why competitors rank above you and get a roadmap to overtake them</p>
            </Card>
            
            <Card className="p-8 text-center hover:shadow-lg transition-shadow">
              <BarChart className="w-16 h-16 mx-auto mb-4 text-purple-600" />
              <h3 className="text-xl font-bold mb-3">Content Gaps</h3>
              <p className="text-gray-600">Keywords your competitors rank for that you're missing out on entirely</p>
            </Card>
            
            <Card className="p-8 text-center hover:shadow-lg transition-shadow">
              <Link className="w-16 h-16 mx-auto mb-4 text-purple-600" />
              <h3 className="text-xl font-bold mb-3">Backlink Profile</h3>
              <p className="text-gray-600">Quality and quantity of sites linking to you vs. your competition</p>
            </Card>
            
            <Card className="p-8 text-center hover:shadow-lg transition-shadow">
              <Zap className="w-16 h-16 mx-auto mb-4 text-purple-600" />
              <h3 className="text-xl font-bold mb-3">Quick Wins</h3>
              <p className="text-gray-600">Immediate fixes that can boost your rankings within days, not months</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-12">Real Results for Real Businesses</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div>
              <div className="text-5xl font-bold text-purple-600 mb-4">147%</div>
              <p className="text-gray-600">Average traffic increase in 90 days</p>
            </div>
            <div>
              <div className="text-5xl font-bold text-purple-600 mb-4">3.2x</div>
              <p className="text-gray-600">More leads from organic search</p>
            </div>
            <div>
              <div className="text-5xl font-bold text-purple-600 mb-4">$4.20</div>
              <p className="text-gray-600">ROI for every $1 spent on SEO</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
          <p className="text-xl text-gray-600 text-center mb-12">
            Start with a free audit, then choose the plan that fits your goals
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-bold mb-4">Quick Win</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">$1,997</span>
                <span className="text-gray-600"> one-time</span>
              </div>
              <p className="mb-6 text-gray-600">Fix critical issues fast</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center"><Check className="w-5 h-5 mr-2 text-green-500" /> Top 10 technical fixes</li>
                <li className="flex items-center"><Check className="w-5 h-5 mr-2 text-green-500" /> 5 key pages optimized</li>
                <li className="flex items-center"><Check className="w-5 h-5 mr-2 text-green-500" /> Google Business Profile setup</li>
                <li className="flex items-center"><Check className="w-5 h-5 mr-2 text-green-500" /> 30-day support</li>
              </ul>
              <Button 
                className="w-full"
                variant="outline"
                onClick={() => document.getElementById('audit')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Get Started
              </Button>
            </Card>
            
            <Card className="p-8 border-2 border-red-500 shadow-lg relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                MOST POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-4">Growth</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">$2,997</span>
                <span className="text-gray-600"> /month</span>
              </div>
              <p className="mb-6 text-gray-600">Consistent traffic growth</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center"><Check className="w-5 h-5 mr-2 text-green-500" /> Everything in Quick Win</li>
                <li className="flex items-center"><Check className="w-5 h-5 mr-2 text-green-500" /> Monthly monitoring</li>
                <li className="flex items-center"><Check className="w-5 h-5 mr-2 text-green-500" /> 4 new pages/month</li>
                <li className="flex items-center"><Check className="w-5 h-5 mr-2 text-green-500" /> Competitor tracking</li>
                <li className="flex items-center"><Check className="w-5 h-5 mr-2 text-green-500" /> Dedicated manager</li>
              </ul>
              <Button 
                className="w-full"
                onClick={() => document.getElementById('audit')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Get Started
              </Button>
            </Card>
            
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-bold mb-4">Domination</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">$5,997</span>
                <span className="text-gray-600"> /month</span>
              </div>
              <p className="mb-6 text-gray-600">Own your market</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center"><Check className="w-5 h-5 mr-2 text-green-500" /> Everything in Growth</li>
                <li className="flex items-center"><Check className="w-5 h-5 mr-2 text-green-500" /> 10 new pages/month</li>
                <li className="flex items-center"><Check className="w-5 h-5 mr-2 text-green-500" /> Link building campaign</li>
                <li className="flex items-center"><Check className="w-5 h-5 mr-2 text-green-500" /> Content creation</li>
                <li className="flex items-center"><Check className="w-5 h-5 mr-2 text-green-500" /> Custom dashboard</li>
              </ul>
              <Button 
                className="w-full"
                variant="outline"
                onClick={() => document.getElementById('audit')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Get Started
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-6 text-center">
          <p>&copy; 2024 Sparkwave AI. All rights reserved.</p>
          <p className="mt-4 opacity-80">Questions? Email info@sparkwave-ai.com</p>
        </div>
      </footer>
    </div>
  );
}