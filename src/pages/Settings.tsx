import { useEffect, useState } from "react";
import {
  Bot,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Save,
  ShieldCheck,
  SettingsIcon,
  UserRound,
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
      <div className="mx-auto max-w-6xl space-y-8 pb-12">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <SettingsIcon className="h-4 w-4" /> Workspace settings
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Settings</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Keep your profile current and connect the tools that power your publishing workflow.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 shadow-sm backdrop-blur-xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account status</p>
              <p className="text-sm font-semibold">Protected and private</p>
            </div>
          </div>
        </header>

        <main className="min-w-0 space-y-6">
          {/* Profile Settings Card */}
          <Card id="profile" className="overflow-hidden rounded-3xl border-border/70 bg-card/70 shadow-sm backdrop-blur-xl">
            <CardHeader className="border-b border-border/60 bg-gradient-to-r from-primary/[0.08] to-transparent pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-bold">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <UserRound className="h-5 w-5" />
                </div>
                <span>Profile information</span>
              </CardTitle>
              <CardDescription>Update the details your team sees across TelePost.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-semibold">Full name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="h-11 rounded-xl border-border/70 bg-background/60 font-medium transition-all focus:bg-background focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="h-11 cursor-not-allowed rounded-xl border-border/60 bg-muted/60 font-medium text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground">Managed by your authentication provider.</p>
                  </div>
                </div>

                <div className="flex justify-end border-t border-border/60 pt-5">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 rounded-xl px-5 font-semibold shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Saving...</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Save changes</span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Telegram Bot Configuration Card */}
          <Card id="telegram" className="overflow-hidden rounded-3xl border-border/70 bg-card/70 shadow-sm backdrop-blur-xl">
            <CardHeader className="border-b border-border/60 bg-gradient-to-r from-sky-500/[0.08] to-transparent pb-6">
              <CardTitle className="flex flex-wrap items-center justify-between gap-4 text-xl font-bold">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/20">
                    <Bot className="h-5 w-5" />
                  </div>
                  <span>Telegram integration</span>
                </div>
                {hasBotToken ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                  </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600">
                    Setup needed
                  </span>
                )}
              </CardTitle>
              <CardDescription>Connect a bot to publish quizzes and posts automatically to your Telegram channels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <Alert className="rounded-2xl border-sky-500/25 bg-sky-500/[0.07] p-4 text-foreground">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                  <AlertDescription className="text-sm leading-relaxed">
                    <strong>How to get your Bot Token:</strong> Message{" "}
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-sky-500 hover:underline inline-flex items-center gap-1"
                    >
                      @BotFather <ExternalLink className="w-3 h-3" />
                    </a>{" "}
                    on Telegram, send <code className="bg-background px-1.5 py-0.5 rounded border border-border text-xs font-mono">/newbot</code>, follow the prompts, and paste the HTTP API Token below.
                  </AlertDescription>
                </div>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="botToken" className="text-sm font-semibold">Bot API token</Label>
                <div className="relative">
                  <Input
                    id="botToken"
                    type={showBotToken ? "text" : "password"}
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    className="h-11 rounded-xl border-border/70 bg-background/60 pr-12 font-mono text-sm transition-all focus:bg-background focus:ring-2 focus:ring-sky-500/20"
                    placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-xl"
                    onClick={() => setShowBotToken(!showBotToken)}
                  >
                    {showBotToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your token is stored with encryption and never exposed in client logs.
                </p>
              </div>

              <div className="flex justify-end border-t border-border/60 pt-5">
                <Button
                  onClick={handleSaveBotToken}
                  disabled={botLoading}
                  className="h-11 rounded-xl bg-sky-500 px-5 font-semibold text-white shadow-lg shadow-sky-500/20 transition-transform hover:-translate-y-0.5 hover:bg-sky-600"
                >
                  {botLoading ? (
                    <span className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving Token...</span>
                    </span>
                  ) : hasBotToken ? (
                    "Update Bot Token"
                  ) : (
                    "Save Bot Token"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </DashboardLayout>
  );
}
