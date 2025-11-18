import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Send, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { ChannelManager } from "@/components/ChannelManager";
import { ChannelService } from "@/services/channelService";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function ConnectBot() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [channelCount, setChannelCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadChannelInfo();
    }
  }, [user]);

  const loadChannelInfo = async () => {
    try {
      setLoading(true);
      const count = await ChannelService.getChannelCount(user!.id);
      setChannelCount(count);
    } catch (error) {
      console.error("Failed to load channel info:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Manage Telegram Channels</h1>
          <p className="text-muted-foreground">
            Connect and manage multiple Telegram channels for quiz delivery
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Send className="w-5 h-5" />
              <span>Channel Configuration</span>
            </CardTitle>
            <CardDescription>
              {loading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                  Loading channels...
                </span>
              ) : channelCount > 0 ? (
                <span className="flex items-center text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {channelCount} channel{channelCount > 1 ? "s" : ""} connected
                </span>
              ) : (
                <span className="flex items-center text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  No channels connected yet
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChannelManager />
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Quick Start Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start space-x-2">
              <span className="font-bold text-primary">1.</span>
              <p>Open Telegram and search for @BotFather</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-primary">2.</span>
              <p>Create a new bot using /newbot command</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-primary">3.</span>
              <p>Copy the bot token you receive</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-primary">4.</span>
              <p>Add your bot as an admin to your Telegram channel</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-primary">5.</span>
              <p>Click "Add Channel" above and fill in your bot token and channel ID</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-primary">6.</span>
              <p>You can manage all your channels from the Create Quiz page</p>
            </div>
          </CardContent>
        </Card>

        {channelCount > 0 && (
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/dashboard/create-quiz")}
              className="gap-2"
            >
              Go to Create Quiz
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
