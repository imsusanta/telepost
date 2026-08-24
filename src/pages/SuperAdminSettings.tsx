import { useEffect, useMemo, useState } from 'react';
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
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '@/components/DashboardLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isSuperAdmin } from '@/services/couponService';
import {
  getAllSettings,
  updateAISettings,
  updateMaintenanceSettings,
  updatePaymentSettings,
  updateTelegramSettings,
  updateUserDefaults,
  type AIProvider,
  type AISettings,
  type PaymentSettings,
  type SystemMaintenance,
  type TelegramSettings,
  type UserDefaults,
} from '@/services/systemSettingsService';

const CLOUDFLARE_MODELS = [
  '@cf/openai/gpt-oss-120b',
  '@cf/openai/gpt-oss-20b',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-8b-instruct',
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
  '@cf/qwen/qwen2.5-coder-32b-instruct',
  '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
];

const PROVIDER_DEFAULT_MODELS: Record<AIProvider, string> = {
  openrouter: 'google/gemini-2.0-flash-exp:free',
  lovable: 'openai/gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
  cloudflare: '@cf/meta/llama-3.1-8b-instruct',
};

const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'openrouter',
  model: PROVIDER_DEFAULT_MODELS.openrouter,
  image_model: '',
  openrouter_image_model: '',
  temperature: 0.7,
  system_prompt: '',
  openrouter_api_key: '',
  gemini_api_key: '',
  openai_api_key: '',
  cloudflare_account_id: '',
  cloudflare_api_token: '',
};

type SecretInputProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  visible: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
};

