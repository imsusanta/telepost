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
  Sparkles,
  Zap,
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
          return;
        }

        if (data) {
          console.log("Profile loaded:", data.full_name);
          setFullName(data.full_name || "");
        }
      }
    } catch (err) {
      console.error("Exception in loadProfile:", err);
    }
  };

  const loadBotConfig = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
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

      window.dispatchEvent(new CustomEvent("profile-updated"));

      toast({
        title: "Success!",
        description: "Profile updated successfully.",
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

      const supabaseAny = supabase as any;

      const { data: existingChannels, error: fetchError } = await supabaseAny
        .from("channels")
        .select("id, name")
        .eq("user_id", user.id)
        .limit(1);

      if (fetchError) {
        throw new Error(fetchError.message || "Failed to fetch channels");
      }

      let saveError = null;

      if (existingChannels && existingChannels.length > 0) {
        const { error: updateError } = await supabaseAny
          .from("channels")
          .update({ telegram_bot_token: botToken })
          .eq("user_id", user.id);

        saveError = updateError;
      } else {
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
        throw new Error(saveError.message || "Failed to save bot token");
      }

      setHasBotToken(true);
      setBotToken("••••••••••••••••••••");
      setShowBotToken(false);

      toast({
        title: "Bot Token Saved!",
        description: "Your Telegram bot token has been saved successfully.",
      });
    } catch (error: unknown) {
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
      <div className="mx-auto max-w-5xl space-y-8 pb-12">
        {/* Hero Section Header with Requested Headline */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/70 to-accent/10 p-6 md:p-10 shadow-2xl backdrop-blur-xl group">
          <div className="absolute -top-12 -right-12 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none transition-all duration-700 group-hover:scale-125" />
          <div className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-accent/20 blur-3xl pointer-events-none transition-all duration-700 group-hover:scale-125" />

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-black uppercase tracking-widest shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span>TelePost Automation Engine</span>
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

            <div className="space-y-1">
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
                <span className="bg-gradient-to-r from-primary via-indigo-500 to-accent bg-clip-text text-transparent">
                  Post Up to 20 Quizzes
                </span>
              </h1>
              <h2 className="text-xl md:text-3xl font-extrabold text-foreground/90 tracking-tight">
                to Your Telegram Channel in Under a Minute
              </h2>
            </div>

            <p className="text-sm md:text-base text-muted-foreground max-w-2xl font-medium leading-relaxed">
              Configure your user profile, connect your Telegram bot token, and manage automated channel broadcasts.
            </p>
          </div>
        </div>

        <main className="space-y-8">
          {/* Profile Information Card */}
          <Card id="profile" className="overflow-hidden rounded-3xl border border-border/80 bg-card/70 shadow-xl backdrop-blur-xl transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="border-b border-border/60 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-bold">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/20">
                  <UserRound className="h-5 w-5" />
                </div>
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Profile Information
                </span>
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                Manage your personal information and display preferences across TelePost.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2.5">
                    <Label htmlFor="fullName" className="text-sm font-semibold text-foreground">
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="h-12 rounded-2xl border-border/70 bg-background/60 font-medium transition-all focus:bg-background focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="h-12 cursor-not-allowed rounded-2xl border-border/50 bg-muted/60 font-medium text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email address is managed by your authentication provider.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end border-t border-border/60 pt-5">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-accent px-7 font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Saving...</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Save className="h-4 w-4" /> Save Profile Changes
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Telegram Bot Integration Card */}
          <Card id="telegram" className="overflow-hidden rounded-3xl border border-border/80 bg-card/70 shadow-xl backdrop-blur-xl transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="border-b border-border/60 bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent pb-6">
              <CardTitle className="flex flex-wrap items-center justify-between gap-4 text-xl font-bold">
                <div className="flex items-center space-x-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/20">
                    <Bot className="h-5 w-5" />
                  </div>
                  <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
                    Telegram Bot Integration
                  </span>
                </div>
                {hasBotToken ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-500 shadow-sm">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Bot Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-500 shadow-sm">
                    <Zap className="h-3.5 w-3.5" /> Setup Needed
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                Connect your Telegram Bot token to post interactive quizzes and broadcasts directly to your Telegram channels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <Alert className="rounded-2xl border-sky-500/30 bg-sky-500/5 p-4 text-foreground">
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

              <div className="space-y-2.5">
                <Label htmlFor="botToken" className="text-sm font-semibold text-foreground">
                  Telegram Bot API Token
                </Label>
                <div className="relative">
                  <Input
                    id="botToken"
                    type={showBotToken ? "text" : "password"}
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    className="h-12 rounded-2xl border-border/70 bg-background/60 pr-12 font-mono text-sm transition-all focus:bg-background focus:ring-2 focus:ring-sky-500/20"
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
                  Your bot token is encrypted and stored securely.
                </p>
              </div>

              <div className="flex justify-end border-t border-border/60 pt-5">
                <Button
                  onClick={handleSaveBotToken}
                  disabled={botLoading}
                  className="h-12 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 px-7 font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
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
