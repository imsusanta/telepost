import { useEffect, useState } from "react";
import {
  Bot,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Loader2,
  SettingsIcon,
  Trash2,
  BarChart3,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { AIService, AISettings, AIUsageStats } from "@/services/aiService";

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // AI Settings state
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [aiUsageStats, setAiUsageStats] = useState<AIUsageStats | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [removingKey, setRemovingKey] = useState(false);

  useEffect(() => {
    loadProfile();
    loadAISettings();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email || "");
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (data) {
        setFullName(data.full_name || "");
      }
    }
  };

  const loadAISettings = async () => {
    try {
      const settings = await AIService.getSettings();
      setAiSettings(settings);

      if (settings.hasApiKey) {
        const stats = await AIService.getUsageStats();
        setAiUsageStats(stats);
      }
    } catch (error) {
      console.error("Error loading AI settings:", error);
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

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    setSavingApiKey(true);
    try {
      await AIService.saveApiKey(apiKey.trim());
      toast({
        title: "API Key Saved",
        description: "Your Gemini API key has been saved. Click 'Test Connection' to verify.",
      });
      setApiKey("");
      await loadAISettings();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save API key",
        variant: "destructive",
      });
    } finally {
      setSavingApiKey(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const result = await AIService.testApiKey();
      if (result.success) {
        toast({
          title: "Connection Successful! 🎉",
          description: `Connected to ${result.model}. Your AI features are ready to use.`,
        });
        await loadAISettings();
      } else {
        toast({
          title: "Connection Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to test connection",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleRemoveApiKey = async () => {
    setRemovingKey(true);
    try {
      await AIService.removeApiKey();
      toast({
        title: "API Key Removed",
        description: "Your Gemini API key has been removed.",
      });
      setAiSettings(null);
      setAiUsageStats(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove API key",
        variant: "destructive",
      });
    } finally {
      setRemovingKey(false);
    }
  };

  const getStatusBadge = () => {
    if (!aiSettings?.hasApiKey) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <AlertCircle className="h-3 w-3 mr-1" />
          Not Configured
        </Badge>
      );
    }

    switch (aiSettings.apiKeyStatus) {
      case "active":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case "invalid":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Invalid
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending Verification
          </Badge>
        );
      default:
        return null;
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
              Update your personal information and account details
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
                <p className="text-sm text-muted-foreground flex items-center space-x-1">
                  <span className="inline-block w-1.5 h-1.5 bg-muted rounded-full"></span>
                  <span>Email address is managed by your authentication provider</span>
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

        {/* AI Configuration Card */}
        <Card className="clay-card-hover bg-card/50 backdrop-blur-sm border-border">
          <CardHeader className="space-y-3 pb-6">
            <CardTitle className="flex items-center space-x-3 text-2xl">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-clay-sm">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                AI Configuration
              </span>
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              Configure your OpenRouter API key for AI-powered post and image generation (uses Gemini 2.0 Flash free model)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* API Key Input */}
            <div className="space-y-3">
              <Label htmlFor="apiKey" className="text-base font-medium text-foreground flex items-center gap-2">
                <Key className="h-4 w-4" />
                OpenRouter API Key
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={aiSettings?.hasApiKey ? "••••••••••••••••••••" : "Enter your OpenRouter API key..."}
                    className="h-12 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  onClick={handleSaveApiKey}
                  disabled={savingApiKey || !apiKey.trim()}
                  className="h-12"
                >
                  {savingApiKey ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Your API key is stored securely and only used for generating content. We never share or store your generated content.
              </p>
            </div>

            {/* Get API Key Link */}
            <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">Don't have an API key?</span>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
              >
                Get Free OpenRouter API Key
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <Separator />

            {/* API Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">API Status:</span>
                {getStatusBadge()}
                {aiSettings?.apiKeyStatus === "active" && (
                  <span className="text-xs text-muted-foreground">
                    • Model: gemini-2.0-flash-exp (free)
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testingConnection || !aiSettings?.hasApiKey}
              >
                {testingConnection ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
              {aiSettings?.hasApiKey && (
                <Button
                  variant="outline"
                  onClick={handleRemoveApiKey}
                  disabled={removingKey}
                  className="text-destructive hover:text-destructive"
                >
                  {removingKey ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Remove Key
                </Button>
              )}
            </div>

            {/* Usage Statistics */}
            {aiSettings?.hasApiKey && aiSettings.apiKeyStatus === "active" && aiUsageStats && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-base font-medium text-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Usage Statistics
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-foreground">{aiUsageStats.postsGeneratedToday}</p>
                      <p className="text-xs text-muted-foreground">Posts Today</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-foreground">{aiUsageStats.imagesGeneratedToday}</p>
                      <p className="text-xs text-muted-foreground">Images Today</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-foreground">{aiUsageStats.totalCallsThisMonth}</p>
                      <p className="text-xs text-muted-foreground">Total This Month</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-foreground">{aiUsageStats.totalTokensThisMonth.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Tokens Used</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
