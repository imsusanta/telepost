import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Bot, BarChart3, Calendar, LayoutDashboard, RefreshCw, Database, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadDashboardData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Load all data in parallel (including quiz IDs for responses)
      const [
        profileResult,
        quizzesResult,
        scheduledResult,
        pendingResult,
        quizIdsResult,
        documentsResult,
        questionsResult,
        channelsResult
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("quiz_generations").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("scheduled_telegram_posts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("scheduled_telegram_posts").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "pending"),
        supabase.from("quiz_generations").select("id").eq("user_id", user.id),
        supabase.from("documents").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("question_banks").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("channels").select("*", { count: "exact", head: true }).eq("user_id", user.id)
      ]);

      // Get response count using the quiz IDs from parallel load
      const quizIds = quizIdsResult.data?.map(q => q.id) || [];
      let totalViews = 0;
      if (quizIds.length > 0) {
        const { count } = await supabase
          .from("quiz_responses")
          .select("quiz_generation_id", { count: "exact", head: true })
          .in("quiz_generation_id", quizIds);
        totalViews = count || 0;
      }

      setProfile(profileResult.data);
      setStats({
        totalQuizzes: quizzesResult.count || 0,
        scheduledPosts: scheduledResult.count || 0,
        pendingPosts: pendingResult.count || 0,
        totalViews,
        totalDocuments: documentsResult.count || 0,
        totalQuestions: questionsResult.count || 0,
        connectedBots: profileResult.data?.telegram_bot_token ? 1 : 0,
        totalChannels: channelsResult.count || 0
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load dashboard data";
      toast({
        title: "Error loading dashboard",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await loadDashboardData();
    toast({
      title: "Dashboard refreshed",
      description: "All stats have been updated",
    });
  }, [loadDashboardData, toast]);

  const statsCards = useMemo(() => [
    {
      title: "Total Quizzes",
      value: stats?.totalQuizzes || 0,
      icon: Sparkles,
      gradient: "from-primary to-accent",
      description: "Quizzes created"
    },
    {
      title: "Scheduled Posts",
      value: stats?.scheduledPosts || 0,
      icon: Calendar,
      gradient: "from-accent to-secondary",
      description: `${stats?.pendingPosts || 0} pending`
    },
    {
      title: "Total Responses",
      value: stats?.totalViews || 0,
      icon: BarChart3,
      gradient: "from-secondary to-success",
      description: "Quiz responses"
    },
    {
      title: "Connected Bots",
      value: stats?.connectedBots || 0,
      icon: Bot,
      gradient: "from-success to-primary",
      description: `${stats?.totalChannels || 0} channels`
    },
    {
      title: "Documents",
      value: stats?.totalDocuments || 0,
      icon: FileText,
      gradient: "from-primary to-secondary",
      description: "PDFs uploaded"
    },
    {
      title: "Question Bank",
      value: stats?.totalQuestions || 0,
      icon: Database,
      gradient: "from-accent to-success",
      description: "Questions saved"
    }
  ], [stats]);

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
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <Card key={idx} className="bg-card/50 backdrop-blur-sm border-border">
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
            statsCards.map((stat, idx) => (
              <Card key={idx} className="clay-card-hover bg-card/50 backdrop-blur-sm border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground">{stat.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-foreground">{stat.value.toLocaleString()}</div>
                    <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-2xl flex items-center justify-center shadow-clay`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{stat.description}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Card className="clay-card bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">Quick Start Guide</CardTitle>
            <CardDescription className="text-muted-foreground">Get started with creating your first quiz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-4 p-5 clay-card-hover bg-muted/20 backdrop-blur-sm">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center flex-shrink-0 shadow-clay">
                <span className="text-white font-bold text-lg">1</span>
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-1.5">Connect Your Telegram Bot</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Link your Telegram bot to start posting quizzes to your channel</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-5 clay-card-hover bg-muted/20 backdrop-blur-sm">
              <div className="w-10 h-10 bg-gradient-to-br from-accent to-secondary rounded-2xl flex items-center justify-center flex-shrink-0 shadow-clay">
                <span className="text-white font-bold text-lg">2</span>
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-1.5">Create Your First Quiz</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Use AI to generate engaging quiz questions in seconds</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-5 clay-card-hover bg-muted/20 backdrop-blur-sm">
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
      </div>
    </DashboardLayout>
  );
}
