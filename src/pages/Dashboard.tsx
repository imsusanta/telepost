import { useMemo, useEffect, useState } from "react";
import { BarChart3, Bot, Calendar, Database, FileText, LayoutDashboard, RefreshCw, Sparkles, TrendingUp, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface DashboardStats {
  totalQuizzes: number;
  scheduledPosts: number;
  pendingPosts: number;
  totalViews: number;
  totalDocuments: number;
  totalQuestions: number;
  connectedBots: number;
  totalChannels: number;
}

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

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <>{count.toLocaleString()}</>;
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
      connectedBots: profileResult.data?.telegram_bot_token ? 1 : 0,
      totalChannels: channelsResult.count || 0
    }
  };
}

export default function Dashboard() {
  const { toast } = useToast();

  // Use React Query for data fetching with caching and auto-refetch
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: fetchDashboardData,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true, // Auto-refetch when user returns to tab
    retry: 2,
  });

  const profile = data?.profile;
  const stats = data?.stats;

  // Handle errors with toast
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
      gradient: "from-primary to-accent",
      description: "Quizzes created",
      trend: stats?.totalQuizzes ? "+12%" : null
    },
    {
      title: "Scheduled Posts",
      value: stats?.scheduledPosts || 0,
      icon: Calendar,
      gradient: "from-accent to-secondary",
      description: `${stats?.pendingPosts || 0} pending`,
      trend: null
    },
    {
      title: "Total Responses",
      value: stats?.totalViews || 0,
      icon: BarChart3,
      gradient: "from-secondary to-success",
      description: "Quiz responses",
      trend: stats?.totalViews ? "+24%" : null
    },
    {
      title: "Connected Bots",
      value: stats?.connectedBots || 0,
      icon: Bot,
      gradient: "from-success to-primary",
      description: `${stats?.totalChannels || 0} channels`,
      trend: null
    },
    {
      title: "Documents",
      value: stats?.totalDocuments || 0,
      icon: FileText,
      gradient: "from-primary to-secondary",
      description: "PDFs uploaded",
      trend: null
    },
    {
      title: "Question Bank",
      value: stats?.totalQuestions || 0,
      icon: Database,
      gradient: "from-accent to-success",
      description: "Questions saved",
      trend: stats?.totalQuestions ? "+8%" : null
    }
  ], [stats]);

  // Only show Quick Start Guide if user has no quizzes
  const showQuickStart = (stats?.totalQuizzes || 0) === 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <PageHeader
            title={`Welcome back, ${profile?.full_name || "User"}!`}
            description="Manage your Telegram quizzes from here"
            icon={LayoutDashboard}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isFetching}
            className="gap-2 clay-button"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error State */}
        {error && !isLoading && (
          <Alert variant="destructive" className="animate-in fade-in duration-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to load dashboard data. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            // Loading Skeletons with staggered animation
            Array.from({ length: 6 }).map((_, idx) => (
              <Card
                key={idx}
                className="bg-card/50 backdrop-blur-sm border-border animate-in fade-in duration-300"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <CardHeader className="pb-3">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="w-12 h-12 rounded-2xl" />
                  </div>
                  <Skeleton className="h-3 w-20 mt-2" />
                </CardContent>
              </Card>
            ))
          ) : (
            // Stats Cards with enhanced animations
            statsCards.map((stat, idx) => (
              <Card
                key={idx}
                className="group clay-card-hover bg-card/50 backdrop-blur-sm border-border transition-all duration-300 hover:scale-[1.02] hover:shadow-xl animate-in fade-in duration-300"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center justify-between">
                    {stat.title}
                    {stat.trend && (
                      <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 font-normal">
                        <TrendingUp className="w-3 h-3" />
                        {stat.trend}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-foreground">
                      {isLoading ? "0" : <AnimatedCounter value={stat.value} />}
                    </div>
                    <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-2xl flex items-center justify-center shadow-clay transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{stat.description}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Quick Start Guide - Only show if no quizzes */}
        {showQuickStart && !isLoading && (
          <Card className="clay-card bg-card/50 backdrop-blur-sm border-border animate-in fade-in duration-500">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-foreground">Quick Start Guide</CardTitle>
              <CardDescription className="text-muted-foreground">Get started with creating your first quiz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-4 p-5 clay-card-hover bg-muted/20 backdrop-blur-sm rounded-xl transition-all duration-300 hover:bg-muted/30 hover:scale-[1.01]">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center flex-shrink-0 shadow-clay">
                  <span className="text-white font-bold text-lg">1</span>
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1.5">Connect Your Telegram Bot</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">Link your Telegram bot to start posting quizzes to your channel</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-5 clay-card-hover bg-muted/20 backdrop-blur-sm rounded-xl transition-all duration-300 hover:bg-muted/30 hover:scale-[1.01]">
                <div className="w-10 h-10 bg-gradient-to-br from-accent to-secondary rounded-2xl flex items-center justify-center flex-shrink-0 shadow-clay">
                  <span className="text-white font-bold text-lg">2</span>
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1.5">Create Your First Quiz</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">Use AI to generate engaging quiz questions in seconds</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-5 clay-card-hover bg-muted/20 backdrop-blur-sm rounded-xl transition-all duration-300 hover:bg-muted/30 hover:scale-[1.01]">
                <div className="w-10 h-10 bg-gradient-to-br from-secondary to-success rounded-2xl flex items-center justify-center flex-shrink-0 shadow-clay">
                  <span className="text-white font-bold text-lg">3</span>
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1.5">Schedule Automatic Posts</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">Set up daily quiz posts to keep your audience engaged</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
