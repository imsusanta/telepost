import { useMemo, useEffect } from "react";
import { BarChart3, Bot, Calendar, Database, FileText, RefreshCw, Sparkles, Plus, ArrowRight, Clock, Activity, TrendingUp } from "lucide-react";
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
    channelsResult,
    connectedBotsResult
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("quiz_generations").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("scheduled_telegram_posts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("scheduled_telegram_posts").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "pending"),
    supabase.from("quiz_responses").select("id, quiz_generations!inner(user_id)", { count: "exact", head: true }).eq("quiz_generations.user_id", user.id),
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("question_banks").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("channels").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    // Count channels with bot tokens (connected bots)
    (supabase as any).from("channels").select("*", { count: "exact", head: true }).eq("user_id", user.id).not("telegram_bot_token", "is", null)
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
      connectedBots: connectedBotsResult.count || 0,
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
      color: "from-sky-500 to-blue-600",
      ring: "ring-sky-500/20",
    },
    {
      title: "Scheduled",
      value: stats?.scheduledPosts || 0,
      icon: Calendar,
      color: "from-amber-500 to-orange-600",
      ring: "ring-amber-500/20",
    },
    {
      title: "Responses",
      value: stats?.totalViews || 0,
      icon: BarChart3,
      color: "from-rose-500 to-pink-600",
      ring: "ring-rose-500/20",
    },
    {
      title: "Questions",
      value: stats?.totalQuestions || 0,
      icon: Database,
      color: "from-emerald-500 to-teal-600",
      ring: "ring-emerald-500/20",
    },
  ], [stats]);

  const quickActions = [
    { title: "Create Quiz", subtitle: "Generate with AI", icon: Plus, path: "/dashboard/create-quiz", color: "from-sky-500 to-blue-600" },
    { title: "Question Bank", subtitle: "Manage your content", icon: Database, path: "/dashboard/question-bank", color: "from-emerald-500 to-teal-600" },
    { title: "Scheduler", subtitle: "Automate publishing", icon: Clock, path: "/dashboard/scheduler", color: "from-amber-500 to-orange-600" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 relative">
        <div className="absolute inset-x-0 -top-16 h-40 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <Card className="border-white/40 bg-card/70 backdrop-blur-xl shadow-[0_20px_60px_-30px_hsl(var(--foreground)/0.4)]">
          <CardContent className="p-5 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <p className="inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase text-primary font-semibold mb-2">
                <Activity className="w-3.5 h-3.5" />
                Workspace Overview
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Welcome back, {profile?.full_name || "User"}!
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mt-2">
                Here's what's happening with your quizzes today.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isFetching}
              className="gap-2 rounded-full px-5 bg-background/80 backdrop-blur"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-28 rounded-2xl bg-muted animate-pulse" />
            ))
          ) : (
            statsCards.map((stat, idx) => (
              <div
                key={idx}
                className={`relative overflow-hidden bg-card/85 backdrop-blur-xl border border-white/30 rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 ring-1 ${stat.ring}`}
              >
                <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-gradient-to-br opacity-20 blur-xl pointer-events-none" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      {stat.value.toLocaleString()}
                    </p>
                  </div>
                  <div className={`w-11 h-11 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <Card className="border-white/40 bg-card/80 backdrop-blur-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  className="text-left rounded-2xl border border-white/30 bg-background/60 p-4 hover:bg-background transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                  onClick={() => navigate(action.path)}
                >
                  <div className={`w-10 h-10 mb-3 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center shadow-lg`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-semibold text-sm">{action.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{action.subtitle}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Info Cards Row */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Connected Channels */}
          <Card className="border-white/40 bg-card/80 backdrop-blur-xl">
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

          {/* Connected Bots */}
          <Card className="border-white/40 bg-card/80 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-500" />
                Connected Bots
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-bold">{stats?.connectedBots || 0}</p>
                  <p className="text-sm text-muted-foreground">Bot tokens configured</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/channels")}>
                  Manage <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="border-white/40 bg-card/80 backdrop-blur-xl">
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
          <Card className="border-white/40 bg-card/80 backdrop-blur-xl">
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
          <Card className="border-dashed border-primary/30 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5">
            <CardContent className="py-8">
              <div className="text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-primary/5">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Create Your First Quiz</h3>
                <p className="text-muted-foreground mb-4">
                  Start engaging your Telegram audience with AI-powered quizzes.
                </p>
                <Button onClick={() => navigate("/dashboard/create-quiz")} className="gap-2 rounded-full px-6">
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
