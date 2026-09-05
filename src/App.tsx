import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import SuperAdminRoute from "./components/SuperAdminRoute";

// Safe dynamic import with automatic retry and reload on deploy chunk mismatch
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      // Check if we already reloaded in this session for this route
      const lastReload = sessionStorage.getItem("last_chunk_reload");
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem("last_chunk_reload", String(now));
        window.location.reload();
        return new Promise(() => {}); // pause until reload triggers
      }
      throw error;
    }
  });
}

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";

// Lazy load remaining pages for code splitting with retry
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const OAuthConsent = lazyWithRetry(() => import("./pages/OAuthConsent"));
const CreateQuizPage = lazyWithRetry(() => import("./pages/CreateQuizPage"));
const Scheduler = lazyWithRetry(() => import("./pages/Scheduler"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const KnowledgeBase = lazyWithRetry(() => import("./pages/KnowledgeBase"));
const Documents = lazyWithRetry(() => import("./pages/Documents"));
const Analytics = lazyWithRetry(() => import("./pages/Analytics"));
const QuestionBank = lazyWithRetry(() => import("./pages/QuestionBank"));
const Channels = lazyWithRetry(() => import("./pages/Channels"));
const CreatePost = lazyWithRetry(() => import("./pages/CreatePost"));
const Stories = lazyWithRetry(() => import("./pages/Stories"));
const Courses = lazyWithRetry(() => import("./pages/Courses"));
const CourseEditor = lazyWithRetry(() => import("./pages/CourseEditor"));
const StudentDashboard = lazyWithRetry(() => import("./pages/StudentDashboard"));
const Batches = lazyWithRetry(() => import("./pages/Batches"));
const LiveClasses = lazyWithRetry(() => import("./pages/LiveClasses"));
const Notices = lazyWithRetry(() => import("./pages/Notices"));
const Tests = lazyWithRetry(() => import("./pages/Tests"));
const TestEditor = lazyWithRetry(() => import("./pages/TestEditor"));

const TeacherDashboard = lazyWithRetry(() => import("./pages/TeacherDashboard"));
const SuperAdminDashboard = lazyWithRetry(() => import("./pages/SuperAdminDashboard"));
const SuperAdminCoupons = lazyWithRetry(() => import("./pages/SuperAdminCoupons"));
const SuperAdminUsers = lazyWithRetry(() => import("./pages/SuperAdminUsers"));
const SuperAdminSubscriptions = lazyWithRetry(() => import("./pages/SuperAdminSubscriptions"));

const SuperAdminAuditLogs = lazyWithRetry(() => import("./pages/SuperAdminAuditLogs"));
const SuperAdminSettings = lazyWithRetry(() => import("./pages/SuperAdminSettings"));
const SuperAdminMcpHealth = lazyWithRetry(() => import("./pages/SuperAdminMcpHealth"));
const SuperAdminLogin = lazyWithRetry(() => import("./pages/SuperAdminLogin"));
const Install = lazyWithRetry(() => import("./pages/Install"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const RefundPolicy = lazyWithRetry(() => import("./pages/RefundPolicy"));
const DataSecurity = lazyWithRetry(() => import("./pages/DataSecurity"));
const Documentation = lazyWithRetry(() => import("./pages/Documentation"));
const ContactSupport = lazyWithRetry(() => import("./pages/ContactSupport"));
const VideoTutorials = lazyWithRetry(() => import("./pages/VideoTutorials"));
const HelpCenter = lazyWithRetry(() => import("./pages/HelpCenter"));

import { AuthProvider } from "./contexts/AuthContext";

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4 page-enter">
      <div className="relative size-12">
        <div className="absolute inset-0 rounded-full border-2 border-primary/15" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">Initializing TelePost...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false, // Don't spam DB when tab switching
      staleTime: 1000 * 60 * 2, // Data is fresh for 2 minutes by default
      gcTime: 1000 * 60 * 10, // Keep in memory for 10 minutes
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
              <Route path="/install" element={<Install />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/super-admin/login" element={<SuperAdminLogin />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/create-quiz" element={<ProtectedRoute><CreateQuizPage /></ProtectedRoute>} />
              <Route path="/dashboard/scheduler" element={<ProtectedRoute><Scheduler /></ProtectedRoute>} />
              <Route path="/dashboard/channels" element={<ProtectedRoute><Channels /></ProtectedRoute>} />
              <Route path="/dashboard/create-post" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
              <Route path="/dashboard/stories" element={<ProtectedRoute><Stories /></ProtectedRoute>} />
              <Route path="/dashboard/knowledge-base" element={<ProtectedRoute><KnowledgeBase /></ProtectedRoute>} />
              <Route path="/dashboard/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
              <Route path="/dashboard/question-bank" element={<ProtectedRoute><QuestionBank /></ProtectedRoute>} />
              <Route path="/dashboard/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/dashboard/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
              <Route path="/dashboard/courses/:courseId" element={<ProtectedRoute><CourseEditor /></ProtectedRoute>} />
              <Route path="/dashboard/batches" element={<ProtectedRoute><Batches /></ProtectedRoute>} />
              <Route path="/dashboard/live-classes" element={<ProtectedRoute><LiveClasses /></ProtectedRoute>} />
              <Route path="/dashboard/notices" element={<ProtectedRoute><Notices /></ProtectedRoute>} />
              <Route path="/dashboard/tests" element={<ProtectedRoute><Tests /></ProtectedRoute>} />
              <Route path="/dashboard/tests/:testId" element={<ProtectedRoute><TestEditor /></ProtectedRoute>} />


              <Route path="/dashboard/teacher" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/super-admin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
              <Route path="/dashboard/super-admin/coupons" element={<SuperAdminRoute><SuperAdminCoupons /></SuperAdminRoute>} />
              <Route path="/dashboard/super-admin/users" element={<SuperAdminRoute><SuperAdminUsers /></SuperAdminRoute>} />
              <Route path="/dashboard/super-admin/subscriptions" element={<SuperAdminRoute><SuperAdminSubscriptions /></SuperAdminRoute>} />
              <Route path="/dashboard/super-admin/audit-logs" element={<SuperAdminRoute><SuperAdminAuditLogs /></SuperAdminRoute>} />
              <Route path="/dashboard/super-admin/settings" element={<SuperAdminRoute><SuperAdminSettings /></SuperAdminRoute>} />
              <Route path="/dashboard/super-admin/mcp-health" element={<SuperAdminRoute><SuperAdminMcpHealth /></SuperAdminRoute>} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />

              <Route path="/terms" element={<Terms />} />
              <Route path="/refund" element={<RefundPolicy />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/data-security" element={<DataSecurity />} />
              <Route path="/security" element={<DataSecurity />} />
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/contact-support" element={<ContactSupport />} />
              <Route path="/video-tutorials" element={<VideoTutorials />} />
              <Route path="/help-center" element={<HelpCenter />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
</ErrorBoundary>
);

export default App;
