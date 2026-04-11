import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Bot,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  RefreshCcw,
  Save,
  Send,
  Users,
  Wrench,
  Zap
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { isSuperAdmin } from '@/services/couponService';
import {
  getAllSettings,
  updateUserDefaults,
  updateMaintenanceSettings,
  updateAISettings,
  updateTelegramSettings,
  updatePaymentSettings,
  type UserDefaults,
  type SystemMaintenance,
  type AISettings,
  type TelegramSettings,
  type PaymentSettings,
} from '@/services/systemSettingsService';
import { supabase } from '@/integrations/supabase/client';

export default function SuperAdminSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);


  const [userDefaults, setUserDefaults] = useState<UserDefaults>({
    auto_approve_signups: true,
    default_role: 'user',
    email_verification_required: true,
  });


  const [maintenanceSettings, setMaintenanceSettings] = useState<SystemMaintenance>({
    maintenance_mode: false,
    maintenance_message: 'System is under maintenance. Please try again later.',
  });

  const [aiSettings, setAISettings] = useState<AISettings>({
    provider: 'lovable',
    model: 'openai/gpt-4o-mini',
    temperature: 0.7,
    system_prompt: '',
    openrouter_api_key: '',
    gemini_api_key: '',
    openai_api_key: '',
  });

  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings>({
    global_bot_token: '',
    fallback_enabled: true,
  });
  const [showGlobalToken, setShowGlobalToken] = useState(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showRazorpayKeyId, setShowRazorpayKeyId] = useState(false);
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [showRazorpayWebhook, setShowRazorpayWebhook] = useState(false);

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    razorpay_key_id: '',
    razorpay_key_secret: '',
    razorpay_webhook_secret: '',
  });

  const [testingAI, setTestingAI] = useState(false);



  useEffect(() => {
    const loadSettings = async () => {
      const hasAccess = await isSuperAdmin();
      if (!hasAccess) {
        navigate('/dashboard');
        return;
      }

      try {
        const data = await getAllSettings();
        setUserDefaults(data.user_defaults);
        setMaintenanceSettings(data.system_maintenance);
        setAISettings(data.ai_settings);
        setTelegramSettings(data.telegram_settings || {
          global_bot_token: '',
          fallback_enabled: true,
        });
        setPaymentSettings(data.payment_settings || {
          razorpay_key_id: '',
          razorpay_key_secret: '',
          razorpay_webhook_secret: '',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load settings',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [navigate, toast]);





  const handleSaveUserDefaults = async () => {
    try {
      setSaving(true);
      await updateUserDefaults(userDefaults);
      toast({
        title: 'Success',
        description: 'User settings saved',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };


  const handleSaveMaintenanceSettings = async () => {
    try {
      setSaving(true);
      await updateMaintenanceSettings(maintenanceSettings);
      toast({
        title: 'Success',
        description: maintenanceSettings.maintenance_mode
          ? 'Maintenance mode enabled'
          : 'Maintenance settings saved',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAISettings = async () => {
    try {
      setSaving(true);
      await updateAISettings(aiSettings);
      toast({
        title: 'Success',
        description: 'AI settings saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save AI settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTelegramSettings = async () => {
    try {
      setSaving(true);
      await updateTelegramSettings(telegramSettings);
      toast({
        title: 'Success',
        description: 'Telegram settings saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save Telegram settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePaymentSettings = async () => {
    try {
      setSaving(true);
      await updatePaymentSettings(paymentSettings);
      toast({
        title: 'Success',
        description: 'Payment gateway settings saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save payment settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestAIConnection = async () => {
    try {
      setTestingAI(true);

      const { data, error } = await supabase.functions.invoke('test-ai-connection', {
        body: {
          provider: aiSettings.provider,
          model: aiSettings.model,
          temperature: aiSettings.temperature,
          system_prompt: aiSettings.system_prompt,
          openrouter_api_key: aiSettings.openrouter_api_key,
          gemini_api_key: aiSettings.gemini_api_key,
          openai_api_key: aiSettings.openai_api_key
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Connection Successful',
          description: `Model "${aiSettings.model}" is working. Response: ${data.response?.substring(0, 100)}...`,
        });
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect to AI',
        variant: 'destructive',
      });
    } finally {
      setTestingAI(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            System Settings
          </h1>
          <p className="text-muted-foreground">
            Configure system-wide defaults and maintenance settings
          </p>
        </div>

        {/* Maintenance Mode Alert */}
        {maintenanceSettings.maintenance_mode && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Maintenance Mode Active</AlertTitle>
            <AlertDescription>
              The system is currently in maintenance mode. Users may not be able to access certain features.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="telegram" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="telegram" className="gap-2">
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Telegram</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">AI</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-2">
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">Maintenance</span>
            </TabsTrigger>
          </TabsList>



          {/* Telegram Bot Settings */}
          <TabsContent value="telegram">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Global Telegram Bot
                </CardTitle>
                <CardDescription>
                  Configure the global Telegram bot used as fallback for all users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Bot className="h-4 w-4" />
                  <AlertTitle>Super Admin Bot Token</AlertTitle>
                  <AlertDescription>
                    This is the primary bot token used when users haven't configured their own.
                    Get a token from <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline font-semibold">@BotFather</a>.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="global_bot_token">Global Bot Token</Label>
                  <div className="relative">
                    <Input
                      id="global_bot_token"
                      type={showGlobalToken ? "text" : "password"}
                      value={telegramSettings.global_bot_token}
                      onChange={(e) => setTelegramSettings(prev => ({
                        ...prev,
                        global_bot_token: e.target.value.trim(),
                      }))}
                      placeholder="Enter global Telegram bot token"
                      className="pr-10 font-mono"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowGlobalToken(!showGlobalToken)}
                    >
                      {showGlobalToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This token is used as the fallback when a user's channel doesn't have a specific token.
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-lg">
                  <div>
                    <Label>Enable Fallback</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow users without channel-specific tokens to use this global bot
                    </p>
                  </div>
                  <Switch
                    checked={telegramSettings.fallback_enabled}
                    onCheckedChange={(checked) => setTelegramSettings(prev => ({
                      ...prev,
                      fallback_enabled: checked,
                    }))}
                  />
                </div>

                <Button onClick={handleSaveTelegramSettings} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Telegram Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Gateway Settings */}
          <TabsContent value="payments">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Razorpay Payment Gateway
                </CardTitle>
                <CardDescription>
                  Configure Razorpay credentials for subscription payments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <CreditCard className="h-4 w-4" />
                  <AlertTitle>Razorpay API Keys</AlertTitle>
                  <AlertDescription>
                    Get your API keys from the{' '}
                    <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Razorpay Dashboard</a>.
                    Use <strong>Test Mode</strong> keys for development and <strong>Live Mode</strong> keys for production.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="razorpay_key_id">Razorpay Key ID</Label>
                    <div className="relative">
                      <Input
                        id="razorpay_key_id"
                        type={showRazorpayKeyId ? "text" : "password"}
                        value={paymentSettings.razorpay_key_id}
                        onChange={(e) => setPaymentSettings(prev => ({
                          ...prev,
                          razorpay_key_id: e.target.value.trim(),
                        }))}
                        placeholder="rzp_test_... or rzp_live_..."
                        className="pr-10 font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowRazorpayKeyId(!showRazorpayKeyId)}
                      >
                        {showRazorpayKeyId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Public key used in the checkout form (starts with rzp_test_ or rzp_live_)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="razorpay_key_secret">Razorpay Key Secret</Label>
                    <div className="relative">
                      <Input
                        id="razorpay_key_secret"
                        type={showRazorpaySecret ? "text" : "password"}
                        value={paymentSettings.razorpay_key_secret}
                        onChange={(e) => setPaymentSettings(prev => ({
                          ...prev,
                          razorpay_key_secret: e.target.value.trim(),
                        }))}
                        placeholder="Your Razorpay Secret Key"
                        className="pr-10 font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                      >
                        {showRazorpaySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Secret key used for server-side order creation and payment verification
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="razorpay_webhook_secret">Webhook Secret (Optional)</Label>
                    <div className="relative">
                      <Input
                        id="razorpay_webhook_secret"
                        type={showRazorpayWebhook ? "text" : "password"}
                        value={paymentSettings.razorpay_webhook_secret}
                        onChange={(e) => setPaymentSettings(prev => ({
                          ...prev,
                          razorpay_webhook_secret: e.target.value.trim(),
                        }))}
                        placeholder="Your Webhook Secret"
                        className="pr-10 font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowRazorpayWebhook(!showRazorpayWebhook)}
                      >
                        {showRazorpayWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Used to verify webhook events from Razorpay (set in Razorpay Dashboard → Webhooks)
                    </p>
                  </div>
                </div>

                <Button onClick={handleSavePaymentSettings} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Payment Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Defaults */}
          <TabsContent value="users">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Defaults
                </CardTitle>
                <CardDescription>
                  Configure default settings for new users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Default Role</Label>
                  <Select
                    value={userDefaults.default_role}
                    onValueChange={(v) => setUserDefaults(prev => ({
                      ...prev,
                      default_role: v as 'user',
                    }))}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Default role assigned to new users
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-Approve Signups</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically approve new user signups
                      </p>
                    </div>
                    <Switch
                      checked={userDefaults.auto_approve_signups}
                      onCheckedChange={(checked) => setUserDefaults(prev => ({
                        ...prev,
                        auto_approve_signups: checked,
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Verification Required</Label>
                      <p className="text-xs text-muted-foreground">
                        Require users to verify their email address
                      </p>
                    </div>
                    <Switch
                      checked={userDefaults.email_verification_required}
                      onCheckedChange={(checked) => setUserDefaults(prev => ({
                        ...prev,
                        email_verification_required: checked,
                      }))}
                    />
                  </div>
                </div>

                <Button onClick={handleSaveUserDefaults} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save User Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>


          {/* AI Configuration */}
          <TabsContent value="ai">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  AI Configuration
                </CardTitle>
                <CardDescription>
                  Configure AI model for quiz generation and document processing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertTitle>AI Model Integration</AlertTitle>
                  <AlertDescription>
                    Enter a model slug (e.g., <code className="bg-muted px-1 rounded">openai/gpt-4o-mini</code> for Lovable AI Gateway).
                    Find models at <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="underline">openrouter.ai/models</a>
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="openrouter_api_key">OpenRouter API Key</Label>
                      <div className="relative">
                        <Input
                          id="openrouter_api_key"
                          type={showOpenRouterKey ? "text" : "password"}
                          value={aiSettings.openrouter_api_key}
                          onChange={(e) => setAISettings(prev => ({
                            ...prev,
                            openrouter_api_key: e.target.value.trim(),
                          }))}
                          placeholder="Your OpenRouter API Key"
                          className="pr-10 font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                        >
                          {showOpenRouterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Main gateway for AI quiz generation models
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gemini_api_key">Gemini API Key (Direct)</Label>
                      <div className="relative">
                        <Input
                          id="gemini_api_key"
                          type={showGeminiKey ? "text" : "password"}
                          value={aiSettings.gemini_api_key}
                          onChange={(e) => setAISettings(prev => ({
                            ...prev,
                            gemini_api_key: e.target.value.trim(),
                          }))}
                          placeholder="Your Gemini API Key"
                          className="pr-10 font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => setShowGeminiKey(!showGeminiKey)}
                        >
                          {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Used for direct Gemini model calls
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="openai_api_key">OpenAI API Key (Direct)</Label>
                      <div className="relative">
                        <Input
                          id="openai_api_key"
                          type={showOpenAIKey ? "text" : "password"}
                          value={aiSettings.openai_api_key}
                          onChange={(e) => setAISettings(prev => ({
                            ...prev,
                            openai_api_key: e.target.value.trim(),
                          }))}
                          placeholder="Your OpenAI API Key"
                          className="pr-10 font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                        >
                          {showOpenAIKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Used for direct OpenAI model calls
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ai_provider">AI Provider</Label>
                      <Select
                        value={aiSettings.provider}
                        onValueChange={(v) => setAISettings(prev => ({
                          ...prev,
                          provider: v as 'openrouter' | 'lovable' | 'gemini' | 'openai',
                        }))}
                      >
                        <SelectTrigger id="ai_provider">
                          <SelectValue placeholder="Select Provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openrouter">OpenRouter (Recommended)</SelectItem>
                          <SelectItem value="gemini">Gemini (Direct)</SelectItem>
                          <SelectItem value="openai">OpenAI (Direct)</SelectItem>
                          <SelectItem value="lovable">Lovable Proxy</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select the service to use for AI requests
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ai_model">Model Name</Label>
                      <Input
                        id="ai_model"
                        value={aiSettings.model}
                        onChange={(e) => setAISettings(prev => ({
                          ...prev,
                          model: e.target.value.trim(),
                        }))}
                        placeholder="e.g., openai/gpt-4o-mini"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the full model slug
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Temperature: {aiSettings.temperature.toFixed(2)}</Label>
                    </div>
                    <Slider
                      value={[aiSettings.temperature]}
                      onValueChange={(value) => setAISettings(prev => ({
                        ...prev,
                        temperature: value[0],
                      }))}
                      min={0}
                      max={1}
                      step={0.05}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower values = more focused, higher values = more creative
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="system_prompt">Global System Prompt</Label>
                    <Textarea
                      id="system_prompt"
                      value={aiSettings.system_prompt}
                      onChange={(e) => setAISettings(prev => ({
                        ...prev,
                        system_prompt: e.target.value,
                      }))}
                      placeholder="Enter a global system prompt to improve AI output quality..."
                      rows={6}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      This prompt will be prepended to all AI requests to guide the model's behavior.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleTestAIConnection}
                    disabled={testingAI || !aiSettings.model}
                    variant="outline"
                    className="gap-2"
                  >
                    {testingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Test Connection
                  </Button>
                  <Button
                    onClick={() => setAISettings({
                      provider: 'openrouter',
                      model: 'openai/gpt-4o-mini',
                      temperature: 0.7,
                      system_prompt: '',
                      openrouter_api_key: '',
                      gemini_api_key: '',
                      openai_api_key: ''
                    })}
                    variant="secondary"
                    className="gap-2"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    Reset to Defaults
                  </Button>
                  <Button
                    onClick={handleSaveAISettings}
                    disabled={saving || !aiSettings.model}
                    className="gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save AI Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance */}
          <TabsContent value="maintenance">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  System Maintenance
                </CardTitle>
                <CardDescription>
                  Control system maintenance mode and messages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                  <div>
                    <Label className="text-amber-600">Maintenance Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable to show maintenance message to all users
                    </p>
                  </div>
                  <Switch
                    checked={maintenanceSettings.maintenance_mode}
                    onCheckedChange={(checked) => setMaintenanceSettings(prev => ({
                      ...prev,
                      maintenance_mode: checked,
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenance_message">Maintenance Message</Label>
                  <Textarea
                    id="maintenance_message"
                    value={maintenanceSettings.maintenance_message}
                    onChange={(e) => setMaintenanceSettings(prev => ({
                      ...prev,
                      maintenance_message: e.target.value,
                    }))}
                    rows={3}
                    placeholder="Enter the message to display during maintenance..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Message shown to users when maintenance mode is active
                  </p>
                </div>

                <Button
                  onClick={handleSaveMaintenanceSettings}
                  disabled={saving}
                  variant={maintenanceSettings.maintenance_mode ? "destructive" : "default"}
                  className="gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {maintenanceSettings.maintenance_mode ? 'Enable Maintenance Mode' : 'Save Maintenance Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout >
  );
}
