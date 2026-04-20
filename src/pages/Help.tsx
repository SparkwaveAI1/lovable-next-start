import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContent, PageHeader } from "@/components/layout/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  HelpCircle,
  BookOpen,
  Rocket,
  MessageSquare,
  Bot,
  Wrench,
  Search,
  FileText,
  Zap,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

interface HelpSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  links: { label: string; href: string; description?: string }[];
}

const helpSections: HelpSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "New to Sparkwave? Start here to get up and running quickly.",
    icon: Rocket,
    links: [
      { label: "Quick Start Guide", href: "/docs/getting-started/quick-start", description: "Get running in 5 minutes" },
      { label: "Onboarding Walkthrough", href: "/docs/getting-started/onboarding", description: "Complete setup guide" },
      { label: "What is Sparkwave?", href: "/docs/overview/what-is-sparkwave", description: "Platform overview and key concepts" },
    ],
  },
  {
    id: "features",
    title: "Features & How-To",
    description: "Learn how to use all the tools at your disposal.",
    icon: Zap,
    links: [
      { label: "Key Features", href: "/docs/overview/key-features", description: "Overview of all capabilities" },
      { label: "AI Agents", href: "/docs/features/agents", description: "How agents work and how to configure them" },
      { label: "Task Management", href: "/docs/features/tasks", description: "Managing automated tasks" },
      { label: "Reports & Analytics", href: "/docs/features/reports", description: "Dashboards and reporting" },
      { label: "How-To Guides", href: "/docs/how-to/create-first-automation", description: "Step-by-step tutorials" },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    description: "Fix common problems and find answers to your questions.",
    icon: Wrench,
    links: [
      { label: "Common Issues", href: "/docs/troubleshooting/common-issues", description: "Solutions to frequent problems" },
      { label: "FAQ", href: "/faq", description: "Frequently asked questions" },
      { label: "System Monitoring", href: "/system-monitoring", description: "Check system health and status" },
    ],
  },
  {
    id: "communication",
    title: "Support & Communication",
    description: "Reach out for help or talk to the AI assistant.",
    icon: MessageSquare,
    links: [
      { label: "Rico AI Assistant", href: "#", description: "Use the floating assistant button (bottom-right)" },
      { label: "Mission Control", href: "/mission-control", description: "View agent activity and status" },
      { label: "All Documentation", href: "/docs", description: "Browse the full docs library" },
    ],
  },
];

// Quick-help topics for search
const searchableTopics = helpSections.flatMap((section) =>
  section.links.map((link) => ({
    ...link,
    sectionTitle: section.title,
    sectionId: section.id,
  }))
);

export default function Help() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = searchQuery.trim()
    ? helpSections
        .map((section) => ({
          ...section,
          links: section.links.filter(
            (link) =>
              link.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
              link.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              section.title.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((section) => section.links.length > 0)
    : helpSections;

  return (
    <DashboardLayout>
      <PageContent>
        <PageHeader
          title="Help Center"
          description="Find answers, learn features, and get support for Sparkwave."
        />

        {/* Search */}
        <div className="relative mb-8 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Action Cards */}
        {!searchQuery.trim() && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Link to="/docs/getting-started/quick-start">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <Rocket className="h-6 w-6 text-primary mb-1" />
                  <CardTitle className="text-base">Quick Start</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>New user? Get started in 5 minutes.</CardDescription>
                </CardContent>
              </Card>
            </Link>
            <Link to="/docs">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <BookOpen className="h-6 w-6 text-primary mb-1" />
                  <CardTitle className="text-base">Documentation</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Browse the full docs library.</CardDescription>
                </CardContent>
              </Card>
            </Link>
            <Link to="/faq">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <HelpCircle className="h-6 w-6 text-primary mb-1" />
                  <CardTitle className="text-base">FAQ</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Answers to common questions.</CardDescription>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {/* Help Sections */}
        <div className="space-y-6">
          {filteredSections.map((section) => {
            const SectionIcon = section.icon;
            return (
              <Card key={section.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <SectionIcon className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <CardDescription>{section.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {section.links.map((link) => (
                      <Link
                        key={link.href + link.label}
                        to={link.href}
                        className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="text-sm font-medium">{link.label}</span>
                            {link.description && (
                              <p className="text-xs text-muted-foreground">{link.description}</p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {searchQuery.trim() && filteredSections.length === 0 && (
            <div className="text-center py-12">
              <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">No results found</h3>
              <p className="text-muted-foreground mb-4">
                No help topics match "{searchQuery}"
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link
                  to="/docs"
                  className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                >
                  Browse all docs <ArrowRight className="h-3 w-3" />
                </Link>
                <Link
                  to="/faq"
                  className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                >
                  View FAQ <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer tip */}
        {!searchQuery.trim() && (
          <div className="mt-8 p-4 bg-muted/50 rounded-lg border text-center">
            <Bot className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Click the floating assistant button in the bottom-right corner
              to chat with Rico, your AI assistant, for instant help.
            </p>
          </div>
        )}
      </PageContent>
    </DashboardLayout>
  );
}
