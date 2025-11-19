import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy load all pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreateQuizPage = lazy(() => import("./pages/CreateQuizPage"));
const Scheduler = lazy(() => import("./pages/Scheduler"));
const Settings = lazy(() => import("./pages/Settings"));
const Documents = lazy(() => import("./pages/Documents"));
const Analytics = lazy(() => import("./pages/Analytics"));
const QuestionBank = lazy(() => import("./pages/QuestionBank"));
const Channels = lazy(() => import("./pages/Channels"));
const Stories = lazy(() => import("./pages/Stories"));
const SuperAdminCoupons = lazy(() => import("./pages/SuperAdminCoupons"));
const SuperAdminUsers = lazy(() => import("./pages/SuperAdminUsers"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-lg"
        >
          Skip to main content
        </a>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/create-quiz" element={<ProtectedRoute><CreateQuizPage /></ProtectedRoute>} />
              <Route path="/dashboard/scheduler" element={<ProtectedRoute><Scheduler /></ProtectedRoute>} />
              <Route path="/dashboard/channels" element={<ProtectedRoute><Channels /></ProtectedRoute>} />
              <Route path="/dashboard/stories" element={<ProtectedRoute><Stories /></ProtectedRoute>} />
              <Route path="/dashboard/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
              <Route path="/dashboard/question-bank" element={<ProtectedRoute><QuestionBank /></ProtectedRoute>} />
              <Route path="/dashboard/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/dashboard/super-admin/coupons" element={<ProtectedRoute><SuperAdminCoupons /></ProtectedRoute>} />
              <Route path="/dashboard/super-admin/users" element={<ProtectedRoute><SuperAdminUsers /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
