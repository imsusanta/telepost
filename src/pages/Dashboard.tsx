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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {profile?.full_name || "User"}!
          </h1>
          <p className="text-gray-400">Manage your Telegram quizzes from here</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-slate-900/50 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Total Quizzes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-white">0</div>
                <Sparkles className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Scheduled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-white">0</div>
                <Calendar className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Total Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-white">0</div>
                <BarChart3 className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Connected Bots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-white">
                  {profile?.telegram_bot_token ? "1" : "0"}
                </div>
                <Send className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900/50 border-white/10">
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>Get started with creating your first quiz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-4 p-4 bg-white/5 rounded-lg">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 font-bold">1</span>
              </div>
              <div>
                <h3 className="font-medium text-white mb-1">Connect Your Telegram Bot</h3>
                <p className="text-sm text-gray-400">Link your Telegram bot to start posting quizzes</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 bg-white/5 rounded-lg">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 font-bold">2</span>
              </div>
              <div>
                <h3 className="font-medium text-white mb-1">Create Your First Quiz</h3>
                <p className="text-sm text-gray-400">Use AI to generate engaging quiz questions</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 bg-white/5 rounded-lg">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 font-bold">3</span>
              </div>
              <div>
                <h3 className="font-medium text-white mb-1">Schedule Automatic Posts</h3>
                <p className="text-sm text-gray-400">Set up daily quiz posts to keep your audience engaged</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
