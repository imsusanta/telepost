import { useMemo, useEffect } from "react";
import { BarChart3, Bot, Calendar, Database, FileText, RefreshCw, Sparkles, Plus, ArrowRight, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// Fetch dashboard data with React Query for caching and auto-refetch
async function fetchDashboardData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user found");

  const [
    profileResult,
    quizzesResult,
    scheduledResult,
    pendingResult,
    responsesResult,
    documentsResult,
    questionsResult,
    channelsResult
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("quiz_generations").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("scheduled_telegram_posts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("scheduled_telegram_posts").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "pending"),
    supabase.from("quiz_responses").select("id, quiz_generations!inner(user_id)", { count: "exact", head: true }).eq("quiz_generations.user_id", user.id),
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("question_banks").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("channels").select("*", { count: "exact", head: true }).eq("user_id", user.id)
  ]);

  return {
    profile: profileResult.data,
    stats: {
      totalQuizzes: quizzesResult.count || 0,
      scheduledPosts: scheduledResult.count || 0,
      pendingPosts: pendingResult.count || 0,
      totalViews: responsesResult.count || 0,
      totalDocuments: documentsResult.count || 0,
      totalQuestions: questionsResult.count || 0,
      connectedBots: 1,
      totalChannels: channelsResult.count || 0
    }
  };
}

export default function Dashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: fetchDashboardData,
    staleTime: 30000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const profile = data?.profile;
  const stats = data?.stats;

  useEffect(() => {
    if (error) {
      const message = error instanceof Error ? error.message : "Failed to load dashboard data";
      toast({
        title: "Error loading dashboard",
        description: message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleRefresh = async () => {
    await refetch();
    toast({
      title: "Dashboard refreshed",
      description: "All stats have been updated",
    });
  };

  const statsCards = useMemo(() => [
    {
      title: "Total Quizzes",
      value: stats?.totalQuizzes || 0,
      icon: Sparkles,
      color: "bg-sky-500",
    },
    {
      title: "Scheduled",
      value: stats?.scheduledPosts || 0,
      icon: Calendar,
      color: "bg-amber-500",
    },
    {
      title: "Responses",
      value: stats?.totalViews || 0,
      icon: BarChart3,
      color: "bg-rose-500",
    },
    {
      title: "Questions",
      value: stats?.totalQuestions || 0,
      icon: Database,
      color: "bg-emerald-500",
    },
  ], [stats]);

  const quickActions = [
    { title: "Create Quiz", icon: Plus, path: "/dashboard/create-quiz", color: "bg-sky-500" },
    { title: "Question Bank", icon: Database, path: "/dashboard/question-bank", color: "bg-emerald-500" },
    { title: "Scheduler", icon: Clock, path: "/dashboard/scheduler", color: "bg-amber-500" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {profile?.full_name?.split(' ')[0] || "User"}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your quizzes today.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isFetching}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))
          ) : (
            statsCards.map((stat, idx) => (
              <div
                key={idx}
                className="bg-card border rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      {stat.value.toLocaleString()}
                    </p>
                  </div>
                  <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {quickActions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2 hover:bg-muted/50"
                  onClick={() => navigate(action.path)}
                >
                  <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium text-sm">{action.title}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Info Cards Row */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Connected Channels */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                Connected Channels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-bold">{stats?.totalChannels || 0}</p>
                  <p className="text-sm text-muted-foreground">Active channels</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/channels")}>
                  Manage <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-bold">{stats?.totalDocuments || 0}</p>
                  <p className="text-sm text-muted-foreground">PDFs uploaded</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/documents")}>
                  View <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pending Posts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Pending Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-bold">{stats?.pendingPosts || 0}</p>
                  <p className="text-sm text-muted-foreground">Scheduled to post</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/scheduler")}>
                  View <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started - Show only if no quizzes */}
        {(stats?.totalQuizzes || 0) === 0 && !isLoading && (
          <Card className="border-dashed">
            <CardContent className="py-8">
              <div className="text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Create Your First Quiz</h3>
                <p className="text-muted-foreground mb-4">
                  Start engaging your Telegram audience with AI-powered quizzes.
                </p>
                <Button onClick={() => navigate("/dashboard/create-quiz")} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Quiz
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
