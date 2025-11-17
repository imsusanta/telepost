import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ConnectBot from "./pages/ConnectBot";
import CreateQuizPage from "./pages/CreateQuizPage";
import Scheduler from "./pages/Scheduler";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/connect-bot" element={<ProtectedRoute><ConnectBot /></ProtectedRoute>} />
          <Route path="/dashboard/create-quiz" element={<ProtectedRoute><CreateQuizPage /></ProtectedRoute>} />
          <Route path="/dashboard/scheduler" element={<ProtectedRoute><Scheduler /></ProtectedRoute>} />
          <Route path="/dashboard/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
          <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
