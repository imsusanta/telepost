import { useEffect, useState } from "react";
import {
  Bot,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  SettingsIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [botLoading, setBotLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [botToken, setBotToken] = useState("");
  const [showBotToken, setShowBotToken] = useState(false);
  const [hasBotToken, setHasBotToken] = useState(false);

  useEffect(() => {
    loadProfile();
    loadBotConfig();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        return;
      }

      if (user) {
        console.log("User found:", user.email);
        setEmail(user.email || "");

        const { data, error } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error loading profile:", error);
          // Still try to set email even if profile fails
          return;
        }

        if (data) {
          console.log("Profile loaded:", data.full_name);
          setFullName(data.full_name || "");
        }
      } else {
        console.log("No user found");
      }
    } catch (err) {
      console.error("Exception in loadProfile:", err);
    }
  };

  const loadBotConfig = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        // Check if user has any channels - use any to bypass type issues
        const { data: channels, error } = await (supabase as any)
          .from("channels")
          .select("id, telegram_bot_token")
          .eq("user_id", user.id)
          .limit(1);

        if (error) {
          console.error("Error loading bot config:", error);
          return;
        }

        if (channels && channels.length > 0 && channels[0].telegram_bot_token) {
          setHasBotToken(true);
          setBotToken("••••••••••••••••••••");
        }
      } catch (err) {
        console.error("Exception loading bot config:", err);
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
        .update({ full_name: fullName })
        .eq("id", user.id);

      if (error) throw error;

      // Dispatch custom event to notify Sidebar (DashboardLayout) to reload profile
      window.dispatchEvent(new CustomEvent("profile-updated"));

      toast({
        title: "Success!",
        description: "Settings updated successfully.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBotToken = async () => {
    if (!botToken || botToken === "••••••••••••••••••••") {
      toast({
        title: "Enter Bot Token",
        description: "Please enter a new bot token",
        variant: "destructive",
      });
      return;
    }

    setBotLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      console.log("Saving bot token for user:", user.id);

      // Use any to bypass TypeScript issues with telegram_bot_token column
      const supabaseAny = supabase as any;

      // Check if user already has any channel
      const { data: existingChannels, error: fetchError } = await supabaseAny
        .from("channels")
        .select("id, name")
        .eq("user_id", user.id)
        .limit(1);

      if (fetchError) {
        console.error("Error fetching channels:", fetchError);
        throw new Error(fetchError.message || "Failed to fetch channels");
      }

      console.log("Existing channels:", existingChannels);

      let saveError = null;

      if (existingChannels && existingChannels.length > 0) {
        // Update ALL existing channels with the new bot token
        console.log(`Updating ${existingChannels.length} existing channels...`);
        const { error: updateError } = await supabaseAny
          .from("channels")
          .update({ telegram_bot_token: botToken })
          .eq("user_id", user.id);

        saveError = updateError;
      } else {
        // Create a new channel with the bot token
        console.log("Creating new channel for user:", user.id);
        const result = await supabaseAny
          .from("channels")
          .insert({
            user_id: user.id,
            name: "Default Channel",
            telegram_bot_token: botToken,
            description: "Default channel for quiz posting"
          });
        saveError = result.error;
      }

      if (saveError) {
        console.error("Error saving bot token:", saveError);
        throw new Error(saveError.message || "Failed to save bot token");
      }

      console.log("Bot token saved successfully!");
      setHasBotToken(true);
      setBotToken("••••••••••••••••••••");
      setShowBotToken(false);

      toast({
        title: "Bot Token Saved!",
        description: "Your Telegram bot token has been saved successfully.",
      });
    } catch (error: unknown) {
      console.error("Exception in handleSaveBotToken:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save bot token",
        variant: "destructive",
      });
    } finally {
      setBotLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-3">
          <h1 className="text-5xl font-bold text-foreground mb-2">
            Settings
          </h1>
          <p className="text-muted-foreground text-lg">Manage your account settings and preferences</p>
        </div>

        {/* Telegram Bot Configuration Card */}
        <Card className="clay-card-hover bg-card/50 backdrop-blur-sm border-border">
          <CardHeader className="space-y-3 pb-6">
            <CardTitle className="flex items-center space-x-3 text-2xl">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-clay-sm">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                Telegram Bot
              </span>
              {hasBotToken && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              Connect your Telegram bot to post quizzes to your channels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Bot className="h-4 w-4" />
              <AlertDescription>
                To get a bot token, message{" "}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  @BotFather <ExternalLink className="w-3 h-3" />
                </a>
                {" "}on Telegram and create a new bot.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Label htmlFor="botToken" className="text-base font-medium text-foreground">
                Bot Token
              </Label>
              <div className="relative">
                <Input
                  id="botToken"
                  type={showBotToken ? "text" : "password"}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="h-12 pr-10 font-mono"
                  placeholder="Enter your Telegram bot token"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowBotToken(!showBotToken)}
                >
                  {showBotToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Your bot token is stored securely and never shared.
              </p>
            </div>

            <Button
              onClick={handleSaveBotToken}
              disabled={botLoading}
              className="h-12 px-8 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold"
            >
              {botLoading ? (
                <span className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </span>
              ) : hasBotToken ? (
                "Update Bot Token"
              ) : (
                "Save Bot Token"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Profile Settings Card */}
        <Card className="clay-card-hover bg-card/50 backdrop-blur-sm border-border">
          <CardHeader className="space-y-3 pb-6">
            <CardTitle className="flex items-center space-x-3 text-2xl">
              <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-xl shadow-clay-sm">
                <SettingsIcon className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Profile Settings
              </span>
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="fullName" className="text-base font-medium text-foreground">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-12 clay-input"
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-base font-medium text-foreground">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="h-12"
                />
                <p className="text-sm text-muted-foreground">
                  Email address is managed by your authentication provider
                </p>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 px-8 clay-button bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold"
                >
                  {loading ? (
                    <span className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
