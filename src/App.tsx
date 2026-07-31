import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import SuperAdminRoute from "./components/SuperAdminRoute";

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
const CreatePost = lazy(() => import("./pages/CreatePost"));
const Stories = lazy(() => import("./pages/Stories"));
const Courses = lazy(() => import("./pages/Courses"));
const CourseEditor = lazy(() => import("./pages/CourseEditor"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const Batches = lazy(() => import("./pages/Batches"));
const LiveClasses = lazy(() => import("./pages/LiveClasses"));
const Notices = lazy(() => import("./pages/Notices"));
const Tests = lazy(() => import("./pages/Tests"));
const TestEditor = lazy(() => import("./pages/TestEditor"));


const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const SuperAdminCoupons = lazy(() => import("./pages/SuperAdminCoupons"));
const SuperAdminUsers = lazy(() => import("./pages/SuperAdminUsers"));
const SuperAdminSubscriptions = lazy(() => import("./pages/SuperAdminSubscriptions"));

const SuperAdminAuditLogs = lazy(() => import("./pages/SuperAdminAuditLogs"));
const SuperAdminSettings = lazy(() => import("./pages/SuperAdminSettings"));
const SuperAdminLogin = lazy(() => import("./pages/SuperAdminLogin"));
const Install = lazy(() => import("./pages/Install"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const DataSecurity = lazy(() => import("./pages/DataSecurity"));
const Documentation = lazy(() => import("./pages/Documentation"));

import { AuthProvider } from "./contexts/AuthContext";

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing TelePost...</p>
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
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/refund" element={<RefundPolicy />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/data-security" element={<DataSecurity />} />
              <Route path="/security" element={<DataSecurity />} />
              <Route path="/documentation" element={<Documentation />} />
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
