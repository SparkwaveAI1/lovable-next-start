import { useEffect } from "react";
import { X, HelpCircle, ExternalLink, MessageCircle, BookOpen, Zap, BarChart3, Mail, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
}

interface HelpContent {
  title: string;
  icon: React.ReactNode;
  description: string;
  sections: {
    heading: string;
    content: string;
  }[];
  links?: {
    label: string;
    url: string;
  }[];
}

// Help content mapped by route
const helpContentMap: Record<string, HelpContent> = {
  "/": {
    title: "Dashboard",
    icon: <BarChart3 className="h-5 w-5 text-blue-500" />,
    description: "Your at-a-glance overview of business performance and activity.",
    sections: [
      {
        heading: "Key Metrics",
        content: "The dashboard displays your most important KPIs—contacts, revenue, engagement, and task completion rates—all updating in real-time."
      },
      {
        heading: "Recent Activity",
        content: "See what's happening across your business: recent contacts, completed tasks, agent activity, and communication stats."
      },
      {
        heading: "Quick Actions",
        content: "Jump to common tasks directly from the dashboard. Create content, add contacts, or review pending items without navigating away."
      },
      {
        heading: "Quick Tips",
        content: "• Check the dashboard daily for a pulse on your business\n• Use widgets to identify trends early\n• Customize visible metrics in settings"
      }
    ]
  },
  "/contacts": {
    title: "Contacts",
    icon: <Mail className="h-5 w-5 text-teal-500" />,
    description: "Manage your contacts, leads, and customer relationships in one place.",
    sections: [
      {
        heading: "Contact List",
        content: "View all contacts with search, filter, and sort capabilities. Click any contact to see their full profile, history, and communication timeline."
      },
      {
        heading: "Adding Contacts",
        content: "Add contacts manually, import from CSV, or sync from external sources like Wix, GHL, or other CRMs. Duplicates are automatically detected."
      },
      {
        heading: "Tags & Segments",
        content: "Organize contacts with tags for easy filtering. Create segments for targeted communications based on behavior, demographics, or custom fields."
      },
      {
        heading: "Quick Tips",
        content: "• Use tags to categorize leads, customers, VIPs\n• Keep contact info updated for deliverability\n• Review inactive contacts periodically\n• Export segments for external campaigns"
      }
    ]
  },
  "/bookings": {
    title: "Bookings",
    icon: <FileText className="h-5 w-5 text-purple-500" />,
    description: "View and manage scheduled appointments and bookings.",
    sections: [
      {
        heading: "Calendar View",
        content: "See all upcoming bookings in calendar format. Switch between day, week, and month views to get the perspective you need."
      },
      {
        heading: "Booking Details",
        content: "Click any booking to see full details: contact info, service type, notes, and history. Reschedule or cancel directly from the detail view."
      },
      {
        heading: "Sync & Integration",
        content: "Bookings sync from connected scheduling platforms. Changes made externally are reflected here automatically."
      },
      {
        heading: "Quick Tips",
        content: "• Check bookings at the start of each day\n• Use notes for special instructions\n• Set up automated reminders to reduce no-shows"
      }
    ]
  },
  "/agents": {
    title: "AI Agents",
    icon: <Zap className="h-5 w-5 text-violet-500" />,
    description: "Configure and monitor your AI agents that automate work across the platform.",
    sections: [
      {
        heading: "Agent Overview",
        content: "Each agent has a specific role: Sales handles outreach, Marketing manages content, Automation executes tasks. View their status, recent activity, and performance."
      },
      {
        heading: "Configuration",
        content: "Customize agent behavior with prompts and settings. Define what they can do autonomously vs. what requires approval."
      },
      {
        heading: "Activity Logs",
        content: "Every agent action is logged. Review what they did, why, and the results. Useful for auditing and improving prompts."
      },
      {
        heading: "Quick Tips",
        content: "• Start with conservative permissions, expand as trust builds\n• Review activity logs weekly\n• Update prompts based on observed behavior\n• Use Mission Control for real-time oversight"
      }
    ]
  },
  "/content-center": {
    title: "Content Center",
    icon: <FileText className="h-5 w-5 text-pink-500" />,
    description: "Create, manage, and publish content across all channels.",
    sections: [
      {
        heading: "Content Library",
        content: "All your content in one place—social posts, emails, landing pages, and more. Search, filter, and organize with folders and tags."
      },
      {
        heading: "Creating Content",
        content: "Use the editor to create new content manually, or let AI generate drafts based on your prompts. Review, edit, and approve before publishing."
      },
      {
        heading: "Publishing",
        content: "Schedule content for future publication or publish immediately. Multi-channel support lets you post the same content across platforms."
      },
      {
        heading: "Quick Tips",
        content: "• Batch create content for the week ahead\n• Use AI drafts as starting points\n• Review scheduled content regularly\n• Repurpose top-performing content"
      }
    ]
  },
  "/mission-control": {
    title: "Mission Control",
    icon: <Zap className="h-5 w-5 text-amber-500" />,
    description: "Your central command center for managing AI agents, tasks, and system health.",
    sections: [
      {
        heading: "Task Board",
        content: "The Kanban-style task board organizes work into clear stages: To Do, In Progress, and Done. Drag tasks between columns or let agents automatically move them as work progresses."
      },
      {
        heading: "Agent Activity Feed",
        content: "Real-time visibility into what your AI agents are doing—task starts, completions, decisions made, status changes, and any errors or blockers encountered."
      },
      {
        heading: "Health Monitoring",
        content: "System health at a glance: agent status indicators, queue depth, error rates, and performance metrics."
      },
      {
        heading: "Quick Tips",
        content: "• Keep task titles actionable\n• Check Mission Control daily for oversight\n• Review the activity feed to understand agent decisions\n• Address blockers quickly when flagged"
      }
    ]
  },
  "/investments": {
    title: "Investments",
    icon: <BarChart3 className="h-5 w-5 text-emerald-500" />,
    description: "Portfolio tracking, stock screening, and market data analysis in one centralized module.",
    sections: [
      {
        heading: "Portfolio Tracking",
        content: "Add holdings with ticker symbol, quantity, and purchase price. View summary totals, individual positions, allocation charts, and historical performance."
      },
      {
        heading: "Stock Screener",
        content: "Filter stocks by price, volume, market cap, fundamentals (P/E, dividends), and technicals (moving averages, RSI). Save screens for quick access."
      },
      {
        heading: "Market Data",
        content: "Real-time quotes, historical OHLCV data, earnings dates, dividend announcements, and relevant news headlines."
      },
      {
        heading: "Quick Tips",
        content: "• Keep holdings updated for accurate tracking\n• Enter purchase prices for true gain/loss\n• Set alerts for significant price movements\n• Use scheduled reports for regular reviews"
      }
    ]
  },
  "/communications": {
    title: "Communications",
    icon: <Mail className="h-5 w-5 text-blue-500" />,
    description: "Centralized SMS and email messaging with campaign management and analytics.",
    sections: [
      {
        heading: "SMS Messaging",
        content: "Send individual or bulk SMS, schedule messages for future delivery. Messages are restricted to business hours (9 AM – 9 PM recipient's local time)."
      },
      {
        heading: "Email Campaigns",
        content: "Transactional emails, marketing newsletters, and multi-step drip sequences. All emails send through verified domains with proper authentication."
      },
      {
        heading: "Campaign Setup",
        content: "Define audience → Choose channel → Write content → Set timing → Review & Launch. Create one-time blasts, drip sequences, or trigger-based automations."
      },
      {
        heading: "Quick Tips",
        content: "• Use templates for consistent messaging\n• Segment contacts for targeted campaigns\n• Review tracking analytics to refine strategy\n• Weekday mornings typically perform best"
      }
    ]
  },
  "/assistant": {
    title: "AI Assistant",
    icon: <MessageCircle className="h-5 w-5 text-violet-500" />,
    description: "Your intelligent helper that understands natural language and can perform actions, answer questions, and automate work.",
    sections: [
      {
        heading: "What It Can Do",
        content: "Answer questions about your data, execute tasks like sending emails, analyze data and generate reports, draft content, and automate workflows."
      },
      {
        heading: "How to Interact",
        content: "Type requests in plain English. Be specific—provide context for better results. The assistant remembers context within a conversation."
      },
      {
        heading: "Example Requests",
        content: "• \"What tasks are overdue?\"\n• \"Draft a follow-up email to leads\"\n• \"Show my portfolio performance\"\n• \"Create a task for Monday\"\n• \"Summarize yesterday's activity\""
      },
      {
        heading: "Quick Tips",
        content: "• Be clear and direct with instructions\n• Iterate if needed—ask for adjustments\n• Use follow-up questions to dig deeper\n• Trust but verify outputs for important decisions"
      }
    ]
  },
  "/reports": {
    title: "Reports",
    icon: <FileText className="h-5 w-5 text-orange-500" />,
    description: "Transform your data into actionable insights with on-demand and scheduled reports.",
    sections: [
      {
        heading: "Report Types",
        content: "Activity reports (tasks, agents, users), communications reports (volume, delivery, engagement), financial reports (portfolio, performance, dividends), and custom reports."
      },
      {
        heading: "Generating Reports",
        content: "Select report type, configure parameters (date range, filters), and generate. Export as PDF, CSV, Excel, or JSON."
      },
      {
        heading: "Scheduling",
        content: "Set up daily, weekly, or monthly reports delivered automatically. Choose email delivery, dashboard refresh, or webhook integration."
      },
      {
        heading: "Quick Tips",
        content: "• Schedule recurring reports to save time\n• Use filters for focused, actionable data\n• Export to spreadsheets for deep analysis\n• Archive important reports for reference"
      }
    ]
  }
};

