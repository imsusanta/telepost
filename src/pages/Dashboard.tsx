import { useMemo, useEffect, useState } from "react";
import { BarChart3, Bot, Calendar, Database, FileText, RefreshCw, Sparkles, Plus, ArrowRight, Clock, Activity, TrendingUp, Sparkle, ArrowUpRight, Zap, CheckCircle2 } from "lucide-react";
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
  // Fetch all stats in parallel for maximum performance
  const [
    quizzesRes,
    sentScheduledRes,
    postedRes,
    scheduledRes,
    pendingRes,
    responsesRes,
    docsRes,
    questionsRes,
    channelsRes
  ] = await Promise.all([
    // Total Quizzes in generation table
    supabase.from("quiz_generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    
    // Sent scheduled quizzes
    supabase.from("scheduled_telegram_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "sent"),

    // Posted telegram posts
    supabase.from("telegram_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),

    // Scheduled posts (Total)
    supabase.from("scheduled_telegram_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    
    // Pending posts
    supabase.from("scheduled_telegram_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending"),
    
    // Quiz responses (Engagements) - Optimized count via inner join
    supabase.from("quiz_responses")
      .select("*, quiz_generations!inner(user_id)", { count: "exact", head: true })
      .eq("quiz_generations.user_id", userId),
    
    // Documents
    supabase.from("documents")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    
    // Questions
    supabase.from("question_banks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    
    // Channels
    supabase.from("channels")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
  ]);

  return {
    stats: {
      totalQuizzes: (quizzesRes.count || 0) + (sentScheduledRes.count || 0) + (postedRes.count || 0),
      scheduledPosts: scheduledRes.count || 0,
      pendingPosts: pendingRes.count || 0,
      totalViews: responsesRes.count || 0,
      totalDocuments: docsRes.count || 0,
      totalQuestions: questionsRes.count || 0,
      totalChannels: channelsRes.count || 0
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
      color: "from-sky-400 to-blue-500",
      glow: "hover:shadow-blue-500/10",
      accent: "text-blue-500",
      description: "Quizzes created & sent"
    },
    {
      title: "Scheduled",
      value: stats?.scheduledPosts || 0,
      icon: Calendar,
      color: "from-amber-400 to-orange-500",
      glow: "hover:shadow-orange-500/10",
      accent: "text-orange-500",
      description: "Planned broadcasts"
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
      <div className="space-y-8 relative pb-10">
        
        {/* Ambient Decorative Blurs with Floating Animations */}
        <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-blue-400/15 blur-[120px] pointer-events-none animate-float-slow" />
        <div className="absolute top-40 right-20 w-80 h-80 rounded-full bg-pink-400/10 blur-[130px] pointer-events-none animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-10 left-1/3 w-96 h-96 rounded-full bg-teal-400/10 blur-[150px] pointer-events-none animate-float-slow" style={{ animationDelay: '4s' }} />

        {/* Header Hero Section */}
        <div className="relative overflow-hidden border border-white/30 dark:border-white/10 bg-white/60 dark:bg-card/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-[0_32px_64px_-24px_rgba(0,0,0,0.06)] dark:shadow-[0_32px_64px_-24px_rgba(0,0,0,0.4)] transition-all duration-500 hover:border-primary/20 animate-fade-in group">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/5 via-accent/5 to-transparent blur-2xl pointer-events-none transition-transform duration-700 group-hover:scale-110" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-primary/10 text-primary animate-pulse-soft">
                <Activity className="w-3 h-3" />
                Live Hub Overview
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
                {greeting}, <span className="text-primary">{profile?.full_name || "User"}</span>!
              </h1>
              <p className="text-sm md:text-base text-muted-foreground font-medium max-w-2xl leading-relaxed">
                Streamline, automate, and scale your Telegram channel engagement metrics with TelePost's intuitive dashboard intelligence.
              </p>
            </div>
            
            <Button
              variant="outline"
              size="default"
              onClick={handleRefresh}
              disabled={isLoading || isFetching}
              className="gap-2.5 rounded-full px-6 bg-white/40 dark:bg-background/40 hover:bg-white dark:hover:bg-background/80 hover:scale-105 active:scale-95 transition-all duration-300 border-white/40 dark:border-white/10 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 text-primary ${isFetching ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <span className="font-semibold text-xs">Sync Stats</span>
            </Button>
          </div>
        </div>

        {/* Interactive Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-32 rounded-3xl bg-muted/60 animate-pulse border border-white/20" />
            ))
          ) : (
            statsCards.map((stat, idx) => (
              <div
                key={idx}
                className={`relative overflow-hidden bg-white/40 dark:bg-card/30 backdrop-blur-md border border-white/40 dark:border-white/5 rounded-3xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1.5 group flex flex-col justify-between h-36 ${stat.glow} animate-fade-up`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Micro Animated Background Circle */}
                <div className={`absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 blur-xl transition-all duration-500 scale-75 group-hover:scale-125`} />
                
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{stat.title}</span>
                    <p className="text-3xl md:text-4xl font-black text-foreground tracking-tight tabular-nums">
                      {stat.value.toLocaleString()}
                    </p>
                  </div>
                  <div className={`w-11 h-11 bg-gradient-to-br ${stat.color} rounded-2xl flex items-center justify-center shadow-md shadow-black/5 group-hover:scale-110 transition-transform duration-500`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground mt-2 border-t border-black/5 dark:border-white/5 pt-2">
                  <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${stat.color} animate-pulse`} />
                  {stat.description}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions Panel */}
        <Card className="border-white/40 dark:border-white/5 bg-white/40 dark:bg-card/20 backdrop-blur-xl rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 animate-fade-up" style={{ animationDelay: '300ms' }}>
          <CardHeader className="pb-4 border-b border-black/5 dark:border-white/5">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <TrendingUp className="w-5 h-5 text-primary animate-bounce-soft" />
              Quick Command Grid
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-medium">
              Start building, scheduling, and editing tasks immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  className="group relative text-left rounded-2xl border border-white/50 dark:border-white/5 bg-white/50 dark:bg-background/25 p-5 hover:bg-white dark:hover:bg-background/60 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between h-40 overflow-hidden"
                  onClick={() => navigate(action.path)}
                >
                  <div className="absolute right-0 bottom-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent blur-lg pointer-events-none group-hover:scale-150 transition-transform duration-700" />
                  
                  <div className="flex justify-between items-start w-full">
                    <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-all duration-500`}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    {action.badge && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary">
                        {action.badge}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mt-4">
                    <div className="flex items-center gap-1">
                      <p className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors duration-300">{action.title}</p>
                      <ArrowUpRight className="w-4 h-4 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-300 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground font-semibold">{action.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Stats & Channel Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up" style={{ animationDelay: '400ms' }}>
          
          {/* Channels Activity */}
          <Card className="border-white/40 dark:border-white/5 bg-white/40 dark:bg-card/25 backdrop-blur-xl rounded-3xl flex flex-col justify-between overflow-hidden group">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary group-hover:rotate-12 transition-transform duration-300" />
                Active Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between border-b border-black/5 dark:border-white/5 pb-4">
                <div>
                  <p className="text-5xl font-black tracking-tight text-foreground">{stats?.totalChannels || 0}</p>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1">Telegram Channels</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate("/dashboard/channels")}
                  className="rounded-full px-4 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-all duration-300"
                >
                  Manage <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Channels are synced and listening for broadcasts.
              </div>
            </CardContent>
          </Card>

          {/* Sourced Knowledge Base */}
          <Card className="border-white/40 dark:border-white/5 bg-white/40 dark:bg-card/25 backdrop-blur-xl rounded-3xl flex flex-col justify-between overflow-hidden group">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary group-hover:-translate-y-0.5 transition-transform" />
                Knowledge Repositories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between border-b border-black/5 dark:border-white/5 pb-4">
                <div>
                  <p className="text-5xl font-black tracking-tight text-foreground">{stats?.totalDocuments || 0}</p>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1">PDFs & Text Library</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate("/dashboard/documents")}
                  className="rounded-full px-4 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-all duration-300"
                >
                  View <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
                Ready to be used for smart quiz generation.
              </div>
            </CardContent>
          </Card>

          {/* Pending Delivery */}
          <Card className="border-white/40 dark:border-white/5 bg-white/40 dark:bg-card/25 backdrop-blur-xl rounded-3xl flex flex-col justify-between overflow-hidden group">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary group-hover:spin-slow" />
                Pending Queue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between border-b border-black/5 dark:border-white/5 pb-4">
                <div>
                  <p className="text-5xl font-black tracking-tight text-foreground">{stats?.pendingPosts || 0}</p>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1">Scheduled Posts</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate("/dashboard/scheduler")}
                  className="rounded-full px-4 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-all duration-300"
                >
                  Inspect <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Awaiting scheduled broadcast slots.
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Getting Started Blank State */}
        {(stats?.totalQuizzes || 0) === 0 && !isLoading && (
          <Card className="border-dashed border-primary/30 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 rounded-3xl animate-fade-up" style={{ animationDelay: '500ms' }}>
            <CardContent className="py-10">
              <div className="text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-8 ring-primary/5 animate-float">
                  <Sparkle className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Create Your First AI Quiz</h3>
                <p className="text-muted-foreground mb-5 text-sm leading-relaxed">
                  Start engaging your Telegram audience immediately with AI-driven, topic-focused interactive quiz broadcasts.
                </p>
                <Button 
                  onClick={() => navigate("/dashboard/create-quiz")} 
                  className="gap-2 rounded-full px-7 bg-primary text-white hover:scale-105 active:scale-95 transition-all duration-300 shadow-md shadow-primary/20"
                >
                  <Plus className="w-4 h-4" />
                  Create Quiz Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

