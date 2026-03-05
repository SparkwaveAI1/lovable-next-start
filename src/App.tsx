import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@/components/Analytics";
import { AssistantButton } from "@/components/assistant";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ContentHub from "./pages/ContentHub";
import Contacts from "./pages/Contacts";
import MediaLibraryPage from "./pages/MediaLibraryPage";
import EmployeeUpload from "./pages/EmployeeUpload";
import ServiceRequests from "./pages/ServiceRequests";
import Auth from "./pages/Auth";
import CrisisMonitor from "./pages/CrisisMonitor";
import LateSetup from "./pages/LateSetup";
import LateConnections from "./pages/LateConnections";
import AdminSetupPage from "./pages/AdminSetupPage";
import BusinessPermissionsPage from "./pages/BusinessPermissionsPage";
import AdminDashboard from "./pages/AdminDashboard";
import EmailMarketing from "./pages/EmailMarketing";
import MissionControl from "./pages/MissionControl";
import AgentRegistry from "./pages/AgentRegistry";
import Agents from "./pages/Agents";
import Bookings from "./pages/Bookings";
import Book from "./pages/Book";
import Reports from "./pages/Reports";
import Docs from "./pages/Docs";
import Investments from "./pages/Investments";
import Sales from "./pages/Sales";
import About from "./pages/About";
import AutomationApp from "./pages/AutomationApp";
import PersonaAIPage from "./pages/PersonaAIPage";
import CaseStudies from "./pages/CaseStudies";
import Services from "./pages/Services";
import MessageQueue from "./pages/MessageQueue";
import ClientSuccess from "./pages/ClientSuccess";
import Communications from "./pages/Communications";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import TwitterAnalytics from "./pages/TwitterAnalytics";
import FAQ from "./pages/FAQ";
// ContentVisibility and ContentReviewPage removed — redirected to /content-hub
import AutomationAudit from "./pages/AutomationAudit";
import ROICalculator from "./pages/ROICalculator";
import Onboarding from "./pages/Onboarding";
import SystemMonitoring from "./pages/SystemMonitoring";
import MonitoringPage from "./pages/Monitoring";
import FightFlow from "./pages/FightFlow";
import SystemOperations from "./pages/SystemOperations";
import CRM from "./pages/CRM";
import DealPipeline from "./pages/DealPipeline";
import ProtectedRoute from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { AuthProvider } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Analytics />
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BusinessProvider>
          <BrowserRouter>
            {/* Floating AI Assistant - appears on all pages */}
            <AssistantButton />
            <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/book" element={<Book />} />
            <Route path="/audit" element={<AutomationAudit />} />
            <Route path="/roi-calculator" element={<ROICalculator />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/about" element={<About />} />
            <Route path="/automation" element={<AutomationApp />} />
            <Route path="/persona-ai" element={<PersonaAIPage />} />
            <Route path="/case-studies" element={<CaseStudies />} />
            <Route path="/services" element={<Services />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/crisis-monitor" element={<CrisisMonitor />} />
            <Route path="/upload" element={<EmployeeUpload />} />
            <Route path="/" element={<ProtectedRoute><ErrorBoundary><Index /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/contacts" element={<ProtectedRoute><ErrorBoundary><Contacts /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/content-hub" element={<ProtectedRoute><ErrorBoundary><ContentHub /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/content-center" element={<Navigate replace to="/content-hub" />} />
            <Route path="/content" element={<Navigate replace to="/content-hub" />} />
            <Route path="/media-library" element={<ProtectedRoute><ErrorBoundary><MediaLibraryPage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/service-requests" element={<ProtectedRoute><ErrorBoundary><ServiceRequests /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/late-setup" element={<ProtectedRoute><ErrorBoundary><LateSetup /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/late-connections" element={<ProtectedRoute><ErrorBoundary><LateConnections /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/admin-setup" element={<ProtectedRoute><ErrorBoundary><AdminSetupPage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/permissions" element={<ProtectedRoute><ErrorBoundary><BusinessPermissionsPage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><ErrorBoundary><AdminDashboard /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/email-marketing" element={<ProtectedRoute><ErrorBoundary><EmailMarketing /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/mission-control" element={<ProtectedRoute><ErrorBoundary><MissionControl /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/system-operations" element={<ProtectedRoute><ErrorBoundary><SystemOperations /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/agents" element={<ProtectedRoute><ErrorBoundary><Agents /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/agent-registry" element={<ProtectedRoute><ErrorBoundary><AgentRegistry /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/bookings" element={<ProtectedRoute><ErrorBoundary><Bookings /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ErrorBoundary><Reports /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/docs/*" element={<ProtectedRoute><ErrorBoundary><Docs /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/investments" element={<ProtectedRoute><ErrorBoundary><Investments /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/message-queue" element={<ProtectedRoute><ErrorBoundary><MessageQueue /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/client-success" element={<ProtectedRoute><ErrorBoundary><ClientSuccess /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/communications" element={<ProtectedRoute><ErrorBoundary><Communications /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/twitter-analytics" element={<ProtectedRoute><ErrorBoundary><TwitterAnalytics /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/faq" element={<ProtectedRoute><ErrorBoundary><FAQ /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/content-visibility" element={<Navigate replace to="/content-hub" />} />
            <Route path="/content-review" element={<Navigate replace to="/content-hub" />} />
            <Route path="/agent-chat" element={<Navigate replace to="/" />} />
            <Route path="/system-monitoring" element={<ProtectedRoute><ErrorBoundary><SystemMonitoring /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/fight-flow" element={<ProtectedRoute><ErrorBoundary><FightFlow /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/crm" element={<ProtectedRoute><ErrorBoundary><CRM /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/crm/deals" element={<ProtectedRoute><ErrorBoundary><DealPipeline /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/crm/:id" element={<ProtectedRoute><ErrorBoundary><CRM /></ErrorBoundary></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </BusinessProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
