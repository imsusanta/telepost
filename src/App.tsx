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
const Stories = lazy(() => import("./pages/Stories"));
const Courses = lazy(() => import("./pages/Courses"));
const CourseEditor = lazy(() => import("./pages/CourseEditor"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const Batches = lazy(() => import("./pages/Batches"));
const LiveClasses = lazy(() => import("./pages/LiveClasses"));
const Notices = lazy(() => import("./pages/Notices"));
const Tests = lazy(() => import("./pages/Tests"));
const TestEditor = lazy(() => import("./pages/TestEditor"));
const FeePlans = lazy(() => import("./pages/FeePlans"));
const Payments = lazy(() => import("./pages/Payments"));
const Attendance = lazy(() => import("./pages/Attendance"));
const LeaveRequests = lazy(() => import("./pages/LeaveRequests"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const SuperAdminCoupons = lazy(() => import("./pages/SuperAdminCoupons"));
const SuperAdminUsers = lazy(() => import("./pages/SuperAdminUsers"));
const SuperAdminInvitations = lazy(() => import("./pages/SuperAdminInvitations"));
const SuperAdminAuditLogs = lazy(() => import("./pages/SuperAdminAuditLogs"));
const SuperAdminSettings = lazy(() => import("./pages/SuperAdminSettings"));
const SuperAdminLogin = lazy(() => import("./pages/SuperAdminLogin"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: true, // Auto-refresh when user returns to tab
      staleTime: 30000, // Consider data fresh for 30 seconds
      gcTime: 300000, // Keep unused data in cache for 5 minutes
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
              <Route path="/super-admin/login" element={<SuperAdminLogin />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/create-quiz" element={<ProtectedRoute><CreateQuizPage /></ProtectedRoute>} />
              <Route path="/dashboard/scheduler" element={<ProtectedRoute><Scheduler /></ProtectedRoute>} />
              <Route path="/dashboard/channels" element={<ProtectedRoute><Channels /></ProtectedRoute>} />
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
              <Route path="/dashboard/fee-plans" element={<ProtectedRoute><FeePlans /></ProtectedRoute>} />
              <Route path="/dashboard/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
              <Route path="/dashboard/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
              <Route path="/dashboard/leaves" element={<ProtectedRoute><LeaveRequests /></ProtectedRoute>} />
              <Route path="/dashboard/teacher" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/super-admin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
              <Route path="/dashboard/super-admin/coupons" element={<SuperAdminRoute><SuperAdminCoupons /></SuperAdminRoute>} />
              <Route path="/dashboard/super-admin/users" element={<SuperAdminRoute><SuperAdminUsers /></SuperAdminRoute>} />
              <Route path="/dashboard/super-admin/invitations" element={<SuperAdminRoute><SuperAdminInvitations /></SuperAdminRoute>} />
              <Route path="/dashboard/super-admin/audit-logs" element={<SuperAdminRoute><SuperAdminAuditLogs /></SuperAdminRoute>} />
              <Route path="/dashboard/super-admin/settings" element={<SuperAdminRoute><SuperAdminSettings /></SuperAdminRoute>} />
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