// Default help content for pages without specific documentation
const defaultHelpContent: HelpContent = {
  title: "Help & Documentation",
  icon: <BookOpen className="h-5 w-5 text-slate-500" />,
  description: "Welcome to Sparkwave! Here's how to get help and make the most of the platform.",
  sections: [
    {
      heading: "Getting Started",
      content: "Navigate using the sidebar on the left. Each module has specific functionality—explore Mission Control for task management, Investments for portfolio tracking, and Communications for outreach."
    },
    {
      heading: "Using the AI Assistant",
      content: "Click the chat bubble in the bottom right to talk with Rico, your AI assistant. Ask questions in plain English or request actions like sending emails or creating tasks."
    },
    {
      heading: "Need More Help?",
      content: "Contact our support team using the button below. We're here to help you succeed with Sparkwave."
    }
  ]
};

export function HelpPanel({ isOpen, onClose, currentPage }: HelpPanelProps) {
  // Get help content for current page, or use default
  const getHelpContent = (): HelpContent => {
    // Match exact routes first
    if (helpContentMap[currentPage]) {
      return helpContentMap[currentPage];
    }
    
    // Try matching partial routes (e.g., /investments/portfolio matches /investments)
    for (const [route, content] of Object.entries(helpContentMap)) {
      if (currentPage.startsWith(route)) {
        return content;
      }
    }
    
    return defaultHelpContent;
  };

  const helpContent = getHelpContent();

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-panel-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-violet-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white shadow-sm">
              {helpContent.icon}
            </div>
            <div>
              <h2 id="help-panel-title" className="text-lg font-semibold text-gray-900">
                {helpContent.title}
              </h2>
              <p className="text-sm text-gray-500">Help & Documentation</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Close help panel"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-6 py-4">
          {/* Description */}
          <p className="text-gray-600 mb-6">{helpContent.description}</p>

          {/* Sections */}
          <div className="space-y-5">
            {helpContent.sections.map((section, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-indigo-500" />
                  {section.heading}
                </h3>
                <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          {/* Documentation Links */}
          {helpContent.links && helpContent.links.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Related Documentation</h3>
              <div className="space-y-2">
                {helpContent.links.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer - Contact Support */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            className="w-full justify-center gap-2 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300"
            onClick={() => {
              window.open("mailto:support@sparkwaveai.com?subject=Help Request", "_blank");
            }}
          >
            <MessageCircle className="h-4 w-4" />
            Contact Support
          </Button>
          <p className="text-xs text-center text-gray-400 mt-2">
            We typically respond within 24 hours
          </p>
        </div>
      </div>
    </>
  );
}

export default HelpPanel;
