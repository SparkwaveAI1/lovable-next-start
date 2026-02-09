import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent, PageHeader } from "@/components/layout/PageLayout";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  HelpCircle, 
  Rocket, 
  Bot, 
  MessageSquare, 
  Sparkles, 
  CreditCard, 
  Wrench, 
  AlertTriangle,
  Mail,
  MessageCircle,
  BookOpen
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: FAQItem[];
}

const faqData: FAQCategory[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: Rocket,
    items: [
      {
        question: "What is Sparkwave?",
        answer: "Sparkwave is an AI-powered automation platform that helps businesses streamline customer communications, automate repetitive tasks, and grow faster. It combines intelligent agents, multi-channel messaging (SMS, email), and an AI assistant to handle everything from lead follow-ups to appointment scheduling."
      },
      {
        question: "How do I set up my account?",
        answer: "After signing up, you'll go through a quick onboarding wizard that helps you configure your business profile, connect your communication channels, and set up your first agent. The entire process takes about 5 minutes."
      },
      {
        question: "What's included in my plan?",
        answer: "Each plan includes a set number of agent actions, message credits, and team seats. The Starter plan is perfect for small businesses, while Growth and Scale plans offer more capacity and advanced features like custom integrations and priority support."
      },
      {
        question: "How do I add team members?",
        answer: "Navigate to Settings → Team and click \"Invite Member.\" Enter their email address and select their role (Admin, Member, or Viewer). They'll receive an invitation email with instructions to join your workspace."
      }
    ]
  },
  {
    id: "agents",
    label: "Agents",
    icon: Bot,
    items: [
      {
        question: "What are agents?",
        answer: "Agents are AI-powered automations that handle specific tasks for your business. For example, a Lead Follow-up Agent can automatically reach out to new leads, while a Scheduling Agent can book appointments without human intervention. Each agent is trained on your business context to respond naturally."
      },
      {
        question: "How do I create a new agent?",
        answer: "Go to the Agents tab and click \"Create Agent.\" Choose a template (like Lead Nurturing or Customer Support) or start from scratch. Configure the agent's trigger, behavior, and messaging style, then activate it."
      },
      {
        question: "Can I customize agent behavior?",
        answer: "Absolutely. You can customize what triggers an agent, how it responds, its tone of voice, and what actions it can take. Advanced users can add conditional logic, custom scripts, and integration hooks."
      },
      {
        question: "What happens if an agent makes a mistake?",
        answer: "Agents operate within guardrails you define. You can enable human-in-the-loop mode for high-stakes decisions, set up approval workflows, or review agent actions before they go out. If an error occurs, you can pause the agent, adjust its settings, and retry."
      },
      {
        question: "Can I pause or stop an agent?",
        answer: "Yes. Every agent has pause and stop controls accessible from the agent dashboard. Paused agents stop processing new triggers but retain their configuration. You can resume at any time without losing settings."
      }
    ]
  },
  {
    id: "communications",
    label: "Communications",
    icon: MessageSquare,
    items: [
      {
        question: "How do I connect my phone number?",
        answer: "Go to Settings → Phone and click \"Add Number.\" You can either purchase a new number through Sparkwave or port an existing number. New numbers are activated instantly; porting typically takes 1-3 business days."
      },
      {
        question: "Can I use my existing business number?",
        answer: "Yes! You can port your existing business phone number to Sparkwave. This keeps your number while gaining all automation capabilities. We'll guide you through the porting process and handle the technical details."
      },
      {
        question: "What's the difference between SMS and email campaigns?",
        answer: "SMS campaigns deliver messages directly to phones with ~98% open rates—ideal for time-sensitive alerts and quick responses. Email campaigns work better for longer content, newsletters, and detailed information. Most businesses use both channels strategically."
      },
      {
        question: "How do I import contacts?",
        answer: "Navigate to Contacts → Import and upload a CSV file with your contact list. Sparkwave will automatically map columns to fields like name, phone, and email. You can also connect your CRM for continuous sync."
      },
      {
        question: "Can I segment my contacts?",
        answer: "Yes. Create segments based on any contact property, behavior, or tag. Use segments to target specific audiences with relevant messaging. Dynamic segments update automatically as contacts meet or no longer meet your criteria."
      }
    ]
  },
  {
    id: "ai",
    label: "AI",
    icon: Sparkles,
    items: [
      {
        question: "What can the AI assistant do?",
        answer: "The AI assistant helps you work faster by drafting messages, answering questions about your data, generating reports, and suggesting optimizations. Ask it anything from \"Draft a follow-up email for cold leads\" to \"Show me last week's conversion rate.\""
      },
      {
        question: "Is my data used to train AI?",
        answer: "No. Your business data is never used to train our AI models. Your information stays private and is only used to serve your account. We take data privacy seriously and are SOC 2 compliant."
      },
      {
        question: "How accurate is the AI?",
        answer: "Our AI is trained on best practices and continuously improved. For critical communications, we recommend reviewing AI-generated content before sending. You can also train the AI on your specific business context to improve accuracy over time."
      },
      {
        question: "Can the AI learn my brand voice?",
        answer: "Yes. In Settings → Brand Voice, you can provide examples of your preferred tone, style guidelines, and sample communications. The AI will adapt its suggestions to match your brand consistently across all channels."
      }
    ]
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCard,
    items: [
      {
        question: "How does billing work?",
        answer: "Sparkwave bills monthly or annually (with a discount for annual plans). Your subscription includes a base allocation of agent actions and message credits. Usage beyond your plan limits is billed at pay-as-you-go rates."
      },
      {
        question: "Can I upgrade or downgrade my plan?",
        answer: "Yes, you can change your plan anytime from Settings → Billing. Upgrades take effect immediately with prorated billing. Downgrades take effect at the start of your next billing cycle."
      },
      {
        question: "What happens if I cancel?",
        answer: "When you cancel, your account remains active until the end of your billing period. After that, you'll lose access to agents and automation, but you can still export your data. Reactivate anytime to resume where you left off."
      },
      {
        question: "Are there any long-term contracts?",
        answer: "No. Sparkwave is month-to-month with no long-term commitment required. Annual plans offer a discount but can still be cancelled with a prorated refund for unused months."
      },
      {
        question: "Do unused credits roll over?",
        answer: "Message credits reset each billing period and don't roll over. We recommend right-sizing your plan based on actual usage. You can view your usage trends in Settings → Usage to optimize your plan."
      }
    ]
  },
  {
    id: "technical",
    label: "Technical",
    icon: Wrench,
    items: [
      {
        question: "What browsers are supported?",
        answer: "Sparkwave works on all modern browsers including Chrome, Firefox, Safari, and Edge (latest two versions). We recommend Chrome for the best experience. Internet Explorer is not supported."
      },
      {
        question: "Is there a mobile app?",
        answer: "Currently, Sparkwave is a web application optimized for desktop use. A mobile app is on our roadmap. In the meantime, the web app works on mobile browsers for quick access on the go."
      },
      {
        question: "How is my data secured?",
        answer: "We use bank-level encryption (AES-256) for data at rest and TLS 1.3 for data in transit. Our infrastructure runs on SOC 2 compliant cloud providers with 24/7 monitoring, automated backups, and strict access controls."
      },
      {
        question: "Can I export my data?",
        answer: "Yes. Go to Settings → Data and click \"Export.\" You can export contacts, conversation history, and analytics as CSV or JSON files. Exports are typically ready within a few minutes depending on data volume."
      },
      {
        question: "Does Sparkwave integrate with other tools?",
        answer: "Yes! Sparkwave integrates with popular CRMs (Salesforce, HubSpot), calendaring tools (Google Calendar, Calendly), and thousands of apps via Zapier and our REST API."
      },
      {
        question: "Is there an API?",
        answer: "Yes. Our REST API allows developers to build custom integrations, automate workflows, and extend Sparkwave's functionality. API access is available on Growth plans and above."
      }
    ]
  },
  {
    id: "troubleshooting",
    label: "Troubleshooting",
    icon: AlertTriangle,
    items: [
      {
        question: "Messages not sending?",
        answer: "First, check your message credits in Settings → Usage. If you have credits, verify the recipient's phone number/email is valid. For SMS, ensure the number can receive texts. Check the message log for specific error codes."
      },
      {
        question: "Agent not responding?",
        answer: "Verify the agent is active (not paused) in the Agents dashboard. Check that trigger conditions are being met by reviewing the agent's activity log. If the agent's queue is backed up, you may need to increase processing limits."
      },
      {
        question: "Dashboard loading slowly?",
        answer: "Try clearing your browser cache and refreshing. If issues persist, check our status page for any ongoing incidents. Large accounts may experience slower loads during peak usage—consider filtering your dashboard view."
      },
      {
        question: "I forgot my password",
        answer: "Click \"Forgot Password\" on the login page and enter your email. You'll receive a reset link within minutes. If you don't see the email, check your spam folder or contact support."
      },
      {
        question: "How do I contact support?",
        answer: "Email us at support@sparkwaveai.com or use the chat widget in the bottom-right corner of the dashboard. Business hours: Monday-Friday, 9 AM - 6 PM EST. Growth and Scale plans include priority support with faster response times."
      }
    ]
  }
];

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("getting-started");

  // Filter FAQ items based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return faqData;
    }

    const query = searchQuery.toLowerCase();
    return faqData.map(category => ({
      ...category,
      items: category.items.filter(
        item =>
          item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query)
      )
    })).filter(category => category.items.length > 0);
  }, [searchQuery]);

  // Get count of matching items for each category
  const getCategoryCount = (categoryId: string) => {
    const category = filteredData.find(c => c.id === categoryId);
    return category?.items.length || 0;
  };

  // Total matching items
  const totalMatches = filteredData.reduce((sum, cat) => sum + cat.items.length, 0);

  return (
    <DashboardLayout>
      <PageContent>
        <PageHeader 
          title="Frequently Asked Questions"
          description="Find answers to common questions about Sparkwave"
        />

        {/* Search Box */}
        <div className="mb-8">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Found {totalMatches} result{totalMatches !== 1 ? "s" : ""} for "{searchQuery}"
            </p>
          )}
        </div>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap gap-2 h-auto bg-transparent p-0">
            {faqData.map((category) => {
              const Icon = category.icon;
              const count = getCategoryCount(category.id);
              const isVisible = !searchQuery || count > 0;
              
              if (!isVisible) return null;
              
              return (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{category.label}</span>
                  {searchQuery && count > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300">
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* FAQ Content */}
          {filteredData.map((category) => (
            <TabsContent key={category.id} value={category.id} className="mt-6">
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <category.icon className="h-5 w-5 text-indigo-500" />
                    <CardTitle className="text-lg text-slate-900 dark:text-white">
                      {category.label}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.items.map((item, index) => (
                      <AccordionItem 
                        key={index} 
                        value={`item-${index}`}
                        className="border-slate-200 dark:border-slate-700"
                      >
                        <AccordionTrigger className="text-left text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 hover:no-underline">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
          ))}

          {/* No results state */}
          {searchQuery && filteredData.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No results found
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                We couldn't find any questions matching "{searchQuery}". Try a different search term.
              </p>
            </div>
          )}
        </Tabs>

        {/* Still Need Help Section */}
        <Card className="mt-12 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border-indigo-200 dark:border-indigo-800">
          <CardContent className="p-8">
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/50 mb-4">
                <HelpCircle className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Still have questions?
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  variant="default" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                  onClick={() => window.location.href = "mailto:support@sparkwaveai.com"}
                >
                  <Mail className="h-4 w-4" />
                  Email Support
                </Button>
                <Button 
                  variant="outline" 
                  className="border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 gap-2"
                  onClick={() => window.open("/docs", "_self")}
                >
                  <BookOpen className="h-4 w-4" />
                  Browse Documentation
                </Button>
              </div>
              <div className="mt-6 pt-6 border-t border-indigo-200 dark:border-indigo-800">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-medium">Business hours:</span> Monday–Friday, 9 AM – 6 PM EST
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  <span className="font-medium">Email:</span>{" "}
                  <a href="mailto:support@sparkwaveai.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    support@sparkwaveai.com
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageContent>
    </DashboardLayout>
  );
}
