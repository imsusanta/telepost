import { useMemo, useEffect, useState } from "react";
import { BarChart3, Bot, Calendar, Database, RefreshCw, Sparkles, Plus, ArrowRight, Clock, TrendingUp, Sparkle, ArrowUpRight, Zap, CheckCircle2, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// Fetch dashboard data with React Query for caching and auto-refetch
async function fetchDashboardData(userId: string) {
  const [
    quizzesRes,
    scheduledRes,
    pendingRes,
    telegramPostsRes,
    responsesRes,
    topicsRes,
    docsRes,
    questionsRes,
    channelsRes
  ] = await Promise.all([
    supabase.from("quiz_generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase.from("scheduled_telegram_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase.from("scheduled_telegram_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending"),
    supabase.from("telegram_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase.from("quiz_responses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase.from("knowledge_base_topics")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase.from("documents")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase.from("question_banks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase.from("channels")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
  ]);

  const results = [
    ["quizzes", quizzesRes],
    ["scheduled posts", scheduledRes],
    ["pending posts", pendingRes],
    ["telegram posts", telegramPostsRes],
    ["quiz responses", responsesRes],
    ["topics", topicsRes],
    ["documents", docsRes],
    ["questions", questionsRes],
    ["channels", channelsRes],
  ] as const;

  for (const [label, result] of results) {
    if (result?.error) {
      console.warn(`Failed to load ${label} count:`, result.error.message);
    }
  }

  // Calculate total quizzes across all generation sources (AI quiz generations, scheduled broadcasts, direct posts)
  const totalQuizzes = (quizzesRes?.count || 0) + (scheduledRes?.count || 0) + (telegramPostsRes?.count || 0);
  const totalTopics = (topicsRes?.count ?? 0) > 0 ? (topicsRes?.count ?? 0) : (docsRes?.count ?? 0);

  return {
    stats: {
      totalQuizzes,
      scheduledPosts: scheduledRes?.count || 0,
      pendingPosts: pendingRes?.count || 0,
      totalViews: responsesRes?.count || 0,
      totalTopics,
      totalDocuments: totalTopics,
      totalQuestions: questionsRes?.count || 0,
      totalChannels: channelsRes?.count || 0
    }
  };
}

export default function Dashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["dashboard-data", user?.id],
    queryFn: () => fetchDashboardData(user!.id),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!user,
    retry: 1,
  });

  const stats = data?.stats;

  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading stats",
        description: "We couldn't refresh your dashboard stats. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleRefresh = async () => {
    const result = await refetch();
    if (result.error) {
      toast({
        title: "Error loading stats",
        description: "We couldn't refresh your dashboard stats. Please try again.",
        variant: "destructive",
      });
      return;
    }
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
      color: "from-sky-400 to-blue-500",
      glow: "hover:shadow-blue-500/10",
      accent: "text-blue-500",
      description: "Quizzes generated"
    },
    {
      title: "Scheduled",
      value: stats?.scheduledPosts || 0,
      icon: Calendar,
      color: "from-amber-400 to-orange-500",
      glow: "hover:shadow-orange-500/10",
      accent: "text-orange-500",
      description: "Scheduled broadcasts"
    },
    {
      title: "Responses",
      value: stats?.totalViews || 0,
      icon: BarChart3,
      color: "from-rose-400 to-pink-500",
      glow: "hover:shadow-pink-500/10",
      accent: "text-pink-500",
      description: "Quiz participation"
    },
    {
      title: "Questions",
      value: stats?.totalQuestions || 0,
      icon: Database,
      color: "from-emerald-400 to-teal-500",
      glow: "hover:shadow-teal-500/10",
      accent: "text-teal-500",
      description: "Saved question pool"
    },
  ], [stats]);

  const quickActions = [
    { 
      title: "Create Quiz", 
      subtitle: "Generate with AI Curation", 
      icon: Plus, 
      path: "/dashboard/create-quiz", 
      color: "from-sky-400 to-blue-500",
      badge: "Popular"
    },
    { 
      title: "Question Bank", 
      subtitle: "Manage your database", 
      icon: Database, 
      path: "/dashboard/question-bank", 
      color: "from-emerald-400 to-teal-500",
      badge: null
    },
    { 
      title: "Scheduler", 
      subtitle: "Automated publishing", 
      icon: Clock, 
      path: "/dashboard/scheduler", 
      color: "from-amber-400 to-orange-500",
      badge: "Auto"
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-6">
        {/* Header Hero Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {greeting}, <span className="text-primary">{profile?.full_name?.split(" ")[0] || "User"}</span>!
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Monitor, schedule, and scale your Telegram quiz channels from a single dashboard.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isFetching}
              className="gap-2 h-8 text-xs font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-primary ${isFetching ? "animate-spin" : ""}`} />
              <span>Refresh Stats</span>
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/dashboard/create-quiz")}
              className="gap-1.5 h-8 text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Quiz</span>
            </Button>
          </div>
        </div>

        {/* Core Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-24 rounded-xl bg-muted/60 animate-pulse border border-border/40" />
            ))
          ) : (
            statsCards.map((stat, idx) => (
              <Card
                key={idx}
                className="border-border/60 bg-card p-4 shadow-sm hover:shadow-md motion-lift flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{stat.title}</span>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight tabular-nums">
                      {stat.value.toLocaleString()}
                    </p>
                  </div>
                  <div className={`w-9 h-9 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center shadow-sm shrink-0 transition-transform duration-300 ease-out hover:scale-110 hover:-rotate-6`}>
                    <stat.icon className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-3 pt-2.5 border-t border-border/30">
                  <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${stat.color}`} />
                  <span className="truncate">{stat.description}</span>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Quick Actions Panel */}
        <Card className="border-border/60 bg-card shadow-sm overflow-hidden">
          <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <TrendingUp className="w-4 h-4 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Launch quizzes, manage questions, and configure delivery schedules.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  className="group text-left rounded-lg border border-border/60 bg-card p-4 hover:bg-accent/40 hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between gap-3"
                  onClick={() => navigate(action.path)}
                >
                  <div className="flex justify-between items-start w-full">
                    <div className={`w-10 h-10 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center shadow-sm`}>
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    {action.badge && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary">
                        {action.badge}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{action.title}</p>
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{action.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Stats & Channel Activity */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {/* Channels Activity */}
          <Card className="border-border/60 bg-card shadow-sm p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Bot className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm text-foreground">Channels</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/dashboard/channels")}
                className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Manage <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold tracking-tight text-foreground">{stats?.totalChannels || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Telegram Channels Connected</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs mt-3 pt-2.5 border-t border-border/30">
              {(stats?.totalChannels || 0) > 0 ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">Channels active and synchronized</span>
                </>
              ) : (
                <span className="text-muted-foreground">Connect a Telegram channel to start posting</span>
              )}
            </div>
          </Card>

          {/* Sourced Knowledge Base */}
          <Card className="border-border/60 bg-card shadow-sm p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm text-foreground">Knowledge Base</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/dashboard/knowledge-base")}
                className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                View <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold tracking-tight text-foreground">{stats?.totalTopics || stats?.totalDocuments || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Saved Knowledge Topics</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3 pt-2.5 border-t border-border/30">
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Ready for AI-powered generation</span>
            </div>
          </Card>

          {/* Pending Delivery */}
          <Card className="border-border/60 bg-card shadow-sm p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm text-foreground">Pending Posts</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/dashboard/scheduler")}
                className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Schedule <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold tracking-tight text-foreground">{stats?.pendingPosts || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Quizzes in Publishing Queue</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3 pt-2.5 border-t border-border/30">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span>Auto-posting according to schedule</span>
            </div>
          </Card>
        </div>

        {/* Getting Started Blank State */}
        {(stats?.totalQuizzes || 0) === 0 && !isLoading && (
          <Card className="border-dashed border-primary/30 bg-primary/5 rounded-xl p-6 text-center">
            <CardContent className="p-0 max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto text-primary">
                <Sparkle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">Create Your First AI Quiz</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Generate tailored multiple-choice questions with detailed explanations and publish directly to your Telegram channels.
              </p>
              <Button 
                size="sm"
                onClick={() => navigate("/dashboard/create-quiz")} 
                className="gap-1.5 text-xs font-medium mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Quiz Now</span>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

