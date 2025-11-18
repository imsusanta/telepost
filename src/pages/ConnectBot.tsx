import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";

export default function ConnectBot() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [channelId, setChannelId] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadBotInfo();
  }, []);

  const loadBotInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("telegram_bot_token, telegram_channel_id")
        .eq("id", user.id)
        .single();
      
      if (data) {
        setBotToken(data.telegram_bot_token || "");
        setChannelId(data.telegram_channel_id || "");
        setIsConnected(!!(data.telegram_bot_token && data.telegram_channel_id));
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          telegram_bot_token: botToken,
          telegram_channel_id: channelId,
        })
        .eq("id", user.id);

      if (error) throw error;

      setIsConnected(true);
      toast({
        title: "Success!",
        description: "Bot connected successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Connect Telegram Bot</h1>
          <p className="text-muted-foreground">Link your Telegram bot to start posting quizzes</p>
        </div>

        <Card className="clay-card bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Send className="w-5 h-5" />
              <span>Bot Configuration</span>
            </CardTitle>
            <CardDescription>
              {isConnected ? (
                <span className="flex items-center text-success">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Bot is connected
                </span>
              ) : (
                <span className="flex items-center text-warning">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Bot not connected yet
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="botToken">Bot Token</Label>
                <Input
                  id="botToken"
                  type="password"
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Get your bot token from @BotFather on Telegram
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="channelId">Channel ID</Label>
                <Input
                  id="channelId"
                  type="text"
                  placeholder="@yourchannel or -1001234567890"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Your channel username or ID (make sure the bot is an admin)
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Saving..." : isConnected ? "Update Connection" : "Connect Bot"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="clay-card bg-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">How to Set Up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
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
              <p>Copy the bot token and paste it above</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-primary">4.</span>
              <p>Add your bot as an admin to your channel</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-primary">5.</span>
              <p>Enter your channel username (with @) or channel ID</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
