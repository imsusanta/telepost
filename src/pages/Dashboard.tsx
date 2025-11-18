import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Send, BarChart3, Calendar } from "lucide-react";

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data);
    }
  };

  const stats = [
    { title: "Total Quizzes", value: "0", icon: Sparkles, gradient: "from-primary to-accent" },
    { title: "Scheduled", value: "0", icon: Calendar, gradient: "from-accent to-secondary" },
    { title: "Total Views", value: "0", icon: BarChart3, gradient: "from-secondary to-success" },
    { title: "Connected Bots", value: profile?.telegram_bot_token ? "1" : "0", icon: Send, gradient: "from-success to-primary" }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-slide-up">
        <div>
          <h1 className="text-4xl font-bold text-gradient bg-gradient-to-r from-primary via-accent to-secondary mb-2">
            Welcome back, {profile?.full_name || "User"}!
          </h1>
          <p className="text-muted-foreground text-lg">Manage your Telegram quizzes from here</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <Card
              key={idx}
              className="clay-card-hover bg-card/50 backdrop-blur-sm border-border animate-scale-in"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground">{stat.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                  <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-2xl flex items-center justify-center shadow-clay`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="clay-card bg-card/50 backdrop-blur-sm border-border animate-scale-in" style={{ animationDelay: "0.4s" }}>
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