function SecretInput({ id, label, value, placeholder, visible, onToggle, onChange }: SecretInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value.trim())}
          placeholder={placeholder}
          className="pr-11 font-mono text-xs"
          autoComplete="off"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2"
          onClick={onToggle}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export default function SuperAdminSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingAI, setTestingAI] = useState(false);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});

  const [userDefaults, setUserDefaults] = useState<UserDefaults>({
    auto_approve_signups: true,
    default_role: 'user',
    email_verification_required: true,
  });
  const [maintenanceSettings, setMaintenanceSettings] = useState<SystemMaintenance>({
    maintenance_mode: false,
    maintenance_message: 'System is under maintenance. Please try again later.',
  });
  const [aiSettings, setAISettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings>({
    global_bot_token: '',
    fallback_enabled: true,
  });
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    razorpay_key_id: '',
    razorpay_key_secret: '',
    razorpay_webhook_secret: '',
  });

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
        setAISettings({ ...DEFAULT_AI_SETTINGS, ...data.ai_settings });
        setTelegramSettings(data.telegram_settings);
        setPaymentSettings(data.payment_settings);
      } catch (error) {
        console.error('Failed to load system settings:', error);
        toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [navigate, toast]);

  const quickModels = useMemo(
    () => (aiSettings.provider === 'cloudflare' ? CLOUDFLARE_MODELS : []),
    [aiSettings.provider]
  );

  const toggleSecret = (key: string) => {
    setVisibleSecrets((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const save = async (action: () => Promise<void>, successMessage: string) => {
    try {
      setSaving(true);
      await action();
      toast({ title: 'Success', description: successMessage });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleProviderChange = (provider: AIProvider) => {
    setAISettings((previous) => ({
      ...previous,
      provider,
      model: PROVIDER_DEFAULT_MODELS[provider],
    }));
  };

  const handleSaveAISettings = async () => {
    if (!aiSettings.model.trim()) {
      toast({ title: 'Model required', description: 'Enter an AI model ID.', variant: 'destructive' });
      return;
    }
    if (
      aiSettings.provider === 'cloudflare' &&
      (!aiSettings.cloudflare_account_id?.trim() || !aiSettings.cloudflare_api_token?.trim())
    ) {
      toast({
        title: 'Cloudflare credentials required',
        description: 'Enter both the Cloudflare Account ID and API token.',
        variant: 'destructive',
      });
      return;
    }
    await save(() => updateAISettings(aiSettings), 'AI settings saved successfully');
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
          openai_api_key: aiSettings.openai_api_key,
          cloudflare_account_id: aiSettings.cloudflare_account_id,
          cloudflare_api_token: aiSettings.cloudflare_api_token,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Unknown AI connection error');

      toast({
        title: 'Connection Successful',
        description: `${data.provider || aiSettings.provider} / ${data.model || aiSettings.model} is working.`,
      });
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
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="bg-gradient-to-r from-primary to-accent bg-clip-text text-3xl font-bold text-transparent">
            System Settings
          </h1>
          <p className="text-muted-foreground">Configure system-wide services and defaults</p>
        </div>

        {maintenanceSettings.maintenance_mode && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Maintenance Mode Active</AlertTitle>
            <AlertDescription>{maintenanceSettings.maintenance_message}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="ai" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:inline-flex lg:w-auto">
            <TabsTrigger value="telegram" className="gap-2"><Send className="h-4 w-4" /><span className="hidden sm:inline">Telegram</span></TabsTrigger>
            <TabsTrigger value="payments" className="gap-2"><CreditCard className="h-4 w-4" /><span className="hidden sm:inline">Payments</span></TabsTrigger>
            <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /><span className="hidden sm:inline">Users</span></TabsTrigger>
            <TabsTrigger value="ai" className="gap-2"><Bot className="h-4 w-4" /><span className="hidden sm:inline">AI</span></TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-2"><Wrench className="h-4 w-4" /><span className="hidden sm:inline">Maintenance</span></TabsTrigger>
          </TabsList>

          <TabsContent value="telegram">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" />Global Telegram Bot</CardTitle>
                <CardDescription>Fallback bot credentials used across the workspace</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <SecretInput
                  id="global_bot_token"
                  label="Global Bot Token"
                  value={telegramSettings.global_bot_token}
                  placeholder="123456:ABC..."
                  visible={Boolean(visibleSecrets.telegram)}
                  onToggle={() => toggleSecret('telegram')}
                  onChange={(value) => setTelegramSettings((previous) => ({ ...previous, global_bot_token: value }))}
                />
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                  <div><Label>Enable Fallback</Label><p className="text-sm text-muted-foreground">Use this bot when a channel has no bot token.</p></div>
                  <Switch checked={telegramSettings.fallback_enabled} onCheckedChange={(checked) => setTelegramSettings((previous) => ({ ...previous, fallback_enabled: checked }))} />
                </div>
                <Button onClick={() => save(() => updateTelegramSettings(telegramSettings), 'Telegram settings saved')} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save Telegram Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Razorpay</CardTitle><CardDescription>Subscription payment credentials</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <SecretInput id="razorpay_key_id" label="Razorpay Key ID" value={paymentSettings.razorpay_key_id} placeholder="rzp_test_..." visible={Boolean(visibleSecrets.razorpayId)} onToggle={() => toggleSecret('razorpayId')} onChange={(value) => setPaymentSettings((previous) => ({ ...previous, razorpay_key_id: value }))} />
                <SecretInput id="razorpay_key_secret" label="Razorpay Key Secret" value={paymentSettings.razorpay_key_secret} placeholder="Enter key secret" visible={Boolean(visibleSecrets.razorpaySecret)} onToggle={() => toggleSecret('razorpaySecret')} onChange={(value) => setPaymentSettings((previous) => ({ ...previous, razorpay_key_secret: value }))} />
                <SecretInput id="razorpay_webhook_secret" label="Webhook Secret" value={paymentSettings.razorpay_webhook_secret} placeholder="Enter webhook secret" visible={Boolean(visibleSecrets.razorpayWebhook)} onToggle={() => toggleSecret('razorpayWebhook')} onChange={(value) => setPaymentSettings((previous) => ({ ...previous, razorpay_webhook_secret: value }))} />
                <Button onClick={() => save(() => updatePaymentSettings(paymentSettings), 'Payment settings saved')} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save Payment Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />User Defaults</CardTitle><CardDescription>Defaults applied to new accounts</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4"><div><Label>Auto-approve signups</Label><p className="text-sm text-muted-foreground">Allow new users to access Telepost immediately.</p></div><Switch checked={userDefaults.auto_approve_signups} onCheckedChange={(checked) => setUserDefaults((previous) => ({ ...previous, auto_approve_signups: checked }))} /></div>
                <div className="flex items-center justify-between rounded-lg border p-4"><div><Label>Require email verification</Label><p className="text-sm text-muted-foreground">Require verified email addresses for new users.</p></div><Switch checked={userDefaults.email_verification_required} onCheckedChange={(checked) => setUserDefaults((previous) => ({ ...previous, email_verification_required: checked }))} /></div>
                <Button onClick={() => save(() => updateUserDefaults(userDefaults), 'User defaults saved')} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save User Defaults
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />AI Provider</CardTitle>
                <CardDescription>Configure the provider and model used for AI text generation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {aiSettings.provider === 'cloudflare' && (
                  <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertTitle>Cloudflare Workers AI</AlertTitle>
                    <AlertDescription>
                      Use your Cloudflare Account ID and an API token with Workers AI permission. Model IDs start with <code>@cf/</code>.{' '}
                      <a className="font-medium underline" href="https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/" target="_blank" rel="noreferrer">View Cloudflare setup docs</a>.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ai_provider">AI Provider</Label>
                    <Select value={aiSettings.provider} onValueChange={(value) => handleProviderChange(value as AIProvider)}>
                      <SelectTrigger id="ai_provider"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cloudflare">Cloudflare Workers AI</SelectItem>
                        <SelectItem value="openrouter">OpenRouter</SelectItem>
                        <SelectItem value="gemini">Google Gemini</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="lovable">Lovable / OpenRouter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {quickModels.length > 0 && (
                    <div className="space-y-2">
                      <Label>Recommended Cloudflare model</Label>
                      <Select value={quickModels.includes(aiSettings.model) ? aiSettings.model : undefined} onValueChange={(model) => setAISettings((previous) => ({ ...previous, model }))}>
                        <SelectTrigger><SelectValue placeholder="Choose a recommended model" /></SelectTrigger>
                        <SelectContent>{quickModels.map((model) => <SelectItem key={model} value={model}>{model}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_model">Model ID</Label>
                  <Input id="ai_model" value={aiSettings.model} onChange={(event) => setAISettings((previous) => ({ ...previous, model: event.target.value.trim() }))} placeholder={PROVIDER_DEFAULT_MODELS[aiSettings.provider]} className="font-mono text-sm" />
                  <p className="text-xs text-muted-foreground">You can enter any compatible model ID, including newly released Cloudflare models.</p>
                </div>

                {aiSettings.provider === 'cloudflare' ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cloudflare_account_id">Cloudflare Account ID</Label>
                      <Input id="cloudflare_account_id" value={aiSettings.cloudflare_account_id || ''} onChange={(event) => setAISettings((previous) => ({ ...previous, cloudflare_account_id: event.target.value.trim() }))} placeholder="32-character account ID" className="font-mono text-xs" autoComplete="off" />
                    </div>
                    <SecretInput id="cloudflare_api_token" label="Cloudflare API Token" value={aiSettings.cloudflare_api_token || ''} placeholder="API token with Workers AI access" visible={Boolean(visibleSecrets.cloudflare)} onToggle={() => toggleSecret('cloudflare')} onChange={(value) => setAISettings((previous) => ({ ...previous, cloudflare_api_token: value }))} />
                  </div>
                ) : aiSettings.provider === 'gemini' ? (
                  <SecretInput id="gemini_api_key" label="Gemini API Key" value={aiSettings.gemini_api_key || ''} placeholder="AIza..." visible={Boolean(visibleSecrets.gemini)} onToggle={() => toggleSecret('gemini')} onChange={(value) => setAISettings((previous) => ({ ...previous, gemini_api_key: value }))} />
                ) : aiSettings.provider === 'openai' ? (
                  <SecretInput id="openai_api_key" label="OpenAI API Key" value={aiSettings.openai_api_key || ''} placeholder="sk-..." visible={Boolean(visibleSecrets.openai)} onToggle={() => toggleSecret('openai')} onChange={(value) => setAISettings((previous) => ({ ...previous, openai_api_key: value }))} />
                ) : (
                  <SecretInput id="openrouter_api_key" label="OpenRouter API Key" value={aiSettings.openrouter_api_key || ''} placeholder="sk-or-..." visible={Boolean(visibleSecrets.openrouter)} onToggle={() => toggleSecret('openrouter')} onChange={(value) => setAISettings((previous) => ({ ...previous, openrouter_api_key: value }))} />
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between"><Label>Temperature</Label><span className="font-mono text-sm text-muted-foreground">{aiSettings.temperature.toFixed(1)}</span></div>
                  <Slider min={0} max={1.5} step={0.1} value={[aiSettings.temperature]} onValueChange={([temperature]) => setAISettings((previous) => ({ ...previous, temperature }))} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="system_prompt">Global System Prompt</Label>
                  <Textarea id="system_prompt" rows={6} value={aiSettings.system_prompt || ''} onChange={(event) => setAISettings((previous) => ({ ...previous, system_prompt: event.target.value }))} placeholder="Instructions applied to every AI request..." />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={handleTestAIConnection} disabled={testingAI || !aiSettings.model} className="gap-2">
                    {testingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}Test Connection
                  </Button>
                  <Button variant="secondary" onClick={() => setAISettings(DEFAULT_AI_SETTINGS)} className="gap-2"><RefreshCcw className="h-4 w-4" />Reset</Button>
                  <Button onClick={handleSaveAISettings} disabled={saving || !aiSettings.model} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save AI Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance">
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" />System Maintenance</CardTitle><CardDescription>Control availability for end users</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between rounded-lg border p-4"><div><Label>Maintenance Mode</Label><p className="text-sm text-muted-foreground">Temporarily limit access to the application.</p></div><Switch checked={maintenanceSettings.maintenance_mode} onCheckedChange={(checked) => setMaintenanceSettings((previous) => ({ ...previous, maintenance_mode: checked }))} /></div>
                <div className="space-y-2"><Label htmlFor="maintenance_message">Maintenance Message</Label><Textarea id="maintenance_message" rows={3} value={maintenanceSettings.maintenance_message} onChange={(event) => setMaintenanceSettings((previous) => ({ ...previous, maintenance_message: event.target.value }))} /></div>
                <Button onClick={() => save(() => updateMaintenanceSettings(maintenanceSettings), 'Maintenance settings saved')} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save Maintenance Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
