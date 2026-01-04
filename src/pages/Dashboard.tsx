import { useMemo, useEffect, useState } from "react";
import { BarChart3, Bot, Calendar, Database, FileText, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Animated counter component for smooth number transitions
function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      setCount(Math.floor(progress * value));
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return (
    <span className="inline-block transition-all duration-300 hover:scale-110 active:scale-95">
      {count.toLocaleString()}
    </span>
  );
}

// Fetch dashboard data with React Query for caching and auto-refetch
async function fetchDashboardData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user found");

  // Load all data in parallel - optimized to avoid sequential calls
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
      connectedBots: 1, // Bot token now stored server-side
      totalChannels: channelsResult.count || 0
    }
  };
}

export default function Dashboard() {
  const { toast } = useToast();

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
      color: "playful-green",
      gradient: "from-[hsl(var(--playful-green))] to-[hsl(var(--playful-green)/0.7)]",
      description: "Quizzes created",
      trend: stats?.totalQuizzes ? "+12%" : null
    },
    {
      title: "Scheduled Posts",
      value: stats?.scheduledPosts || 0,
      icon: Calendar,
      color: "playful-yellow",
      gradient: "from-[hsl(var(--playful-yellow))] to-[hsl(var(--playful-yellow)/0.7)]",
      description: `${stats?.pendingPosts || 0} pending`,
      trend: null
    },
    {
      title: "Total Responses",
      value: stats?.totalViews || 0,
      icon: BarChart3,
      color: "playful-coral",
      gradient: "from-[hsl(var(--playful-coral))] to-[hsl(var(--playful-coral)/0.7)]",
      description: "Quiz responses",
      trend: stats?.totalViews ? "+24%" : null
    },
    {
      title: "Connected Bots",
      value: stats?.connectedBots || 0,
      icon: Bot,
      color: "primary",
      gradient: "from-primary to-accent",
      description: `${stats?.totalChannels || 0} channels`,
      trend: null
    },
    {
      title: "Documents",
      value: stats?.totalDocuments || 0,
      icon: FileText,
      color: "secondary",
      gradient: "from-secondary to-primary",
      description: "PDFs uploaded",
      trend: null
    },
    {
      title: "Question Bank",
      value: stats?.totalQuestions || 0,
      icon: Database,
      color: "accent",
      gradient: "from-accent to-secondary",
      description: "Questions saved",
      trend: stats?.totalQuestions ? "+8%" : null
    }
  ], [stats]);

  const showQuickStart = (stats?.totalQuizzes || 0) === 0;

  return (
    <DashboardLayout>
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 overflow-visible">
          <div className="space-y-4 animate-premium-entrance">
            <h1 className="text-6xl md:text-7xl font-black text-foreground tracking-tighter leading-none">
              Welcome back, <br />
              <span className="text-primary italic animate-wave-text bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
                {profile?.full_name?.split(' ')[0] || "User"}!
              </span>
            </h1>
            <p className="text-xl text-muted-foreground font-medium max-w-lg delay-300 animate-in fade-in slide-in-from-left-4 duration-1000">
              Here's a quick look at how your Telegram quizzes are performing today.
            </p>
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={handleRefresh}
            disabled={isLoading || isFetching}
            className="gap-2 rounded-2xl border-2 px-8 py-8 font-bold text-lg hover:bg-muted/50 transition-all shadow-sm group glass-button animate-premium-entrance"
            style={{ animationDelay: '400ms' }}
          >
            <RefreshCw className={`w-5 h-5 transition-transform duration-700 group-hover:rotate-180 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 overflow-visible">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-48 rounded-4xl bg-card/50 backdrop-blur-sm border-2 border-border/40 animate-pulse" />
            ))
          ) : (
            statsCards.map((stat, idx) => (
              <div
                key={idx}
                className={`group relative overflow-hidden rounded-4xl p-8 bg-white dark:bg-card border border-border/40 soft-shadow-lg clay-card-hover animate-premium-entrance`}
                style={{ animationDelay: `${idx * 150 + 500}ms` }}
              >
                <div className="flex flex-col h-full justify-between relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-black text-muted-foreground uppercase tracking-widest transition-colors duration-300 group-hover:text-primary">{stat.title}</p>
                      <div className="text-5xl font-black text-foreground tracking-tighter">
                        <AnimatedCounter value={stat.value} />
                      </div>
                    </div>
                    <div className={`w-16 h-16 bg-gradient-to-br ${stat.gradient} rounded-3xl flex items-center justify-center shadow-lg stat-icon transition-all duration-700`}>
                      <stat.icon className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/10">
                    <p className="text-base font-bold text-muted-foreground">{stat.description}</p>
                    {stat.trend && (
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs font-black flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {stat.trend}
                      </span>
                    )}
                  </div>
                </div>

                {/* Decorative background circle */}
                <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-[0.05] transition-all duration-700 group-hover:scale-150 animate-soft-float ${stat.color === 'playful-green' ? 'bg-playful-green' :
                  stat.color === 'playful-yellow' ? 'bg-playful-yellow' :
                    stat.color === 'playful-coral' ? 'bg-playful-coral' : 'bg-primary'
                  }`} />
              </div>
            ))
          )}
        </div>

        {/* Quick Start Guide */}
        {showQuickStart && !isLoading && (
          <div className="bg-white dark:bg-card rounded-5xl p-10 border border-border/40 soft-shadow-lg animate-premium-entrance" style={{ animationDelay: '1.5s' }}>
            <div className="mb-10 text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-4xl font-black text-foreground tracking-tight italic">Get Started in 3 Steps</h2>
              <p className="text-xl text-muted-foreground font-medium">Follow these simple steps to launch your first AI-powered quiz.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: 1, title: "Connect Bot", desc: "Link your Telegram bot to start posting quizzes to your channel", gradient: "from-primary to-accent" },
                { step: 2, title: "Create Quiz", desc: "Use AI to generate engaging quiz questions in seconds", gradient: "from-accent to-secondary" },
                { step: 3, title: "Schedule", desc: "Set up daily quiz posts to keep your audience engaged", gradient: "from-secondary to-success" }
              ].map((item, i) => (
                <div key={i} className="group p-8 rounded-4xl bg-[hsl(var(--playful-background))] dark:bg-muted/10 border border-border/40 transition-all duration-500 hover:translate-y-[-10px] hover:shadow-2xl animate-premium-entrance" style={{ animationDelay: `${i * 200 + 1700}ms` }}>
                  <div className={`w-14 h-14 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-500`}>
                    <span className="text-white font-black text-2xl">{item.step}</span>
                  </div>
                  <h3 className="text-2xl font-black text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground font-medium text-lg leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
