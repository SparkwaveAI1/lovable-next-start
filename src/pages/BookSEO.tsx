import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getLeadAttribution } from "@/lib/leadAttribution";
import { CheckCircle2, Clock, TrendingUp } from "lucide-react";
import sparkwaveIcon from "@/assets/sparkwave-icon.png";

const PRIMARY_GOALS = [
  "Increase organic traffic",
  "Rank for specific keywords",
  "Fix technical SEO issues",
  "Improve local SEO",
  "Other",
];

const BUDGETS = [
  "Under $500/mo",
  "$500–$1,000/mo",
  "$1,000–$2,500/mo",
  "$2,500+/mo",
];

const TIME_SLOTS = [
  "9:00 AM EST",
  "10:00 AM EST",
  "11:00 AM EST",
  "12:00 PM EST",
  "1:00 PM EST",
  "2:00 PM EST",
  "3:00 PM EST",
  "4:00 PM EST",
  "5:00 PM EST",
];

export default function BookSEO() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [budget, setBudget] = useState("");
  const [seoChallenge, setSeoChallenge] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [honeypot, setHoneypot] = useState(""); // anti-spam
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submitCooldown = useRef(false);
  const { toast } = useToast();

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split("T")[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check — silently reject bots
    if (honeypot) return;

    // Prevent double-submit
    if (submitCooldown.current) return;

    // Validate date range
    const minDate = getMinDate();
    const maxDate = getMaxDate();
    if (preferredDate < minDate || preferredDate > maxDate) {
      toast({ title: "Invalid date", description: "Please choose a date between tomorrow and 30 days from now.", variant: "destructive" });
      return;
    }

    // Validate time slot
    if (!TIME_SLOTS.includes(preferredTime)) {
      toast({ title: "Invalid time", description: "Please select a valid time slot.", variant: "destructive" });
      return;
    }

    setLoading(true);
    submitCooldown.current = true;

    // Step 1: Insert to Supabase
    const attribution = getLeadAttribution();
    const { error: insertError } = await supabase
      .from("sparkwave_booking_requests")
      .insert({
        name,
        email,
        phone: phone || null,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        topic: "SEO Strategy Call",
        message: JSON.stringify({
          website_url: websiteUrl,
          primary_goal: primaryGoal,
          budget,
          seo_challenge: seoChallenge,
        }),
        status: "pending",
        ...attribution,
      });

    if (insertError) {
      console.error("Booking insert error:", insertError);
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
      setLoading(false);
      setTimeout(() => { submitCooldown.current = false; }, 3000);
      return;
    }

    // Step 2: Show pending-review success only.
    // /book/seo now follows the same intake path as /book: record the request for manual review,
    // preserve attribution via getLeadAttribution(), and do not fire customer-facing or internal
    // confirmation emails from this page.
    setLoading(false);
    setSubmitted(true);
    toast({
      title: "Request submitted",
      description: "We'll review your SEO strategy request and confirm next steps within 24 hours.",
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700 text-white text-center">
          <CardContent className="pt-12 pb-10 px-8">
            <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-3">Request Received!</h2>
            <p className="text-slate-300 text-base mb-6">
              Your SEO strategy request is pending manual review. We'll be in touch within 24 hours to confirm next steps.
            </p>
            <p className="text-slate-400 text-sm">
              Questions? Email us at{" "}
              <a href="mailto:info@sparkwave-ai.com" className="text-green-400 hover:underline">
                info@sparkwave-ai.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-slate-800 border-slate-700 text-white">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <img src={sparkwaveIcon} alt="Sparkwave AI" className="h-10 w-10" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <TrendingUp className="h-5 w-5 text-green-400" />
            <span className="text-green-400 text-sm font-medium uppercase tracking-wide">SEO Strategy Call</span>
          </div>
          <CardTitle className="text-2xl font-bold text-white">Book Your Free SEO Strategy Call</CardTitle>
          <CardDescription className="text-slate-300 mt-1">
            Tell us about your site and goals. We'll confirm your call within 24 hours.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Honeypot — hidden from real users */}
          <input
            name="website_confirm"
            tabIndex={-1}
            style={{ display: "none" }}
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            autoComplete="off"
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-200">Name *</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-200">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteUrl" className="text-slate-200">Your Website *</Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://yourwebsite.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200">Primary SEO Goal *</Label>
              <Select value={primaryGoal} onValueChange={setPrimaryGoal} required>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="What's your main goal?" />
                </SelectTrigger>
                <SelectContent>
                  {PRIMARY_GOALS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200">Monthly Budget *</Label>
              <Select value={budget} onValueChange={setBudget} required>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select your budget range" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGETS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seoChallenge" className="text-slate-200">Biggest SEO Challenge (optional)</Label>
              <Textarea
                id="seoChallenge"
                placeholder="What's your biggest SEO pain point right now?"
                value={seoChallenge}
                onChange={(e) => setSeoChallenge(e.target.value)}
                rows={3}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-slate-200">Preferred Date *</Label>
                <Input
                  id="date"
                  type="date"
                  min={getMinDate()}
                  max={getMaxDate()}
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Preferred Time *</Label>
                <Select value={preferredTime} onValueChange={setPreferredTime} required>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder={<span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Select time</span>} />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
              disabled={loading || !preferredTime || !primaryGoal || !budget}
            >
              {loading ? "Booking..." : "Request My Strategy Call →"}
            </Button>

            <p className="text-xs text-center text-slate-400">
              We'll email you within 24 hours to confirm. No spam, ever.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
