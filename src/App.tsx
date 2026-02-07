import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@/components/Analytics";
import { AssistantButton } from "@/components/assistant";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ContentCenter from "./pages/ContentCenter";
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
import Bookings from "./pages/Bookings";
import Book from "./pages/Book";
import Reports from "./pages/Reports";
import Docs from "./pages/Docs";
import Investments from "./pages/Investments";
import Sales from "./pages/Sales";
import About from "./pages/About";
import AutomationApp from "./pages/AutomationApp";
import MessageQueue from "./pages/MessageQueue";
import ClientSuccess from "./pages/ClientSuccess";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
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
            <Route path="/book" element={<Book />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/about" element={<About />} />
            <Route path="/automation" element={<AutomationApp />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/crisis-monitor" element={<CrisisMonitor />} />
            <Route path="/upload" element={<EmployeeUpload />} />
            <Route path="/" element={<ProtectedRoute><ErrorBoundary><Index /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/contacts" element={<ProtectedRoute><ErrorBoundary><Contacts /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/content-center" element={<ProtectedRoute><ErrorBoundary><ContentCenter /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/media-library" element={<ProtectedRoute><ErrorBoundary><MediaLibraryPage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/service-requests" element={<ProtectedRoute><ErrorBoundary><ServiceRequests /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/late-setup" element={<ProtectedRoute><ErrorBoundary><LateSetup /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/late-connections" element={<ProtectedRoute><ErrorBoundary><LateConnections /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/admin-setup" element={<ProtectedRoute><ErrorBoundary><AdminSetupPage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/permissions" element={<ProtectedRoute><ErrorBoundary><BusinessPermissionsPage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><ErrorBoundary><AdminDashboard /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/email-marketing" element={<ProtectedRoute><ErrorBoundary><EmailMarketing /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/mission-control" element={<ProtectedRoute><ErrorBoundary><MissionControl /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/agents" element={<ProtectedRoute><ErrorBoundary><AgentRegistry /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/bookings" element={<ProtectedRoute><ErrorBoundary><Bookings /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ErrorBoundary><Reports /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/docs/*" element={<ProtectedRoute><ErrorBoundary><Docs /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/investments" element={<ProtectedRoute><ErrorBoundary><Investments /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/message-queue" element={<ProtectedRoute><ErrorBoundary><MessageQueue /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/client-success" element={<ProtectedRoute><ErrorBoundary><ClientSuccess /></ErrorBoundary></ProtectedRoute>} />
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
