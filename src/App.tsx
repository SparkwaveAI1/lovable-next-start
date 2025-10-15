import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ContentCenter from "./pages/ContentCenter";
import GameTestInterface from "./components/GameTestInterface";
import MediaLibraryPage from "./pages/MediaLibraryPage";
import EmployeeUpload from "./pages/EmployeeUpload";
import ServiceRequests from "./pages/ServiceRequests";
import Auth from "./pages/Auth";
import LateSetup from "./pages/LateSetup";
import LateConnections from "./pages/LateConnections";
import AdminSetupPage from "./pages/AdminSetupPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { BusinessProvider } from "@/contexts/BusinessContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BusinessProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/upload" element={<ProtectedRoute><EmployeeUpload /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/content-center" element={<ProtectedRoute><ContentCenter /></ProtectedRoute>} />
            <Route path="/game-test" element={<ProtectedRoute><GameTestInterface /></ProtectedRoute>} />
            <Route path="/media-library" element={<ProtectedRoute><MediaLibraryPage /></ProtectedRoute>} />
            <Route path="/service-requests" element={<ProtectedRoute><ServiceRequests /></ProtectedRoute>} />
            <Route path="/late-setup" element={<ProtectedRoute><LateSetup /></ProtectedRoute>} />
            <Route path="/late-connections" element={<ProtectedRoute><LateConnections /></ProtectedRoute>} />
            <Route path="/admin-setup" element={<ProtectedRoute><AdminSetupPage /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </BusinessProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
