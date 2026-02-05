import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, CheckCircle2, Clock, Sparkles } from "lucide-react";
import sparkwaveIcon from "@/assets/sparkwave-icon.png";

const TOPICS = [
  "AI Automation for my business",
  "Lead generation & follow-up",
  "Social media automation",
  "Custom AI solution",
  "General inquiry",
  "Other"
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
  "5:00 PM EST"
];

export default function Book() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Get maximum date (30 days out)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('sparkwave_booking_requests')
        .insert({
          name,
          email,
          phone: phone || null,
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          topic,
          message: message || null
        });

      if (error) {
        console.error('Booking error:', error);
        toast({
          title: "Error",
          description: "Failed to submit booking request. Please try again.",
          variant: "destructive",
        });
      } else {
        setSubmitted(true);
        toast({
          title: "Request Submitted!",
          description: "We'll confirm your call time within 24 hours.",
        });
      }
    } catch (err) {
      console.error('Booking error:', err);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-green-50 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-12 pb-12">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-green-100 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Request Received!</h2>
            <p className="text-slate-600 mb-6">
              Thanks {name.split(' ')[0]}! We'll send a confirmation email to <strong>{email}</strong> within 24 hours with your call details.
            </p>
            <div className="bg-slate-50 rounded-lg p-4 text-left">
              <p className="text-sm text-slate-600 mb-1">
                <strong>Requested:</strong> {new Date(preferredDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-sm text-slate-600 mb-1">
                <strong>Time:</strong> {preferredTime}
              </p>
              <p className="text-sm text-slate-600">
                <strong>Topic:</strong> {topic}
              </p>
            </div>
            <Button 
              variant="outline" 
              className="mt-6"
              onClick={() => window.location.href = 'https://sparkwaveai.app'}
            >
              Visit Sparkwave
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-green-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img src={sparkwaveIcon} alt="Sparkwave" className="h-14 w-14" />
          </div>
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <CalendarDays className="h-6 w-6 text-green-600" />
            Book a Discovery Call
          </CardTitle>
          <CardDescription className="text-base">
            Learn how AI automation can transform your business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-6 p-3 bg-green-50 rounded-lg border border-green-100">
            <Sparkles className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800">
              <strong>30-minute call</strong> with Scott to discuss your automation needs
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="John Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Preferred Date *</Label>
                <Input
                  id="date"
                  type="date"
                  min={getMinDate()}
                  max={getMaxDate()}
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Preferred Time *</Label>
                <Select value={preferredTime} onValueChange={setPreferredTime} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time">
                      {preferredTime || <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Select time</span>}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">What would you like to discuss? *</Label>
              <Select value={topic} onValueChange={setTopic} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  {TOPICS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Anything specific you'd like to cover? (optional)</Label>
              <Textarea
                id="message"
                placeholder="Tell us about your business and what challenges you're facing..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700" 
              disabled={loading || !preferredTime || !topic}
            >
              {loading ? "Submitting..." : "Request Call"}
            </Button>

            <p className="text-xs text-center text-slate-500">
              We'll email you within 24 hours to confirm your booking
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
